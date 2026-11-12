import type { World } from './state';

/** Nom de la salle Colyseus d'un duel en ligne (2 places). */
export const ROOM_NAME = 'duel';
/** Nom de la salle à quatre combattants (4 places, dernier debout). */
export const FOUR_ROOM_NAME = 'four';
/** Salle des quatre combattants : nom Colyseus et taille de la place. */
/** Nombre de places par salle. */
export const ROOM_SIZE: Record<string, number> = { [ROOM_NAME]: 2, [FOUR_ROOM_NAME]: 4 };
/** Envoie une empreinte d'état au client toutes les N frames (détection des divergences). */
export const HASH_EVERY = 30;
/** Avance maximale du client sur le serveur confirmé, en ticks (au-delà, le client attend). */
export const MAX_AHEAD = 30;
export const MAX_NAME = 16;

export type Slot = number;

export interface LobbyPlayer {
  name: string;
  hero: string;
  ready: boolean;
  connected: boolean;
  /** Place occupée par un bot (IA gérée par le serveur). */
  bot: boolean;
}

export interface LobbyState {
  code: string;
  phase: 'lobby' | 'fight' | 'result';
  arena: string;
  /** Nombre de places (2 ou 4). */
  size: number;
  /** Une place par slot ; null si libre. */
  players: (LobbyPlayer | null)[];
  /** Vote de revanche par slot. */
  rematch: boolean[];
  /** Mode dernier debout (salle à quatre). */
  ffa: boolean;
  /** Duel : id du vainqueur. Dernier debout : id du vainqueur. */
  winner: number | null;
  /** Mode dernier debout : ids dans l'ordre d'élimination (vainqueur en dernier). */
  placements: number[];
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
  | { type: 'resync' }
  /** Hôte uniquement : ajoute un bot dans la première place libre, ou retire le dernier bot. */
  | { type: 'bot'; add: boolean };

/** Messages envoyés par le serveur. */
export type ServerMessage =
  | { type: 'welcome'; slot: number }
  | { type: 'lobby'; state: LobbyState }
  | { type: 'start'; seq: number; slot: Slot; heroes: string[]; arena: string; ffa: boolean }
  /** Entrées utilisées par le serveur pour simuler le tick `t`, par emplacement. */
  | { type: 'tick'; t: number; inputs: number[] }
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
