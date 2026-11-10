import { useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { getMove, type Fighter } from '@iron/engine';
import { runtime } from '../runtime';
import type { ModelSpec } from './models';

interface Want {
  name: string;
  once: boolean;
  speed: number;
}

interface Loaded {
  root: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

/** Choisit le clip à jouer selon l'état de la sim. L'animation suit la sim, jamais l'inverse. */
function pick(f: Fighter, spec: ModelSpec, clipDuration: (name: string) => number): Want {
  const c = spec.clips;
  switch (f.action) {
    case 'attack': {
      const move = f.move ?? 'jab';
      const name = c.attack[move] ?? c.attackDefault;
      const m = getMove(f.characterId, move);
      const seconds = (m.startup + m.active + m.recovery) / 60;
      const speed = Math.min(3, Math.max(0.6, clipDuration(name) / seconds));
      return { name, once: true, speed };
    }
    case 'walkFwd':
    case 'walkBack':
    case 'sideL':
    case 'sideR':
      return { name: c.walk, once: false, speed: f.action === 'walkBack' ? 0.8 : 1 };
    case 'runFwd':
      return { name: c.run, once: false, speed: 1 };
    case 'dodge':
      return { name: c.run, once: false, speed: 1.4 };
    case 'jump':
      return { name: c.jump, once: true, speed: 1 };
    case 'crouch':
    case 'crouchBlock':
    case 'block':
    case 'parry':
      return { name: c.guard, once: false, speed: 1 };
    case 'hitstun':
      return { name: c.hit[f.combo % 2 === 0 ? 0 : 1], once: true, speed: 1.2 };
    case 'knockdown':
    case 'thrown':
      return { name: c.death, once: true, speed: 1.5 };
    case 'getup':
      return { name: c.getup, once: true, speed: 1.2 };
    case 'victory':
      return { name: c.victory, once: false, speed: 1 };
    default:
      return { name: c.idle, once: false, speed: 1 };
  }
}

function useAsset(spec: ModelSpec): Loaded {
  const loader = spec.kind === 'gltf' ? GLTFLoader : FBXLoader;
  const res = useLoader(loader as never, spec.url) as unknown as { scene?: THREE.Object3D; animations: THREE.AnimationClip[] } & THREE.Object3D;
  return { root: res.scene ?? res, animations: res.animations };
}

/**
 * Combattant à modèle animé (glTF/FBX) : lit l'état interpolé de la sim, choisit le clip,
 * et fige l'animation pendant le hit-stop. N'écrit jamais dans la sim.
 */
export function ModelFighter({ index, spec }: { index: number; spec: ModelSpec }) {
  const asset = useAsset(spec);

  const inst = useMemo(() => {
    const object = cloneSkinned(asset.root);
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.frustumCulled = false;
      }
    });
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const dim = spec.fit === 'height' ? size.y : Math.max(size.x, size.z);
    const scale = spec.size / (dim || 1);
    const center = box.getCenter(new THREE.Vector3());
    // Pieds au sol, modèle centré sur l'origine du combattant.
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    const pivot = new THREE.Group(); // inclinaison de réaction (autour des pieds)
    pivot.add(object);
    const holder = new THREE.Group(); // orientation du modèle (yaw de correction)
    holder.rotation.y = spec.yaw;
    holder.add(pivot);
    const root = new THREE.Group(); // position et orientation de la sim
    root.add(holder);

    const mixer = new THREE.AnimationMixer(object);
    const clips = new Map(asset.animations.map((a) => [a.name, a]));
    const actions = new Map<string, THREE.AnimationAction>();
    return { root, pivot, mixer, clips, actions };
  }, [asset, spec]);

  if (import.meta.env.DEV) ((window as unknown as { __models?: Record<number, THREE.Object3D> }).__models ??= {})[index] = inst.root;
  const st = useMemo(
    () => ({ current: '', active: null as THREE.AnimationAction | null, yaw: 0, tilt: 0, prevStun: 0, prevFrame: 0, prevMove: '' }),
    [],
  );

  useEffect(
    () => () => {
      inst.mixer.stopAllAction();
    },
    [inst],
  );

  useFrame((_, delta) => {
    const w = runtime.world;
    const p = runtime.prev;
    if (!w || !p) return;
    const cur = w.fighters[index]!;
    const prev = p.fighters[index]!;
    const a = runtime.alpha;
    const k = 1 - Math.exp(-delta * 20);

    inst.root.position.set(
      THREE.MathUtils.lerp(prev.pos.x, cur.pos.x, a),
      THREE.MathUtils.lerp(prev.pos.y, cur.pos.y, a),
      THREE.MathUtils.lerp(prev.pos.z, cur.pos.z, a),
    );
    let dy = Math.atan2(cur.facing.x, cur.facing.z) - st.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    st.yaw += dy * k;
    inst.root.rotation.y = st.yaw;

    const want = pick(cur, spec, (n) => inst.clips.get(n)?.duration ?? 1);
    const move = cur.move ?? '';
    const restart =
      want.name !== st.current
      || (cur.action === 'attack' && (cur.moveFrame < st.prevFrame || move !== st.prevMove))
      || (cur.action === 'hitstun' && cur.stun > st.prevStun);
    if (restart) {
      const clip = inst.clips.get(want.name);
      if (clip) {
        let action = inst.actions.get(want.name);
        if (!action) {
          action = inst.mixer.clipAction(clip);
          inst.actions.set(want.name, action);
        }
        action.reset();
        action.setLoop(want.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = true;
        action.timeScale = want.speed;
        action.enabled = true;
        if (st.active && st.active !== action) action.crossFadeFrom(st.active, 0.12, false);
        action.play();
        st.active = action;
      }
      st.current = want.name;
    }
    st.prevStun = cur.stun;
    st.prevFrame = cur.moveFrame;
    st.prevMove = move;

    // Réaction aux coups : légère inclinaison en arrière pendant le hitstun.
    st.tilt += ((cur.action === 'hitstun' ? -0.3 : 0) - st.tilt) * k;
    inst.pivot.rotation.x = st.tilt;

    inst.mixer.timeScale = w.hitstop > 0 ? 0 : 1;
    inst.mixer.update(delta);
  });

  return <primitive object={inst.root} />;
}
