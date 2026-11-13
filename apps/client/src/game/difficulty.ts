import { AI_MAX_LEVEL } from '@iron/engine';
import { create } from 'zustand';

/** Niveau général des adversaires contrôlés par l'ordinateur (Réglages). */
export type AiDifficulty = 'easy' | 'medium' | 'hard' | 'impossible';

export const DIFFICULTY_LABELS: [AiDifficulty, string][] = [
  ['easy', 'FACILE'], ['medium', 'MOYEN'], ['hard', 'DIFFICILE'], ['impossible', 'IMPOSSIBLE'],
];

const KEY = 'iron-legacy.ai';

function load(): AiDifficulty {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'easy' || v === 'hard' || v === 'impossible' ? v : 'medium';
  } catch {
    return 'medium';
  }
}

export const useDifficulty = create<{ value: AiDifficulty }>(() => ({ value: load() }));

export function setDifficulty(value: AiDifficulty): void {
  useDifficulty.setState({ value });
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Stockage indisponible : réglage valable pour la session.
  }
}

/**
 * Niveau réel d'un combat contre l'ordinateur : le niveau prévu par le mode (arcade, histoire, robots,
 * combat rapide), décalé par le réglage. Impossible = niveau maximal partout.
 */
export function effectiveLevel(base: number, d: AiDifficulty = useDifficulty.getState().value): number {
  if (d === 'impossible') return AI_MAX_LEVEL;
  const offset = d === 'easy' ? -2 : d === 'hard' ? 2 : 0;
  return Math.min(AI_MAX_LEVEL - 1, Math.max(1, base + offset));
}
