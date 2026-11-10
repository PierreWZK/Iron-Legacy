import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { runtime } from '../runtime';
import { poseFor } from './pose';
import { BONE_NAMES, buildRig, type FighterLook } from './rig';

const K = 0.3; // lissage des rotations (transitions entre poses)

/** Vue d'un combattant : lit l'état de la sim (interpolé), n'écrit jamais dedans. */
export function FighterView({ index, look }: { index: number; look: FighterLook }) {
  const rig = useMemo(() => buildRig(look), [look]);
  if (import.meta.env.DEV) ((window as unknown as { __rigs?: unknown[] }).__rigs ??= [])[index] = rig;
  const state = useMemo(() => ({ lastYaw: 0, yaw: 0, bodyYaw: 0, t: 0, hipsY: 0 }), []);

  useFrame((_, delta) => {
    const cur = runtime.world.fighters[index]!;
    const prev = runtime.prev.fighters[index]!;
    const a = runtime.alpha;
    rig.root.position.set(
      THREE.MathUtils.lerp(prev.pos.x, cur.pos.x, a),
      THREE.MathUtils.lerp(prev.pos.y, cur.pos.y, a),
      THREE.MathUtils.lerp(prev.pos.z, cur.pos.z, a),
    );
    // Lissage de la rotation pour ne pas « claquer » quand la cible change d'angle.
    const targetYaw = Math.atan2(cur.facing.x, cur.facing.z);
    let dy = targetYaw - state.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    state.yaw += dy * Math.min(1, delta * 18);
    state.t += delta;

    const pose = poseFor(cur.action, state.t);
    state.bodyYaw += (pose.bodyYaw - state.bodyYaw) * K;
    state.hipsY += (pose.hipsY - state.hipsY) * K;
    rig.root.rotation.y = state.yaw + state.bodyYaw;
    rig.bones.hips.position.y = 0.95 + state.hipsY;
    for (const name of BONE_NAMES) {
      const bone = rig.bones[name];
      const [x, y, z] = pose.rot[name] ?? [0, 0, 0];
      bone.rotation.x += (x - bone.rotation.x) * K;
      bone.rotation.y += (y - bone.rotation.y) * K;
      bone.rotation.z += (z - bone.rotation.z) * K;
    }
  });

  return <primitive object={rig.root} />;
}
