/** Défis du mode robots : un objectif précis contre un robot donné. */

export interface ChallengeStats {
  won: boolean;
  robotId: string;
  /** Vie perdue par le joueur pendant le combat. */
  damageTaken: number;
  /** Secondes restantes sur l'horloge de la dernière manche. */
  secondsLeft: number;
  /** Projections réussies par le joueur. */
  throws: number;
  /** Coups bloqués par le joueur. */
  blocks: number;
  /** Plus long enchaînement du joueur. */
  comboMax: number;
}

export interface ChallengeDef {
  id: string;
  label: string;
  description: string;
  robot: string;
  level: number;
  check: (s: ChallengeStats) => boolean;
}

export const CHALLENGES: readonly ChallengeDef[] = [
  {
    id: 'perfect', label: 'Sans une égratignure', description: 'Gagner sans perdre de vie.',
    robot: 'guardian', level: 4, check: (s) => s.won && s.damageTaken === 0,
  },
  {
    id: 'speed', label: 'Éclair', description: 'Gagner avec plus de 30 secondes restantes.',
    robot: 'scout', level: 3, check: (s) => s.won && s.secondsLeft > 30,
  },
  {
    id: 'throws', label: 'Prise de contrôle', description: 'Réussir 2 projections et gagner.',
    robot: 'heavy', level: 4, check: (s) => s.won && s.throws >= 2,
  },
  {
    id: 'combo', label: 'Enchaînement', description: 'Enchaîner 5 coups sans interruption.',
    robot: 'assassin', level: 4, check: (s) => s.comboMax >= 5,
  },
  {
    id: 'blocker', label: 'Mur', description: 'Bloquer 5 coups et gagner.',
    robot: 'heavy', level: 3, check: (s) => s.won && s.blocks >= 5,
  },
  {
    id: 'elite', label: "Contre l'élite", description: 'Battre ROBOT ÉLITE.',
    robot: 'elite', level: 6, check: (s) => s.won && s.robotId === 'elite',
  },
];

export function getChallenge(id: string): ChallengeDef {
  const c = CHALLENGES.find((d) => d.id === id);
  if (!c) throw new Error(`Défi inconnu : ${id}`);
  return c;
}

export function checkChallenge(id: string, stats: ChallengeStats): boolean {
  return getChallenge(id).check(stats);
}
