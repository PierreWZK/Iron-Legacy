import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { runtime } from '../runtime';
import { poseFor } from './pose';
import { BONE_NAMES, buildRig, type FighterLook } from './rig';

/** Vue d'un combattant : lit l'état de la sim (interpolé), n'écrit jamais dedans. */
export function FighterView({ index, look }: { index: number; look: FighterLook }) {
  const rig = useMemo(() => buildRig(look), [look]);
  const s = useMemo(() => ({ yaw: 0, t: 0, bodyYaw: 0, hipsY: 0, lying: 0 }), []);

  useFrame((_, delta) => {
    const w = runtime.world;
    const p = runtime.prev;
    if (!w || !p) return;
    const cur = w.fighters[index]!;
    const prev = p.fighters[index]!;
    const a = runtime.alpha;
    const k = 1 - Math.exp(-delta * 22);
    s.t += delta;

    const pose = poseFor(cur, s.t);
    s.lying += ((pose.lying ? 1 : 0) - s.lying) * k;
    rig.root.position.set(
      THREE.MathUtils.lerp(prev.pos.x, cur.pos.x, a),
      THREE.MathUtils.lerp(prev.pos.y, cur.pos.y, a) + s.lying * 0.12,
      THREE.MathUtils.lerp(prev.pos.z, cur.pos.z, a),
    );

    // Lissage de l'orientation : évite les claquements quand la cible change d'angle.
    let dy = Math.atan2(cur.facing.x, cur.facing.z) - s.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    s.yaw += dy * k;
    s.bodyYaw += (pose.bodyYaw - s.bodyYaw) * k;
    s.hipsY += (pose.hipsY - s.hipsY) * k;
    rig.root.rotation.set(-(Math.PI / 2) * s.lying, s.yaw + s.bodyYaw, 0);
    rig.bones.hips.position.y = 0.95 + s.hipsY;

    for (const name of BONE_NAMES) {
      const bone = rig.bones[name];
      const [x, y, z] = pose.rot[name] ?? [0, 0, 0];
      bone.rotation.x += (x - bone.rotation.x) * k;
      bone.rotation.y += (y - bone.rotation.y) * k;
      bone.rotation.z += (z - bone.rotation.z) * k;
    }
  });

  return <primitive object={rig.root} />;
}
