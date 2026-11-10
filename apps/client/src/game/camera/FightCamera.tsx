import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fightAxis, runtime } from '../runtime';

const tmp = new THREE.Vector3();
const look = new THREE.Vector3();

/**
 * Caméra de combat : cadre le milieu des combattants, perpendiculaire à l'axe P1→P2
 * (P1 toujours à gauche). Distance proportionnelle à l'écart pour garder tout le monde visible.
 */
export function FightCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  useFrame((_, delta) => {
    const fs = runtime.world.fighters;
    const a = runtime.alpha;
    let cx = 0;
    let cz = 0;
    let maxSpread = 0;
    const pts = fs.map((f, i) => {
      const p = runtime.prev.fighters[i]!.pos;
      return { x: p.x + (f.pos.x - p.x) * a, z: p.z + (f.pos.z - p.z) * a };
    });
    for (const p of pts) {
      cx += p.x;
      cz += p.z;
    }
    cx /= pts.length;
    cz /= pts.length;
    for (const p of pts) maxSpread = Math.max(maxSpread, Math.hypot(p.x - cx, p.z - cz));

    const axis = fightAxis(runtime.world);
    // Direction de visée = (axis.z, -axis.x) pour que la droite écran soit l'axe P1→P2.
    const fx = axis.z;
    const fz = -axis.x;
    const dist = THREE.MathUtils.clamp(4.2 + maxSpread * 2.2, 5.5, 13);
    tmp.set(cx - fx * dist, 1.9 + maxSpread * 0.25, cz - fz * dist);
    look.set(cx, 1.15, cz);

    const k = 1 - Math.exp(-delta * 7);
    camera.position.lerp(tmp, k);
    camera.lookAt(look);
  });

  return null;
}
