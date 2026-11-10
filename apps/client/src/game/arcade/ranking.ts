import type { Difficulty } from '@iron/engine';

export interface RankEntry {
  fighter: string;
  difficulty: Difficulty;
  score: number;
  /** Nombre de combats gagnés. */
  stages: number;
  date: string;
}

const KEY = 'iron-legacy.arcade-ranking';
const MAX_ENTRIES = 10;

/**
 * Classement local (localStorage, propre au navigateur). Le classement en ligne viendra avec les comptes (phase 11).
 * Stockage indisponible (navigation privée, quota) : le classement reste vide, sans erreur.
 */
export function loadRanking(): RankEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? (data as RankEntry[]).slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

/** Ajoute un score, garde les MAX_ENTRIES meilleurs, et renvoie le classement à jour. */
export function saveRanking(entry: RankEntry): RankEntry[] {
  const list = [...loadRanking(), entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Stockage indisponible : on garde le classement en mémoire seulement.
  }
  return list;
}
