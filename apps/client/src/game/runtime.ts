import { effectiveLevel } from './difficulty';
import {
  aiInput, Btn, cloneWorld, createDuelWorld, createWorld, DT, MAX_AHEAD, Rollback, stepWorld, TICK_RATE, type GameEvent, type World,
} from '@iron/engine';
import type { Axis, KeyboardInput } from './input/keyboard';

export type DummyMode = 'idle' | 'block' | 'attack' | 'patrol';
export type Mode = 'training' | 'ai' | 'online';

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
  /** Décor forcé (mode en ligne) ; sinon celui du personnage adverse. */
  arena?: string;
}

export const DUMMY_MODES: readonly DummyMode[] = ['idle', 'block', 'attack', 'patrol'];

const MAX_STEPS_PER_FRAME = 5;
const PATROL = [Btn.Fwd, Btn.SideR, Btn.Back, Btn.SideL] as const;

/**
 * Axe de l'écran : la droite de l'écran est toujours +X, la caméra ne tourne jamais. Les combattants
 * se font face où qu'ils soient : en tournant autour de l'adversaire (pas de côté), on peut passer
 * derrière lui et se retrouver à droite de l'écran. Les touches sont lues sur l'écran, puis projetées sur
 * l'avant du combattant (voir `KeyboardInput.sample`).
 */
export const VIEW_AXIS: Axis = { x: 1, z: 0 };

export function fightAxis(_w: World): Axis {
  return VIEW_AXIS;
}

/** Même axe fixe pour tous les joueurs, en ligne aussi : la droite de l'écran reste la droite. */
export function axisFor(_w: World, _self: number): Axis {
  return VIEW_AXIS;
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
  /** Netcode en ligne (null hors ligne). */
  online: Rollback | null = null;
  /** Personnages de chaque emplacement (2 en duel, 4 en dernier debout). */
  heroes: string[] = ['kairo', 'vera'];
  /** Envoie l'entrée locale au serveur pour le tick donné. */
  private sendInput: ((t: number, bits: number) => void) | null = null;
  /** Tick le plus avancé confirmé par le serveur (+1). */
  private serverTick = 0;
  private queue: GameEvent[] = [];

  start(cfg: MatchConfig): void {
    this.config = { ...cfg, level: cfg.mode === 'ai' ? effectiveLevel(cfg.level) : cfg.level };
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

  /** Démarre un duel en ligne : le monde est simulé localement avec rollback, l'autorité est le serveur. */
  startOnline(opts: { slot: number; heroes: string[]; arena: string; ffa: boolean; team: boolean; sendInput: (t: number, bits: number) => void }): void {
    this.heroes = [...opts.heroes];
    this.config = { p1: opts.heroes[0]!, p2: opts.heroes[1]!, mode: 'online', level: 0, dummy: 'idle', arena: opts.arena };
    const world = createWorld({ heroes: opts.heroes, intro: true, ffa: opts.ffa, team: opts.team });
    this.online = new Rollback(opts.slot, world);
    this.sendInput = opts.sendInput;
    this.serverTick = 0;
    this.world = this.online.world;
    this.prev = cloneWorld(this.world);
    this.acc = 0;
    this.alpha = 0;
    this.shake = 0;
    this.queue = [];
    this.stats = emptyStats();
    this.lastHp = this.world.fighters[opts.slot]!.health;
    this.playerMin = this.world.fighters[opts.slot]!.maxHealth;
  }

  /** Entrées réelles du tick t, reçues du serveur. */
  onlineTick(t: number, inputs: number[]): void {
    if (!this.online) return;
    this.serverTick = Math.max(this.serverTick, t + 1);
    this.online.confirm(t, inputs);
    this.world = this.online.world;
  }

  /** État de référence reçu du serveur (après une divergence). */
  onlineSnapshot(world: World): void {
    if (!this.online) return;
    this.online.resync(world);
    this.world = this.online.world;
  }

  /** Vérifie l'empreinte serveur du tick t (reportée si le tick n'est pas encore atteint). */
  onlineVerify(t: number, h: string): void {
    this.online?.verify(t, h);
  }

  /** Divergences détectées depuis le dernier appel ; vidées au passage. */
  takeDivergences(): number {
    const n = this.online?.divergences.length ?? 0;
    if (this.online) this.online.divergences = [];
    return n;
  }

  private advanceOnline(delta: number, kb: KeyboardInput): void {
    const rb = this.online!;
    this.acc += Math.min(delta, 0.25);
    let steps = 0;
    while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME) {
      // Trop d'avance sur le serveur : on attend ses confirmations (évite des corrections massives).
      if (rb.tick - this.serverTick > MAX_AHEAD) {
        this.acc = 0;
        break;
      }
      const bits = kb.sample(rb.world.fighters[rb.localIndex]!, axisFor(rb.world, rb.localIndex));
      this.sendInput?.(rb.tick, bits);
      this.prev = cloneWorld(rb.world);
      rb.step(bits);
      this.world = rb.world;
      const me = rb.world.fighters[rb.localIndex]!;
      const hp = me.health;
      if (hp < this.lastHp) this.stats.damageTaken += this.lastHp - hp;
      this.lastHp = hp;
      this.playerMin = Math.min(this.playerMin, hp);
      this.stats.secondsLeft = rb.world.match.clock / TICK_RATE;
      this.stats.comboMax = Math.max(this.stats.comboMax, me.combo);
      for (const e of rb.world.events) {
        this.queue.push(e);
        if (e.kind === 'hit' || e.kind === 'throw') this.shake = Math.max(this.shake, Math.min(1, (e.damage ?? 8) / 12));
      }
      this.acc -= DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    this.alpha = this.acc / DT;
    this.shake *= Math.exp(-delta * 9);
  }

  /** Combat hors ligne en pause (menu Échap). Sans effet en ligne : le serveur ne s'arrête pas. */
  paused = false;

  advance(delta: number, kb: KeyboardInput): void {
    if (this.paused && !this.online) {
      kb.discard();
      return;
    }
    if (this.online) {
      this.advanceOnline(delta, kb);
      return;
    }
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
