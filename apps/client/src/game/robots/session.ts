import { create } from 'zustand';
import {
  checkChallenge, getChallenge, getCharacter, healBetweenWaves, waveSetup,
} from '@iron/engine';
import { runtime } from '../runtime';
import { backToMenu, useApp } from '../store';
import { useProgress } from '../progress';

export type RobotPhase = 'menu' | 'fight' | 'between' | 'over' | 'challenge';

interface Saved {
  bestWave: number;
  done: string[];
}

const KEY = 'iron-legacy.robots';

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
    return {
      bestWave: typeof data.bestWave === 'number' ? data.bestWave : 0,
      done: Array.isArray(data.done) ? data.done.filter((x): x is string => typeof x === 'string') : [],
    };
  } catch {
    return { bestWave: 0, done: [] };
  }
}

function save(s: Saved): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Stockage indisponible : le record vaut pour la session seulement.
  }
}

export interface RobotState {
  /** Une vague ou un défi est en cours. */
  active: boolean;
  phase: RobotPhase;
  hero: string;
  mode: 'survival' | 'challenge';
  /** Index 0-based de la vague en cours. */
  wave: number;
  /** Vie du héros au début de la vague. */
  playerHealth: number;
  challengeId: string | null;
  result: { passed: boolean; label: string } | null;
  bestWave: number;
  done: string[];
}

const saved = load();

export const useRobots = create<RobotState>(() => ({
  active: false,
  phase: 'menu',
  hero: 'kairo',
  mode: 'survival',
  wave: 0,
  playerHealth: 100,
  challengeId: null,
  result: null,
  bestWave: saved.bestWave,
  done: saved.done,
}));

/** Ouvre le mode robots (écran de choix). */
export function robotsOpen(): void {
  const s = load();
  useRobots.setState({ active: false, phase: 'menu', bestWave: s.bestWave, done: s.done, result: null });
  useApp.setState({ screen: 'robots' });
}

export function robotsSetHero(id: string): void {
  if (useProgress.getState().unlocked.includes(id)) useRobots.setState({ hero: id });
}

/** Lance la vague `wave` contre le robot prévu, avec la vie du héros reportée d'une vague à l'autre. */
function launchWave(): void {
  const st = useRobots.getState();
  const setup = waveSetup(st.wave);
  const robotMax = Math.round(getCharacter(setup.robot).health * setup.healthScale);
  const heroMax = getCharacter(st.hero).health;
  runtime.start({
    p1: st.hero, p2: setup.robot, mode: 'ai', level: setup.level, dummy: 'idle',
    maxHealth: [heroMax, robotMax], health: [st.playerHealth, robotMax],
  });
  useRobots.setState({ active: true, phase: 'fight', mode: 'survival' });
  useApp.setState((s) => ({ screen: 'fight', runId: s.runId + 1 }));
}

/** Vagues : repart de la première vague avec la pleine vie du héros. */
export function robotsSurvivalStart(): void {
  const st = useRobots.getState();
  useRobots.setState({ wave: 0, playerHealth: getCharacter(st.hero).health, result: null, challengeId: null });
  launchWave();
}

/** Passe à la vague suivante après une victoire. */
export function robotsNextWave(): void {
  useRobots.setState((s) => ({ wave: s.wave + 1 }));
  launchWave();
}

/** Lance un défi : un combat contre le robot et le niveau imposés par le défi. */
export function robotsChallengeStart(id: string): void {
  const def = getChallenge(id);
  const st = useRobots.getState();
  runtime.start({ p1: st.hero, p2: def.robot, mode: 'ai', level: def.level, dummy: 'idle' });
  useRobots.setState({ active: true, phase: 'fight', mode: 'challenge', challengeId: id, result: null });
  useApp.setState((s) => ({ screen: 'fight', runId: s.runId + 1 }));
}

/** Retour à l'écran de choix après un défi ou une fin de vagues. */
export function robotsBack(): void {
  useRobots.setState({ active: false, phase: 'menu', result: null });
  useApp.setState({ screen: 'robots' });
}

export function robotsQuit(): void {
  useRobots.setState({ active: false, phase: 'menu' });
  backToMenu();
}

/** Appelée après la fin d'un combat du mode robots : vague suivante, fin des vagues, ou résultat de défi. */
export function robotFightOver(): void {
  const st = useRobots.getState();
  if (!st.active || st.phase !== 'fight' || useApp.getState().screen !== 'fight') return;
  const w = runtime.world;
  if (!w) return;
  const won = w.match.matchWinner === 0;
  const stats = runtime.stats;

  if (st.mode === 'challenge' && st.challengeId) {
    const def = getChallenge(st.challengeId);
    const passed = checkChallenge(def.id, {
      won,
      robotId: def.robot,
      damageTaken: stats.damageTaken,
      secondsLeft: stats.secondsLeft,
      throws: stats.throws,
      blocks: stats.blocks,
      comboMax: stats.comboMax,
    });
    const done = passed && !st.done.includes(def.id) ? [...st.done, def.id] : st.done;
    save({ bestWave: st.bestWave, done });
    useRobots.setState({ active: false, phase: 'challenge', done, result: { passed, label: def.label } });
    useApp.setState({ screen: 'robots' });
    return;
  }

  const bestWave = Math.max(st.bestWave, won ? st.wave + 1 : st.wave);
  save({ bestWave, done: st.done });
  if (!won) {
    useRobots.setState({ active: false, phase: 'over', bestWave });
    useApp.setState({ screen: 'robots' });
    return;
  }
  const heroMax = w.fighters[0]!.maxHealth;
  useRobots.setState({
    active: false,
    phase: 'between',
    bestWave,
    playerHealth: healBetweenWaves(w.fighters[0]!.health, heroMax),
  });
  useApp.setState({ screen: 'robots' });
}

// Accès de test (mode dev uniquement).
if (import.meta.env.DEV) {
  (window as unknown as { __robots: unknown }).__robots = { useRobots, robotFightOver, robotsChallengeStart, robotsSurvivalStart, robotsNextWave };
}
