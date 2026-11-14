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
  /** Accessoires : cape, backpack, cannons, bladeArms, hipBlades, crest, antenna, hornsRed, helm, spikes. */
  extras?: string[];
  /** Corps du modèle 3D : homme ou femme. */
  body?: 'm' | 'f';
  /** Coiffure du modèle 3D (fichier dans models/hair) ; null = crâne rasé. */
  hairStyle?: string | null;
}

function v(p: Partial<VisualSpec> & Pick<VisualSpec, 'skin' | 'suit' | 'trim' | 'accent' | 'head' | 'outfit'>): VisualSpec {
  return {
    height: 1, shoulders: 1, torso: 1, limbs: 1, legs: 1, hair: 0x14100d, glove: null, boot: 0x15181c,
    longSleeves: false, longPants: false, bareTorso: false, boxy: false, body: 'm', hairStyle: 'Hair_Buzzed', ...p,
  };
}

export const VISUALS: Record<string, VisualSpec> = {
  kairo: v({
    head: 'karate', outfit: 'gi', skin: 0xc68e6a, suit: 0xe8e8e2, trim: 0x15181c, accent: 0x34e0ff,
    longSleeves: true, longPants: true, boot: 0xc68e6a, hairStyle: 'Hair_SimpleParted',
  }),
  vera: v({
    head: 'boxer', outfit: 'sport', skin: 0x8d5a3b, suit: 0x2a2f3a, trim: 0xd83a3a, accent: 0xff4a3a,
    hair: 0x3a1a10, glove: 0xd83a3a, boot: 0xf0f0f0, height: 1.02, shoulders: 0.9, torso: 0.92, limbs: 0.92,
    body: 'f', hairStyle: 'Hair_Buns',
  }),
  wolf: v({
    head: 'boxer', outfit: 'sport', skin: 0xc49a7c, suit: 0x3b4350, trim: 0xdfe3e8, accent: 0xffd23a,
    hair: 0xdfe3e8, glove: 0x2b2f36, boot: 0x2b2f36, height: 1.05, shoulders: 1.15, torso: 1.1, limbs: 1.1, legs: 0.95,
    longPants: true, hairStyle: 'Hair_Buzzed',
  }),
  fox: v({
    head: 'boxer', outfit: 'sport', skin: 0xe0b090, suit: 0x6b3a1a, trim: 0xf4ece0, accent: 0xffb02a,
    hair: 0xd9732a, glove: 0x3a2412, boot: 0x3a2412, height: 0.95, shoulders: 0.95, torso: 0.9, limbs: 0.9, legs: 1.05,
    body: 'f', hairStyle: 'Hair_Long', longPants: true,
  }),
  bull: v({
    head: 'boxer', outfit: 'wrestler', skin: 0x5a3a28, suit: 0x2a1a12, trim: 0xe8dcc4, accent: 0xff4a2a,
    hair: 0x1f130c, glove: 0x1f130c, boot: 0x1f130c, height: 1.2, shoulders: 1.35, torso: 1.3, limbs: 1.35, legs: 0.9,
    bareTorso: true, hairStyle: 'Hair_Buzzed',
  }),
  stag: v({
    head: 'boxer', outfit: 'sport', skin: 0xb08a5a, suit: 0x4a3a22, trim: 0xe6dcc0, accent: 0x9fe8ff,
    hair: 0x6a4a2a, glove: 0x4a3a22, boot: 0x4a3a22, height: 1.15, shoulders: 1.0, torso: 0.95, limbs: 0.95, legs: 1.15,
    longPants: true, hairStyle: 'Hair_SimpleParted',
  }),
  husky: v({
    head: 'boxer', outfit: 'sport', skin: 0xe6c4a8, suit: 0x33415a, trim: 0xf2f6fa, accent: 0x7fd4ff,
    hair: 0xdfe6ee, glove: 0x2a3446, boot: 0x2a3446, height: 1.05, shoulders: 1.05,
    body: 'f', hairStyle: 'Hair_Long', longPants: true,
  }),
  robot: v({
    head: 'boxer', outfit: 'sport', skin: 0xa87858, suit: 0x3b4450, trim: 0xc8d0d8, accent: 0x34e0ff,
    glove: 0x2a3038, boot: 0x2a3038, longSleeves: true, longPants: true,
    height: 1.05, shoulders: 1.2, torso: 1.2, limbs: 1.15, hairStyle: null,
    extras: ['antenna'],
  }),
  shin: v({
    head: 'ninja', outfit: 'ninja', skin: 0xc9a07a, suit: 0x16181d, trim: 0x2a2d36, accent: 0xb02a3a,
    hair: 0x14100d, glove: 0x2a2d36, boot: 0x0e0f12, longSleeves: true, longPants: true, height: 0.97, shoulders: 0.9,
    torso: 0.88, limbs: 0.9, legs: 1.05, hairStyle: 'Hair_Buzzed',
  }),
  brutus: v({
    head: 'wrestler', outfit: 'wrestler', skin: 0xc4896a, suit: 0x7a1a1a, trim: 0xffc23a, accent: 0xffc23a,
    hair: 0x3a2a1a, boot: 0x14100d, bareTorso: true, height: 1.12, shoulders: 1.4, torso: 1.35, limbs: 1.35, legs: 0.95,
    hairStyle: 'Hair_Buzzed',
  }),
  akira: v({
    head: 'judoka', outfit: 'gi', skin: 0xd2a27c, suit: 0xf0f0ec, trim: 0x222222, accent: 0x34e0ff,
    hair: 0x14100d, longSleeves: true, longPants: true, boot: 0xd2a27c, shoulders: 1.1, torso: 1.1, limbs: 1.05,
    hairStyle: 'Hair_SimpleParted',
  }),
  nyx: v({
    head: 'shadow', outfit: 'tech', skin: 0x8a5a44, suit: 0x2a1f3a, trim: 0x4a3a6a, accent: 0xb04aff,
    hair: 0x120c1c, glove: 0x2a1f3a, boot: 0x1a1226, longSleeves: true, longPants: true, height: 1.02,
    shoulders: 0.9, torso: 0.88, limbs: 0.92, legs: 1.08, body: 'f', hairStyle: 'Hair_Long',
  }),
  scout: v({
    head: 'robot', outfit: 'robot', skin: 0xb8c0c8, suit: 0x3a4450, trim: 0xd8e0e8, accent: 0x34e0ff,
    glove: 0x2a3038, boot: 0x2a3038, boxy: true, longSleeves: true, longPants: true,
    height: 0.95, shoulders: 0.9, torso: 0.9, limbs: 0.95,
    extras: ['antenna'],
  }),
  guardian: v({
    head: 'robot', outfit: 'robot', skin: 0x7a8490, suit: 0x2a3440, trim: 0x9aa4ae, accent: 0xff8a2a,
    glove: 0x2a3038, boot: 0x2a3038, boxy: true, longSleeves: true, longPants: true,
    height: 1.12, shoulders: 1.5, torso: 1.45, limbs: 1.3,
    extras: ['helm', 'spikes'],
  }),
  assassin: v({
    head: 'robot', outfit: 'robot', skin: 0x5a1a1a, suit: 0x1a1214, trim: 0x2a1e22, accent: 0xff2a3a,
    glove: 0x1a1214, boot: 0x1a1214, boxy: true, longSleeves: true, longPants: true,
    height: 1.0, shoulders: 0.95, torso: 0.92, limbs: 0.95,
    extras: ['bladeArms', 'hornsRed', 'hipBlades'],
  }),
  heavy: v({
    head: 'robot', outfit: 'robot', skin: 0x5a5f68, suit: 0x3a3228, trim: 0x8a7a5a, accent: 0xffc23a,
    glove: 0x2a2620, boot: 0x2a2620, boxy: true, longSleeves: true, longPants: true,
    height: 1.3, shoulders: 1.6, torso: 1.5, limbs: 1.4,
    extras: ['helm', 'cannons'],
  }),
  elite: v({
    head: 'robot', outfit: 'robot', skin: 0x9a8a5a, suit: 0x3a3424, trim: 0xc8b87a, accent: 0xffe08a,
    glove: 0x3a3424, boot: 0x3a3424, boxy: true, longSleeves: true, longPants: true,
    height: 1.05, shoulders: 1.2, torso: 1.15, limbs: 1.1,
    extras: ['crest', 'cape'],
  }),
  titan: v({
    head: 'titan', outfit: 'robot', skin: 0x5a5f68, suit: 0x2a2f36, trim: 0x8a929c, accent: 0xff3a2a,
    glove: 0x1c2026, boot: 0x1c2026, boxy: true, longSleeves: true, longPants: true, height: 1.45,
    shoulders: 1.5, torso: 1.5, limbs: 1.4, hairStyle: null,
    extras: ['backpack', 'cannons', 'spikes'],
  }),
};

export function visualFor(id: string): VisualSpec {
  return VISUALS[id] ?? VISUALS['kairo']!;
}
