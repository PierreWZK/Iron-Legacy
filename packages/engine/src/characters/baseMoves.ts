import type { MoveDef, MoveId } from './types';

/** Table de coups de référence (style karaté). Les autres personnages la surchargent partiellement. */
export const BASE_MOVES: Record<MoveId, MoveDef> = {
  jab: { label: 'Jab', limb: 'punchL', height: 'high', startup: 4, active: 2, recovery: 8, damage: 4, hitstun: 13, blockstun: 9, knockback: 0.4, launch: 0, knockdown: false, reach: 1.0, radius: 0.3, lunge: 0, cancel: true },
  cross: { label: 'Direct', limb: 'punchR', height: 'mid', startup: 7, active: 3, recovery: 13, damage: 8, hitstun: 16, blockstun: 11, knockback: 0.8, launch: 0, knockdown: false, reach: 1.1, radius: 0.3, lunge: 0, cancel: true },
  uppercut: { label: 'Uppercut', limb: 'uppercut', height: 'high', startup: 9, active: 3, recovery: 18, damage: 11, hitstun: 22, blockstun: 14, knockback: 0.5, launch: 6, knockdown: false, reach: 0.95, radius: 0.3, lunge: 0, cancel: false },
  frontKick: { label: 'Coup de pied frontal', limb: 'kickL', height: 'mid', startup: 9, active: 4, recovery: 15, damage: 9, hitstun: 17, blockstun: 12, knockback: 1.0, launch: 0, knockdown: false, reach: 1.25, radius: 0.32, lunge: 0, cancel: true },
  roundhouse: { label: 'Coup de pied circulaire', limb: 'kickR', height: 'high', startup: 14, active: 4, recovery: 24, damage: 14, hitstun: 24, blockstun: 16, knockback: 1.4, launch: 0, knockdown: false, reach: 1.35, radius: 0.4, lunge: 0, cancel: false },
  lowKick: { label: 'Balayette basse', limb: 'kickL', height: 'low', startup: 5, active: 2, recovery: 10, damage: 5, hitstun: 12, blockstun: 9, knockback: 0.4, launch: 0, knockdown: false, reach: 1.0, radius: 0.3, lunge: 0, cancel: true },
  sweep: { label: 'Balayage', limb: 'kickR', height: 'low', startup: 12, active: 3, recovery: 22, damage: 10, hitstun: 20, blockstun: 12, knockback: 1.0, launch: 0, knockdown: true, reach: 1.2, radius: 0.35, lunge: 0, cancel: false },
  lunge: { label: 'Fente', limb: 'lunge', height: 'mid', startup: 12, active: 5, recovery: 18, damage: 10, hitstun: 20, blockstun: 10, knockback: 1.2, launch: 0, knockdown: false, reach: 1.3, radius: 0.3, lunge: 3.5, cancel: false },
  elbow: { label: 'Coude', limb: 'elbow', height: 'high', startup: 10, active: 3, recovery: 20, damage: 13, hitstun: 24, blockstun: 14, knockback: 1.5, launch: 0, knockdown: true, reach: 0.9, radius: 0.3, lunge: 0, cancel: false },
  jumpKick: { label: 'Coup de pied sauté', limb: 'jumpKick', height: 'mid', startup: 6, active: 6, recovery: 12, damage: 9, hitstun: 18, blockstun: 12, knockback: 1.0, launch: 0, knockdown: false, reach: 0.9, radius: 0.35, lunge: 0, cancel: false },
  airRound: { label: 'Circulaire sauté', limb: 'airRound', height: 'high', startup: 8, active: 6, recovery: 12, damage: 11, hitstun: 20, blockstun: 14, knockback: 0.6, launch: 3, knockdown: false, reach: 1.0, radius: 0.38, lunge: 0, cancel: false },
  throw: { label: 'Projection', limb: 'throw', height: 'mid', startup: 5, active: 1, recovery: 20, damage: 14, hitstun: 0, blockstun: 0, knockback: 0, launch: 0, knockdown: true, reach: 0.9, radius: 0.4, lunge: 0, cancel: false, throw: true },
};
