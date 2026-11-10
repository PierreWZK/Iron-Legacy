/** Mode vagues : un robot par vague, de plus en plus fort. Données pures et déterministes. */

/** Ordre des robots dans les vagues ordinaires. */
export const WAVE_ORDER = ['scout', 'guardian', 'assassin', 'heavy', 'elite'] as const;

/** Une vague sur dix est un boss : TITAN-01. */
export const BOSS_EVERY = 10;

export interface WaveSetup {
  robot: string;
  /** Niveau d'IA (1 à 7). */
  level: number;
  /** Multiplicateur de vie du robot (1 à 2.2). */
  healthScale: number;
  boss: boolean;
}

/** Réglage de la vague `n` (0-based). */
export function waveSetup(n: number): WaveSetup {
  if (!Number.isInteger(n) || n < 0) throw new Error(`Vague invalide : ${n}`);
  const boss = n % BOSS_EVERY === BOSS_EVERY - 1;
  return {
    robot: boss ? 'titan' : WAVE_ORDER[n % WAVE_ORDER.length]!,
    level: Math.min(7, 1 + Math.floor(n / 2)),
    healthScale: Math.min(2.2, 1 + 0.08 * n),
    boss,
  };
}

/** Part de vie max récupérée entre deux vagues. */
export const WAVE_HEAL = 0.25;

/** Vie du joueur après une vague gagnée : récupération partielle, sans dépasser le maximum. */
export function healBetweenWaves(health: number, max: number): number {
  return Math.min(max, Math.round(health + max * WAVE_HEAL));
}
