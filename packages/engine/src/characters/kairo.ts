import { BASE_MOVES } from './baseMoves';
import type { CharacterDef } from './types';

export const KAIRO: CharacterDef = {
  id: 'kairo',
  name: 'KAIRO',
  epithet: 'Maître du karaté',
  style: 'Karaté : garde solide, contre-attaques, coups précis',
  bio: "Ancien instructeur d'un dojo fermé par HELIX. Il ne combat plus que pour ceux qui n'ont plus de voix.",
  health: 100,
  speeds: { walkFwd: 2.0, walkBack: 1.5, runFwd: 5.0, side: 1.8, dodge: 3.2, jumpVel: 9 },
  look: { skin: 0xc68e6a, suit: 0x35506b, accent: 0x34e0ff, scale: 1.0 },
  moves: BASE_MOVES,
};
