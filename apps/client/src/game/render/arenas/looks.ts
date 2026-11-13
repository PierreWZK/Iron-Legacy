import type { ArenaId } from './specs';

/** Ambiance ajoutée à chaque décor : ciel dégradé, lumière d'appoint, contre-jour, particules. */
export type ParticleKind = 'leaves' | 'petals' | 'snow' | 'embers' | 'dust' | 'fireflies' | 'sparks';

export interface ArenaLook {
  /** Dégradé du ciel : haut et horizon. */
  skyTop: string;
  horizon: string;
  /** Lumière hémisphérique : ciel, sol, intensité (éclaire les zones d'ombre). */
  hemi: [string, string, number];
  /** Contre-jour coloré derrière les combattants (détache les silhouettes du fond). */
  rim: [string, number];
  stars?: boolean;
  particles?: { kind: ParticleKind; color: string };
  /** Remplace l'ambiance du décor quand elle est trop sombre. */
  ambient?: [string, number];
  sun?: [string, number];
  /** Multiplicateur d'intensité des lumières ponctuelles du décor. */
  pointBoost?: number;
  /** Exposition du rendu (1 = neutre). */
  exposure?: number;
}

/** Tous les décors sont éclairés : plus de combat dans le noir, même les décors de nuit ont une lune et un contre-jour. */
export const LOOKS: Record<Exclude<ArenaId, 'dojo'>, ArenaLook> = {
  forest: {
    skyTop: '#1c5478', horizon: '#8fd0b0', hemi: ['#a8e0c8', '#2a3a20', 1.0], rim: ['#bff0ff', 1.6], stars: true,
    particles: { kind: 'fireflies', color: '#e8ff7a' }, ambient: ['#a8c8d4', 1.0], sun: ['#e8f4ff', 2.2], exposure: 1.25,
  },
  autumn: {
    skyTop: '#8a4a22', horizon: '#ffcf8a', hemi: ['#ffd9a0', '#5a3a1a', 1.0], rim: ['#ffb060', 1.3],
    particles: { kind: 'leaves', color: '#e8742a' }, exposure: 1.15,
  },
  canyon: {
    skyTop: '#4a8ad8', horizon: '#ffdca8', hemi: ['#ffe8c0', '#b8894f', 0.9], rim: ['#ffc880', 1.0],
    particles: { kind: 'dust', color: '#f0d098' }, exposure: 1.1,
  },
  snow: {
    skyTop: '#7fa8d8', horizon: '#eef4fb', hemi: ['#ffffff', '#aabfd6', 1.0], rim: ['#cfe4ff', 1.0],
    particles: { kind: 'snow', color: '#ffffff' }, exposure: 1.0,
  },
  tundra: {
    skyTop: '#4a7aa8', horizon: '#d4e8f4', hemi: ['#e8f4ff', '#9fb8cc', 1.0], rim: ['#bfe4ff', 1.2],
    particles: { kind: 'snow', color: '#eaf6ff' }, exposure: 1.05,
  },
  lab: {
    skyTop: '#143a5e', horizon: '#2a7098', hemi: ['#8fd8ff', '#14202c', 1.2], rim: ['#34e0ff', 2.4], stars: true,
    particles: { kind: 'sparks', color: '#7fe8ff' }, ambient: ['#a8d0ec', 1.1], sun: ['#e8f6ff', 1.8], pointBoost: 1.8, exposure: 1.3,
  },
  fortress: {
    skyTop: '#4a1414', horizon: '#c04226', hemi: ['#ff9a88', '#2a1a1a', 1.1], rim: ['#ff5a3a', 2.4],
    particles: { kind: 'embers', color: '#ff8a3a' }, ambient: ['#e8a0a0', 1.0], sun: ['#ffc0a8', 1.8], pointBoost: 1.7, exposure: 1.3,
  },
  street: {
    skyTop: '#2c3470', horizon: '#f08c62', hemi: ['#b0b8e8', '#262a34', 1.0], rim: ['#6ab8ff', 1.8], stars: true,
    particles: { kind: 'dust', color: '#ffd0a0' }, ambient: ['#a8b0d4', 1.0], sun: ['#d8c8c8', 1.6], pointBoost: 1.8, exposure: 1.3,
  },
  rooftop: {
    skyTop: '#2c3a7a', horizon: '#ff9068', hemi: ['#b8c8f0', '#2a2e38', 1.1], rim: ['#ff6a7a', 2.0], stars: true,
    ambient: ['#a8bce0', 1.1], sun: ['#ffd0a8', 1.9], pointBoost: 2.0, exposure: 1.35,
  },
  factory: {
    skyTop: '#2a2a3a', horizon: '#c8804a', hemi: ['#ffd0a0', '#2a2a2e', 1.0], rim: ['#ff9a4a', 1.8],
    particles: { kind: 'embers', color: '#ffa04a' }, ambient: ['#d8c0a8', 1.0], sun: ['#ffe0c0', 1.8], pointBoost: 1.8, exposure: 1.3,
  },
  temple: {
    skyTop: '#6a9ad0', horizon: '#ffdcb8', hemi: ['#fff0dc', '#6a6256', 1.0], rim: ['#ffc8a0', 1.2],
    particles: { kind: 'petals', color: '#ffb0c8' }, exposure: 1.15,
  },
  desert: {
    skyTop: '#4a90d8', horizon: '#ffdca8', hemi: ['#ffe8c0', '#c9a266', 0.9], rim: ['#ffb870', 1.1],
    particles: { kind: 'dust', color: '#f0cf98' }, exposure: 1.1,
  },
};
