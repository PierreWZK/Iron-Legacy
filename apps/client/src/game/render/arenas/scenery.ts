import * as THREE from 'three';

/** Bibliothèque d'éléments de décor dessinés en code (formes simples, matériaux partagés). */
export type Rnd = () => number;

/** Générateur pseudo-aléatoire à graine : un décor est identique à chaque chargement. */
export function mulberry32(seed: number): Rnd {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PropKind =
  | 'tree' | 'pine' | 'deadTree' | 'rock' | 'bush' | 'cactus' | 'pillar' | 'column' | 'crate' | 'barrel'
  | 'lamp' | 'building' | 'pipe' | 'tower' | 'torii' | 'iceSpike' | 'snowMound' | 'lantern' | 'machine'
  | 'chimney' | 'dune' | 'mesa'
  // Modèles 3D uniquement (voir envModels.ts).
  | 'grass' | 'wall' | 'gate' | 'floorLight' | 'block';

export interface PropColors {
  /** Couleur principale (feuillage, façade, pierre…). */
  primary: number;
  /** Couleur secondaire (tronc, structure…). */
  secondary: number;
  /** Couleur lumineuse (fenêtres, voyants, lanternes). */
  accent: number;
  /** Variante de textures des modèles 3D (panneaux rouges de la forteresse). */
  skin?: 'red';
}

const geo = {
  sphere: new THREE.SphereGeometry(1, 10, 8),
  cone: new THREE.ConeGeometry(1, 1, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  rock: new THREE.DodecahedronGeometry(1, 0),
  plane: new THREE.PlaneGeometry(1, 1),
};

const cache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, rough = 0.9, metal = 0, emissive = 0, intensity = 0): THREE.MeshStandardMaterial {
  metal = Math.min(metal, 0.2);
  const key = `${color}|${rough}|${metal}|${emissive}|${intensity}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: true });
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = intensity;
    }
    cache.set(key, m);
  }
  return m;
}

type V3 = [number, number, number];
function put(parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, p: V3, s: V3, r: V3 = [0, 0, 0]): THREE.Mesh {
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(...p);
  mesh.scale.set(...s);
  mesh.rotation.set(...r);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Fabrique un élément de décor posé au sol (origine au pied), de taille « naturelle » (échelle 1). */
export function makeProp(kind: PropKind, rnd: Rnd, c: PropColors): THREE.Object3D {
  const g = new THREE.Group();
  const j = (a: number) => (rnd() - 0.5) * a;
  switch (kind) {
    case 'tree': {
      put(g, geo.cyl, mat(c.secondary), [0, 1.5, 0], [0.25, 3, 0.25]);
      put(g, geo.sphere, mat(c.primary), [0, 3.6, 0], [1.6, 1.3, 1.6]);
      put(g, geo.sphere, mat(c.primary), [j(0.8), 4.6, j(0.8)], [1.1, 1.0, 1.1]);
      put(g, geo.sphere, mat(c.primary, 0.9), [j(1.2), 3.1, j(1.2)], [1.0, 0.9, 1.0]);
      break;
    }
    case 'pine': {
      put(g, geo.cyl, mat(c.secondary), [0, 1, 0], [0.2, 2, 0.2]);
      for (let i = 0; i < 4; i++) put(g, geo.cone, mat(c.primary), [0, 2.2 + i * 1.0, 0], [1.6 - i * 0.32, 1.7, 1.6 - i * 0.32]);
      break;
    }
    case 'deadTree': {
      put(g, geo.cyl, mat(c.secondary), [0, 2, 0], [0.2, 4, 0.2]);
      for (let i = 0; i < 3; i++) {
        put(g, geo.cyl, mat(c.secondary), [j(0.3), 2.4 + i * 0.6, j(0.3)], [0.07, 1.4, 0.07], [j(1.4), j(6), 0.9 * (i % 2 ? 1 : -1)]);
      }
      break;
    }
    case 'rock': {
      put(g, geo.rock, mat(c.primary, 1), [0, 0.35, 0], [0.7 + rnd() * 0.5, 0.45 + rnd() * 0.3, 0.6 + rnd() * 0.5], [j(1), j(6), j(1)]);
      break;
    }
    case 'bush': {
      for (let i = 0; i < 3; i++) put(g, geo.sphere, mat(c.primary), [j(0.6), 0.45, j(0.6)], [0.55 + rnd() * 0.2, 0.45, 0.55 + rnd() * 0.2]);
      break;
    }
    case 'cactus': {
      put(g, geo.cyl, mat(c.primary), [0, 1.2, 0], [0.22, 2.4, 0.22]);
      put(g, geo.sphere, mat(c.primary), [0, 2.4, 0], [0.22, 0.22, 0.22]);
      put(g, geo.cyl, mat(c.primary), [0.4, 1.5, 0], [0.12, 0.8, 0.12], [0, 0, 0.0]);
      put(g, geo.cyl, mat(c.primary), [0.2, 1.3, 0], [0.12, 0.45, 0.12], [0, 0, 1.4]);
      break;
    }
    case 'pillar': {
      put(g, geo.box, mat(c.primary, 0.8), [0, 3, 0], [0.9, 6, 0.9]);
      put(g, geo.box, mat(c.secondary, 0.7), [0, 6.1, 0], [1.2, 0.3, 1.2]);
      break;
    }
    case 'column': {
      const h = 3 + rnd() * 4;
      put(g, geo.cyl, mat(c.primary, 0.9), [0, h / 2, 0], [0.55, h, 0.55]);
      put(g, geo.cyl, mat(c.secondary, 0.9), [0, 0.2, 0], [0.8, 0.4, 0.8]);
      if (rnd() > 0.5) put(g, geo.box, mat(c.primary, 1), [0.5, 0.3, 0.3], [0.7, 0.5, 0.6], [0, j(2), 0.2]); // éboulis
      break;
    }
    case 'crate': {
      put(g, geo.box, mat(c.primary, 0.8), [0, 0.5, 0], [1, 1, 1], [0, j(1.2), 0]);
      put(g, geo.box, mat(c.secondary, 0.7), [0, 0.5, 0], [1.04, 0.14, 1.04]);
      break;
    }
    case 'barrel': {
      put(g, geo.cyl, mat(c.primary, 0.5, 0.4), [0, 0.55, 0], [0.45, 1.1, 0.45]);
      put(g, geo.cyl, mat(c.secondary, 0.4, 0.6), [0, 0.55, 0], [0.47, 0.1, 0.47]);
      break;
    }
    case 'lamp': {
      put(g, geo.cyl, mat(c.secondary, 0.5, 0.5), [0, 2.2, 0], [0.07, 4.4, 0.07]);
      put(g, geo.sphere, mat(c.accent, 0.3, 0, c.accent, 1.6), [0, 4.5, 0], [0.22, 0.22, 0.22]);
      break;
    }
    case 'building': {
      const h = 8 + rnd() * 22;
      const w = 4 + rnd() * 4;
      put(g, geo.box, mat(c.primary, 0.85), [0, h / 2, 0], [w, h, w]);
      const lit = mat(c.accent, 0.4, 0, c.accent, 1.4);
      const dark = mat(0x0c0e14, 0.4);
      for (let y = 2; y < h - 1; y += 2.2) {
        for (let x = -w / 2 + 0.8; x < w / 2 - 0.5; x += 1.4) {
          put(g, geo.plane, rnd() > 0.45 ? lit : dark, [x, y, w / 2 + 0.01], [0.8, 1.0, 1]);
        }
      }
      break;
    }
    case 'pipe': {
      const len = 6 + rnd() * 8;
      put(g, geo.cyl, mat(c.primary, 0.45, 0.6), [0, 3.5 + rnd() * 2, 0], [0.35, len, 0.35], [0, 0, Math.PI / 2]);
      put(g, geo.cyl, mat(c.secondary, 0.5, 0.5), [-len / 3, 1.8, 0], [0.16, 3.6, 0.16]);
      put(g, geo.cyl, mat(c.secondary, 0.5, 0.5), [len / 3, 1.8, 0], [0.16, 3.6, 0.16]);
      break;
    }
    case 'tower': {
      put(g, geo.cyl, mat(c.primary, 0.7, 0.2), [0, 6, 0], [0.8, 12, 0.8]);
      put(g, geo.box, mat(c.secondary, 0.6, 0.3), [0, 12.3, 0], [1.6, 0.6, 1.6]);
      put(g, geo.sphere, mat(c.accent, 0.3, 0, c.accent, 1.8), [0, 13.0, 0], [0.25, 0.25, 0.25]);
      break;
    }
    case 'torii': {
      for (const s of [-1, 1]) put(g, geo.cyl, mat(c.primary, 0.7), [2.2 * s, 2.6, 0], [0.28, 5.2, 0.28]);
      put(g, geo.box, mat(c.primary, 0.7), [0, 5.3, 0], [6.6, 0.4, 0.5]);
      put(g, geo.box, mat(c.secondary, 0.7), [0, 4.3, 0], [5.0, 0.25, 0.3]);
      break;
    }
    case 'iceSpike': {
      const h = 2 + rnd() * 3;
      put(g, geo.cone, mat(c.primary, 0.15, 0.1, c.accent, 0.15), [0, h / 2, 0], [0.7 + rnd() * 0.4, h, 0.7 + rnd() * 0.4], [j(0.3), 0, j(0.3)]);
      break;
    }
    case 'snowMound': {
      put(g, geo.sphere, mat(c.primary, 1), [0, 0, 0], [1.6 + rnd() * 1.2, 0.7 + rnd() * 0.4, 1.4 + rnd()]);
      break;
    }
    case 'lantern': {
      put(g, geo.box, mat(c.primary, 0.9), [0, 0.5, 0], [0.5, 1.0, 0.5]);
      put(g, geo.box, mat(c.accent, 0.3, 0, c.accent, 1.5), [0, 1.25, 0], [0.4, 0.4, 0.4]);
      put(g, geo.cone, mat(c.secondary, 0.9), [0, 1.65, 0], [0.45, 0.35, 0.45]);
      break;
    }
    case 'machine': {
      const h = 2 + rnd() * 2.5;
      put(g, geo.box, mat(c.primary, 0.5, 0.5), [0, h / 2, 0], [2 + rnd(), h, 1.6]);
      put(g, geo.cyl, mat(c.secondary, 0.5, 0.5), [0.5, h + 0.5, 0], [0.4, 1, 0.4]);
      put(g, geo.box, mat(c.accent, 0.3, 0, c.accent, 1.4), [0, h * 0.6, 0.82], [0.9, 0.2, 0.02]);
      break;
    }
    case 'chimney': {
      put(g, geo.cyl, mat(c.primary, 0.9), [0, 9, 0], [1.4, 18, 1.4]);
      put(g, geo.cyl, mat(c.secondary, 0.9), [0, 18.2, 0], [1.6, 0.5, 1.6]);
      put(g, geo.sphere, mat(c.accent, 0.3, 0, c.accent, 1.3), [0, 19, 0], [0.4, 0.2, 0.4]);
      break;
    }
    case 'dune': {
      put(g, geo.sphere, mat(c.primary, 1), [0, 0, 0], [6 + rnd() * 5, 1.6 + rnd() * 1.4, 4 + rnd() * 3], [0, rnd() * 6, 0]);
      break;
    }
    case 'mesa': {
      const h = 5 + rnd() * 7;
      put(g, geo.box, mat(c.primary, 1), [0, h / 2, 0], [3 + rnd() * 2, h, 3 + rnd() * 2], [0, rnd() * 6, 0]);
      put(g, geo.box, mat(c.secondary, 1), [0, h * 0.7, 0], [3.4 + rnd() * 2, 0.5, 3.4 + rnd() * 2]);
      break;
    }
  }
  return g;
}
