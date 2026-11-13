import type { PropColors, PropKind } from './scenery';

/** Une couche d'éléments de décor : `count` éléments posés en couronne entre `rMin` et `rMax` mètres du centre. */
export interface Layer {
  kind: PropKind;
  count: number;
  rMin: number;
  rMax: number;
  scale: [number, number];
  colors: PropColors;
  /** Hauteur de pose (m). */
  y?: number;
}

export interface ArenaSpec {
  sky: string;
  fog: [number, number];
  ground: string;
  floor: string;
  ring: string;
  ambient: [string, number];
  sun: [string, number];
  /** Quadrillage lumineux sur le sol (labo, usine). */
  grid?: { color: string; division: number };
  /** Lumières ponctuelles colorées (au plus 3). */
  points?: { pos: [number, number, number]; color: string; intensity: number }[];
  rain?: boolean;
  layers: Layer[];
}

export type ArenaId =
  | 'dojo' | 'street' | 'forest' | 'autumn' | 'canyon' | 'snow' | 'tundra'
  | 'lab' | 'rooftop' | 'factory' | 'temple' | 'desert' | 'fortress';

/**
 * Les grands éléments (arbres, bâtiments, mesas…) restent au-delà de 23 m : la caméra de combat
 * s'éloigne jusqu'à ~21 m du centre et ne doit jamais les traverser.
 */
const FAR = 23;
const col = (primary: number, secondary: number, accent = 0xffffff): PropColors => ({ primary, secondary, accent });

/** Les 12 décors dessinés en code (le dojo a son propre composant). */
export const ARENAS: Record<Exclude<ArenaId, 'dojo'>, ArenaSpec> = {
  forest: {
    sky: '#0b1410', fog: [22, 62], ground: '#1c2a18', floor: '#4a3d2a', ring: '#9fe8ff',
    ambient: ['#7f9fb5', 0.5], sun: ['#cfe6ff', 1.6],
    layers: [
      { kind: 'tree', count: 46, rMin: FAR, rMax: 40, scale: [1.2, 1.9], colors: col(0x2e5a2a, 0x4a3320) },
      { kind: 'pine', count: 30, rMin: FAR, rMax: 42, scale: [1.2, 2.0], colors: col(0x1f4a30, 0x3a2a1a) },
      { kind: 'deadTree', count: 6, rMin: FAR, rMax: 36, scale: [1.2, 1.6], colors: col(0, 0x3a2e24) },
      { kind: 'bush', count: 24, rMin: 9.5, rMax: 17, scale: [0.8, 1.4], colors: col(0x2a5030, 0) },
      { kind: 'rock', count: 14, rMin: 9.5, rMax: 16, scale: [0.6, 1.1], colors: col(0x55595c, 0) },
    ],
  },
  autumn: {
    sky: '#2a1608', fog: [22, 62], ground: '#4a2e14', floor: '#6b4a28', ring: '#ffb020',
    ambient: ['#d9a070', 0.6], sun: ['#ffd9a0', 2.0],
    layers: [
      { kind: 'tree', count: 30, rMin: FAR, rMax: 40, scale: [1.2, 1.9], colors: col(0xd9732a, 0x4a3320) },
      { kind: 'tree', count: 22, rMin: FAR, rMax: 40, scale: [1.2, 1.9], colors: col(0xb5481a, 0x4a3320) },
      { kind: 'tree', count: 12, rMin: FAR, rMax: 40, scale: [1.2, 1.9], colors: col(0xe8b03a, 0x4a3320) },
      { kind: 'bush', count: 26, rMin: 9.5, rMax: 17, scale: [0.8, 1.4], colors: col(0xc8641e, 0) },
      { kind: 'rock', count: 10, rMin: 9.5, rMax: 16, scale: [0.6, 1.1], colors: col(0x6a5a4a, 0) },
    ],
  },
  canyon: {
    sky: '#d8a55e', fog: [24, 66], ground: '#b8894f', floor: '#d8bb85', ring: '#ff6a3a',
    ambient: ['#ffe0b0', 0.8], sun: ['#fff0cc', 2.6],
    layers: [
      { kind: 'mesa', count: 26, rMin: FAR, rMax: 44, scale: [2.0, 3.6], colors: col(0xb06a3a, 0xc88a52) },
      { kind: 'cactus', count: 12, rMin: FAR, rMax: 34, scale: [1.0, 1.6], colors: col(0x4a7a3a, 0) },
      { kind: 'deadTree', count: 8, rMin: FAR, rMax: 36, scale: [1.2, 1.6], colors: col(0, 0x6a4a2a) },
      { kind: 'rock', count: 22, rMin: 9.5, rMax: 16, scale: [0.6, 1.3], colors: col(0x9a6a40, 0) },
    ],
  },
  snow: {
    sky: '#aabfd6', fog: [22, 62], ground: '#eef3f8', floor: '#f6f9fc', ring: '#9fc4ff',
    ambient: ['#cfdcec', 0.85], sun: ['#ffffff', 1.8],
    layers: [
      { kind: 'pine', count: 56, rMin: FAR, rMax: 42, scale: [1.3, 2.1], colors: col(0xdbe6f2, 0x6a5a4a) },
      { kind: 'iceSpike', count: 10, rMin: FAR, rMax: 34, scale: [1.2, 2.0], colors: col(0xbfe0ff, 0, 0x9fd8ff) },
      { kind: 'snowMound', count: 22, rMin: 10, rMax: 18, scale: [0.8, 1.4], colors: col(0xffffff, 0) },
      { kind: 'rock', count: 10, rMin: 9.5, rMax: 16, scale: [0.6, 1.1], colors: col(0x8a929c, 0) },
    ],
  },
  tundra: {
    sky: '#8fb2c9', fog: [22, 62], ground: '#cfe2ee', floor: '#e8f3fa', ring: '#7fd4ff',
    ambient: ['#bcd2e4', 0.85], sun: ['#eaf6ff', 1.7],
    layers: [
      { kind: 'iceSpike', count: 34, rMin: FAR, rMax: 44, scale: [1.6, 3.4], colors: col(0xb8e0ff, 0, 0x7fd4ff) },
      { kind: 'deadTree', count: 10, rMin: FAR, rMax: 36, scale: [1.2, 1.7], colors: col(0, 0x5a5048) },
      { kind: 'snowMound', count: 16, rMin: 10, rMax: 18, scale: [0.8, 1.5], colors: col(0xf4f9ff, 0) },
      { kind: 'rock', count: 16, rMin: 9.5, rMax: 16, scale: [0.6, 1.2], colors: col(0x7a8590, 0) },
    ],
  },
  lab: {
    sky: '#05080d', fog: [22, 56], ground: '#0d141b', floor: '#1a2430', ring: '#34e0ff',
    ambient: ['#8fb4d0', 0.7], sun: ['#dff3ff', 1.4],
    grid: { color: '#2a5a78', division: 28 },
    points: [
      { pos: [-10, 3, 10], color: '#34e0ff', intensity: 14 },
      { pos: [10, 3, 10], color: '#34e0ff', intensity: 14 },
    ],
    layers: [
      { kind: 'pillar', count: 14, rMin: FAR, rMax: 25, scale: [1.0, 1.3], colors: col(0x2a3846, 0x34e0ff) },
      { kind: 'machine', count: 12, rMin: 12, rMax: 17, scale: [0.9, 1.3], colors: col(0x3a4858, 0x6a7a8a, 0x34e0ff) },
      { kind: 'crate', count: 8, rMin: 11, rMax: 16, scale: [0.9, 1.3], colors: col(0x4a5868, 0x34e0ff) },
      { kind: 'tower', count: 6, rMin: FAR, rMax: 30, scale: [1.0, 1.4], colors: col(0x2a3846, 0x4a5868, 0x34e0ff) },
    ],
  },
  fortress: {
    sky: '#120808', fog: [20, 54], ground: '#1a0e0e', floor: '#2a1a1a', ring: '#ff3a2a',
    ambient: ['#c07070', 0.6], sun: ['#ffb0a0', 1.3],
    grid: { color: '#7a2a2a', division: 28 },
    points: [
      { pos: [-10, 3, 10], color: '#ff3a2a', intensity: 16 },
      { pos: [10, 3, -10], color: '#ff3a2a', intensity: 16 },
    ],
    layers: [
      { kind: 'pillar', count: 16, rMin: FAR, rMax: 26, scale: [1.1, 1.5], colors: col(0x3a2424, 0xff3a2a) },
      { kind: 'tower', count: 10, rMin: FAR, rMax: 34, scale: [1.2, 1.8], colors: col(0x3a2424, 0x5a3a3a, 0xff3a2a) },
      { kind: 'machine', count: 10, rMin: 12, rMax: 17, scale: [1.0, 1.4], colors: col(0x4a2e2e, 0x6a4a4a, 0xff3a2a) },
    ],
  },
  street: {
    sky: '#0a0c14', fog: [20, 60], ground: '#15171c', floor: '#20232b', ring: '#ff4a3a',
    ambient: ['#7a82a0', 0.55], sun: ['#aab4d8', 1.0],
    points: [
      { pos: [-9, 3.6, 9], color: '#ffb066', intensity: 14 },
      { pos: [9, 3.6, 9], color: '#6ab8ff', intensity: 14 },
    ],
    layers: [
      { kind: 'building', count: 36, rMin: FAR + 2, rMax: 44, scale: [1.0, 1.6], colors: col(0x3a4468, 0, 0xffe0a0) },
      { kind: 'building', count: 14, rMin: FAR + 2, rMax: 44, scale: [1.0, 1.6], colors: col(0x4a3c68, 0, 0x9ae0ff) },
      { kind: 'lamp', count: 12, rMin: 10, rMax: 17, scale: [1.0, 1.1], colors: col(0, 0x4a4e5a, 0xffc880) },
      { kind: 'barrel', count: 8, rMin: 10, rMax: 16, scale: [1.0, 1.2], colors: col(0x6a2a2a, 0x8a8e9a) },
      { kind: 'crate', count: 8, rMin: 10, rMax: 16, scale: [0.9, 1.3], colors: col(0x5a4a38, 0x3a2e24) },
    ],
  },
  rooftop: {
    sky: '#070a12', fog: [14, 46], ground: '#14171d', floor: '#22262e', ring: '#b02a3a',
    ambient: ['#6a7a9a', 0.5], sun: ['#9ab0d8', 0.9], rain: true,
    points: [{ pos: [0, 4, -8], color: '#ff5a6a', intensity: 12 }],
    layers: [
      { kind: 'building', count: 44, rMin: FAR + 3, rMax: 46, scale: [1.0, 1.8], colors: col(0x3c4868, 0, 0xffe0a0) },
      { kind: 'tower', count: 8, rMin: FAR, rMax: 36, scale: [1.0, 1.5], colors: col(0x4a5068, 0x6a7088, 0xff6a7a) },
      { kind: 'machine', count: 10, rMin: 11, rMax: 17, scale: [0.9, 1.2], colors: col(0x3a3e48, 0x5a5e68, 0xff4a5a) },
      { kind: 'barrel', count: 6, rMin: 10, rMax: 16, scale: [1.0, 1.2], colors: col(0x4a4e5a, 0x6a6e7a) },
    ],
  },
  factory: {
    sky: '#140d0a', fog: [18, 56], ground: '#1c1a1a', floor: '#2a2a2e', ring: '#ffc23a',
    ambient: ['#a08070', 0.55], sun: ['#ffd0a0', 1.1],
    grid: { color: '#5a4a2a', division: 26 },
    points: [
      { pos: [-10, 3.5, 10], color: '#ff8a2a', intensity: 14 },
      { pos: [10, 3.5, -10], color: '#ff8a2a', intensity: 14 },
    ],
    layers: [
      { kind: 'machine', count: 18, rMin: 11, rMax: 18, scale: [1.0, 1.5], colors: col(0x4a4040, 0x7a6a5a, 0xff8a2a) },
      { kind: 'pipe', count: 14, rMin: FAR, rMax: 34, scale: [1.0, 1.4], colors: col(0x6a5a4a, 0x3a3030) },
      { kind: 'chimney', count: 7, rMin: 28, rMax: 44, scale: [1.0, 1.4], colors: col(0x3a2e2a, 0x5a4a40, 0xff8a2a) },
      { kind: 'barrel', count: 10, rMin: 10, rMax: 16, scale: [1.0, 1.3], colors: col(0x8a3a1a, 0x5a5a60) },
      { kind: 'crate', count: 10, rMin: 10, rMax: 16, scale: [0.9, 1.4], colors: col(0x5a4a38, 0x3a2e24) },
    ],
  },
  temple: {
    sky: '#1a1f2a', fog: [20, 58], ground: '#3a342c', floor: '#6b6256', ring: '#ffb066',
    ambient: ['#8a90a8', 0.55], sun: ['#ffd8a8', 1.4],
    points: [
      { pos: [-8, 2, 8], color: '#ff9a4a', intensity: 12 },
      { pos: [8, 2, -8], color: '#ff9a4a', intensity: 12 },
    ],
    layers: [
      { kind: 'column', count: 18, rMin: 12, rMax: 19, scale: [1.0, 1.5], colors: col(0x8a8272, 0x6a6256) },
      { kind: 'torii', count: 3, rMin: FAR, rMax: 28, scale: [1.6, 2.2], colors: col(0x9a2a24, 0x6a1a18) },
      { kind: 'lantern', count: 10, rMin: 9.5, rMax: 13, scale: [1.0, 1.2], colors: col(0x7a7262, 0x4a4238, 0xffa850) },
      { kind: 'tree', count: 24, rMin: FAR, rMax: 40, scale: [1.2, 1.9], colors: col(0x2f5a3a, 0x3a2a1a) },
      { kind: 'rock', count: 12, rMin: 9.5, rMax: 18, scale: [0.6, 1.2], colors: col(0x6a6256, 0) },
    ],
  },
  desert: {
    sky: '#e0b070', fog: [24, 66], ground: '#c9a266', floor: '#d9b878', ring: '#b04aff',
    ambient: ['#ffe0b0', 0.8], sun: ['#fff0d0', 2.4],
    layers: [
      { kind: 'dune', count: 18, rMin: FAR + 2, rMax: 48, scale: [2.0, 3.5], colors: col(0xc79a5a, 0) },
      { kind: 'tower', count: 7, rMin: FAR, rMax: 36, scale: [1.0, 1.6], colors: col(0x7a4a2a, 0x5a3a2a, 0xff6a2a) },
      { kind: 'pipe', count: 8, rMin: FAR, rMax: 34, scale: [1.0, 1.3], colors: col(0x8a5a3a, 0x4a3a2a) },
      { kind: 'mesa', count: 8, rMin: FAR + 4, rMax: 48, scale: [1.5, 2.6], colors: col(0xa8703a, 0xc88a52) },
      { kind: 'cactus', count: 8, rMin: FAR, rMax: 34, scale: [1.0, 1.5], colors: col(0x4a7a3a, 0) },
      { kind: 'rock', count: 14, rMin: 9.5, rMax: 16, scale: [0.6, 1.2], colors: col(0x9a7040, 0) },
    ],
  },
};
