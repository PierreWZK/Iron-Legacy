import { aiInput, Btn, cloneWorld, createDuelWorld, DT, stepWorld, TICK_RATE, type GameEvent, type World } from '@iron/engine';
import type { Axis, KeyboardInput } from './input/keyboard';

export type DummyMode = 'idle' | 'block' | 'attack' | 'patrol';
export type Mode = 'training' | 'ai';

/** Statistiques d'un combat, lues par les défis du mode robots. */
export interface MatchStats {
  damageTaken: number;
  secondsLeft: number;
  throws: number;
  blocks: number;
  comboMax: number;
}

export const emptyStats = (): MatchStats => ({ damageTaken: 0, secondsLeft: 0, throws: 0, blocks: 0, comboMax: 0 });

export interface MatchConfig {
  p1: string;
  p2: string;
  mode: Mode;
  /** Niveau de l'IA (1 à 5). */
  level: number;
  /** Comportement du mannequin en entraînement. */
  dummy: DummyMode;
  /** Vie max et vie de départ, joueur 1 puis joueur 2 (mode robots). */
  maxHealth?: [number, number];
  health?: [number, number];
}

export const DUMMY_MODES: readonly DummyMode[] = ['idle', 'block', 'attack', 'patrol'];

const MAX_STEPS_PER_FRAME = 5;
const PATROL = [Btn.Fwd, Btn.SideR, Btn.Back, Btn.SideL] as const;

/** Axe P1 → P2 (repli sur X si superposés). La droite de l'écran suit cet axe. */
export function fightAxis(w: World): Axis {
  const a = w.fighters[0]!.pos;
  const b = w.fighters[1]!.pos;
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  return d > 1e-4 ? { x: (b.x - a.x) / d, z: (b.z - a.z) / d } : { x: 1, z: 0 };
}

/** Entrées du mannequin d'entraînement (déterministes, selon le tick). */
export function dummyInput(mode: DummyMode, tick: number): number {
  switch (mode) {
    case 'block':
      return Btn.Back;
    case 'attack':
      return tick % 90 === 0 ? Btn.LP : 0;
    case 'patrol':
      return PATROL[Math.floor(tick / 50) % PATROL.length]!;
    default:
      return 0;
  }
}

/**
 * Boucle à pas fixe : accumule le temps réel, avance la sim par ticks de 1/60 s,
 * garde l'état précédent pour interpoler le rendu. Ne rend rien : seulement l'état.
 */
export class Runtime {
  world: World | null = null;
  prev: World | null = null;
  /** Position dans le tick courant (0..1), pour l'interpolation du rendu. */
  alpha = 0;
  /** Intensité de secousse caméra, décroît avec le temps. */
  shake = 0;
  /** Vie infinie (entraînement uniquement). */
  infinite = false;
  /** Vie la plus basse atteinte par le joueur pendant le combat (détecte les combats parfaits). */
  playerMin = 100;
  config: MatchConfig = { p1: 'kairo', p2: 'vera', mode: 'training', level: 2, dummy: 'idle' };
  /** Statistiques du combat en cours. */
  stats: MatchStats = emptyStats();
  private lastHp = 100;
  private acc = 0;
  private queue: GameEvent[] = [];

  start(cfg: MatchConfig): void {
    this.config = { ...cfg };
    this.world = createDuelWorld({
      p1: cfg.p1, p2: cfg.p2, intro: true, maxHealth: cfg.maxHealth, health: cfg.health,
    });
    this.stats = emptyStats();
    this.lastHp = this.world.fighters[0]!.health;
    this.prev = cloneWorld(this.world);
    this.acc = 0;
    this.alpha = 0;
    this.shake = 0;
    this.queue = [];
    this.playerMin = this.world.fighters[0]!.maxHealth;
  }

  cycleDummy(): void {
    const i = DUMMY_MODES.indexOf(this.config.dummy);
    this.config.dummy = DUMMY_MODES[(i + 1) % DUMMY_MODES.length]!;
  }

  advance(delta: number, kb: KeyboardInput): void {
    const w = this.world;
    if (!w) return;
    if (this.config.mode === 'training') {
      if (kb.consume('t')) this.cycleDummy();
      if (kb.consume('i')) this.infinite = !this.infinite;
    }
    if (kb.consume('enter')) this.start(this.config);

    this.acc += Math.min(delta, 0.25);
    let steps = 0;
    while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME) {
      this.prev = cloneWorld(w);
      const p1 = kb.sample(w.fighters[0]!, fightAxis(w));
      const p2 = this.config.mode === 'ai'
        ? aiInput(w, w.fighters[1]!, w.fighters[0]!, this.config.level)
        : dummyInput(this.config.dummy, w.tick);
      stepWorld(w, [p1, p2]);
      if (this.infinite && this.config.mode === 'training') {
        for (const f of w.fighters) f.health = f.maxHealth;
      }
      this.playerMin = Math.min(this.playerMin, w.fighters[0]!.health);
      const hp = w.fighters[0]!.health;
      if (hp < this.lastHp) this.stats.damageTaken += this.lastHp - hp;
      this.lastHp = hp;
      this.stats.secondsLeft = w.match.clock / TICK_RATE;
      this.stats.comboMax = Math.max(this.stats.comboMax, w.fighters[0]!.combo);
      for (const e of w.events) {
        if (e.kind === 'block' && e.fighter === 0) this.stats.blocks += 1;
        if (e.kind === 'throw' && e.fighter === 1) this.stats.throws += 1;
        this.queue.push(e);
        if (e.kind === 'hit' || e.kind === 'throw') {
          this.shake = Math.max(this.shake, Math.min(1, (e.damage ?? 8) / 12));
        }
      }
      this.acc -= DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    this.alpha = this.acc / DT;
    this.shake *= Math.exp(-delta * 9);
  }

  /** Événements d'impact depuis le dernier appel (consommés une seule fois par le rendu). */
  drainEvents(): GameEvent[] {
    const q = this.queue;
    this.queue = [];
    return q;
  }
}

export const runtime = new Runtime();
