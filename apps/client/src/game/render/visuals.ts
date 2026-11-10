/**
 * Apparence 3D de chaque personnage : proportions, couleurs, tête, tenue. Tout est dessiné en code
 * (aucun modèle externe) à partir d'un même squelette humanoïde, pour que toutes les animations
 * s'appliquent à tous les personnages.
 */
export type HeadKind =
  | 'karate' | 'boxer' | 'ninja' | 'wrestler' | 'judoka' | 'shadow'
  | 'wolf' | 'fox' | 'husky' | 'bull' | 'stag' | 'robot' | 'titan';

export type Outfit = 'gi' | 'sport' | 'fur' | 'ninja' | 'wrestler' | 'robot' | 'tech';

export interface VisualSpec {
  /** Échelle globale (1 = 1,8 m). */
  height: number;
  /** Proportions (1 = normal). */
  shoulders: number;
  torso: number;
  limbs: number;
  legs: number;
  skin: number;
  suit: number;
  /** Détails sombres ou clairs sans lueur (ceinture, bois, cornes, carapace…). */
  trim: number;
  /** Détails lumineux (visière, yeux, bracelets, noyau). */
  accent: number;
  hair: number;
  /** Couleur des gants ou pattes ; null = mains nues. */
  glove: number | null;
  boot: number;
  head: HeadKind;
  outfit: Outfit;
  tail?: 'wolf' | 'fox' | 'husky' | 'bull';
  /** Manches et pantalon longs (vêtement) ; sinon peau ou fourrure visible. */
  longSleeves: boolean;
  longPants: boolean;
  /** Torse nu (peau ou fourrure). */
  bareTorso: boolean;
  /** Corps articulé en blocs (robots). */
  boxy: boolean;
}

function v(p: Partial<VisualSpec> & Pick<VisualSpec, 'skin' | 'suit' | 'trim' | 'accent' | 'head' | 'outfit'>): VisualSpec {
  return {
    height: 1, shoulders: 1, torso: 1, limbs: 1, legs: 1, hair: 0x14100d, glove: null, boot: 0x15181c,
    longSleeves: false, longPants: false, bareTorso: false, boxy: false, ...p,
  };
}

export const VISUALS: Record<string, VisualSpec> = {
  kairo: v({
    head: 'karate', outfit: 'gi', skin: 0xc68e6a, suit: 0xe8e8e2, trim: 0x15181c, accent: 0x34e0ff,
    longSleeves: true, longPants: true, boot: 0xc68e6a,
  }),
  vera: v({
    head: 'boxer', outfit: 'sport', skin: 0x8d5a3b, suit: 0x2a2f3a, trim: 0xd83a3a, accent: 0xff4a3a,
    hair: 0x3a1a10, glove: 0xd83a3a, boot: 0xf0f0f0, height: 1.02, shoulders: 0.9, torso: 0.92, limbs: 0.92,
  }),
  wolf: v({
    head: 'wolf', outfit: 'fur', skin: 0x8a8f98, suit: 0x3b4350, trim: 0xdfe3e8, accent: 0xffd23a,
    glove: 0x2b2f36, boot: 0x2b2f36, tail: 'wolf', height: 1.05, shoulders: 1.15, torso: 1.1, limbs: 1.1, legs: 0.95,
  }),
  fox: v({
    head: 'fox', outfit: 'fur', skin: 0xd9732a, suit: 0x6b3a1a, trim: 0xf4ece0, accent: 0xffb02a,
    glove: 0x3a2412, boot: 0x3a2412, tail: 'fox', height: 0.95, shoulders: 0.95, torso: 0.9, limbs: 0.9, legs: 1.05,
  }),
  bull: v({
    head: 'bull', outfit: 'fur', skin: 0x5a3a28, suit: 0x2a1a12, trim: 0xe8dcc4, accent: 0xff4a2a,
    glove: 0x1f130c, boot: 0x1f130c, tail: 'bull', height: 1.2, shoulders: 1.35, torso: 1.3, limbs: 1.35, legs: 0.9,
    bareTorso: true,
  }),
  stag: v({
    head: 'stag', outfit: 'fur', skin: 0xb08a5a, suit: 0x4a3a22, trim: 0xe6dcc0, accent: 0x9fe8ff,
    glove: 0x4a3a22, boot: 0x4a3a22, height: 1.15, shoulders: 1.0, torso: 0.95, limbs: 0.95, legs: 1.15,
  }),
  husky: v({
    head: 'husky', outfit: 'fur', skin: 0x9aa8b8, suit: 0x33415a, trim: 0xf2f6fa, accent: 0x7fd4ff,
    glove: 0x2a3446, boot: 0x2a3446, tail: 'husky', height: 1.05, shoulders: 1.05,
  }),
  robot: v({
    head: 'robot', outfit: 'robot', skin: 0x8f98a3, suit: 0x3b4450, trim: 0xc8d0d8, accent: 0x34e0ff,
    glove: 0x2a3038, boot: 0x2a3038, boxy: true, longSleeves: true, longPants: true,
    height: 1.05, shoulders: 1.2, torso: 1.2, limbs: 1.15,
  }),
  shin: v({
    head: 'ninja', outfit: 'ninja', skin: 0xc9a07a, suit: 0x16181d, trim: 0x2a2d36, accent: 0xb02a3a,
    glove: 0x2a2d36, boot: 0x0e0f12, longSleeves: true, longPants: true, height: 0.97, shoulders: 0.9,
    torso: 0.88, limbs: 0.9, legs: 1.05,
  }),
  brutus: v({
    head: 'wrestler', outfit: 'wrestler', skin: 0xc4896a, suit: 0x7a1a1a, trim: 0xffc23a, accent: 0xffc23a,
    hair: 0xc4896a, boot: 0x14100d, bareTorso: true, height: 1.12, shoulders: 1.4, torso: 1.35, limbs: 1.35, legs: 0.95,
  }),
  akira: v({
    head: 'judoka', outfit: 'gi', skin: 0xd2a27c, suit: 0xf0f0ec, trim: 0x222222, accent: 0x34e0ff,
    longSleeves: true, longPants: true, boot: 0xd2a27c, shoulders: 1.1, torso: 1.1, limbs: 1.05,
  }),
  nyx: v({
    head: 'shadow', outfit: 'tech', skin: 0x8a5a44, suit: 0x2a1f3a, trim: 0x4a3a6a, accent: 0xb04aff,
    hair: 0x120c1c, glove: 0x2a1f3a, boot: 0x1a1226, longSleeves: true, longPants: true, height: 1.02,
    shoulders: 0.9, torso: 0.88, limbs: 0.92, legs: 1.08,
  }),
  titan: v({
    head: 'titan', outfit: 'robot', skin: 0x5a5f68, suit: 0x2a2f36, trim: 0x8a929c, accent: 0xff3a2a,
    glove: 0x1c2026, boot: 0x1c2026, boxy: true, longSleeves: true, longPants: true, height: 1.45,
    shoulders: 1.5, torso: 1.5, limbs: 1.4,
  }),
};

export function visualFor(id: string): VisualSpec {
  return VISUALS[id] ?? VISUALS['kairo']!;
}
