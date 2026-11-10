import { getCharacter, type MoveId } from './characters';
import {
  ARENA_RADIUS, INTRO_TICKS, ROUND_SECONDS, START_DISTANCE, TICK_RATE,
} from './constants';
import type { InputFrame } from './input';

export type ActionState =
  | 'idle' | 'walkFwd' | 'walkBack' | 'sideL' | 'sideR' | 'runFwd'
  | 'crouch' | 'crouchBlock' | 'jump' | 'block' | 'dodge' | 'parry'
  | 'attack' | 'throw' | 'hitstun' | 'knockdown' | 'getup' | 'thrown' | 'victory';

export type DodgeSub = 'back' | 'left' | 'right' | null;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Fighter {
  id: number;
  team: number;
  characterId: string;
  /** Position au sol (x,z) et hauteur (y). */
  pos: Vec3;
  /** Vitesse (m/s) : horizontale pour le saut et le recul, verticale pour la gravité. */
  vel: Vec3;
  /** Direction unitaire (x,z) vers la cible. */
  facing: { x: number; z: number };
  action: ActionState;
  actionTicks: number;
  /** Coup en cours (action 'attack' ou 'throw'). */
  move: MoveId | null;
  /** Frame courante (1-based) du coup, de la parade, de l'esquive ou de la projection. */
  moveFrame: number;
  /** Le coup en cours a déjà touché, paré ou bloqué (autorise les annulations). */
  moveHit: boolean;
  sub: DodgeSub;
  /** Frames restantes de hitstun / blockstun / knockdown / getup / thrown. */
  stun: number;
  /** La réaction en cours doit se transformer en knockdown à l'atterrissage. */
  airStun: boolean;
  health: number;
  maxHealth: number;
  /** Nombre de coups consécutifs réussis par ce combattant. */
  combo: number;
  comboTimer: number;
  /** Entrée du tick précédent et entrée courante (bits de Btn). */
  prevInput: InputFrame;
  input: InputFrame;
  /** Derniers ticks où LP / RP ont été pressés (détection de projection). */
  lastLP: number;
  lastRP: number;
  crouched: boolean;
  lastHitBy: number | null;
}

/** Événement visuel/sonore produit par la sim, consommé par le client. */
export interface GameEvent {
  kind: 'hit' | 'block' | 'parry' | 'throw' | 'tech' | 'ko';
  fighter: number;
  x: number;
  y: number;
  z: number;
  damage?: number;
  counter?: boolean;
  combo?: number;
}

export interface MatchState {
  phase: 'intro' | 'fight' | 'ko' | 'over';
  timer: number;
  /** Horloge du round en ticks. */
  clock: number;
  round: number;
  wins: [number, number];
  roundWinner: number | null;
  matchWinner: number | null;
}

export interface World {
  tick: number;
  fighters: Fighter[];
  /** Ticks de figeage restants après un impact (hit-stop). */
  hitstop: number;
  /** État du générateur pseudo-aléatoire déterministe (xorshift32). */
  rng: number;
  events: GameEvent[];
  match: MatchState;
}

export interface DuelOptions {
  p1: string;
  p2: string;
  intro?: boolean;
  distance?: number;
}

const SEED = 0x2f6b9d1;

function makeFighter(id: number, team: number, characterId: string): Fighter {
  const ch = getCharacter(characterId);
  return {
    id,
    team,
    characterId,
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    facing: { x: 1, z: 0 },
    action: 'idle',
    actionTicks: 0,
    move: null,
    moveFrame: 0,
    moveHit: false,
    sub: null,
    stun: 0,
    airStun: false,
    health: ch.health,
    maxHealth: ch.health,
    combo: 0,
    comboTimer: 0,
    prevInput: 0,
    input: 0,
    lastLP: -999,
    lastRP: -999,
    crouched: false,
    lastHitBy: null,
  };
}

export function endMove(f: Fighter): void {
  f.move = null;
  f.moveFrame = 0;
  f.moveHit = false;
  f.sub = null;
}

/** Remet le round à zéro : positions face à face, vie pleine, horloge pleine. */
export function beginRound(w: World, intro: boolean, distance = START_DISTANCE): void {
  const half = Math.min(distance, ARENA_RADIUS * 2) / 2;
  for (const f of w.fighters) {
    const side = f.id === 0 ? -1 : 1;
    f.pos = { x: side * half, y: 0, z: 0 };
    f.vel = { x: 0, y: 0, z: 0 };
    f.facing = { x: -side, z: 0 };
    f.health = f.maxHealth;
    f.action = 'idle';
    f.actionTicks = 0;
    f.stun = 0;
    f.airStun = false;
    f.combo = 0;
    f.comboTimer = 0;
    f.crouched = false;
    endMove(f);
  }
  w.hitstop = 0;
  w.match.phase = intro ? 'intro' : 'fight';
  w.match.timer = INTRO_TICKS;
  w.match.clock = ROUND_SECONDS * TICK_RATE;
  w.match.roundWinner = null;
}

/** Crée un duel (2 combattants) prêt à jouer. */
export function createDuelWorld(opts: DuelOptions): World {
  const w: World = {
    tick: 0,
    fighters: [makeFighter(0, 0, opts.p1), makeFighter(1, 1, opts.p2)],
    hitstop: 0,
    rng: SEED,
    events: [],
    match: {
      phase: 'fight', timer: 0, clock: 0, round: 1, wins: [0, 0], roundWinner: null, matchWinner: null,
    },
  };
  beginRound(w, opts.intro ?? false, opts.distance ?? START_DISTANCE);
  return w;
}

/** Nombre pseudo-aléatoire dans [0,1) ; mute `w.rng` (déterministe). */
export function nextRandom(w: World): number {
  let x = w.rng;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  w.rng = x;
  return (x >>> 0) / 4294967296;
}

/** Copie profonde (snapshots pour rollback / interpolation). */
export function cloneWorld(w: World): World {
  return structuredClone(w);
}
