import { autoSave } from './account/auth';
import { create } from 'zustand';
import type { ActionState, MatchState, MoveId } from '@iron/engine';
import { runtime, type DummyMode, type MatchConfig } from './runtime';

/** État d'interface, rafraîchi ~10 Hz depuis la sim. La sim elle-même reste dans `runtime`. */
export interface HudState {
  fps: number;
  tick: number;
  names: [string, string];
  health: [number, number];
  maxHealth: [number, number];
  actions: [ActionState, ActionState];
  moves: [MoveId | null, MoveId | null];
  moveFrames: [number, number];
  combo: [number, number];
  distance: number;
  phase: MatchState['phase'];
  clock: number;
  round: number;
  wins: [number, number];
  roundWinner: number | null;
  matchWinner: number | null;
  dummy: DummyMode;
  mode: MatchConfig['mode'];
  infinite: boolean;
  /** Dernier impact, pour l'affichage des dégâts (stamp = changement à chaque coup). */
  lastHit: { damage: number; counter: boolean; combo: number; stamp: number } | null;
  /** Tous les combattants (utile à partir de trois). */
  roster: { name: string; hp: number; max: number; alive: boolean }[];
  /** Mode dernier debout. */
  ffa: boolean;
  /** Mode équipes 2v2. */
  team: boolean;
}

export const useHud = create<HudState>(() => ({
  fps: 0,
  tick: 0,
  names: ['', ''],
  health: [100, 100],
  maxHealth: [100, 100],
  actions: ['idle', 'idle'],
  moves: [null, null],
  moveFrames: [0, 0],
  combo: [0, 0],
  distance: 0,
  phase: 'intro',
  clock: 99,
  round: 1,
  wins: [0, 0],
  roundWinner: null,
  matchWinner: null,
  dummy: 'idle',
  mode: 'training',
  infinite: false,
  lastHit: null,
  roster: [],
  ffa: false,
  team: false,
}));

export type Screen = 'menu' | 'select' | 'vs' | 'fight' | 'arcade' | 'story' | 'robots' | 'online' | 'account';

export interface AppState {
  screen: Screen;
  config: MatchConfig;
  /** Incrémenté à chaque combat : remonte la scène 3D proprement. */
  runId: number;
  /** Écran VS affiché avant le combat (personnages, légende). */
  vs: { p1: string; p2: string; sub: string } | null;
}

export const useApp = create<AppState>(() => ({
  screen: 'menu',
  config: { p1: 'kairo', p2: 'vera', mode: 'ai', level: 2, dummy: 'idle' },
  runId: 0,
  vs: null,
}));

/** Lance un combat avec la configuration choisie dans le menu. */
export function startFight(): void {
  runtime.start(useApp.getState().config);
  toFight();
}

/** Passe par l'écran VS (le combat est déjà préparé dans `runtime`), puis `enterFight`. */
export function toFight(sub = ''): void {
  const c = runtime.config;
  useApp.setState({ screen: 'vs', vs: { p1: c.p1, p2: c.p2, sub } });
}

/** Fin de l'écran VS : monte la scène de combat. */
export function enterFight(): void {
  if (useApp.getState().screen !== 'vs') return;
  useApp.setState((s) => ({ screen: 'fight', runId: s.runId + 1 }));
}

export function backToMenu(): void {
  autoSave();
  useApp.setState({ screen: 'menu' });
}
