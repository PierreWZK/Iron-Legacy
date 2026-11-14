import type { Fighter } from '@iron/engine';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { BONE_NAMES, type BoneName, type Rig } from './rig';
import type { VisualSpec } from './visuals';

/**
 * Combattant en modèle 3D (corps humain skinné, pack « Universal Base Characters » de Quaternius, CC0).
 *
 * Le jeu garde ses poses procédurales (`pose.ts`), calées sur les frames de la simulation : elles sont
 * reportées sur le squelette du modèle. Pour chaque os piloté, rotation monde visée =
 * rotation monde de notre os × calage × rotation monde de l'os du modèle au repos. Le calage aligne la pose
 * de repos du modèle (bras écartés) sur la nôtre (bras le long du corps).
 */
export interface ModelRig extends Rig {
  /**
   * À appeler à chaque image : joue le clip de l'état du combattant (marche, course, saut, coup reçu…) puis
   * reporte les rotations des os témoins (`bones`) sur le squelette, mélangées au clip selon l'état.
   */
  sync: (delta: number, f: Fighter) => void;
  /** Os de la tête du modèle (coiffure comprise) : sert au cadrage des portraits. */
  headNode: THREE.Object3D;
}

let clipsPromise: Promise<THREE.AnimationClip[]> | null = null;

/** Clips du pack « Universal Animation Library » (Quaternius, CC0), même squelette que les corps. */
function loadClips(): Promise<THREE.AnimationClip[]> {
  clipsPromise ??= new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/anims.glb`).then((g) => g.animations);
  return clipsPromise;
}

/** Nos os -> os du modèle, avec l'os enfant qui donne la direction du membre (null : pas de calage). */
const MAP: ReadonlyArray<[BoneName, string, string | null]> = [
  ['hips', 'pelvis', null],
  ['spine', 'spine_01', null],
  ['chest', 'spine_02', null],
  ['neck', 'neck_01', null],
  ['head', 'Head', null],
  ['upperArmL', 'upperarm_l', 'lowerarm_l'],
  ['forearmL', 'lowerarm_l', 'hand_l'],
  ['upperArmR', 'upperarm_r', 'lowerarm_r'],
  ['forearmR', 'lowerarm_r', 'hand_r'],
  ['thighL', 'thigh_l', 'calf_l'],
  ['shinL', 'calf_l', 'foot_l'],
  ['thighR', 'thigh_r', 'calf_r'],
  ['shinR', 'calf_r', 'foot_r'],
];

/** Parent de chaque os dans notre squelette (repos = identité partout). */
const PARENT: Partial<Record<BoneName, BoneName>> = {
  spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck',
  upperArmL: 'chest', forearmL: 'upperArmL', upperArmR: 'chest', forearmR: 'upperArmR',
  thighL: 'hips', shinL: 'thighL', thighR: 'hips', shinR: 'thighR',
};

const DOWN = new THREE.Vector3(0, -1, 0);
/** Longueur cuisse + tibia de notre squelette (m, avant `spec.legs`). */
const LEG_LEN = 0.88;
/** Teinte moyenne de la texture de peau du modèle : sert à viser la couleur de peau du personnage. */
const SKIN_BASE = new THREE.Color(0xb5805a);

/** Coiffures modelées sur la tête du corps féminin (les autres le sont sur le corps masculin). */
const FEMALE_HAIR = new Set(['Hair_Buns', 'Hair_Long', 'Hair_BuzzedFemale']);

const cache = new Map<string, Promise<THREE.Object3D>>();

function loadScene(file: string): Promise<THREE.Object3D> {
  let p = cache.get(file);
  if (!p) {
    p = new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/${file}`).then((g) => g.scene);
    cache.set(file, p);
  }
  return p;
}

/** Zones de tenue peintes sur le corps : couleur par sommet selon l'os dominant et la position sur le membre. */
function paintOutfit(mesh: THREE.SkinnedMesh, spec: VisualSpec, bonePos: Map<string, THREE.Vector3>): void {
  const g = mesh.geometry.clone();
  mesh.geometry = g;
  const pos = g.getAttribute('position');
  const si = g.getAttribute('skinIndex');
  const sw = g.getAttribute('skinWeight');
  const names = mesh.skeleton.bones.map((b) => b.name);
  const out = new Float32Array(pos.count * 4);
  const suit = new THREE.Color(spec.suit);
  const trim = new THREE.Color(spec.trim);
  const glove = spec.glove === null ? null : new THREE.Color(spec.glove);
  const boot = spec.boot === spec.skin ? null : new THREE.Color(spec.boot);
  const y = (n: string) => bonePos.get(n)!.y;
  const pelvisY = y('pelvis');
  const kneeY = y('calf_l');
  const shortsY = kneeY + (pelvisY - kneeY) * 0.45;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    let best = 0;
    let bw = -1;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w > bw) {
        bw = w;
        best = si.getComponent(i, k);
      }
    }
    const n = names[best] ?? '';
    v.fromBufferAttribute(pos, i);
    let c: THREE.Color | null = null;
    if (/^(hand|index|middle|ring|pinky|thumb)/.test(n)) c = glove;
    else if (/^(foot|ball)/.test(n)) c = boot;
    else if (n === 'pelvis') c = v.y > pelvisY + 0.06 ? trim : suit; // ceinture au-dessus du bassin
    else if (n.startsWith('thigh')) c = spec.longPants || v.y > shortsY ? suit : null;
    else if (n.startsWith('calf')) c = spec.longPants ? suit : null;
    else if (/^(spine|clavicle)/.test(n)) c = spec.bareTorso ? null : suit;
    else if (n.startsWith('upperarm')) {
      const side = n.endsWith('_l') ? '_l' : '_r';
      const sh = bonePos.get(`upperarm${side}`)!;
      const el = bonePos.get(`lowerarm${side}`)!;
      const along = v.distanceTo(sh) / sh.distanceTo(el);
      c = spec.bareTorso ? null : spec.longSleeves || along < 0.45 ? suit : null;
    } else if (n.startsWith('lowerarm')) c = spec.longSleeves && !spec.bareTorso ? suit : null;
    if (c) {
      out[i * 4] = c.r;
      out[i * 4 + 1] = c.g;
      out[i * 4 + 2] = c.b;
      out[i * 4 + 3] = 1;
    }
  }
  g.setAttribute('outfit', new THREE.BufferAttribute(out, 4));

  const src = mesh.material as THREE.MeshStandardMaterial;
  const mat = src.clone();
  mat.roughness = 0.78;
  mat.metalness = 0;
  const skin = new THREE.Color(spec.skin);
  mat.color.setRGB(
    Math.min(1.6, skin.r / SKIN_BASE.r), Math.min(1.6, skin.g / SKIN_BASE.g), Math.min(1.6, skin.b / SKIN_BASE.b),
  );
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 outfit;\nvarying vec4 vOutfit;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOutfit = outfit;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vOutfit;')
      .replace(
        '#include <map_fragment>',
        // Le tissu garde le modelé peint dans la texture (ombres des muscles), pas sa couleur.
        '#include <map_fragment>\nfloat ol = dot(texture2D(map, vMapUv).rgb, vec3(0.3, 0.5, 0.2));\n'
        + 'diffuseColor.rgb = mix(diffuseColor.rgb, vOutfit.rgb * clamp(0.5 + ol, 0.78, 1.12), vOutfit.a);',
      );
  };
  mesh.material = mat;
}

export async function loadModelRig(spec: VisualSpec): Promise<ModelRig> {
  const [scene, hair, clips, ref] = await Promise.all([
    loadScene(spec.body === 'f' ? 'hero_f.gltf' : 'hero_m.gltf'),
    spec.hairStyle ? loadScene(`hair/${spec.hairStyle}.gltf`) : Promise.resolve(null),
    loadClips(),
    loadScene(FEMALE_HAIR.has(spec.hairStyle ?? '') ? 'hero_f.gltf' : 'hero_m.gltf'),
  ]);
  ref.updateMatrixWorld(true);
  hair?.updateMatrixWorld(true);
  const refHead = ref.getObjectByName('Head')!.matrixWorld;
  const model = cloneSkinned(scene);
  model.updateMatrixWorld(true);

  const byName = new Map<string, THREE.Object3D>();
  model.traverse((o) => byName.set(o.name, o));
  const bonePos = new Map<string, THREE.Vector3>();
  for (const [n, o] of byName) bonePos.set(n, o.getWorldPosition(new THREE.Vector3()));

  // Calage : rotation monde au repos de chaque os piloté, membres ramenés le long du corps.
  const targets: Array<{ ours: BoneName; bone: THREE.Object3D; pre: THREE.Quaternion }> = [];
  for (const [ours, name, child] of MAP) {
    const bone = byName.get(name);
    if (!bone) throw new Error(`Os absent du modèle : ${name}`);
    const pre = bone.getWorldQuaternion(new THREE.Quaternion());
    if (child) {
      const dir = bonePos.get(child)!.clone().sub(bonePos.get(name)!).normalize();
      pre.premultiply(new THREE.Quaternion().setFromUnitVectors(dir, DOWN));
    }
    targets.push({ ours, bone, pre });
  }
  // Rotation monde (fixe) du nœud qui porte le squelette, et rotations locales de repos des os non pilotés.
  const driven = new Set(targets.map((t) => t.bone));
  const top = byName.get('root')?.parent ?? model;
  const topQ = top.getWorldQuaternion(new THREE.Quaternion());

  // Cheveux du corps de base masqués : la coiffure est une pièce à part, teintée par le personnage.
  model.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!(m as THREE.Mesh).isMesh) return;
    if ((m.material as THREE.Material).name.includes('Hair')) {
      m.visible = false;
      return;
    }
    if (!m.isSkinnedMesh) return;
    m.frustumCulled = false; // la boîte englobante ne suit pas les os
    m.castShadow = true;
    if ((m.material as THREE.Material).name.includes('Superhero')) paintOutfit(m, spec, bonePos);
  });
  if (hair && spec.hairStyle) {
    const hairMat = new THREE.MeshStandardMaterial({ color: spec.hair, roughness: 0.62, metalness: 0, side: THREE.DoubleSide });
    hair.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const h = new THREE.Mesh(mesh.geometry, hairMat);
      h.castShadow = true;
      // Chaque coiffure est modelée sur la tête d'un des deux corps (certaines en centimètres, via leur nœud) :
      // on applique son nœud, on annule la pose de repos de l'os Head de ce corps de référence, puis on
      // l'accroche à l'os Head du combattant.
      h.applyMatrix4(mesh.matrixWorld);
      h.applyMatrix4(refHead.clone().invert());
      byName.get('Head')!.add(h);
    });
  }

  const legLen = bonePos.get('thigh_l')!.distanceTo(bonePos.get('calf_l')!) + bonePos.get('calf_l')!.distanceTo(bonePos.get('foot_l')!);
  const scale = (LEG_LEN * spec.legs) / legLen;
  // Carrure : le corps s'élargit avec les épaules et le torse du personnage.
  const wide = 0.7 + 0.3 * ((spec.shoulders + spec.torso) / 2);
  model.scale.set(scale * wide, scale, scale * wide);

  const pivotH = 0.9 * spec.height;
  const hipsBase = 0.07 + LEG_LEN * spec.legs - 0.02 + 0.05;
  const root = new THREE.Group();
  const rotor = new THREE.Group();
  const body = new THREE.Group();
  root.add(rotor);
  rotor.add(body);
  body.position.y = -pivotH;
  body.scale.setScalar(spec.height);
  body.add(model);

  // Os témoins : mêmes noms que le squelette dessiné en code, la vue y écrit ses rotations lissées.
  const bones = {} as Record<BoneName, THREE.Group>;
  for (const n of BONE_NAMES) bones[n] = new THREE.Group();
  bones.hips.position.y = hipsBase;

  const ourW = {} as Record<BoneName, THREE.Quaternion>;
  for (const n of BONE_NAMES) ourW[n] = new THREE.Quaternion();
  const world = new Map<THREE.Object3D, THREE.Quaternion>();
  for (const t of targets) world.set(t.bone, new THREE.Quaternion());
  const tmp = new THREE.Quaternion();
  const inv = new THREE.Quaternion();

  // Repos de chaque os (les clips les modifient ensuite).
  const bindQ = new Map<THREE.Object3D, THREE.Quaternion>();
  model.traverse((o) => bindQ.set(o, o.quaternion.clone()));
  const pelvis = byName.get('pelvis')!;
  const pelvisBind = pelvis.position.clone();

  /** Rotation monde d'un nœud dans la pose procédurale pure (os pilotés déjà calculés, sinon parent × repos). */
  const worldOf = (o: THREE.Object3D, into: THREE.Quaternion): THREE.Quaternion => {
    if (o === top) return into.copy(topQ);
    if (driven.has(o)) return into.copy(world.get(o)!);
    return worldOf(o.parent!, into).multiply(bindQ.get(o)!);
  };

  // --- Clips (marche, course, saut, accroupi, coups reçus) ---
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<string, THREE.AnimationAction>();
  for (const c of clips) actions.set(c.name, mixer.clipAction(c));
  // Poing fermé : doigts relevés dans le clip de direct, au moment de l'impact.
  const fist = new Map<THREE.Object3D, THREE.Quaternion>();
  const jab = clips.find((c) => c.name === 'Punch_Jab');
  if (jab) {
    for (const tr of jab.tracks) {
      const [node, prop] = tr.name.split('.');
      const bone = byName.get(node!);
      if (!bone || prop !== 'quaternion' || !/^(index|middle|ring|pinky|thumb)/.test(node!)) continue;
      let i = 0;
      while (i < tr.times.length - 1 && tr.times[i]! < jab.duration * 0.4) i++;
      fist.set(bone, new THREE.Quaternion().fromArray(tr.values, i * 4));
    }
  }
  // Os non pilotés qui reviennent au repos quand la pose procédurale domine (bras ou corps).
  const restArm = ['clavicle_l', 'clavicle_r', 'hand_l', 'hand_r'].map((n) => byName.get(n)!);
  const restBody = ['spine_03', 'foot_l', 'foot_r', 'ball_l', 'ball_r'].map((n) => byName.get(n)!);
  const ARMS = new Set<BoneName>(['upperArmL', 'forearmL', 'upperArmR', 'forearmR']);

  let current = '';
  let wBody = 1;
  let wArm = 1;
  let lastStun = 0;

  const sync = (delta: number, f: Fighter): void => {
    const a = animFor(f);
    const rehit = !!a.once && f.stun > lastStun + 1;
    lastStun = f.stun;
    // Le clip de coup reçu est choisi à l'impact, pas changé pendant l'étourdissement.
    if (a.once && !rehit && current.startsWith('Hit_')) a.clip = current;
    const next = actions.get(a.clip);
    if (next && (a.clip !== current || rehit)) {
      const prev = actions.get(current);
      if (prev && prev !== next) prev.fadeOut(0.12);
      next.reset().setEffectiveWeight(1).fadeIn(rehit ? 0.04 : 0.12).play();
      next.setLoop(a.once ? THREE.LoopOnce : THREE.LoopRepeat, a.once ? 1 : Infinity);
      next.clampWhenFinished = !!a.once;
      current = a.clip;
    }
    if (next) next.timeScale = a.speed;
    mixer.update(delta);
    const k = 1 - Math.exp(-delta * 14);
    wBody += (a.body - wBody) * k;
    wArm += (a.arms - wArm) * k;

    for (const t of targets) {
      const local = bones[t.ours].quaternion;
      const p = PARENT[t.ours];
      if (p) ourW[t.ours].copy(ourW[p]).multiply(local);
      else ourW[t.ours].copy(local);
      const w = world.get(t.bone)!.copy(ourW[t.ours]).multiply(t.pre);
      worldOf(t.bone.parent!, tmp);
      inv.copy(tmp).invert().multiply(w);
      // Mélange : le clip a déjà posé l'os, la pose procédurale le reprend selon son poids.
      t.bone.quaternion.slerp(inv, ARMS.has(t.ours) ? wArm : wBody);
    }
    for (const o of restArm) o.quaternion.slerp(bindQ.get(o)!, wArm);
    for (const o of restBody) o.quaternion.slerp(bindQ.get(o)!, wBody);
    for (const [o, q] of fist) o.quaternion.slerp(q, wArm);
    pelvis.position.lerp(pelvisBind, wBody);
    model.position.y = (bones.hips.position.y - hipsBase) * wBody;
  };

  return { root, rotor, bones, hipsBase, pivotH, sway: [], sync, headNode: byName.get('Head')! };
}

interface Anim {
  clip: string;
  speed: number;
  /** Poids de la pose procédurale sur le corps (jambes, buste, tête) et sur les bras ; 0 = clip seul. */
  body: number;
  arms: number;
  /** Joué une fois puis figé (coup reçu). */
  once?: boolean;
}

/** Clip et poids selon l'état du combattant. Les coups, projections, parades et esquives restent procéduraux. */
function animFor(f: Fighter): Anim {
  switch (f.action) {
    case 'walkFwd':
      return { clip: 'Walk_Loop', speed: 1.3, body: 0, arms: 1 };
    case 'walkBack':
      return { clip: 'Walk_Loop', speed: -1.15, body: 0, arms: 1 };
    case 'sideL':
    case 'sideR':
      return { clip: 'Walk_Loop', speed: 1.25, body: 0, arms: 1 };
    case 'runFwd':
      return { clip: 'Sprint_Loop', speed: 1.1, body: 0, arms: 0 };
    case 'jump':
      return { clip: 'Jump_Loop', speed: 1, body: 0, arms: 0.5 };
    case 'crouch':
    case 'crouchBlock':
      return { clip: 'Crouch_Idle_Loop', speed: 1, body: 0, arms: 1 };
    case 'hitstun':
      return { clip: f.stun > 14 ? 'Hit_Head' : 'Hit_Chest', speed: 1.2, body: 0, arms: 0, once: true };
    default:
      return { clip: 'Idle_Loop', speed: 1, body: 1, arms: 1 };
  }
}
