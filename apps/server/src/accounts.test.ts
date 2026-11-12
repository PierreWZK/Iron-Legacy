import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'colyseus.js';
import { AccountError, AccountStore, SAVE_KEYS } from './accounts';
import { createGameServer } from './app';

const PORT = 2596;
const BASE = `http://localhost:${PORT}`;

describe('comptes — stockage', () => {
  it('inscription, connexion, jeton, pseudo pris, mauvais mot de passe', () => {
    const s = new AccountStore(':memory:');
    const a = s.register('Alice', 'secret1');
    expect(s.account(a.token)?.name).toBe('Alice');
    expect(() => s.register('alice', 'autre12')).toThrow(AccountError);
    expect(() => s.login('Alice', 'mauvais')).toThrow(/incorrect/);
    expect(() => s.login('Inconnu', 'secret1')).toThrow(/incorrect/);
    const b = s.login('ALICE', 'secret1');
    expect(s.account(b.token)?.id).toBe(a.account.id);
    s.logout(b.token);
    expect(s.account(b.token)).toBeNull();
    s.close();
  });

  it('pseudo et mot de passe validés', () => {
    const s = new AccountStore(':memory:');
    expect(() => s.register('ab', 'secret1')).toThrow(/Pseudo/);
    expect(() => s.register('bad name!', 'secret1')).toThrow(/Pseudo/);
    expect(() => s.register('Bob', '12345')).toThrow(/Mot de passe/);
    s.close();
  });

  it('sauvegarde : seules les clés connues sont gardées, valeurs bornées', () => {
    const s = new AccountStore(':memory:');
    const { account } = s.register('Carol', 'secret1');
    s.saveProgress(account.id, { [SAVE_KEYS[0]]: '["kairo"]', hack: 'x', [SAVE_KEYS[1]]: 42 });
    expect(s.loadProgress(account.id)).toEqual({ [SAVE_KEYS[0]]: '["kairo"]' });
    expect(() => s.saveProgress(account.id, []) ).toThrow(AccountError);
    s.close();
  });

  it('classement : victoires décroissantes, comptes sans partie exclus', () => {
    const s = new AccountStore(':memory:');
    const x = s.register('Xavier', 'secret1').account.id;
    const y = s.register('Yann', 'secret1').account.id;
    s.register('Zoe', 'secret1');
    s.recordResult(x, true);
    s.recordResult(x, false);
    s.recordResult(y, true);
    const rows = s.ranking(10);
    // Même nombre de victoires : moins de parties d'abord (Yann 1/1 avant Xavier 1/2).
    expect(rows.map((r) => r.name)).toEqual(['Yann', 'Xavier']);
    expect(rows.find((r) => r.name === 'Zoe')).toBeUndefined();
    s.close();
  });
});

describe('comptes — API HTTP et salon de duel', () => {
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

  const post = (path: string, body: unknown, token = '') =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });

  it('inscription et routes protégées', async () => {
    const r = await post('/api/register', { name: 'Http1', password: 'secret1' });
    expect(r.status).toBe(200);
    const { token } = (await r.json()) as { token: string };
    const me = await fetch(`${BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(((await me.json()) as { name: string }).name).toBe('Http1');
    const noAuth = await fetch(`${BASE}/api/progress`);
    expect(noAuth.status).toBe(401);
    const bad = await post('/api/login', { name: 'Http1', password: 'nope' });
    expect(bad.status).toBe(400);
  });

  it('sauvegarde synchronisée par API', async () => {
    const { token } = (await (await post('/api/login', { name: 'Http1', password: 'secret1' })).json()) as { token: string };
    const put = await fetch(`${BASE}/api/progress`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [SAVE_KEYS[0]]: '["kairo","vera","wolf"]' }),
    });
    expect(put.status).toBe(200);
    const get = await fetch(`${BASE}/api/progress`, { headers: { Authorization: `Bearer ${token}` } });
    expect(((await get.json()) as { data: Record<string, string> }).data[SAVE_KEYS[0]]).toBe('["kairo","vera","wolf"]');
  });

  it('un forfait en duel compte une défaite et une victoire aux bons comptes', async () => {
    const hostTok = ((await (await post('/api/register', { name: 'Hote1', password: 'secret1' })).json()) as { token: string }).token;
    const guestTok = ((await (await post('/api/register', { name: 'Invit1', password: 'secret1' })).json()) as { token: string }).token;
    const client = new Client(`ws://localhost:${PORT}`);
    const host = await client.create('duel', { code: 'ACC01', name: 'Hote1', token: hostTok });
    const guest = await client.join('duel', { code: 'ACC01', name: 'Invit1', token: guestTok });
    await new Promise((r) => setTimeout(r, 150));
    guest.send('ready', { ready: true });
    host.send('ready', { ready: true });
    await new Promise((r) => setTimeout(r, 150));
    host.send('start', {});
    await new Promise((r) => setTimeout(r, 300));
    await host.leave(true);
    await new Promise((r) => setTimeout(r, 300));
    const rows = (await (await fetch(`${BASE}/api/ranking?limit=50`)).json()) as { rows: { name: string; wins: number; games: number }[] };
    expect(rows.rows.find((r) => r.name === 'Invit1')).toEqual({ name: 'Invit1', wins: 1, games: 1 });
    expect(rows.rows.find((r) => r.name === 'Hote1')).toEqual({ name: 'Hote1', wins: 0, games: 1 });
    guest.leave(true);
  }, 15000);
});
