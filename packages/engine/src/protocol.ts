import type { World } from './state';

/** Nom de la salle Colyseus d'un duel en ligne. */
export const ROOM_NAME = 'duel';
/** Envoie une empreinte d'état au client toutes les N frames (détection des divergences). */
export const HASH_EVERY = 30;
/** Avance maximale du client sur le serveur confirmé, en ticks (au-delà, le client attend). */
export const MAX_AHEAD = 30;
export const MAX_NAME = 16;

export type Slot = 0 | 1;

export interface LobbyPlayer {
  name: string;
  hero: string;
  ready: boolean;
  connected: boolean;
}

export interface LobbyState {
  code: string;
  phase: 'lobby' | 'fight' | 'result';
  arena: string;
  /** Une place par slot ; null si libre. */
  players: [LobbyPlayer | null, LobbyPlayer | null];
  /** Vote de revanche par slot. */
  rematch: [boolean, boolean];
  winner: number | null;
}

/** Messages envoyés par le client. */
export type ClientMessage =
  | { type: 'hero'; hero: string }
  | { type: 'ready'; ready: boolean }
  | { type: 'arena'; arena: string }
  | { type: 'start' }
  | { type: 'input'; t: number; i: number }
  | { type: 'ping'; ts: number }
  | { type: 'rematch' }
  | { type: 'resync' };

/** Messages envoyés par le serveur. */
export type ServerMessage =
  | { type: 'lobby'; state: LobbyState }
  | { type: 'start'; seq: number; slot: Slot; heroes: [string, string]; arena: string }
  /** Entrées utilisées par le serveur pour simuler le tick `t`. */
  | { type: 'tick'; t: number; inputs: [number, number] }
  /** Empreinte de l'état après le tick `t`. */
  | { type: 'hash'; t: number; h: string }
  | { type: 'snapshot'; world: World }
  | { type: 'result'; winner: number | null }
  | { type: 'pong'; ts: number }
  | { type: 'error'; message: string };

/** Nom affiché : texte découpé, sans espaces superflus, valeur par défaut si vide. */
export function cleanName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim().slice(0, MAX_NAME) : '';
  return s.length > 0 ? s : 'Joueur';
}

/** Code de salon : 5 caractères majuscules, sans caractères ambigus (0, O, 1, I). */
export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function isRoomCode(s: unknown): s is string {
  return typeof s === 'string' && /^[A-Z2-9]{5}$/.test(s);
}
