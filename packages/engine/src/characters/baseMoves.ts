import type { Height, Limb, MoveDef, MoveId } from './types';

/** Construit un coup : les champs rares (lancer, knockdown, avancée, string…) passent par `extra`. */
export function mv(
  label: string, limb: Limb, height: Height,
  startup: number, active: number, recovery: number,
  damage: number, hitstun: number, blockstun: number, knockback: number, reach: number,
  extra: Partial<MoveDef> = {},
): MoveDef {
  return {
    label, limb, height, startup, active, recovery, damage, hitstun, blockstun, knockback,
    launch: 0, knockdown: false, reach, radius: 0.3, lunge: 0, cancel: false, ...extra,
  };
}

/** Table de coups de référence (style karaté). Les autres personnages la surchargent partiellement. */
export const BASE_MOVES: Record<MoveId, MoveDef> = {
  // Debout
  jab: mv('Jab', 'punchL', 'high', 4, 2, 8, 4, 13, 9, 0.4, 1.0, { cancel: true, string: true }),
  cross: mv('Direct', 'punchR', 'mid', 7, 3, 13, 8, 16, 11, 0.8, 1.1, { cancel: true, string: true }),
  frontKick: mv('Coup de pied frontal', 'kickL', 'mid', 9, 4, 15, 9, 17, 12, 1.0, 1.25, { radius: 0.32, cancel: true, string: true }),
  roundhouse: mv('Coup de pied circulaire', 'kickR', 'high', 14, 4, 24, 14, 24, 16, 1.4, 1.35, { radius: 0.4 }),
  // Avant + bouton
  lunge: mv('Fente', 'lunge', 'mid', 12, 5, 18, 10, 20, 10, 1.2, 1.3, { lunge: 3.5 }),
  elbow: mv('Coude', 'elbow', 'high', 10, 3, 20, 13, 24, 14, 1.5, 0.9, { knockdown: true }),
  kneeLift: mv('Genou', 'knee', 'mid', 11, 3, 16, 10, 19, 11, 0.9, 0.9, { launch: 3 }),
  axeKick: mv('Coup de hache', 'axe', 'high', 16, 4, 26, 15, 26, 18, 1.0, 1.0, { knockdown: true, radius: 0.35 }),
  // Arrière + bouton
  backFist: mv('Revers', 'backFist', 'high', 8, 2, 14, 7, 15, 10, 0.6, 1.0, { cancel: true }),
  sideKick: mv('Coup de pied latéral', 'sideKick', 'mid', 12, 3, 20, 11, 20, 13, 1.6, 1.5),
  spinKick: mv('Coup de pied tournant', 'spinKick', 'high', 15, 4, 26, 14, 24, 15, 1.3, 1.4, { knockdown: true, radius: 0.4 }),
  // Accroupi + bouton
  lowJab: mv('Poing bas', 'punchL', 'mid', 5, 2, 9, 3, 11, 8, 0.3, 1.0, { cancel: true, string: true }),
  uppercut: mv('Uppercut', 'uppercut', 'high', 9, 3, 18, 11, 22, 14, 0.5, 0.95, { launch: 6 }),
  lowKick: mv('Balayette basse', 'kickL', 'low', 5, 2, 10, 5, 12, 9, 0.4, 1.0, { cancel: true, string: true }),
  sweep: mv('Balayage', 'kickR', 'low', 12, 3, 22, 10, 20, 12, 1.0, 1.2, { knockdown: true, radius: 0.35 }),
  // Accroupi + avant + bouton
  hookPunch: mv('Crochet', 'hook', 'mid', 9, 3, 14, 9, 17, 11, 0.9, 1.05, { cancel: true }),
  risingHook: mv('Crochet ascendant', 'risingHook', 'high', 13, 3, 22, 12, 24, 15, 0.6, 1.0, { launch: 7 }),
  slideKick: mv('Glissade', 'slide', 'low', 14, 4, 24, 9, 20, 14, 0.9, 1.5, { knockdown: true, lunge: 2.5 }),
  dragonKick: mv('Coup du dragon', 'dragon', 'high', 15, 4, 28, 16, 26, 17, 0.8, 1.1, { launch: 8 }),
  // En courant
  tackle: mv('Charge épaule', 'tackle', 'mid', 10, 5, 22, 12, 22, 12, 2.0, 1.2, { knockdown: true, lunge: 6 }),
  flyingKick: mv('Coup de pied volant', 'flying', 'mid', 12, 6, 24, 13, 22, 14, 1.8, 1.3, { lunge: 5 }),
  // En l'air
  airPunch: mv('Poing sauté', 'airPunch', 'mid', 5, 6, 10, 7, 16, 10, 0.6, 1.0),
  airElbow: mv('Coude sauté', 'airElbow', 'high', 7, 5, 12, 9, 19, 12, 0.6, 0.9, { launch: 2 }),
  jumpKick: mv('Coup de pied sauté', 'jumpKick', 'mid', 6, 6, 12, 9, 18, 12, 1.0, 0.9, { radius: 0.35 }),
  airRound: mv('Circulaire sauté', 'airRound', 'high', 8, 6, 12, 11, 20, 14, 0.6, 1.0, { launch: 3, radius: 0.38 }),
  // Projections : séquence jouée après la prise, récupération = séquence + 12
  throw: mv('Projection', 'throw', 'mid', 5, 1, 52, 14, 0, 0, 0, 0.9, { radius: 0.4, knockdown: true, throw: true, sequence: 40, landing: 1.5 }),
  hipToss: mv('Projection de hanche', 'hipToss', 'mid', 5, 1, 60, 16, 0, 0, 0, 0.9, { radius: 0.4, knockdown: true, throw: true, sequence: 48, landing: 1.2 }),
  suplex: mv('Suplex', 'suplex', 'mid', 6, 1, 66, 20, 0, 0, 0, 0.9, { radius: 0.4, knockdown: true, throw: true, sequence: 54, landing: -1.2 }),
  legThrow: mv('Projection de jambe', 'legThrow', 'mid', 6, 1, 56, 13, 0, 0, 0, 0.9, { radius: 0.4, knockdown: true, throw: true, sequence: 44, landing: 1.0 }),
};
