import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, type Room } from 'colyseus.js';
import type { LobbyState } from '@iron/engine';
import { createGameServer } from './app';

const PORT = 2611;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('salon unique : mode choisi par l\'hôte', () => {
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

  it('1v1v1 à trois humains ; le duel refuse trois joueurs ; l\'hôte qui part est remplacé', async () => {
    const client = new Client(`ws://localhost:${PORT}`);
    const rooms: Room[] = [
      await client.create('fight', { code: 'MODE2', name: 'A', mode: 'duel' }),
      await client.join('fight', { code: 'MODE2', name: 'B' }),
      await client.join('fight', { code: 'MODE2', name: 'C' }),
    ];
    const host = rooms[0]!;
    let lobby: LobbyState | null = null;
    const errors: string[] = [];
    const starts: { slot: number; heroes: string[]; ffa: boolean }[] = [];
    host.onMessage('lobby', (m: { state: LobbyState }) => { lobby = m.state; });
    host.onMessage('error', (m: { message: string }) => errors.push(m.message));
    for (const r of rooms) {
      r.onMessage('start', (m: { slot: number; heroes: string[]; ffa: boolean }) => starts.push(m));
      r.onMessage('*', () => {});
    }
    await wait(150);
    for (const r of rooms) r.send('ready', { ready: true });
    await wait(150);
    expect(lobby!.mode).toBe('duel');
    host.send('start', {});
    await wait(150);
    expect(errors.at(-1)).toMatch(/2 combattants/);
    expect(starts).toHaveLength(0);

    host.send('mode', { mode: 'ffa' });
    await wait(150);
    expect(lobby!.mode).toBe('ffa');
    expect(lobby!.ffa).toBe(true);
    host.send('start', {});
    await wait(200);
    expect(starts).toHaveLength(3);
    expect(starts.map((s) => s.slot).sort()).toEqual([0, 1, 2]);
    expect(starts.every((s) => s.heroes.length === 3 && s.ffa)).toBe(true);
    for (const r of rooms) r.leave();
  }, 15000);

  it('l\'hôte quitte le salon : le joueur suivant devient hôte (place 0)', async () => {
    const client = new Client(`ws://localhost:${PORT}`);
    const host = await client.create('fight', { code: 'MODE3', name: 'A' });
    const b = await client.join('fight', { code: 'MODE3', name: 'B' });
    let slot = -1;
    b.onMessage('welcome', (m: { slot: number }) => { slot = m.slot; });
    b.onMessage('*', () => {});
    await wait(150);
    await host.leave();
    await wait(200);
    expect(slot).toBe(0);
    b.leave();
  }, 10000);
});
