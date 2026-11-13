import type { World } from './state';

/** Nom de la salle Colyseus d'un duel en ligne (2 places). */
export const ROOM_NAME = 'duel';
/** Nom de la salle à quatre combattants (4 places, dernier debout). */
export const FOUR_ROOM_NAME = 'four';
/** Salle 2v2 : quatre places, équipes par parité de place (0 et 2 contre 1 et 3). */
export const TEAM_ROOM_NAME = 'team';
/** Salle unique du client : quatre places, l'hôte choisit le mode (duel, dernier debout à 3 ou 4, 2v2). */
export const FIGHT_ROOM_NAME = 'fight';

/** Mode de jeu d'un salon. */
export type RoomMode = 'duel' | 'ffa' | 'team';
export const ROOM_MODES: readonly RoomMode[] = ['duel', 'ffa', 'team'];
/** Nombre de combattants accepté par mode (places occupées au lancement). */
export const MODE_PLAYERS: Record<RoomMode, readonly number[]> = { duel: [2], ffa: [3, 4], team: [4] };
/** Salle des quatre combattants : nom Colyseus et taille de la place. */
/** Nombre de places par salle. */
export const ROOM_SIZE: Record<string, number> = { [ROOM_NAME]: 4, [FOUR_ROOM_NAME]: 4, [TEAM_ROOM_NAME]: 4, [FIGHT_ROOM_NAME]: 4 };
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
  /** Nombre de places (4). */
  size: number;
  /** Mode choisi par l'hôte. */
  mode: RoomMode;
  /** Une place par slot ; null si libre. */
  players: (LobbyPlayer | null)[];
  /** Vote de revanche par slot. */
  rematch: boolean[];
  /** Mode dernier debout. */
  ffa: boolean;
  /** Mode équipes 2v2. */
  team: boolean;
  /** Mode équipes : équipe gagnante (null si égalité au temps). */
  winnerTeam: number | null;
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
  | { type: 'bot'; add: boolean }
  /** Hôte uniquement : change le mode de jeu (dans le salon). */
  | { type: 'mode'; mode: RoomMode }
  /** Hôte uniquement, après un combat : retour au salon (changer de mode, de combattants…). */
  | { type: 'lobby' };

/** Messages envoyés par le serveur. */
export type ServerMessage =
  | { type: 'welcome'; slot: number }
  | { type: 'lobby'; state: LobbyState }
  | { type: 'start'; seq: number; slot: Slot; heroes: string[]; arena: string; ffa: boolean; team: boolean }
  /** Entrées utilisées par le serveur pour simuler le tick `t`, par emplacement. */
  | { type: 'tick'; t: number; inputs: number[] }
  /** Empreinte de l'état après le tick `t`. */
  | { type: 'hash'; t: number; h: string }
  | { type: 'snapshot'; world: World }
  | { type: 'result'; winner: number | null; winnerTeam: number | null }
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
