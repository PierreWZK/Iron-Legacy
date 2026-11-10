import * as THREE from 'three';

/**
 * PLACEHOLDER VISUEL (phase 1) : humanoïde procédural articulé (vrai squelette de joints,
 * pas une capsule). À remplacer par un GLB riggé avec les MÊMES noms d'os (voir BONE_NAMES) :
 * `pose.ts` et `FighterView` n'ont alors pas à changer.
 */
export const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'upperArmL', 'forearmL', 'upperArmR', 'forearmR',
  'thighL', 'shinL', 'thighR', 'shinR',
] as const;
export type BoneName = (typeof BONE_NAMES)[number];

export interface FighterLook {
  skin: number;
  suit: number;
  accent: number;
  /** Échelle globale (carrure/taille). */
  scale: number;
}

export interface Rig {
  root: THREE.Group;
  bones: Record<BoneName, THREE.Group>;
}

const limbGeo = (len: number, rTop: number, rBot: number) => {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, 10, 1);
  g.translate(0, -len / 2, 0);
  return g;
};
const jointGeo = new THREE.SphereGeometry(1, 12, 8);

export function buildRig(look: FighterLook): Rig {
  const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.65 });
  const suit = new THREE.MeshStandardMaterial({ color: look.suit, roughness: 0.5, metalness: 0.3 });
  const accent = new THREE.MeshStandardMaterial({
    color: look.accent, emissive: look.accent, emissiveIntensity: 0.6, roughness: 0.3,
  });

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const joint = (r: number, mat: THREE.Material, parent: THREE.Object3D) => {
    const m = mesh(jointGeo, mat, parent);
    m.scale.setScalar(r);
    return m;
  };
  const group = (name: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };

  const root = new THREE.Group();
  const body = group('body', root);
  body.scale.setScalar(look.scale);

  const hips = group('hips', body, 0, 0.95, 0);
  const pelvis = mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.2, 10), suit, hips);
  pelvis.scale.z = 0.7;
  mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 16), accent, hips).rotation.x = Math.PI / 2;

  const spine = group('spine', hips, 0, 0.1, 0);
  const chest = group('chest', spine, 0, 0.22, 0);
  const torso = mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.5, 10), suit, spine);
  torso.position.y = 0.2;
  torso.scale.z = 0.62;
  const plate = mesh(new THREE.BoxGeometry(0.3, 0.2, 0.06), accent, chest);
  plate.position.set(0, 0.06, 0.15);

  const neck = group('neck', chest, 0, 0.3, 0);
  mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skin, neck).position.y = 0.04;
  const head = group('head', neck, 0, 0.1, 0);
  const skull = mesh(jointGeo, skin, head);
  skull.scale.set(0.11, 0.135, 0.12);
  skull.position.y = 0.1;
  const visor = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), accent, head);
  visor.position.set(0, 0.12, 0.1);

  const arm = (side: 'L' | 'R', sx: number) => {
    const shoulder = group(`shoulder${side}`, chest, sx * 0.3, 0.22, 0);
    joint(0.085, suit, shoulder).scale.y = 0.06;
    const upper = group(`upperArm${side}`, shoulder);
    mesh(limbGeo(0.3, 0.06, 0.05), skin, upper);
    const fore = group(`forearm${side}`, upper, 0, -0.3, 0);
    joint(0.052, skin, fore);
    mesh(limbGeo(0.27, 0.05, 0.04), suit, fore);
    joint(0.06, accent, group(`hand${side}`, fore, 0, -0.29, 0));
    return { upper, fore };
  };
  const leg = (side: 'L' | 'R', sx: number) => {
    const thigh = group(`thigh${side}`, hips, sx * 0.11, -0.05, 0);
    mesh(limbGeo(0.45, 0.095, 0.065), suit, thigh);
    const shin = group(`shin${side}`, thigh, 0, -0.45, 0);
    joint(0.07, suit, shin);
    mesh(limbGeo(0.42, 0.065, 0.045), suit, shin);
    const foot = group(`foot${side}`, shin, 0, -0.43, 0);
    const shoe = mesh(new THREE.BoxGeometry(0.1, 0.07, 0.26), accent, foot);
    shoe.position.set(0, -0.02, 0.06);
    return { thigh, shin };
  };

  const aL = arm('L', 1);
  const aR = arm('R', -1);
  const lL = leg('L', 1);
  const lR = leg('R', -1);

  return {
    root,
    bones: {
      hips, spine, chest, neck, head,
      upperArmL: aL.upper, forearmL: aL.fore, upperArmR: aR.upper, forearmR: aR.fore,
      thighL: lL.thigh, shinL: lL.shin, thighR: lR.thigh, shinR: lR.shin,
    },
  };
}
