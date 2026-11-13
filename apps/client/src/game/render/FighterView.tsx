import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { runtime } from '../runtime';
import { poseFor } from './pose';
import { BONE_NAMES, buildRig } from './rig';
import { visualFor } from './visuals';

/** Vue d'un combattant : lit l'état de la sim (interpolé), n'écrit jamais dedans. */
export function FighterView({ index, characterId }: { index: number; characterId: string }) {
  const spec = useMemo(() => visualFor(characterId), [characterId]);
  const rig = useMemo(() => buildRig(spec), [spec]);
  const s = useMemo(() => ({ yaw: 0, t: 0, bodyYaw: 0, hipsY: 0, lying: 0, px: 0, pz: 0, init: false }), []);

  useFrame((_, delta) => {
    const w = runtime.world;
    const p = runtime.prev;
    if (!w || !p) return;
    const cur = w.fighters[index]!;
    const prev = p.fighters[index]!;
    const a = runtime.alpha;
    const k = 1 - Math.exp(-delta * 22);
    // Réactions et parades : le corps suit la pose presque sans retard. Coups, pas lancés et esquives : un peu de
    // lissage pour que l'armé et le retour se voient (la pose elle-même porte l'anticipation et l'impact).
    const snap = cur.action === 'hitstun' || cur.action === 'parry';
    const move = cur.action === 'attack' || cur.action === 'dodge' || cur.action === 'dash';
    const kb = 1 - Math.exp(-delta * (snap ? 75 : move ? 40 : 18));
    s.t += delta;

    const pose = poseFor(cur, s.t, w, a);
    const xf = pose.root;
    // Pendant une projection, la chorégraphie impose la hauteur et les rotations ; ensuite le corps reste à terre.
    s.lying = xf ? (xf.centerY < 0.35 ? 1 : 0) : s.lying + ((pose.lying ? 1 : 0) - s.lying) * k;
    const ground = THREE.MathUtils.lerp(prev.pos.y, cur.pos.y, a);
    const centerY = xf ? xf.centerY * spec.height : THREE.MathUtils.lerp(rig.pivotH, 0.2, s.lying);
    const tx = THREE.MathUtils.lerp(prev.pos.x, cur.pos.x, a);
    const tz = THREE.MathUtils.lerp(prev.pos.z, cur.pos.z, a);
    // En ligne, une correction (entrée adverse arrivée après la prédiction) déplace d'un coup le combattant :
    // on fond l'écart en quelques images au lieu de le téléporter. Grand écart (projection, réapparition) : direct.
    const err = Math.hypot(tx - s.px, tz - s.pz);
    if (runtime.online && s.init && err < 1.5) {
      const ks = 1 - Math.exp(-delta * (index === runtime.online.localIndex ? 30 : 16));
      s.px += (tx - s.px) * ks;
      s.pz += (tz - s.pz) * ks;
    } else {
      s.px = tx;
      s.pz = tz;
      s.init = true;
    }
    rig.root.position.set(s.px, ground + centerY, s.pz);

    // Lissage de l'orientation : évite les claquements quand la cible change d'angle.
    let dy = Math.atan2(cur.facing.x, cur.facing.z) - s.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    s.yaw += dy * k;
    s.bodyYaw += (pose.bodyYaw - s.bodyYaw) * kb;
    s.hipsY += (pose.hipsY - s.hipsY) * kb;
    rig.root.rotation.y = s.yaw + s.bodyYaw;
    rig.rotor.rotation.set(xf ? xf.rotX : -(Math.PI / 2) * s.lying, 0, xf ? xf.rotZ : 0);
    rig.bones.hips.position.y = rig.hipsBase + s.hipsY;

    for (const name of BONE_NAMES) {
      if (name === 'tail') continue;
      const bone = rig.bones[name];
      const [x, y, z] = pose.rot[name] ?? [0, 0, 0];
      bone.rotation.x += (x - bone.rotation.x) * kb;
      bone.rotation.y += (y - bone.rotation.y) * kb;
      bone.rotation.z += (z - bone.rotation.z) * kb;
    }

    // Éléments qui ondulent : écharpes, bandeaux, queue de cheval, queues d'animaux.
    const energy = cur.action === 'runFwd' ? 1.7 : cur.action.startsWith('walk') || cur.action.startsWith('side') ? 1.25 : 1;
    for (const sw of rig.sway) sw.obj.rotation.x = 0.35 + Math.sin(s.t * sw.freq * energy + sw.phase) * sw.amp * energy;
    rig.bones.tail.rotation.set(
      (cur.action === 'runFwd' ? 0.5 : 0.1) + Math.sin(s.t * 3) * 0.08,
      Math.sin(s.t * 2.2) * 0.3 * energy,
      0,
    );
  });

  return <primitive object={rig.root} />;
}
