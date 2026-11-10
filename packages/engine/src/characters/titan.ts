import { BASE_MOVES } from './baseMoves';
import type { CharacterDef } from './types';

/** Boss d'arcade : lourd, lent, coups puissants. Non sélectionnable dans le menu. */
export const TITAN: CharacterDef = {
  id: 'titan',
  name: 'TITAN-01',
  epithet: 'Boss robotique',
  style: 'Lourd : coups lents, dégâts élevés, garde lourde',
  bio: "Unité de combat autonome de HELIX. Il a décidé que l'humanité était inutile.",
  health: 180,
  speeds: { walkFwd: 1.6, walkBack: 1.2, runFwd: 3.6, side: 1.4, dodge: 2.6, jumpVel: 8 },
  look: { skin: 0x5a5f68, suit: 0x2a2f36, accent: 0xff6a2a, scale: 1.45 },
  moves: {
    ...BASE_MOVES,
    jab: { ...BASE_MOVES.jab, startup: 6, damage: 6, hitstun: 14 },
    cross: { ...BASE_MOVES.cross, startup: 9, damage: 12 },
    elbow: { ...BASE_MOVES.elbow, damage: 18 },
    roundhouse: { ...BASE_MOVES.roundhouse, startup: 18, recovery: 26, damage: 20 },
  },
};
