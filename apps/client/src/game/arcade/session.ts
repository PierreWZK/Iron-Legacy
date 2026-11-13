import { create } from 'zustand';
import {
  aiLevelFor, ARCADE_STAGES, getCharacter, scoreFight, TICK_RATE, type Difficulty,
} from '@iron/engine';
import { runtime } from '../runtime';
import { backToMenu, toFight, useApp } from '../store';
import { loadRanking, saveRanking, type RankEntry } from './ranking';

export type ArcadePhase = 'select' | 'fight' | 'between' | 'lost' | 'ending';

export interface StageResult {
  stage: number;
  opponent: string;
  score: number;
  won: boolean;
}

export interface ArcadeState {
  /** Une partie d'arcade est en cours (un combat est lancé ou va l'être). */
  active: boolean;
  phase: ArcadePhase;
  fighter: string;
  difficulty: Difficulty;
  /** Index 0-based de l'étape en cours dans ARCADE_STAGES. */
  stage: number;
  total: number;
  results: StageResult[];
  ranking: RankEntry[];
}

export const useArcade = create<ArcadeState>(() => ({
  active: false,
  phase: 'select',
  fighter: 'kairo',
  difficulty: 'normal',
  stage: 0,
  total: 0,
  results: [],
  ranking: loadRanking(),
}));

/** Ouvre l'écran de sélection de l'arcade. */
export function arcadeOpen(): void {
  useArcade.setState({ active: false, phase: 'select', stage: 0, total: 0, results: [], ranking: loadRanking() });
  useApp.setState({ screen: 'arcade' });
}

export function arcadeSetChoice(p: Partial<Pick<ArcadeState, 'fighter' | 'difficulty'>>): void {
  useArcade.setState(p);
}

/** Lance l'étape courante contre son adversaire, avec le niveau de la difficulté choisie. */
function launchStage(): void {
  const { fighter, difficulty, stage } = useArcade.getState();
  const s = ARCADE_STAGES[stage]!;
  runtime.start({ p1: fighter, p2: s.opponent, mode: 'ai', level: aiLevelFor(stage, difficulty), dummy: 'idle' });
  useArcade.setState({ active: true, phase: 'fight' });
  toFight('ARCADE');
}

/** Démarre une nouvelle partie d'arcade à la première étape. */
export function arcadeStart(): void {
  useArcade.setState({ stage: 0, total: 0, results: [] });
  launchStage();
}

/** Passe à l'étape suivante (déjà incrémentée dans `arcadeFightOver`). */
export function arcadeNext(): void {
  launchStage();
}

export function arcadeRetry(): void {
  arcadeStart();
}

/** Abandonne la partie et revient au menu principal. */
export function arcadeQuit(): void {
  useArcade.setState({ active: false, phase: 'select' });
  backToMenu();
}

/**
 * Appelée quelques secondes après la fin d'un combat d'arcade.
 * Calcule le score, puis passe à l'étape suivante, à la défaite ou à la fin du boss.
 */
export function arcadeFightOver(): void {
  const st = useArcade.getState();
  if (!st.active || st.phase !== 'fight' || useApp.getState().screen !== 'fight') return;
  const w = runtime.world;
  if (!w) return;

  const p = w.fighters[0]!;
  const stage = st.stage;
  const opponent = ARCADE_STAGES[stage]!.opponent;
  const won = w.match.matchWinner === 0;
  const score = won
    ? scoreFight({
      stage: stage + 1,
      difficulty: st.difficulty,
      healthRatio: p.health / p.maxHealth,
      secondsLeft: w.match.clock / TICK_RATE,
      perfect: runtime.playerMin >= p.maxHealth,
    })
    : 0;
  const results = [...st.results, { stage: stage + 1, opponent: getCharacter(opponent).name, score, won }];
  const total = st.total + score;

  if (won && stage + 1 < ARCADE_STAGES.length) {
    useArcade.setState({ stage: stage + 1, total, results, phase: 'between' });
    useApp.setState({ screen: 'arcade' });
    return;
  }

  const ranking = saveRanking({
    fighter: st.fighter,
    difficulty: st.difficulty,
    score: total,
    stages: results.filter((r) => r.won).length,
    date: new Date().toISOString().slice(0, 10),
  });
  useArcade.setState({ total, results, phase: won ? 'ending' : 'lost', ranking, active: false });
  useApp.setState({ screen: 'arcade' });
}
