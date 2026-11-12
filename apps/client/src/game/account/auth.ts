import { create } from 'zustand';

/** Adresse HTTP du serveur (même hôte que le temps réel : ws:// → http://). */
const API: string = (((import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'ws://localhost:2567')).replace(/^ws/, 'http');

import { savedToken } from './token';

const TOKEN_KEY = 'iron-legacy.token';
const NAME_KEY = 'iron-legacy.account';
/** Clés de la sauvegarde : exactement celles acceptées par le serveur (apps/server/src/accounts.ts). */
const SAVE_KEYS = ['iron-legacy.unlocked', 'iron-legacy.robots', 'iron-legacy.story', 'iron-legacy.arcade-ranking'] as const;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible : la session vaut pour l'onglet seulement.
  }
}

export interface AccountState {
  name: string | null;
  busy: boolean;
  error: string | null;
  status: string | null;
}

export const useAccount = create<AccountState>(() => ({
  name: read(NAME_KEY),
  busy: false,
  error: null,
  status: null,
}));

function token(): string | null {
  return savedToken() || null;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (res.status === 401 && t) signedOut();
  if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
  return data;
}

function signedIn(name: string, tok: string): void {
  write(TOKEN_KEY, tok);
  write(NAME_KEY, name);
  useAccount.setState({ name, error: null });
}

function signedOut(): void {
  write(TOKEN_KEY, null);
  write(NAME_KEY, null);
  useAccount.setState({ name: null });
}

/** Crée un compte et ouvre la session. Pousse la sauvegarde locale vers le serveur. */
export async function register(name: string, password: string): Promise<void> {
  await run(async () => {
    const r = await call<{ token: string; name: string }>('POST', '/api/register', { name, password });
    signedIn(r.name, r.token);
    await pushProgress();
  });
}

/** Ouvre une session. Récupère la sauvegarde du compte et recharge la page pour l'appliquer. */
export async function login(name: string, password: string): Promise<void> {
  await run(async () => {
    const r = await call<{ token: string; name: string }>('POST', '/api/login', { name, password });
    signedIn(r.name, r.token);
    await pullProgress();
    window.location.reload();
  });
}

export async function logout(): Promise<void> {
  await run(async () => {
    if (token()) await call('POST', '/api/logout').catch(() => undefined);
    signedOut();
    useAccount.setState({ status: 'Déconnecté.' });
  });
}

/** Envoie la sauvegarde locale au serveur. Sans effet hors connexion. Les erreurs ne bloquent pas le jeu. */
export async function pushProgress(): Promise<void> {
  if (!token()) return;
  const data: Record<string, string> = {};
  for (const key of SAVE_KEYS) {
    const v = read(key);
    if (v !== null) data[key] = v;
  }
  try {
    await call('PUT', '/api/progress', data);
    useAccount.setState({ status: 'Sauvegarde envoyée.' });
  } catch {
    useAccount.setState({ status: 'Sauvegarde non envoyée (serveur injoignable).' });
  }
}

/** Remplace la sauvegarde locale par celle du serveur. */
async function pullProgress(): Promise<void> {
  const r = await call<{ data: Record<string, string> }>('GET', '/api/progress');
  for (const key of SAVE_KEYS) {
    const v = r.data[key];
    if (typeof v === 'string') write(key, v);
  }
}

/** Sauvegarde automatique : à chaque retour au menu, si connecté. */
export function autoSave(): void {
  void pushProgress();
}

export async function fetchRanking(): Promise<{ name: string; wins: number; games: number }[]> {
  const r = await call<{ rows: { name: string; wins: number; games: number }[] }>('GET', '/api/ranking?limit=20');
  return r.rows;
}

async function run(job: () => Promise<void>): Promise<void> {
  useAccount.setState({ busy: true, error: null, status: null });
  try {
    await job();
  } catch (e) {
    useAccount.setState({ error: e instanceof Error ? e.message : 'Erreur.' });
  } finally {
    useAccount.setState({ busy: false });
  }
}
