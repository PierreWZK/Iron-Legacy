import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

/** Clés de sauvegarde acceptées (les clés du stockage local du client). Toute autre clé est ignorée. */
export const SAVE_KEYS = [
  'iron-legacy.unlocked',
  'iron-legacy.robots',
  'iron-legacy.story',
  'iron-legacy.arcade-ranking',
] as const;
const MAX_SAVE_VALUE = 20_000;
const NAME_RE = /^[A-Za-z0-9_-]{3,16}$/;

export interface Account {
  id: number;
  name: string;
}

export interface RankingRow {
  name: string;
  wins: number;
  games: number;
}

/** Comptes, jetons de session, sauvegardes et classement, dans une base SQLite (node:sqlite). */
export class AccountStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      create table if not exists users (
        id integer primary key autoincrement,
        name text not null unique collate nocase,
        salt text not null,
        hash text not null
      );
      create table if not exists tokens (
        token text primary key,
        user_id integer not null,
        created integer not null
      );
      create table if not exists saves (
        user_id integer primary key,
        data text not null
      );
      create table if not exists stats (
        user_id integer primary key,
        wins integer not null default 0,
        games integer not null default 0
      );
    `);
  }

  /** Crée un compte et ouvre une session. Erreur lisible si le nom est pris ou invalide. */
  register(name: string, password: string): { token: string; account: Account } {
    if (!NAME_RE.test(name)) throw new AccountError('Pseudo : 3 à 16 caractères (lettres, chiffres, _ et -).');
    if (password.length < 6 || password.length > 128) throw new AccountError('Mot de passe : 6 à 128 caractères.');
    if (this.db.prepare('select 1 from users where name = ?').get(name)) throw new AccountError('Ce pseudo est déjà pris.');
    const salt = randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const row = this.db.prepare('insert into users (name, salt, hash) values (?, ?, ?) returning id').get(name, salt, hash) as { id: number };
    this.db.prepare('insert into stats (user_id) values (?)').run(row.id);
    return { token: this.session(row.id), account: { id: row.id, name } };
  }

  /** Vérifie le mot de passe et ouvre une session. Même message pour pseudo inconnu et mot de passe faux. */
  login(name: string, password: string): { token: string; account: Account } {
    const row = this.db.prepare('select id, name, salt, hash from users where name = ?').get(name) as
      | { id: number; name: string; salt: string; hash: string }
      | undefined;
    const ok = row !== undefined && safeEqualHex(hashPassword(password, row.salt), row.hash);
    if (!row || !ok) throw new AccountError('Pseudo ou mot de passe incorrect.');
    return { token: this.session(row.id), account: { id: row.id, name: row.name } };
  }

  /** Compte lié à un jeton, ou null. */
  account(token: string): Account | null {
    if (!token) return null;
    const row = this.db.prepare(`
      select users.id, users.name from tokens join users on users.id = tokens.user_id where tokens.token = ?
    `).get(token) as { id: number; name: string } | undefined;
    return row ? { id: row.id, name: row.name } : null;
  }

  logout(token: string): void {
    this.db.prepare('delete from tokens where token = ?').run(token);
  }

  /** Sauvegarde : seules les clés connues, valeurs texte bornées. */
  saveProgress(userId: number, data: unknown): void {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new AccountError('Sauvegarde invalide.');
    const clean: Record<string, string> = {};
    for (const key of SAVE_KEYS) {
      const v = (data as Record<string, unknown>)[key];
      if (typeof v === 'string' && v.length <= MAX_SAVE_VALUE) clean[key] = v;
    }
    this.db.prepare('insert into saves (user_id, data) values (?, ?) on conflict(user_id) do update set data = excluded.data')
      .run(userId, JSON.stringify(clean));
  }

  loadProgress(userId: number): Record<string, string> {
    const row = this.db.prepare('select data from saves where user_id = ?').get(userId) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Record<string, string>) : {};
  }

  /** Une partie en ligne terminée : victoire ou défaite pour ce compte. */
  recordResult(userId: number, won: boolean): void {
    this.db.prepare('update stats set games = games + 1, wins = wins + ? where user_id = ?').run(won ? 1 : 0, userId);
  }

  /** Classement par victoires, puis par parties jouées (moins de parties = mieux à égalité de victoires). */
  ranking(limit: number): RankingRow[] {
    const n = Math.min(100, Math.max(1, Math.floor(limit)));
    return this.db.prepare(`
      select users.name, stats.wins, stats.games from stats join users on users.id = stats.user_id
      where stats.games > 0 order by stats.wins desc, stats.games asc, users.name asc limit ?
    `).all(n) as unknown as RankingRow[];
  }

  close(): void {
    this.db.close();
  }

  private session(userId: number): string {
    const token = randomUUID() + randomBytes(16).toString('hex');
    this.db.prepare('insert into tokens (token, user_id, created) values (?, ?, ?)').run(token, userId, Date.now());
    return token;
  }
}

export class AccountError extends Error {}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Store partagé par le serveur HTTP et les salons de combat. */
let current: AccountStore | null = null;
export function setAccountStore(store: AccountStore | null): void {
  current = store;
}
export function accountStore(): AccountStore | null {
  return current;
}
