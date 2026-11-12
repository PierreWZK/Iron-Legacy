import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, type Room } from 'colyseus.js';
import { createDuelWorld, Rollback, type ServerMessage } from '@iron/engine';
import { createGameServer } from './app';

const PORT = 2599;
const FRAMES = 240;
const script = (t: number, slot: number): number => [Btn(0), Btn(1), Btn(2), Btn(3)][(t + slot * 5) % 4]!;
function Btn(k: number): number {
  return [0, 2 /* Fwd */, 1 /* Back */, 128 /* LP */][k]!;
}

interface Peer {
  room: Room;
  slot: number;
  rb: Rollback | null;
  matches: number;
  mismatches: number;
  missing: number;
  hashes: number;
  errors: string[];
  timer?: ReturnType<typeof setInterval>;
}

/** Connecte un client qui joue avec le netcode réel (rollback) et compare ses états aux empreintes serveur. */
function attach(room: Room, peer: Peer): void {
  room.onMessage('start', (msg: ServerMessage & { type: 'start' }) => {
    peer.slot = msg.slot;
    peer.rb = new Rollback(msg.slot, createDuelWorld({ p1: msg.heroes[0], p2: msg.heroes[1], intro: true }));
    peer.timer = setInterval(() => {
      const rb = peer.rb!;
      if (rb.tick >= FRAMES) return;
      const bits = script(rb.tick, peer.slot);
      room.send('input', { t: rb.tick, i: bits });
      rb.step(bits);
    }, 1000 / 60);
  });
  room.onMessage('tick', (msg: { t: number; inputs: [number, number] }) => {
    peer.rb?.confirm(msg.t, msg.inputs);
  });
  room.onMessage('hash', (msg: { t: number; h: string }) => {
    peer.hashes++;
    if (!peer.rb) {
      peer.missing++;
      return;
    }
    peer.rb.verify(msg.t, msg.h);
  });
  room.onMessage('error', (msg: { message: string }) => peer.errors.push(msg.message));
}

describe('duel en ligne — serveur autoritaire et netcode', () => {
  let stop: (() => Promise<void>) | null = null;
  beforeAll(async () => {
    const { gameServer, httpServer } = createGameServer();
    await gameServer.listen(PORT);
    stop = async () => {
      await gameServer.gracefullyShutdown(false);
      httpServer.close();
    };
  });
  afterAll(async () => {
    await stop?.();
  });

  it('deux joueurs : lobby, prêts, combat, empreintes identiques, aucune erreur', async () => {
    const client = new Client(`ws://localhost:${PORT}`);
    const host = await client.create('duel', { code: 'TEST1', name: 'Hôte' });
    const guest = await client.join('duel', { code: 'TEST1', name: 'Invité' });
    const a: Peer = { room: host, slot: -1, rb: null, matches: 0, mismatches: 0, missing: 0, hashes: 0, errors: [] };
    const b: Peer = { room: guest, slot: -1, rb: null, matches: 0, mismatches: 0, missing: 0, hashes: 0, errors: [] };
    attach(host, a);
    attach(guest, b);

    let lastLobby: { players: unknown[] } | null = null;
    host.onMessage('lobby', (m: { state: { players: unknown[] } }) => { lastLobby = m.state; });
    await new Promise((r) => setTimeout(r, 200));
    guest.send('hero', { hero: 'vera' });
    host.send('ready', { ready: true });
    guest.send('ready', { ready: true });
    await new Promise((r) => setTimeout(r, 200));
    expect(lastLobby).not.toBeNull();
    host.send('start', {});

    await new Promise((r) => setTimeout(r, 6000));
    clearInterval(a.timer);
    clearInterval(b.timer);
    expect(a.slot).toBe(0);
    expect(b.slot).toBe(1);
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
    expect(a.rb!.divergences).toEqual([]);
    expect(b.rb!.divergences).toEqual([]);
    expect(a.rb!.verified).toBeGreaterThan(0);
    expect(b.rb!.verified).toBeGreaterThan(0);
    expect(a.rb!.tick).toBeGreaterThan(200);
    host.leave();
    guest.leave();
  }, 20000);
});
