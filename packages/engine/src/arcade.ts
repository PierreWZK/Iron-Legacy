/** Mode arcade : échelle de combats, difficulté et calcul du score. Données pures, sans rendu. */

export interface ArcadeStage {
  /** Identifiant du personnage adverse (voir ROSTER). */
  opponent: string;
  /** Niveau de base de l'IA pour cette étape (1 à 7). */
  level: number;
  boss: boolean;
}

/** 8 combats puis le boss final. */
export const ARCADE_STAGES: readonly ArcadeStage[] = [
  { opponent: 'wolf', level: 1, boss: false },
  { opponent: 'fox', level: 2, boss: false },
  { opponent: 'bull', level: 2, boss: false },
  { opponent: 'stag', level: 3, boss: false },
  { opponent: 'husky', level: 3, boss: false },
  { opponent: 'robot', level: 4, boss: false },
  { opponent: 'vera', level: 4, boss: false },
  { opponent: 'kairo', level: 5, boss: false },
  { opponent: 'titan', level: 5, boss: true },
];

export type Difficulty = 'facile' | 'normal' | 'difficile' | 'expert';

export const DIFFICULTIES: Record<Difficulty, { label: string; levelOffset: number; multiplier: number }> = {
  facile: { label: 'Facile', levelOffset: -1, multiplier: 0.8 },
  normal: { label: 'Normal', levelOffset: 0, multiplier: 1 },
  difficile: { label: 'Difficile', levelOffset: 1, multiplier: 1.25 },
  expert: { label: 'Expert', levelOffset: 2, multiplier: 1.5 },
};

export const DIFFICULTY_IDS: readonly Difficulty[] = ['facile', 'normal', 'difficile', 'expert'];

export const MAX_AI_LEVEL = 7;

/** Niveau d'IA effectif pour une étape (index 0-based) et une difficulté. */
export function aiLevelFor(stageIndex: number, difficulty: Difficulty): number {
  const stage = ARCADE_STAGES[stageIndex];
  if (!stage) throw new Error(`Étape arcade inconnue : ${stageIndex}`);
  const level = stage.level + DIFFICULTIES[difficulty].levelOffset;
  return Math.min(MAX_AI_LEVEL, Math.max(1, level));
}

export interface FightResult {
  /** Numéro de l'étape (1-based). */
  stage: number;
  difficulty: Difficulty;
  /** Vie restante du joueur en fin de combat, de 0 à 1. */
  healthRatio: number;
  /** Secondes restantes sur l'horloge de la dernière manche. */
  secondsLeft: number;
  /** Le joueur n'a jamais perdu de vie pendant le combat. */
  perfect: boolean;
}

/** Score d'un combat gagné : progression, vie, temps, perfection, le tout multiplié par la difficulté. */
export function scoreFight(r: FightResult): number {
  const base = 1000 * r.stage
    + Math.round(Math.max(0, Math.min(1, r.healthRatio)) * 500)
    + Math.max(0, Math.round(r.secondsLeft)) * 10
    + (r.perfect ? 1000 : 0);
  return Math.round(base * DIFFICULTIES[r.difficulty].multiplier);
}
