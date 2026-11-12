import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, type Room } from 'colyseus.js';
import { createWorld, Rollback, type ServerMessage } from '@iron/engine';
import { createGameServer } from './app';

const PORT = 2598;
const FRAMES = 200;
const script = (t: number, slot: number): number => [0, 2, 1, 128][(t + slot * 3) % 4]!;

interface Peer {
  room: Room;
  slot: number;
  rb: Rollback | null;
  errors: string[];
  timer?: ReturnType<typeof setInterval>;
}

function attach(room: Room, peer: Peer): void {
  room.onMessage('start', (msg: ServerMessage & { type: 'start' }) => {
    peer.slot = msg.slot;
    peer.rb = new Rollback(msg.slot, createWorld({ heroes: msg.heroes, intro: true, ffa: msg.ffa }));
    peer.timer = setInterval(() => {
      const rb = peer.rb!;
      if (rb.tick >= FRAMES) return;
      const bits = script(rb.tick, peer.slot);
      room.send('input', { t: rb.tick, i: bits });
      rb.step(bits);
    }, 1000 / 60);
  });
  room.onMessage('tick', (msg: { t: number; inputs: number[] }) => peer.rb?.confirm(msg.t, msg.inputs));
  room.onMessage('hash', (msg: { t: number; h: string }) => peer.rb?.verify(msg.t, msg.h));
  room.onMessage('error', (msg: { message: string }) => peer.errors.push(msg.message));
}

describe('quatre combattants — deux humains et deux bots', () => {
  let stop: (() => Promise<void>) | null = null;
  beforeAll(async () => {
    const { gameServer, httpServer } = createGameServer({ dbPath: ':memory:' });
    await gameServer.listen(PORT);
    stop = async () => {
      await gameServer.gracefullyShutdown(false);
      httpServer.close();
    };
  });
  afterAll(async () => {
    await stop?.();
  });

  it('lobby à quatre places, bots ajoutés par l\'hôte, combat dernier debout sans divergence', async () => {
    const client = new Client(`ws://localhost:${PORT}`);
    const host = await client.create('four', { code: 'FOUR1', name: 'Hôte' });
    const guest = await client.join('four', { code: 'FOUR1', name: 'Invité' });
    const a: Peer = { room: host, slot: -1, rb: null, errors: [] };
    const b: Peer = { room: guest, slot: -1, rb: null, errors: [] };
    attach(host, a);
    attach(guest, b);
    let lobby: { size: number; players: unknown[]; ffa: boolean } | null = null;
    host.onMessage('lobby', (m: { state: { size: number; players: unknown[]; ffa: boolean } }) => { lobby = m.state; });
    await new Promise((r) => setTimeout(r, 200));
    host.send('bot', { add: true });
    host.send('bot', { add: true });
    guest.send('hero', { hero: 'brutus' });
    host.send('ready', { ready: true });
    guest.send('ready', { ready: true });
    await new Promise((r) => setTimeout(r, 200));
    expect(lobby).not.toBeNull();
    expect(lobby!.size).toBe(4);
    expect(lobby!.ffa).toBe(true);
    expect(lobby!.players.filter((p) => p !== null)).toHaveLength(4);
    host.send('start', {});
    await new Promise((r) => setTimeout(r, 5000));
    clearInterval(a.timer);
    clearInterval(b.timer);
    expect(a.slot).toBe(0);
    expect(b.slot).toBe(1);
    expect(a.errors).toEqual([]);
    expect(a.rb!.divergences).toEqual([]);
    expect(b.rb!.divergences).toEqual([]);
    expect(a.rb!.verified).toBeGreaterThan(0);
    expect(b.rb!.verified).toBeGreaterThan(0);
    host.leave();
    guest.leave();
  }, 20000);
});
