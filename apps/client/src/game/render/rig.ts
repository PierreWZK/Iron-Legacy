import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { HeadKind, VisualSpec } from './visuals';

/**
 * Corps humanoïde articulé dessiné en code : squelette de joints nommés, formes modelées (profils
 * de révolution pour le torse et les membres), rendu cel-shading avec contour. Un même squelette
 * sert à tous les personnages ; `pose.ts` pilote les joints par leur nom (les noms et positions
 * des joints ne doivent donc pas changer).
 */
export const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'upperArmL', 'forearmL', 'upperArmR', 'forearmR',
  'thighL', 'shinL', 'thighR', 'shinR', 'tail',
] as const;
export type BoneName = (typeof BONE_NAMES)[number];

/** Élément qui ondule avec le mouvement (écharpe, bandeau, queue de cheval, pan de manteau). */
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

export interface RigOptions {
  /** Épaisseur du contour (m). 0 = pas de contour. */
  outline?: number;
}

// ---------- Géométries partagées ----------

const G = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  cone: new THREE.ConeGeometry(1, 1, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.14),
  sharp: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.14, 10, 24),
};
const UP = new THREE.Vector3(0, 1, 0);

type V3 = [number, number, number];
interface PartOpts {
  p?: V3;
  s?: V3;
  r?: V3;
}

/** Dégradé à 3 paliers du cel-shading. */
const TOON_RAMP = (() => {
  const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

function toon(color: number, emissive = 0): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: TOON_RAMP, emissive: emissive || 0x000000 });
}

function glowMat(color: number, intensity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3 });
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

/** Tige cylindrique entre deux points (bois de cerf, antennes, lames). */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, parent: THREE.Object3D, geo: THREE.BufferGeometry = G.cyl): void {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.scale.set(r, len, r);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  parent.add(m);
}

function vec(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

/** Solide de révolution autour de Y à partir d'un profil [rayon, hauteur] (du haut vers le bas). */
function lathe(profile: Array<[number, number]>): THREE.LatheGeometry {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0008), y)), 20);
}

/** Membre modelé : de `y=0` vers le bas, rayon rTop→rBot avec un renflement musculaire. */
function limbGeo(len: number, rTop: number, rBot: number, bulge = 0.012, at = 0.35): THREE.LatheGeometry {
  const pts: Array<[number, number]> = [[0, 0.004]];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = rTop + (rBot - rTop) * t + bulge * Math.exp(-(((t - at) / 0.28) ** 2));
    pts.push([r, -len * t]);
  }
  pts.push([0, -len - 0.004]);
  return lathe(pts);
}

function group(name: string, parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------- Contour (coque inversée) ----------

const outlineGeoCache = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();

/** Copie à normales lissées (sans coutures) : la coque ne s'ouvre pas sur les arêtes vives. */
function hullGeo(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  let h = outlineGeoCache.get(geo);
  if (!h) {
    h = geo.clone();
    h.deleteAttribute('normal');
    h.deleteAttribute('uv');
    h = mergeVertices(h, 1e-4);
    h.computeVertexNormals();
    outlineGeoCache.set(geo, h);
  }
  return h;
}

function outlineMaterial(thickness: number, color = 0x08090d): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uThick: { value: thickness } },
    vertexShader: `
      uniform float uThick;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        mv.xyz += n * uThick;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }`,
  });
}

function addOutlines(root: THREE.Object3D, thickness: number): void {
  if (thickness <= 0) return;
  const mat = outlineMaterial(thickness);
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  for (const m of meshes) {
    const mm = m.material as THREE.Material;
    if ((mm as THREE.MeshStandardMaterial).emissiveIntensity > 0.5) continue; // pas de contour sur les lueurs
    const hull = new THREE.Mesh(hullGeo(m.geometry), mat);
    hull.name = 'outline';
    m.add(hull);
  }
}

// ---------- Matériaux et utilitaires de dessin ----------

interface Mats {
  skin: THREE.Material;
  suit: THREE.Material;
  trim: THREE.Material;
  glow: THREE.Material;
  hair: THREE.Material;
  glove: THREE.Material;
  boot: THREE.Material;
  dark: THREE.Material;
  white: THREE.Material;
  metal: THREE.Material;
  accentToon: THREE.Material;
}

function addSway(list: Sway[], obj: THREE.Object3D, amp: number, freq: number, phase = 0): void {
  list.push({ obj, amp, freq, phase });
}

/** Yeux (blanc + iris + reflet) de chaque côté du visage, regard vers l'avant. */
function eyes(head: THREE.Object3D, m: Mats, y: number, z: number, x: number, r: number, iris: THREE.Material = m.dark): void {
  for (const s of [-1, 1]) {
    P(G.sphere, m.white, head, { p: [x * s, y, z], s: [r * 1.25, r * 1.05, r * 0.7] });
    P(G.sphere, iris, head, { p: [x * s, y, z + r * 0.4], s: [r * 0.7, r * 0.8, r * 0.4] });
  }
}

/** Sourcils inclinés (expression : 1 = déterminé/furieux, 0 = neutre). */
function brows(head: THREE.Object3D, mat: THREE.Material, y: number, z: number, x: number, w: number, angry: number): void {
  for (const s of [-1, 1]) P(G.box, mat, head, { p: [x * s, y, z], s: [w, 0.014, 0.018], r: [0, 0, -s * 0.5 * angry] });
}

/** Visage humain : mâchoire, oreilles, nez, bouche, yeux, sourcils. */
function face(head: THREE.Group, m: Mats, o: { brow?: number; mouth?: 'line' | 'smirk' | 'open'; browMat?: THREE.Material } = {}): void {
  P(G.sphere, m.skin, head, { p: [0, 0.1, 0], s: [0.11, 0.13, 0.12] }); // crâne
  P(G.sphere, m.skin, head, { p: [0, 0.045, 0.028], s: [0.088, 0.075, 0.09] }); // mâchoire
  P(G.sphere, m.skin, head, { p: [0, 0.01, 0.07], s: [0.04, 0.03, 0.035] }); // menton
  for (const s of [-1, 1]) P(G.sphere, m.skin, head, { p: [0.113 * s, 0.1, -0.005], s: [0.02, 0.04, 0.03] }); // oreilles
  P(G.cone, m.skin, head, { p: [0, 0.088, 0.122], s: [0.016, 0.04, 0.02], r: [Math.PI / 2 - 0.35, 0, 0] }); // nez
  eyes(head, m, 0.118, 0.1, 0.045, 0.02);
  brows(head, o.browMat ?? m.hair, 0.15, 0.108, 0.048, 0.034, o.brow ?? 0.7);
  const mouth = o.mouth ?? 'line';
  if (mouth === 'open') P(G.sphere, m.dark, head, { p: [0, 0.042, 0.108], s: [0.03, 0.014, 0.012] });
  else P(G.box, m.dark, head, { p: [mouth === 'smirk' ? 0.008 : 0, 0.046, 0.112], s: [0.04, 0.007, 0.01], r: [0, 0, mouth === 'smirk' ? 0.18 : 0] });
}

/** Têtes humaines : coiffure, bandeau, cagoule, moustache… */
function humanHead(kind: HeadKind, head: THREE.Group, m: Mats, sway: Sway[]): void {
  switch (kind) {
    case 'karate': { // cheveux en pointes + bandeau à pans
      face(head, m, { brow: 0.9, mouth: 'smirk' });
      P(G.sphere, m.hair, head, { p: [0, 0.158, -0.014], s: [0.117, 0.092, 0.125] });
      for (let i = -2; i <= 2; i++) P(G.cone, m.hair, head, { p: [i * 0.034, 0.225 - Math.abs(i) * 0.012, 0.005], s: [0.03, 0.09, 0.03], r: [0.25, 0, -i * 0.28] });
      P(G.torus, m.glow, head, { p: [0, 0.14, 0], r: [Math.PI / 2, 0, 0], s: [0.122, 0.122, 0.2] });
      const tail = group('band', head, 0, 0.14, -0.12);
      P(G.box, m.glow, tail, { p: [0.02, -0.08, -0.01], s: [0.028, 0.18, 0.008] });
      P(G.box, m.glow, tail, { p: [-0.018, -0.1, -0.012], s: [0.028, 0.2, 0.008] });
      addSway(sway, tail, 0.4, 5, 0);
      break;
    }
    case 'judoka': { // cheveux ras, sourcils calmes, bandeau discret
      face(head, m, { brow: 0.2, mouth: 'line' });
      P(G.sphere, m.hair, head, { p: [0, 0.162, -0.018], s: [0.113, 0.085, 0.122] });
      break;
    }
    case 'boxer': { // queue de cheval haute, frange, serre-tête
      face(head, m, { brow: 0.75, mouth: 'smirk' });
      P(G.sphere, m.hair, head, { p: [0, 0.165, -0.015], s: [0.12, 0.095, 0.127] });
      P(G.box, m.hair, head, { p: [0.03, 0.185, 0.095], s: [0.1, 0.03, 0.04], r: [0.3, 0, -0.35] }); // frange
      P(G.torus, m.accentToon, head, { p: [0, 0.158, 0.0], r: [Math.PI / 2 + 0.2, 0, 0], s: [0.118, 0.118, 0.17] });
      const pony = group('pony', head, 0, 0.2, -0.105);
      P(G.sphere, m.accentToon, pony, { p: [0, 0, 0], s: [0.028, 0.028, 0.028] });
      P(G.sphere, m.hair, pony, { p: [0, -0.06, -0.035], s: [0.05, 0.085, 0.05] });
      P(G.sphere, m.hair, pony, { p: [0, -0.16, -0.05], s: [0.04, 0.09, 0.04] });
      P(G.sphere, m.hair, pony, { p: [0, -0.24, -0.055], s: [0.025, 0.06, 0.025] });
      addSway(sway, pony, 0.35, 4.2, 1);
      break;
    }
    case 'ninja': { // cagoule, fente des yeux, plaque frontale, longs pans de tissu
      P(G.sphere, m.suit, head, { p: [0, 0.1, -0.004], s: [0.123, 0.14, 0.13] });
      P(G.sphere, m.suit, head, { p: [0, 0.04, 0.03], s: [0.095, 0.085, 0.095] });
      P(G.box, m.skin, head, { p: [0, 0.122, 0.115], s: [0.15, 0.042, 0.022] });
      eyes(head, m, 0.122, 0.118, 0.042, 0.015, m.glow);
      brows(head, m.dark, 0.15, 0.12, 0.045, 0.03, 1);
      P(G.torus, m.trim, head, { p: [0, 0.162, 0], r: [Math.PI / 2, 0, 0], s: [0.127, 0.127, 0.2] });
      P(G.box, m.metal, head, { p: [0, 0.162, 0.122], s: [0.06, 0.04, 0.014] }); // plaque
      P(G.sphere, m.glow, head, { p: [0, 0.162, 0.131], s: [0.012, 0.012, 0.006] });
      const tails = group('band', head, 0, 0.162, -0.125);
      P(G.box, m.glow, tails, { p: [0.025, -0.1, -0.01], s: [0.03, 0.22, 0.008] });
      P(G.box, m.glow, tails, { p: [-0.025, -0.13, -0.02], s: [0.03, 0.28, 0.008] });
      addSway(sway, tails, 0.5, 6, 0);
      break;
    }
    case 'wrestler': { // crâne rasé, gros sourcils, moustache à guidon, mâchoire carrée
      face(head, m, { brow: 1, mouth: 'open', browMat: m.dark });
      P(G.box, m.skin, head, { p: [0, 0.04, 0.04], s: [0.13, 0.07, 0.11] }); // mâchoire carrée
      for (const s of [-1, 1]) {
        P(G.sphere, m.dark, head, { p: [0.032 * s, 0.07, 0.118], s: [0.038, 0.016, 0.014], r: [0, 0, -s * 0.2] });
        P(G.sphere, m.dark, head, { p: [0.07 * s, 0.062, 0.1], s: [0.016, 0.016, 0.014] });
      }
      P(G.sphere, m.accentToon, head, { p: [0.117, 0.06, -0.005], s: [0.012, 0.012, 0.012] }); // anneau d'oreille
      break;
    }
    case 'shadow': { // longue mèche sur un œil, lunettes lumineuses relevées
      face(head, m, { brow: 0.8, mouth: 'smirk' });
      P(G.sphere, m.hair, head, { p: [0, 0.165, -0.025], s: [0.126, 0.1, 0.137] });
      P(G.sphere, m.hair, head, { p: [0.045, 0.14, 0.085], s: [0.075, 0.07, 0.04], r: [0.3, 0, -0.5] }); // mèche
      const mane = group('mane', head, 0, 0.13, -0.1);
      P(G.sphere, m.hair, mane, { p: [0, -0.1, -0.02], s: [0.085, 0.18, 0.055] });
      P(G.sphere, m.hair, mane, { p: [0.03, -0.24, -0.03], s: [0.05, 0.12, 0.04] });
      addSway(sway, mane, 0.25, 3.2, 2);
      P(G.box, m.glow, head, { p: [0, 0.178, 0.098], s: [0.15, 0.028, 0.025], r: [0.45, 0, 0] }); // lunettes relevées
      break;
    }
    default:
      face(head, m);
  }
}

/** Têtes animales anthropomorphes : museau, oreilles, cornes, bois, crocs. */
function animalHead(kind: HeadKind, head: THREE.Group, m: Mats): void {
  const fur = m.skin;
  const light = m.trim;
  const cheeks = (y: number, z: number, w: number) => {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) P(G.cone, light, head, { p: [(0.1 + i * 0.012) * s, y - i * 0.028, z], s: [0.03, 0.07, 0.02], r: [0, 0, s * (1.2 + i * 0.15) * w] });
  };
  switch (kind) {
    case 'wolf':
    case 'husky': {
      const husky = kind === 'husky';
      P(G.sphere, fur, head, { p: [0, 0.1, 0], s: [0.108, 0.125, 0.118] });
      P(G.sphere, husky ? light : fur, head, { p: [0, 0.06, 0.13], s: [0.062, 0.05, 0.1] }); // museau
      P(G.sphere, husky ? light : fur, head, { p: [0, 0.03, 0.12], s: [0.05, 0.025, 0.09] }); // mâchoire
      P(G.sphere, m.dark, head, { p: [0, 0.082, 0.222], s: [0.028, 0.022, 0.026] }); // truffe
      if (!husky) for (const s of [-1, 1]) P(G.cone, m.white, head, { p: [0.03 * s, 0.045, 0.19], s: [0.007, 0.03, 0.007], r: [Math.PI, 0, 0] }); // crocs
      for (const s of [-1, 1]) {
        P(G.cone, fur, head, { p: [0.068 * s, 0.225, -0.01], s: [0.052, husky ? 0.12 : 0.15, 0.04], r: [0, 0, -0.22 * s] });
        P(G.cone, m.dark, head, { p: [0.068 * s, 0.22, 0.005], s: [0.03, husky ? 0.09 : 0.11, 0.02], r: [0, 0, -0.22 * s] });
      }
      if (husky) {
        P(G.sphere, light, head, { p: [0, 0.14, 0.09], s: [0.055, 0.075, 0.035] }); // masque blanc
        for (const s of [-1, 1]) P(G.sphere, light, head, { p: [0.05 * s, 0.075, 0.085], s: [0.045, 0.045, 0.05] });
      } else {
        P(G.sphere, light, head, { p: [0, 0.03, -0.04], s: [0.14, 0.12, 0.12] }); // crinière
        cheeks(0.09, 0.0, 1);
      }
      eyes(head, m, 0.125, 0.1, 0.045, 0.02, m.glow);
      brows(head, m.dark, 0.153, 0.106, 0.048, 0.034, 1);
      break;
    }
    case 'fox': {
      P(G.sphere, fur, head, { p: [0, 0.1, 0], s: [0.1, 0.115, 0.11] });
      P(G.cone, fur, head, { p: [0, 0.075, 0.16], s: [0.058, 0.2, 0.058], r: [Math.PI / 2, 0, 0] });
      P(G.sphere, m.dark, head, { p: [0, 0.085, 0.262], s: [0.022, 0.02, 0.022] });
      P(G.sphere, light, head, { p: [0, 0.045, 0.12], s: [0.048, 0.03, 0.08] }); // gorge claire
      for (const s of [-1, 1]) {
        P(G.cone, fur, head, { p: [0.072 * s, 0.245, -0.005], s: [0.06, 0.22, 0.04], r: [0, 0, -0.2 * s] });
        P(G.cone, m.dark, head, { p: [0.072 * s, 0.235, 0.002], s: [0.032, 0.13, 0.02], r: [0, 0, -0.2 * s] });
        P(G.sphere, light, head, { p: [0.085 * s, 0.065, 0.065], s: [0.05, 0.05, 0.06] });
      }
      cheeks(0.08, 0.03, 0.8);
      eyes(head, m, 0.125, 0.098, 0.045, 0.02, m.glow);
      brows(head, m.dark, 0.152, 0.104, 0.048, 0.034, 0.6);
      break;
    }
    case 'bull': {
      P(G.sphere, fur, head, { p: [0, 0.1, 0], s: [0.145, 0.125, 0.14] });
      P(G.box, fur, head, { p: [0, 0.035, 0.13], s: [0.115, 0.09, 0.105] }); // mufle
      P(G.sphere, light, head, { p: [0, 0.04, 0.178], s: [0.075, 0.05, 0.03] });
      P(G.torus, m.accentToon, head, { p: [0, 0.015, 0.19], s: [0.035, 0.035, 0.035] }); // anneau de nez
      P(G.box, fur, head, { p: [0, 0.165, 0.09], s: [0.14, 0.035, 0.06] }); // arcade
      for (const s of [-1, 1]) {
        const a = vec(0.12 * s, 0.2, 0);
        const b = vec(0.22 * s, 0.24, 0.0);
        const c = vec(0.3 * s, 0.34, 0.03);
        const d = vec(0.3 * s, 0.44, 0.07);
        rod(a, b, 0.032, light, head);
        rod(b, c, 0.026, light, head);
        rod(c, d, 0.018, light, head);
        P(G.sphere, light, head, { p: [d.x, d.y, d.z], s: [0.014, 0.014, 0.014] });
        P(G.sphere, fur, head, { p: [0.15 * s, 0.12, -0.03], s: [0.045, 0.028, 0.06] }); // oreilles
      }
      eyes(head, m, 0.128, 0.118, 0.065, 0.021, m.glow);
      brows(head, m.dark, 0.16, 0.122, 0.07, 0.04, 1);
      break;
    }
    case 'stag': {
      P(G.sphere, fur, head, { p: [0, 0.1, 0], s: [0.1, 0.12, 0.115] });
      P(G.sphere, fur, head, { p: [0, 0.065, 0.14], s: [0.052, 0.05, 0.1] });
      P(G.sphere, light, head, { p: [0, 0.04, 0.13], s: [0.045, 0.025, 0.08] });
      P(G.sphere, m.dark, head, { p: [0, 0.078, 0.238], s: [0.026, 0.022, 0.026] });
      P(G.sphere, light, head, { p: [0, 0.0, 0.0], s: [0.07, 0.09, 0.07] }); // fraise de fourrure au cou
      for (const s of [-1, 1]) {
        P(G.cone, fur, head, { p: [0.125 * s, 0.15, -0.03], s: [0.05, 0.14, 0.03], r: [0, 0, -1.1 * s] });
        const v = (x: number, y: number, z: number) => vec(x * s, y, z);
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
      eyes(head, m, 0.125, 0.1, 0.045, 0.018, m.glow);
      brows(head, m.dark, 0.15, 0.105, 0.047, 0.03, 0.2);
      break;
    }
    default:
      break;
  }
}

/** Têtes de robots : crâne arrondi, visière lumineuse, ouïes, antennes ; détails selon `extras`. */
function robotHead(kind: HeadKind, head: THREE.Group, m: Mats, extras: string[]): void {
  const big = kind === 'titan';
  const w = big ? 0.26 : 0.2;
  const h = big ? 0.2 : 0.17;
  const d = big ? 0.23 : 0.19;
  P(G.box, m.trim, head, { p: [0, 0.1, 0], s: [w, h, d] });
  P(G.box, m.suit, head, { p: [0, 0.188, -0.01], s: [w * 0.8, 0.03, d * 0.8] }); // arête de crâne
  P(G.box, m.dark, head, { p: [0, 0.118, d * 0.5 - 0.004], s: [w * 0.88, 0.06, 0.03] }); // visière
  P(G.box, m.glow, head, { p: [0, 0.118, d * 0.5 + 0.012], s: [w * 0.78, 0.028, 0.012] });
  P(G.box, m.suit, head, { p: [0, 0.018, 0.03], s: [w * 0.82, 0.045, d * 0.75] }); // mâchoire
  for (let i = -2; i <= 2; i++) P(G.sharp, m.dark, head, { p: [i * 0.026, 0.02, d * 0.5 - 0.002 + 0.03], s: [0.01, 0.028, 0.008] }); // grille
  for (const s of [-1, 1]) {
    P(G.cyl, m.suit, head, { p: [(w * 0.5 + 0.012) * s, 0.1, 0], r: [0, 0, Math.PI / 2], s: [0.045, 0.028, 0.045] });
    P(G.cyl, m.glow, head, { p: [(w * 0.5 + 0.03) * s, 0.1, 0], r: [0, 0, Math.PI / 2], s: [0.022, 0.01, 0.022] });
    if (big) P(G.cone, m.suit, head, { p: [0.11 * s, 0.3, 0], s: [0.045, 0.24, 0.045], r: [0, 0, -0.35 * s] });
  }
  if (extras.includes('crest')) { // aigrette d'élite
    P(G.box, m.accentToon, head, { p: [0, 0.255, -0.02], s: [0.025, 0.1, 0.17], r: [0.2, 0, 0] });
  }
  if (extras.includes('antenna') && !big) {
    rod(vec(0.06, 0.19, 0), vec(0.075, 0.32, 0), 0.007, m.suit, head);
    P(G.sphere, m.glow, head, { p: [0.075, 0.325, 0], s: [0.02, 0.02, 0.02] });
    rod(vec(-0.06, 0.19, 0), vec(-0.07, 0.26, 0), 0.007, m.suit, head);
  }
  if (extras.includes('hornsRed') && !big) {
    for (const s of [-1, 1]) P(G.cone, m.glow, head, { p: [0.06 * s, 0.23, 0.01], s: [0.022, 0.1, 0.022], r: [0, 0, -0.3 * s] });
  }
  if (extras.includes('helm')) { // casque lourd
    P(G.box, m.metal, head, { p: [0, 0.2, 0], s: [w * 1.08, 0.04, d * 1.1] });
    P(G.box, m.metal, head, { p: [0, 0.255, -0.02], s: [0.06, 0.07, 0.17] });
  }
}

/** Queues d'animaux, balancées par `FighterView` via le joint `tail`. */
function buildTail(kind: NonNullable<VisualSpec['tail']>, tail: THREE.Group, m: Mats): void {
  switch (kind) {
    case 'wolf':
      P(G.cone, m.skin, tail, { p: [0, -0.1, -0.2], s: [0.075, 0.5, 0.075], r: [-1.2, 0, 0] });
      P(G.sphere, m.trim, tail, { p: [0, -0.19, -0.43], s: [0.055, 0.055, 0.075] });
      break;
    case 'fox':
      P(G.sphere, m.skin, tail, { p: [0, -0.05, -0.18], s: [0.09, 0.09, 0.2] });
      P(G.sphere, m.skin, tail, { p: [0, -0.1, -0.4], s: [0.115, 0.115, 0.23] });
      P(G.sphere, m.trim, tail, { p: [0, -0.14, -0.62], s: [0.085, 0.085, 0.15] });
      break;
    case 'husky':
      P(G.cone, m.skin, tail, { p: [0, 0.1, -0.2], s: [0.075, 0.4, 0.075], r: [-2.0, 0, 0] });
      P(G.sphere, m.trim, tail, { p: [0, 0.3, -0.3], s: [0.065, 0.065, 0.09] });
      break;
    case 'bull':
      rod(vec(0, 0, -0.05), vec(0, -0.4, -0.12), 0.018, m.skin, tail);
      P(G.sphere, m.dark, tail, { p: [0, -0.46, -0.13], s: [0.05, 0.08, 0.05] });
      break;
  }
}

/** Main : poing serré (paumes, doigts, pouce) ou gant/patte épais. */
function buildHand(hand: THREE.Group, m: Mats, K: number, spec: VisualSpec, side: number): void {
  const gloved = spec.glove !== null;
  const r = (gloved ? 0.078 : 0.06) * K;
  if (spec.boxy) {
    P(G.box, m.glove, hand, { p: [0, -0.02, 0], s: [r * 1.7, r * 1.7, r * 1.7] });
    for (let i = -1; i <= 1; i++) P(G.box, m.metal, hand, { p: [i * r * 0.5, -r * 0.9, r * 0.5], s: [r * 0.45, r * 0.9, r * 0.5] });
    return;
  }
  P(G.sphere, m.glove, hand, { p: [0, -0.02, 0], s: [r, r * 0.95, r * 1.05] });
  if (gloved) {
    P(G.cyl, m.glove, hand, { p: [0, 0.03, 0], s: [r * 0.78, 0.035, r * 0.78] }); // manchette
  } else {
    for (let i = 0; i < 4; i++) P(G.sphere, m.glove, hand, { p: [(i - 1.5) * r * 0.45, -r * 0.5, r * 0.65], s: [r * 0.27, r * 0.3, r * 0.3] }); // phalanges
    P(G.sphere, m.glove, hand, { p: [side * r * 0.9, -r * 0.1, r * 0.35], s: [r * 0.3, r * 0.4, r * 0.3] }); // pouce
  }
  if (spec.head === 'wolf' || spec.head === 'husky' || spec.head === 'fox' || spec.head === 'bull') {
    for (let i = 0; i < 3; i++) P(G.cone, m.white, hand, { p: [(i - 1) * r * 0.5, -r * 1.15, r * 0.6], s: [r * 0.12, r * 0.4, r * 0.12], r: [0.4, 0, 0] }); // griffes
  }
}

/** Chaussure : semelle, dessus, bout renforcé. */
function buildFoot(foot: THREE.Group, m: Mats, K: number, spec: VisualSpec): void {
  const bare = spec.boot === spec.skin;
  P(G.box, m.dark, foot, { p: [0, -0.043, 0.065], s: [0.115 * K, 0.026, 0.27] }); // semelle
  P(G.sphere, m.boot, foot, { p: [0, -0.014, 0.05], s: [0.062 * K, 0.052, 0.14] });
  P(G.sphere, m.boot, foot, { p: [0, -0.024, 0.155], s: [0.058 * K, 0.04, 0.07] });
  if (!bare && !spec.boxy) P(G.torus, m.trim, foot, { p: [0, 0.02, 0.0], r: [Math.PI / 2, 0, 0], s: [0.058 * K, 0.058 * K, 0.5] }); // revers
  if (spec.boxy) P(G.box, m.metal, foot, { p: [0, 0.0, 0.1], s: [0.1 * K, 0.04, 0.14] });
  if (spec.head === 'wolf' || spec.head === 'husky' || spec.head === 'fox' || spec.head === 'bull') {
    for (let i = -1; i <= 1; i++) P(G.cone, m.white, foot, { p: [i * 0.03 * K, -0.03, 0.225], s: [0.01, 0.04, 0.01], r: [Math.PI / 2, 0, 0] });
  }
}

/** Construit le corps d'un personnage à partir de sa fiche visuelle. */
export function buildRig(spec: VisualSpec, opts: RigOptions = {}): Rig {
  const boxy = spec.boxy;
  const extras = spec.extras ?? [];
  const has = (x: string) => extras.includes(x);
  const m: Mats = {
    skin: toon(spec.skin),
    suit: toon(spec.suit),
    trim: toon(spec.trim),
    glow: glowMat(spec.accent, 1.1),
    hair: toon(spec.hair),
    glove: toon(spec.glove ?? spec.skin),
    boot: toon(spec.boot),
    dark: toon(0x0c0d10),
    white: toon(0xf2f2ee),
    metal: toon(boxy ? 0xaab2bc : 0xb9bdc4),
    accentToon: toon(spec.accent),
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

  // --- Bassin ---
  const hips = group('hips', body, 0, hipsBase, 0);
  const hipMat = spec.outfit === 'wrestler' || spec.outfit === 'sport' || !spec.longPants ? m.suit : pants;
  if (boxy) {
    P(G.box, m.suit, hips, { s: [0.4 * T, 0.2, 0.26 * T] });
    P(G.box, m.metal, hips, { p: [0, -0.02, 0.12 * T], s: [0.2 * T, 0.12, 0.05] });
  } else {
    P(G.sphere, hipMat, hips, { p: [0, -0.01, 0], s: [0.2 * T, 0.12, 0.14 * T] });
  }
  P(G.torus, m.trim, hips, { p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0], s: [0.185 * T, 0.165 * T, 0.2] }); // ceinture
  if (spec.outfit === 'gi') { // nœud de ceinture et deux pans
    P(G.sphere, m.trim, hips, { p: [0.03, 0.065, 0.165 * T], s: [0.042, 0.035, 0.03] });
    const knot = group('knot', hips, 0.03, 0.06, 0.17 * T);
    P(G.box, m.trim, knot, { p: [0.015, -0.1, 0.0], s: [0.03, 0.2, 0.01], r: [0, 0, 0.12] });
    P(G.box, m.trim, knot, { p: [-0.02, -0.09, 0.005], s: [0.03, 0.17, 0.01], r: [0, 0, -0.1] });
    addSway(sway, knot, 0.1, 3, 0);
  }
  if (spec.outfit === 'wrestler') { // ceinture de champion
    P(G.sphere, m.accentToon, hips, { p: [0, 0.07, 0.19 * T], s: [0.085, 0.06, 0.035] });
    P(G.sphere, m.dark, hips, { p: [0, 0.07, 0.2 * T], s: [0.05, 0.035, 0.02] });
    P(G.cyl, m.accentToon, hips, { p: [0, -0.06, 0], s: [0.205 * T, 0.03, 0.145 * T] });
  }
  if (spec.outfit === 'sport') { // short à bande latérale
    for (const s of [-1, 1]) P(G.box, m.trim, hips, { p: [0.19 * s * T, -0.03, 0], s: [0.012, 0.15, 0.07] });
  }
  if (spec.outfit === 'ninja') { // pochettes
    for (const s of [-1, 1]) P(G.box, m.trim, hips, { p: [0.19 * s * T, 0.0, 0.05], s: [0.05, 0.07, 0.07] });
  }
  if (spec.outfit === 'tech') { // pans de manteau qui ondulent
    for (const s of [-1, 1]) {
      const flap = group('flap', hips, 0.12 * s * T, 0.0, -0.1);
      P(G.box, m.suit, flap, { p: [0, -0.2, -0.02], s: [0.1, 0.4, 0.014] });
      P(G.box, m.glow, flap, { p: [0.0, -0.4, -0.02], s: [0.1, 0.012, 0.016] });
      addSway(sway, flap, 0.25, 2.6, s);
    }
  }
  if (has('hipBlades')) for (const s of [-1, 1]) P(G.box, m.metal, hips, { p: [0.21 * s * T, 0, -0.02], s: [0.03, 0.22, 0.08], r: [0, 0, 0.2 * s] });

  // --- Torse ---
  const spine = group('spine', hips, 0, 0.1, 0);
  const chest = group('chest', spine, 0, 0.22, 0);
  if (boxy) {
    P(G.box, chestMat, spine, { p: [0, 0.0, 0], s: [0.3 * T, 0.2, 0.2 * T] }); // abdomen articulé
    P(G.box, chestMat, spine, { p: [0, 0.27, 0], s: [0.5 * T, 0.32, 0.31 * T] });
    P(G.box, m.trim, spine, { p: [0, 0.4, 0.0], s: [0.56 * T, 0.09, 0.34 * T] });
    for (let i = -2; i <= 2; i++) P(G.sharp, m.dark, spine, { p: [i * 0.06 * T, 0.2, 0.155 * T], s: [0.018, 0.1, 0.01] }); // ouïes
  } else {
    const prof: Array<[number, number]> = [
      [0.001, -0.1], [0.165, -0.085], [0.168, 0.02], [0.155, 0.12], [0.185, 0.24], [0.225, 0.36], [0.225, 0.44], [0.16, 0.5], [0.07, 0.535], [0.001, 0.545],
    ];
    const torso = P(lathe(prof.slice().reverse()), chestMat, spine, { s: [T, 1, 0.66 * T] });
    torso.name = 'torso';
    if (spec.bareTorso || spec.outfit === 'wrestler') {
      for (const s of [-1, 1]) {
        P(G.sphere, m.skin, spine, { p: [0.085 * s * T, 0.37, 0.115 * T], s: [0.095 * T, 0.065, 0.05] }); // pectoraux
        for (let i = 0; i < 3; i++) P(G.sphere, m.skin, spine, { p: [0.04 * s * T, 0.26 - i * 0.07, 0.108 * T], s: [0.05 * T, 0.028, 0.025] }); // abdominaux
      }
    }
  }
  switch (spec.outfit) {
    case 'gi': // col croisé
      for (const s of [-1, 1]) {
        P(G.box, m.white, chest, { p: [0.045 * s, 0.1, 0.133 * T], s: [0.06, 0.34, 0.03], r: [0, 0, 0.32 * s] });
        P(G.box, m.trim, chest, { p: [0.045 * s, 0.1, 0.152 * T], s: [0.018, 0.34, 0.012], r: [0, 0, 0.32 * s] });
      }
      P(G.box, m.skin, chest, { p: [0, 0.22, 0.135 * T], s: [0.07, 0.1, 0.02] });
      break;
    case 'sport': // veste crop à bandes + brassière
      P(G.cyl, m.trim, chest, { p: [0, 0.01, 0], s: [0.215 * T, 0.06, 0.14 * T] });
      for (const s of [-1, 1]) P(G.box, m.trim, chest, { p: [0.07 * s * T, 0.14, 0.131 * T], s: [0.018, 0.32, 0.012] });
      P(G.cyl, m.skin, spine, { p: [0, 0.03, 0], s: [0.168 * T, 0.12, 0.112 * T] }); // ventre nu
      break;
    case 'fur': { // fourrure au col + sangles croisées
      P(G.torus, m.trim, chest, { p: [0, 0.3, 0], r: [Math.PI / 2, 0, 0], s: [0.17 * T, 0.12 * T, 0.7] });
      for (let i = 0; i < 6; i++) {
        const a = (i - 2.5) * 0.4;
        P(G.cone, m.trim, chest, { p: [Math.sin(a) * 0.14 * T, 0.31, Math.cos(a) * 0.1 + 0.02], s: [0.05, 0.1, 0.05], r: [Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.8] });
      }
      P(G.box, m.dark, chest, { p: [0, 0.1, 0.14 * T], s: [0.04, 0.5, 0.012], r: [0, 0, 0.7] });
      P(G.box, m.dark, chest, { p: [0, 0.1, 0.14 * T], s: [0.04, 0.5, 0.012], r: [0, 0, -0.7] });
      P(G.sphere, m.accentToon, chest, { p: [0, 0.1, 0.15 * T], s: [0.035, 0.035, 0.02] });
      break;
    }
    case 'wrestler': // bretelles de justaucorps
      for (const s of [-1, 1]) P(G.box, m.suit, chest, { p: [0.11 * s * T, 0.16, 0.12 * T], s: [0.05, 0.4, 0.03], r: [0, 0, -0.08 * s] });
      break;
    case 'robot':
      P(G.cyl, m.glow, chest, { p: [0, 0.11, 0.155 * T], r: [Math.PI / 2, 0, 0], s: [0.065, 0.02, 0.065] }); // noyau
      P(G.torus, m.metal, chest, { p: [0, 0.11, 0.16 * T], s: [0.085, 0.085, 0.4] });
      break;
    case 'ninja': // bandes croisées, sabre dans le dos
      P(G.box, m.trim, chest, { p: [0, 0.12, 0.13 * T], s: [0.04, 0.46, 0.012], r: [0, 0, 0.6] });
      P(G.box, m.trim, chest, { p: [0, 0.12, 0.13 * T], s: [0.04, 0.46, 0.012], r: [0, 0, -0.6] });
      rod(vec(0.13, 0.35, -0.16), vec(-0.17, -0.12, -0.18), 0.018, m.dark, chest);
      rod(vec(-0.17, -0.12, -0.18), vec(-0.24, -0.25, -0.19), 0.011, m.metal, chest);
      P(G.sphere, m.glow, chest, { p: [0.13, 0.36, -0.16], s: [0.022, 0.022, 0.022] });
      break;
    case 'tech': // circuits lumineux + épaulette
      for (const s of [-1, 1]) P(G.box, m.glow, chest, { p: [0.07 * s, 0.1, 0.136 * T], s: [0.012, 0.32, 0.01], r: [0, 0, 0.15 * s] });
      P(G.box, m.glow, chest, { p: [0, 0.22, 0.14 * T], s: [0.15, 0.012, 0.01] });
      break;
  }
  if (has('cape')) {
    const cape = group('cape', chest, 0, 0.3, -0.12);
    P(G.box, m.accentToon, cape, { p: [0, -0.3, -0.02], s: [0.44 * T, 0.7, 0.014] });
    addSway(sway, cape, 0.18, 2.2, 0.8);
  }
  if (has('backpack')) {
    P(G.box, m.metal, chest, { p: [0, 0.12, -0.19 * T], s: [0.3 * T, 0.36, 0.12] });
    for (const s of [-1, 1]) P(G.cyl, m.glow, chest, { p: [0.09 * s * T, 0.0, -0.25 * T], r: [Math.PI / 2, 0, 0], s: [0.035, 0.03, 0.035] });
  }
  if (has('cannons')) for (const s of [-1, 1]) {
    P(G.cyl, m.dark, chest, { p: [0.34 * s * T, 0.44, -0.04], r: [Math.PI / 2, 0, 0], s: [0.05, 0.3, 0.05] });
    P(G.cyl, m.glow, chest, { p: [0.34 * s * T, 0.44, 0.12], r: [Math.PI / 2, 0, 0], s: [0.03, 0.02, 0.03] });
  }

  // --- Cou et tête ---
  const neck = group('neck', chest, 0, 0.3, 0);
  const thick = spec.head === 'bull' ? 1.6 : spec.head === 'wrestler' ? 1.35 : 1;
  if (boxy) {
    P(G.cyl, m.dark, neck, { p: [0, 0.04, 0], s: [0.05, 0.12, 0.05] });
    for (let i = 0; i < 3; i++) P(G.torus, m.metal, neck, { p: [0, 0.0 + i * 0.035, 0], r: [Math.PI / 2, 0, 0], s: [0.055, 0.055, 0.3] });
  } else {
    P(G.cyl, m.skin, neck, { p: [0, 0.04, 0], s: [0.056 * thick, 0.1, 0.056 * thick] });
  }
  if (spec.outfit === 'ninja') {
    P(G.torus, m.glow, neck, { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0], s: [0.078, 0.078, 0.45] });
    const scarf = group('scarf', neck, 0, 0.04, -0.07);
    P(G.box, m.glow, scarf, { p: [0.03, -0.18, -0.03], s: [0.055, 0.38, 0.012] });
    P(G.box, m.glow, scarf, { p: [-0.02, -0.15, -0.05], s: [0.055, 0.3, 0.012] });
    addSway(sway, scarf, 0.45, 5.5, 0.5);
  }
  const head = group('head', neck, 0, 0.1, 0);
  switch (spec.head) {
    case 'wolf': case 'fox': case 'husky': case 'bull': case 'stag':
      animalHead(spec.head, head, m);
      break;
    case 'robot': case 'titan':
      robotHead(spec.head, head, m, extras);
      break;
    default:
      humanHead(spec.head, head, m, sway);
  }

  // --- Bras ---
  const arm = (side: 'L' | 'R', sx: number) => {
    const shoulder = group(`shoulder${side}`, chest, sx * 0.3 * S, 0.22, 0);
    if (boxy) {
      P(G.box, m.trim, shoulder, { s: [0.2 * K, 0.13 * K, 0.2 * K] });
      P(G.box, m.metal, shoulder, { p: [sx * 0.04, 0.07, 0], s: [0.17 * K, 0.04, 0.18 * K], r: [0, 0, sx * -0.15] });
    } else if (spec.bareTorso) {
      P(G.sphere, m.skin, shoulder, { s: [0.11 * K, 0.09 * K, 0.1 * K] }); // deltoïde
    } else {
      P(G.sphere, spec.longSleeves ? m.suit : m.skin, shoulder, { s: [0.09 * K, 0.07 * K, 0.088 * K] });
    }
    if (spec.outfit === 'fur') for (let i = 0; i < 3; i++) P(G.cone, m.trim, shoulder, { p: [sx * 0.06, 0.07 - i * 0.02, (i - 1) * 0.06], s: [0.035, 0.09, 0.035], r: [0, 0, -sx * 1.2] }); // fourrure d'épaule
    if (has('spikes')) for (let i = 0; i < 3; i++) P(G.cone, m.metal, shoulder, { p: [sx * 0.04, 0.12 + i * 0.01, (i - 1) * 0.05], s: [0.025, 0.1, 0.025], r: [0, 0, -sx * 0.3] });
    const upper = group(`upperArm${side}`, shoulder);
    const upperGeo = boxy ? limbGeo(0.3, 0.052 * K, 0.046 * K, 0.004) : limbGeo(0.3, 0.062 * K, 0.046 * K, 0.014 * K, 0.3);
    P(upperGeo, boxy ? m.dark : sleeve, upper);
    const fore = group(`forearm${side}`, upper, 0, -0.3, 0);
    P(G.sphere, boxy ? m.metal : sleeve, fore, { s: [0.054 * K, 0.054 * K, 0.054 * K] }); // coude
    const foreGeo = boxy ? limbGeo(0.27, 0.058 * K, 0.05 * K, 0.006) : limbGeo(0.27, 0.052 * K, 0.04 * K, 0.014 * K, 0.25);
    P(foreGeo, boxy ? m.suit : sleeve, fore);
    if (boxy) P(G.box, m.metal, fore, { p: [0, -0.1, 0], s: [0.13 * K, 0.14, 0.13 * K] }); // plaque d'avant-bras
    if (spec.outfit === 'ninja') for (let i = 0; i < 4; i++) P(G.torus, m.trim, fore, { p: [0, -0.13 - i * 0.03, 0], r: [Math.PI / 2, 0, 0], s: [0.047 * K, 0.047 * K, 0.4] }); // bandages
    else if (spec.outfit === 'gi') P(G.torus, m.white, fore, { p: [0, -0.2, 0], r: [Math.PI / 2, 0, 0], s: [0.05 * K, 0.05 * K, 0.7] });
    else if (spec.outfit === 'wrestler') P(G.cyl, m.white, fore, { p: [0, -0.2, 0], s: [0.05 * K, 0.07, 0.05 * K] }); // bande de poignet
    else if (spec.outfit === 'tech' || spec.outfit === 'sport') P(G.torus, m.glow, fore, { p: [0, -0.2, 0], r: [Math.PI / 2, 0, 0], s: [0.05 * K, 0.05 * K, 0.5] });
    else if (spec.outfit === 'robot') P(G.torus, m.glow, fore, { p: [0, -0.22, 0], r: [Math.PI / 2, 0, 0], s: [0.055 * K, 0.055 * K, 0.4] });
    if (has('bladeArms')) rod(vec(0, -0.18, 0.06), vec(0, -0.3, 0.3), 0.012, m.metal, fore, G.sharp);
    const hand = group(`hand${side}`, fore, 0, -0.29, 0);
    buildHand(hand, m, K, spec, sx);
    return { upper, fore };
  };

  // --- Jambes ---
  const leg = (side: 'L' | 'R', sx: number) => {
    const thigh = group(`thigh${side}`, hips, sx * 0.11 * T, -0.05, 0);
    const thighGeo = boxy ? limbGeo(thighLen, 0.07 * K, 0.06 * K, 0.004) : limbGeo(thighLen, 0.1 * K, 0.062 * K, 0.016 * K, 0.3);
    P(thighGeo, boxy ? m.dark : pants, thigh);
    if (boxy) P(G.box, m.suit, thigh, { p: [0, -thighLen * 0.45, 0.012], s: [0.14 * K, thighLen * 0.5, 0.15 * K] });
    const shin = group(`shin${side}`, thigh, 0, -thighLen, 0);
    P(G.sphere, boxy ? m.metal : pants, shin, { s: [0.072 * K, 0.07 * K, 0.072 * K] }); // genou
    const shinGeo = boxy ? limbGeo(shinLen, 0.06 * K, 0.05 * K, 0.004) : limbGeo(shinLen, 0.066 * K, 0.044 * K, 0.014 * K, 0.25);
    P(shinGeo, boxy ? m.dark : pants, shin);
    if (boxy) {
      P(G.box, m.metal, shin, { p: [0, -0.04, 0.05], s: [0.13 * K, 0.12, 0.07] }); // genouillère
      P(G.box, m.suit, shin, { p: [0, -shinLen * 0.55, 0.03], s: [0.12 * K, shinLen * 0.5, 0.13 * K] });
    }
    if (spec.outfit === 'wrestler') {
      P(G.sphere, m.glow, shin, { p: [0, 0, 0.05], s: [0.08, 0.08, 0.05] }); // genouillère
      P(G.cyl, m.white, shin, { p: [0, -shinLen + 0.1, 0], s: [0.058, 0.09, 0.058] }); // chaussette
    }
    if (spec.outfit === 'ninja') for (let i = 0; i < 4; i++) P(G.torus, m.trim, shin, { p: [0, -shinLen * 0.55 - i * 0.03, 0], r: [Math.PI / 2, 0, 0], s: [0.05 * K, 0.05 * K, 0.4] });
    if (spec.outfit === 'fur') P(G.cyl, m.trim, shin, { p: [0, -shinLen + 0.1, 0], s: [0.062 * K, 0.07, 0.062 * K] }); // manchette de fourrure
    const foot = group(`foot${side}`, shin, 0, -shinLen, 0);
    buildFoot(foot, m, K, spec);
    return { thigh, shin };
  };

  const aL = arm('L', 1);
  const aR = arm('R', -1);
  const lL = leg('L', 1);
  const lR = leg('R', -1);

  const tail = group('tail', hips, 0, 0, -0.12);
  if (spec.tail) buildTail(spec.tail, tail, m);

  addOutlines(root, opts.outline ?? 0.012);

  return {
    root, rotor, hipsBase, pivotH, sway,
    bones: {
      hips, spine, chest, neck, head,
      upperArmL: aL.upper, forearmL: aL.fore, upperArmR: aR.upper, forearmR: aR.fore,
      thighL: lL.thigh, shinL: lL.shin, thighR: lR.thigh, shinR: lR.shin, tail,
    },
  };
}
