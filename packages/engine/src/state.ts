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
  /** Derniers ticks où chaque bouton a été pressé (détection des projections à deux boutons). */
  lastPress: { lp: number; rp: number; lk: number; rk: number };
  /** Identifiant du combattant qui m'a projeté (séquence de projection en cours), sinon null. */
  thrownBy: number | null;
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
  /** Coup à l'origine de l'événement (pour les effets et les sons). */
  move?: string;
}

export interface MatchState {
  /** duel : manches au meilleur des 3. ffa : une seule partie, dernier debout gagne. */
  mode: 'duel' | 'ffa';
  /** Mode ffa : ids des combattants dans l'ordre de leur élimination ; le vainqueur est en dernier. */
  placements: number[];
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
  /** Vie max (défaut : vie du personnage) et vie de départ (défaut : vie max), joueur 1 puis joueur 2. */
  maxHealth?: [number, number];
  health?: [number, number];
}

export interface WorldOptions {
  /** Personnages, dans l'ordre des emplacements (id 0, 1, 2…). */
  heroes: string[];
  intro?: boolean;
  /** Mode dernier debout. */
  ffa?: boolean;
  distance?: number;
  maxHealth?: number[];
  health?: number[];
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
    lastPress: { lp: -999, rp: -999, lk: -999, rk: -999 },
    thrownBy: null,
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

/** Rayon du cercle de départ pour plus de deux combattants (m). */
const CIRCLE_RADIUS = 2.4;

/** Positions de départ : face à face pour un duel, en cercle face au centre sinon. */
export function startPosition(id: number, n: number, distance = START_DISTANCE): { pos: Vec3; facing: { x: number; z: number } } {
  if (n === 2) {
    const half = Math.min(distance, ARENA_RADIUS * 2) / 2;
    const side = id === 0 ? -1 : 1;
    return { pos: { x: side * half, y: 0, z: 0 }, facing: { x: -side, z: 0 } };
  }
  const a = (id / n) * Math.PI * 2 + Math.PI / 4;
  const x = Math.cos(a) * CIRCLE_RADIUS;
  const z = Math.sin(a) * CIRCLE_RADIUS;
  return { pos: { x, y: 0, z }, facing: { x: -Math.cos(a), z: -Math.sin(a) } };
}

/** Remet le round à zéro : positions de départ, vie pleine, horloge pleine. */
export function beginRound(w: World, intro: boolean, distance = START_DISTANCE): void {
  const n = w.fighters.length;
  for (const f of w.fighters) {
    const start = startPosition(f.id, n, distance);
    f.pos = start.pos;
    f.vel = { x: 0, y: 0, z: 0 };
    f.facing = start.facing;
    f.health = f.maxHealth;
    f.action = 'idle';
    f.actionTicks = 0;
    f.stun = 0;
    f.airStun = false;
    f.combo = 0;
    f.comboTimer = 0;
    f.crouched = false;
    f.thrownBy = null;
    endMove(f);
  }
  w.hitstop = 0;
  w.match.phase = intro ? 'intro' : 'fight';
  w.match.timer = INTRO_TICKS;
  w.match.clock = ROUND_SECONDS * TICK_RATE;
  w.match.roundWinner = null;
  w.match.placements = [];
}

/** Crée un combat à N combattants (duel par défaut, dernier debout en mode ffa). */
export function createWorld(opts: WorldOptions): World {
  if (opts.heroes.length < 2) throw new Error('Un combat demande au moins deux combattants.');
  const w: World = {
    tick: 0,
    fighters: opts.heroes.map((h, i) => makeFighter(i, i, h)),
    hitstop: 0,
    rng: SEED,
    events: [],
    match: {
      mode: opts.ffa ? 'ffa' : 'duel',
      placements: [],
      phase: 'fight', timer: 0, clock: 0, round: 1, wins: [0, 0], roundWinner: null, matchWinner: null,
    },
  };
  beginRound(w, opts.intro ?? false, opts.distance ?? START_DISTANCE);
  for (const [i, max] of (opts.maxHealth ?? []).entries()) {
    const f = w.fighters[i]!;
    f.maxHealth = Math.max(1, max);
    f.health = f.maxHealth;
  }
  for (const [i, hp] of (opts.health ?? []).entries()) {
    const f = w.fighters[i]!;
    f.health = Math.min(f.maxHealth, Math.max(0, hp));
  }
  return w;
}

/** Crée un duel (2 combattants) prêt à jouer. */
export function createDuelWorld(opts: DuelOptions): World {
  return createWorld({
    heroes: [opts.p1, opts.p2],
    intro: opts.intro,
    distance: opts.distance,
    maxHealth: opts.maxHealth,
    health: opts.health,
  });
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
