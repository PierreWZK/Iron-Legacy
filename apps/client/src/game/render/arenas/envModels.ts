import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PropColors, PropKind, Rnd } from './scenery';

/**
 * Éléments de décor en modèles 3D (packs « Stylized Nature MegaKit » et « Modular SciFi MegaKit » de
 * Quaternius, CC0 ; immeubles du pack « Downtown City MegaKit », CC0). Les couleurs viennent du décor : feuillage, écorce et roche sont teintés, pas texturés.
 */
const MODELS: Partial<Record<PropKind, string[]>> = {
  tree: ['CommonTree_1', 'CommonTree_2', 'CommonTree_3'],
  pine: ['Pine_1', 'Pine_2', 'Pine_3'],
  deadTree: ['DeadTree_1', 'DeadTree_2'],
  bush: ['Bush_Common'],
  rock: ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'],
  grass: ['Grass_Common_Tall'],
  pillar: ['Column_Large_Straight', 'Column_Round'],
  crate: ['Prop_Crate3', 'Prop_Crate4'],
  barrel: ['Prop_Barrel_Large'],
  machine: ['Prop_Computer', 'Prop_ItemHolder', 'Prop_Crate4', 'Column_Astra'],
  wall: ['WallAstra_Straight', 'WallBand_Straight', 'WallAstra_Straight'],
  gate: ['Door_Frame_SquareTall'],
  floorLight: ['Prop_Light_Floor'],
  block: ['Building_Small_1', 'Building_Medium_2_001', 'Building_Large_2', 'Building_Small_1'],
};

/** Taille visée (m) par rapport au modèle d'origine, pour rester proche des éléments dessinés en code. */
const SIZE: Partial<Record<PropKind, number>> = {
  tree: 1.1, pine: 1.2, deadTree: 0.8, bush: 1.1, rock: 0.55, grass: 0.55,
  pillar: 1.1, crate: 0.85, barrel: 1.2, machine: 1.2, wall: 2.6, gate: 2.2, floorLight: 1.4,
};

const BASE = `${import.meta.env.BASE_URL}models/env/`;
const loaders = {
  std: new GLTFLoader(),
  // Variante rouge des textures de panneaux (forteresse).
  red: new GLTFLoader(new THREE.LoadingManager().setURLModifier((u) => u.replace(/(T_Trim_0[12]_BaseColor)\.png/, '$1_Red.png'))),
};
const scenes = new Map<string, Promise<THREE.Object3D>>();
const mats = new Map<string, THREE.Material>();

function load(file: string, red: boolean): Promise<THREE.Object3D> {
  const key = `${file}|${red}`;
  let p = scenes.get(key);
  if (!p) {
    p = (red ? loaders.red : loaders.std).loadAsync(`${BASE}${file}.gltf`).then((g) => {
      // Posé au sol et centré : les pièces modulaires ont leur origine décalée.
      const box = new THREE.Box3().setFromObject(g.scene);
      g.scene.position.set(-(box.min.x + box.max.x) / 2, -Math.max(box.min.y, -0.05), -(box.min.z + box.max.z) / 2);
      const holder = new THREE.Group();
      holder.add(g.scene);
      return holder;
    });
    scenes.set(key, p);
  }
  return p;
}

/** Matériau d'un élément selon le nom du matériau d'origine et les couleurs du décor. */
function materialFor(src: THREE.MeshStandardMaterial, c: PropColors): THREE.Material {
  const n = src.name;
  const flat = n.startsWith('Bark') ? c.secondary : n.startsWith('Rocks') || n.startsWith('Grass') ? c.primary : null;
  const leaf = n.startsWith('Lea');
  const glow = /Light|Screen|Decal|FakeInterior_[123]/.test(n); // fenêtres éclairées
  if (flat === null && !leaf && !glow) return src;
  const key = `${src.uuid}|${flat ?? (leaf ? c.primary : c.accent)}`;
  let m = mats.get(key);
  if (m) return m;
  if (flat !== null) {
    m = new THREE.MeshStandardMaterial({ color: flat, roughness: 0.95, flatShading: n.startsWith('Rocks'), side: THREE.DoubleSide });
  } else if (leaf) {
    // La texture ne sert que de découpe : la couleur du feuillage est celle du décor (vert, roux, neige…).
    const l = src.clone();
    l.color.set(c.primary);
    l.alphaTest = 0.5;
    l.transparent = false;
    l.side = THREE.DoubleSide;
    l.roughness = 0.9;
    l.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', 'diffuseColor.a *= texture2D(map, vMapUv).a;');
    };
    m = l;
  } else {
    const g = src.clone();
    g.emissive.set(c.accent);
    g.emissiveMap = g.map;
    g.emissiveIntensity = n.includes('Light') ? 2.4 : 1.2;
    if (n.includes('Light')) g.color.set(c.accent);
    m = g;
  }
  mats.set(key, m);
  return m;
}

/** Élément en modèle 3D, ou null si ce type reste dessiné en code. Le modèle arrive dans le groupe une fois chargé. */
export function modelProp(kind: PropKind, rnd: Rnd, c: PropColors): THREE.Object3D | null {
  const files = MODELS[kind];
  if (!files) return null;
  const file = files[Math.floor(rnd() * files.length)]!;
  const group = new THREE.Group();
  void load(file, c.skin === 'red').then((scene) => {
    const o = scene.clone();
    o.scale.setScalar(SIZE[kind] ?? 1);
    o.traverse((x) => {
      const mesh = x as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = materialFor(mesh.material as THREE.MeshStandardMaterial, c);
      mesh.receiveShadow = true;
    });
    group.add(o);
  }, (e) => console.warn('Décor indisponible', file, e));
  return group;
}
