import * as THREE from 'three';
import type { HeadKind, VisualSpec } from './visuals';

/**
 * Corps humanoïde articulé dessiné en code (squelette de joints nommés + formes simples).
 * Un même squelette sert à tous les personnages : seules les proportions, couleurs, tête, tenue et
 * accessoires changent (voir visuals.ts). `pose.ts` pilote les joints par leur nom.
 */
export const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'upperArmL', 'forearmL', 'upperArmR', 'forearmR',
  'thighL', 'shinL', 'thighR', 'shinR', 'tail',
] as const;
export type BoneName = (typeof BONE_NAMES)[number];

/** Élément qui ondule avec le mouvement (écharpe, bandeau, queue de cheval). */
export interface Sway {
  obj: THREE.Object3D;
  amp: number;
  freq: number;
  phase: number;
}

export interface Rig {
  /** Position dans le monde ; son origine est le centre du corps (pivot des rotations). */
  root: THREE.Group;
  /** Rotations globales du corps (chute, projection) autour du centre. */
  rotor: THREE.Group;
  bones: Record<BoneName, THREE.Group>;
  /** Hauteur du bassin au repos (avant échelle). */
  hipsBase: number;
  /** Hauteur du centre du corps (m) : `root.y` pour avoir les pieds au sol. */
  pivotH: number;
  sway: Sway[];
}

const G = {
  sphere: new THREE.SphereGeometry(1, 14, 10),
  cone: new THREE.ConeGeometry(1, 1, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  box: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.14, 8, 20),
};
const UP = new THREE.Vector3(0, 1, 0);

type V3 = [number, number, number];
interface PartOpts {
  p?: V3;
  s?: V3;
  r?: V3;
}

function std(color: number, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/** Ajoute une forme (géométrie partagée, mise à l'échelle par `s`). */
function P(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, o: PartOpts = {}): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  if (o.p) m.position.set(...o.p);
  if (o.s) m.scale.set(...o.s);
  if (o.r) m.rotation.set(...o.r);
  parent.add(m);
  return m;
}

/** Tige cylindrique entre deux points (bois de cerf, antennes, piques). */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, parent: THREE.Object3D): void {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = new THREE.Mesh(G.cyl, mat);
  m.castShadow = true;
  m.scale.set(r, len, r);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  parent.add(m);
}

function limbGeo(len: number, rTop: number, rBot: number): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, 10, 1);
  g.translate(0, -len / 2, 0);
  return g;
}

function group(name: string, parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

interface Mats {
  skin: THREE.Material;
  suit: THREE.Material;
  trim: THREE.Material;
  glow: THREE.Material;
  hair: THREE.Material;
  glove: THREE.Material;
  boot: THREE.Material;
  dark: THREE.Material;
}

function addSway(list: Sway[], obj: THREE.Object3D, amp: number, freq: number, phase = 0): void {
  list.push({ obj, amp, freq, phase });
}

/** Œil sphérique de chaque côté du visage. */
function eyes(head: THREE.Object3D, mat: THREE.Material, y: number, z: number, x: number, r: number): void {
  for (const s of [-1, 1]) P(G.sphere, mat, head, { p: [x * s, y, z], s: [r, r, r] });
}

/** Têtes humaines : coiffure, bandeau, masque, moustache… */
function humanHead(kind: HeadKind, head: THREE.Group, m: Mats, sway: Sway[]): void {
  P(G.sphere, m.skin, head, { p: [0, 0.1, 0], s: [0.11, 0.13, 0.12] }); // crâne
  eyes(head, m.dark, 0.12, 0.105, 0.045, 0.016);
  switch (kind) {
    case 'karate': // cheveux courts + bandeau à pans
    case 'judoka': {
      P(G.sphere, m.hair, head, { p: [0, 0.155, -0.012], s: [0.118, 0.1, 0.125] });
      if (kind === 'karate') {
        P(G.torus, m.glow, head, { p: [0, 0.135, 0], r: [Math.PI / 2, 0, 0], s: [0.122, 0.122, 0.2] });
        const tail = group('band', head, 0, 0.135, -0.12);
        P(G.box, m.glow, tail, { p: [0.02, -0.08, -0.01], s: [0.025, 0.17, 0.008] });
        addSway(sway, tail, 0.4, 5, 0);
      }
      break;
    }
    case 'boxer': { // queue de cheval
      P(G.sphere, m.hair, head, { p: [0, 0.16, -0.015], s: [0.12, 0.1, 0.127] });
      const pony = group('pony', head, 0, 0.19, -0.1);
      P(G.sphere, m.hair, pony, { p: [0, -0.04, -0.03], s: [0.04, 0.06, 0.04] });
      P(G.sphere, m.hair, pony, { p: [0, -0.12, -0.04], s: [0.035, 0.07, 0.035] });
      addSway(sway, pony, 0.35, 4.2, 1);
      break;
    }
    case 'ninja': { // cagoule, fente des yeux, bandeau, écharpe
      P(G.sphere, m.suit, head, { p: [0, 0.105, -0.004], s: [0.122, 0.14, 0.13] });
      P(G.box, m.skin, head, { p: [0, 0.118, 0.118], s: [0.15, 0.045, 0.02] });
      eyes(head, m.dark, 0.122, 0.127, 0.04, 0.012);
      P(G.torus, m.glow, head, { p: [0, 0.155, 0], r: [Math.PI / 2, 0, 0], s: [0.125, 0.125, 0.2] });
      const tails = group('band', head, 0, 0.155, -0.125);
      P(G.box, m.glow, tails, { p: [0.025, -0.08, -0.01], s: [0.03, 0.17, 0.008] });
      P(G.box, m.glow, tails, { p: [-0.025, -0.1, -0.02], s: [0.03, 0.2, 0.008] });
      addSway(sway, tails, 0.5, 6, 0);
      break;
    }
    case 'wrestler': { // crâne rasé, moustache
      P(G.box, m.hair, head, { p: [0, 0.075, 0.114], s: [0.11, 0.022, 0.02] });
      break;
    }
    case 'shadow': { // longue chevelure + bandeau lumineux
      P(G.sphere, m.hair, head, { p: [0, 0.16, -0.02], s: [0.125, 0.105, 0.135] });
      const mane = group('mane', head, 0, 0.12, -0.1);
      P(G.sphere, m.hair, mane, { p: [0, -0.1, -0.02], s: [0.075, 0.17, 0.05] });
      addSway(sway, mane, 0.25, 3.2, 2);
      P(G.box, m.glow, head, { p: [0, 0.125, 0.112], s: [0.15, 0.03, 0.02] });
      break;
    }
    default:
      break;
  }
}

/** Têtes animales anthropomorphes : museau, oreilles, cornes, bois. */
function animalHead(kind: HeadKind, head: THREE.Group, m: Mats): void {
  const fur = m.skin;
  const light = m.trim;
  switch (kind) {
    case 'wolf':
    case 'husky': {
      P(G.sphere, fur, head, { p: [0, 0.1, 0], s: [0.105, 0.12, 0.115] });
      P(G.box, kind === 'husky' ? light : fur, head, { p: [0, 0.075, 0.14], s: [0.07, 0.06, 0.16] });
      P(G.sphere, m.dark, head, { p: [0, 0.088, 0.222], s: [0.03, 0.025, 0.03] });
      for (const s of [-1, 1]) {
        P(G.cone, fur, head, { p: [0.065 * s, 0.225, -0.01], s: [0.045, kind === 'husky' ? 0.11 : 0.14, 0.04], r: [0, 0, -0.25 * s] });
        P(G.sphere, light, head, { p: [0.085 * s, 0.07, 0.04], s: [0.04, 0.05, 0.05] });
      }
      if (kind === 'husky') P(G.sphere, light, head, { p: [0, 0.13, 0.085], s: [0.06, 0.06, 0.04] });
      else P(G.sphere, m.trim, head, { p: [0, 0.04, -0.045], s: [0.14, 0.12, 0.12] }); // crinière
      eyes(head, m.glow, 0.125, 0.1, 0.045, 0.018);
      break;
    }
    case 'fox': {
      P(G.sphere, fur, head, { p: [0, 0.1, 0], s: [0.1, 0.115, 0.11] });
      P(G.cone, fur, head, { p: [0, 0.075, 0.16], s: [0.06, 0.2, 0.06], r: [Math.PI / 2, 0, 0] });
      P(G.sphere, m.dark, head, { p: [0, 0.085, 0.265], s: [0.025, 0.022, 0.025] });
      for (const s of [-1, 1]) {
        P(G.cone, fur, head, { p: [0.07 * s, 0.24, -0.005], s: [0.055, 0.2, 0.04], r: [0, 0, -0.2 * s] });
        P(G.cone, m.dark, head, { p: [0.07 * s, 0.23, 0.0], s: [0.03, 0.12, 0.02], r: [0, 0, -0.2 * s] });
        P(G.sphere, light, head, { p: [0.08 * s, 0.065, 0.06], s: [0.05, 0.05, 0.06] });
      }
      eyes(head, m.glow, 0.125, 0.098, 0.045, 0.018);
      break;
    }
    case 'bull': {
      P(G.sphere, fur, head, { p: [0, 0.1, 0], s: [0.14, 0.125, 0.135] });
      P(G.box, fur, head, { p: [0, 0.04, 0.13], s: [0.11, 0.085, 0.1] });
      P(G.torus, light, head, { p: [0, 0.03, 0.185], s: [0.035, 0.035, 0.035] });
      for (const s of [-1, 1]) {
        P(G.cone, light, head, { p: [0.14 * s, 0.2, 0], s: [0.035, 0.22, 0.035], r: [0, 0, -1.0 * s] });
        P(G.box, fur, head, { p: [0.15 * s, 0.12, -0.03], s: [0.07, 0.02, 0.045], r: [0, 0, -0.3 * s] });
      }
      eyes(head, m.glow, 0.13, 0.115, 0.06, 0.02);
      break;
    }
    case 'stag': {
      P(G.sphere, fur, head, { p: [0, 0.1, 0], s: [0.1, 0.12, 0.115] });
      P(G.box, fur, head, { p: [0, 0.07, 0.15], s: [0.055, 0.055, 0.18] });
      P(G.sphere, m.dark, head, { p: [0, 0.08, 0.245], s: [0.028, 0.024, 0.028] });
      for (const s of [-1, 1]) {
        P(G.box, fur, head, { p: [0.12 * s, 0.14, -0.03], s: [0.09, 0.02, 0.05], r: [0, 0, -0.5 * s] });
        const v = (x: number, y: number, z: number) => new THREE.Vector3(x * s, y, z);
        const base = v(0.05, 0.2, -0.02);
        const p1 = v(0.12, 0.36, -0.08);
        const p2 = v(0.18, 0.52, -0.12);
        const p3 = v(0.16, 0.66, -0.1);
        rod(base, p1, 0.016, light, head);
        rod(p1, p2, 0.014, light, head);
        rod(p2, p3, 0.012, light, head);
        rod(p1, v(0.22, 0.46, 0.0), 0.011, light, head);
        rod(p2, v(0.27, 0.64, -0.02), 0.011, light, head);
        rod(p2, v(0.24, 0.7, -0.22), 0.011, light, head);
      }
      eyes(head, m.glow, 0.125, 0.1, 0.045, 0.016);
      break;
    }
    default:
      break;
  }
}

/** Têtes de robots : bloc métallique, visière lumineuse, antenne, cornes pour le boss. */
function robotHead(kind: HeadKind, head: THREE.Group, m: Mats): void {
  const big = kind === 'titan';
  P(G.box, m.trim, head, { p: [0, 0.1, 0], s: [big ? 0.25 : 0.2, big ? 0.2 : 0.17, big ? 0.22 : 0.19] });
  P(G.box, m.glow, head, { p: [0, 0.12, big ? 0.115 : 0.1], s: [big ? 0.21 : 0.17, 0.05, 0.02] });
  P(G.box, m.suit, head, { p: [0, 0.015, 0.03], s: [big ? 0.2 : 0.16, 0.04, big ? 0.17 : 0.14] }); // mâchoire
  for (const s of [-1, 1]) {
    P(G.cyl, m.suit, head, { p: [(big ? 0.135 : 0.108) * s, 0.1, 0], r: [0, 0, Math.PI / 2], s: [0.04, 0.025, 0.04] });
    if (big) P(G.cone, m.suit, head, { p: [0.1 * s, 0.27, 0], s: [0.04, 0.2, 0.04], r: [0, 0, -0.35 * s] });
  }
  if (!big) {
    rod(new THREE.Vector3(0.05, 0.19, 0), new THREE.Vector3(0.06, 0.3, 0), 0.008, m.suit, head);
    P(G.sphere, m.glow, head, { p: [0.06, 0.305, 0], s: [0.02, 0.02, 0.02] });
  }
}

/** Queues d'animaux : visibles, balancées par `FighterView` via le joint `tail`. */
function buildTail(kind: NonNullable<VisualSpec['tail']>, tail: THREE.Group, m: Mats): void {
  switch (kind) {
    case 'wolf':
      P(G.cone, m.skin, tail, { p: [0, -0.1, -0.2], s: [0.07, 0.5, 0.07], r: [-1.2, 0, 0] });
      P(G.sphere, m.trim, tail, { p: [0, -0.19, -0.42], s: [0.05, 0.05, 0.06] });
      break;
    case 'fox':
      P(G.sphere, m.skin, tail, { p: [0, -0.05, -0.18], s: [0.09, 0.09, 0.2] });
      P(G.sphere, m.skin, tail, { p: [0, -0.1, -0.4], s: [0.11, 0.11, 0.22] });
      P(G.sphere, m.trim, tail, { p: [0, -0.14, -0.6], s: [0.08, 0.08, 0.14] });
      break;
    case 'husky':
      P(G.cone, m.skin, tail, { p: [0, 0.1, -0.2], s: [0.07, 0.4, 0.07], r: [-2.0, 0, 0] });
      P(G.sphere, m.trim, tail, { p: [0, 0.3, -0.3], s: [0.06, 0.06, 0.08] });
      break;
    case 'bull':
      rod(new THREE.Vector3(0, 0, -0.05), new THREE.Vector3(0, -0.4, -0.12), 0.018, m.skin, tail);
      P(G.sphere, m.dark, tail, { p: [0, -0.45, -0.13], s: [0.045, 0.07, 0.045] });
      break;
  }
}

/** Construit le corps d'un personnage à partir de sa fiche visuelle. */
export function buildRig(spec: VisualSpec): Rig {
  const boxy = spec.boxy;
  const m: Mats = {
    skin: std(spec.skin, boxy ? 0.45 : 0.7, boxy ? 0.2 : 0),
    suit: std(spec.suit, boxy ? 0.5 : 0.8, boxy ? 0.15 : 0),
    trim: std(spec.trim, 0.5, boxy ? 0.2 : 0.05),
    glow: new THREE.MeshStandardMaterial({ color: spec.accent, emissive: spec.accent, emissiveIntensity: 0.9, roughness: 0.3 }),
    hair: std(spec.hair, 0.9),
    glove: std(spec.glove ?? spec.skin, 0.7),
    boot: std(spec.boot, 0.75),
    dark: std(0x0c0d10, 0.5),
  };
  const sway: Sway[] = [];
  const K = spec.limbs;
  const S = spec.shoulders;
  const T = spec.torso;
  const L = spec.legs;
  const thighLen = 0.45 * L;
  const shinLen = 0.43 * L;
  const hipsBase = 0.07 + thighLen + shinLen - 0.02 + 0.05; // pieds au sol quand le bassin est à hipsBase
  const pivotH = 0.9 * spec.height;

  const root = new THREE.Group();
  const rotor = group('rotor', root);
  const body = group('body', rotor, 0, -pivotH, 0);
  body.scale.setScalar(spec.height);

  const sleeve = spec.longSleeves ? m.suit : m.skin;
  const pants = spec.longPants ? m.suit : m.skin;
  const chestMat = spec.bareTorso ? m.skin : m.suit;

  const hips = group('hips', body, 0, hipsBase, 0);
  P(G.cyl, spec.outfit === 'wrestler' || spec.outfit === 'sport' || !spec.longPants ? m.suit : pants, hips, { s: [0.2 * T, 0.2, 0.14 * T] });
  P(G.torus, m.trim, hips, { r: [Math.PI / 2, 0, 0], s: [0.19 * T, 0.19 * T, 0.2] }); // ceinture
  if (spec.outfit === 'gi') {
    P(G.box, m.trim, hips, { p: [0, -0.02, 0.17 * T], s: [0.05, 0.05, 0.03] });
    P(G.box, m.trim, hips, { p: [0.025, -0.1, 0.17 * T], s: [0.025, 0.14, 0.012] });
  }
  if (spec.outfit === 'wrestler') P(G.torus, m.glow, hips, { r: [Math.PI / 2, 0, 0], s: [0.2 * T, 0.2 * T, 0.5] });

  const spine = group('spine', hips, 0, 0.1, 0);
  const chest = group('chest', spine, 0, 0.22, 0);
  if (boxy) {
    P(G.box, chestMat, spine, { p: [0, 0.2, 0], s: [0.46 * T, 0.5, 0.3 * T] });
  } else {
    P(G.cyl, chestMat, spine, { p: [0, 0.2, 0], s: [0.22 * T, 0.5, 0.14 * T] });
  }
  switch (spec.outfit) {
    case 'gi':
      for (const s of [-1, 1]) P(G.box, m.suit, chest, { p: [0.05 * s, 0.1, 0.13 * T], s: [0.1, 0.34, 0.03], r: [0, 0, 0.35 * s] });
      break;
    case 'sport':
      P(G.cyl, m.trim, chest, { p: [0, 0.03, 0], s: [0.22 * T, 0.09, 0.145 * T] });
      break;
    case 'fur':
      P(G.sphere, m.trim, chest, { p: [0, 0.07, 0.11 * T], s: [0.15 * T, 0.2, 0.09] });
      break;
    case 'wrestler':
      for (const s of [-1, 1]) P(G.sphere, m.skin, chest, { p: [0.09 * s * T, 0.09, 0.12 * T], s: [0.1 * T, 0.08, 0.06] });
      break;
    case 'robot':
      P(G.sphere, m.glow, chest, { p: [0, 0.08, 0.15 * T], s: [0.07, 0.07, 0.04] });
      P(G.box, m.trim, chest, { p: [0, 0.2, 0.0], s: [0.5 * T, 0.06, 0.32 * T] });
      break;
    case 'ninja':
      P(G.torus, m.glow, hips, { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0], s: [0.2 * T, 0.2 * T, 0.2] });
      break;
    case 'tech':
      for (const s of [-1, 1]) P(G.box, m.glow, chest, { p: [0.07 * s, 0.1, 0.133 * T], s: [0.012, 0.3, 0.01], r: [0, 0, 0.15 * s] });
      break;
  }

  const neck = group('neck', chest, 0, 0.3, 0);
  P(G.cyl, m.skin, neck, { p: [0, 0.04, 0], s: [0.055 * (spec.head === 'bull' ? 1.6 : 1), 0.1, 0.055 * (spec.head === 'bull' ? 1.6 : 1)] });
  if (spec.outfit === 'ninja') {
    P(G.torus, m.glow, neck, { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0], s: [0.075, 0.075, 0.4] });
    const scarf = group('scarf', neck, 0, 0.04, -0.07);
    P(G.box, m.glow, scarf, { p: [0.03, -0.17, -0.03], s: [0.05, 0.34, 0.012] });
    P(G.box, m.glow, scarf, { p: [-0.02, -0.14, -0.05], s: [0.05, 0.28, 0.012] });
    addSway(sway, scarf, 0.45, 5.5, 0.5);
  }
  const head = group('head', neck, 0, 0.1, 0);
  switch (spec.head) {
    case 'wolf': case 'fox': case 'husky': case 'bull': case 'stag':
      animalHead(spec.head, head, m);
      break;
    case 'robot': case 'titan':
      robotHead(spec.head, head, m);
      break;
    default:
      humanHead(spec.head, head, m, sway);
  }

  const arm = (side: 'L' | 'R', sx: number) => {
    const shoulder = group(`shoulder${side}`, chest, sx * 0.3 * S, 0.22, 0);
    if (spec.outfit === 'robot') P(G.box, m.trim, shoulder, { s: [0.17 * K, 0.1 * K, 0.17 * K] });
    else P(G.sphere, spec.longSleeves ? m.suit : m.skin, shoulder, { s: [0.085 * K, 0.06 * K, 0.085 * K] });
    const upper = group(`upperArm${side}`, shoulder);
    P(limbGeo(0.3, 0.06 * K, 0.05 * K), sleeve, upper);
    const fore = group(`forearm${side}`, upper, 0, -0.3, 0);
    P(G.sphere, boxy ? m.trim : sleeve, fore, { s: [0.052 * K, 0.052 * K, 0.052 * K] });
    P(limbGeo(0.27, 0.05 * K, 0.04 * K), spec.outfit === 'robot' ? m.suit : sleeve, fore);
    if (spec.outfit === 'ninja' || spec.outfit === 'tech' || spec.outfit === 'gi' || spec.outfit === 'sport' || spec.outfit === 'robot') {
      P(G.torus, m.glow, fore, { p: [0, -0.2, 0], r: [Math.PI / 2, 0, 0], s: [0.05 * K, 0.05 * K, 0.5] }); // bracelet
    }
    const hand = group(`hand${side}`, fore, 0, -0.29, 0);
    const handR = (spec.glove !== null ? 0.075 : 0.06) * K;
    if (boxy) P(G.box, m.glove, hand, { s: [handR * 1.5, handR * 1.5, handR * 1.5] });
    else P(G.sphere, m.glove, hand, { s: [handR, handR, handR] });
    return { upper, fore };
  };
  const leg = (side: 'L' | 'R', sx: number) => {
    const thigh = group(`thigh${side}`, hips, sx * 0.11 * T, -0.05, 0);
    P(limbGeo(thighLen, 0.095 * K, 0.065 * K), pants, thigh);
    const shin = group(`shin${side}`, thigh, 0, -thighLen, 0);
    P(G.sphere, boxy ? m.trim : pants, shin, { s: [0.07 * K, 0.07 * K, 0.07 * K] });
    P(limbGeo(shinLen, 0.065 * K, 0.045 * K), pants, shin);
    if (spec.outfit === 'wrestler') P(G.sphere, m.glow, shin, { p: [0, 0, 0.05], s: [0.075, 0.075, 0.045] }); // genouillère
    const foot = group(`foot${side}`, shin, 0, -shinLen, 0);
    P(G.box, m.boot, foot, { p: [0, -0.02, 0.06], s: [0.11 * K, 0.07, 0.26] });
    return { thigh, shin };
  };

  const aL = arm('L', 1);
  const aR = arm('R', -1);
  const lL = leg('L', 1);
  const lR = leg('R', -1);

  const tail = group('tail', hips, 0, 0, -0.12);
  if (spec.tail) buildTail(spec.tail, tail, m);

  return {
    root, rotor, hipsBase, pivotH, sway,
    bones: {
      hips, spine, chest, neck, head,
      upperArmL: aL.upper, forearmL: aL.fore, upperArmR: aR.upper, forearmR: aR.fore,
      thighL: lL.thigh, shinL: lL.shin, thighR: lR.thigh, shinR: lR.shin, tail,
    },
  };
}
