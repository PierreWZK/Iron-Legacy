import { BASE_MOVES } from './baseMoves';
import type { CharacterDef } from './types';

export const VERA: CharacterDef = {
  id: 'vera',
  name: 'VERA',
  epithet: 'Kickboxeuse',
  style: 'Kickboxing : pieds rapides, pression constante, boxe légère',
  bio: "Championne de rue passée par les usines de HELIX. Elle frappe vite et ne s'arrête jamais.",
  health: 100,
  speeds: { walkFwd: 2.4, walkBack: 1.9, runFwd: 5.8, side: 2.3, dodge: 3.6, jumpVel: 10 },
  look: { skin: 0x8d5a3b, suit: 0x703030, accent: 0xff4a3a, scale: 1.05 },
  moves: {
    ...BASE_MOVES,
    jab: { ...BASE_MOVES.jab, startup: 3, damage: 3, hitstun: 12 },
    lowKick: { ...BASE_MOVES.lowKick, startup: 4, damage: 6 },
    frontKick: { ...BASE_MOVES.frontKick, startup: 7, damage: 10, recovery: 13 },
    roundhouse: { ...BASE_MOVES.roundhouse, startup: 11, recovery: 20, damage: 13, hitstun: 22 },
  },
};
