import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fightAxis, runtime } from '../runtime';

const tmp = new THREE.Vector3();
const look = new THREE.Vector3();

/**
 * Caméra de combat : cadre le milieu des combattants, de profil, orientation fixe (+X à droite)
 * (la droite de l écran est fixe : la caméra ne tourne jamais). Distance proportionnelle à l'écart pour garder tout le monde visible.
 * Secousse proportionnelle à la force des impacts (lecture seule de `runtime.shake`).
 */
export function FightCamera() {
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;

  useFrame((_, delta) => {
    const w = runtime.world;
    const p = runtime.prev;
    if (!w || !p) return;
    const a = runtime.alpha;
    const pts = w.fighters.map((f, i) => {
      const pr = p.fighters[i]!.pos;
      return { x: pr.x + (f.pos.x - pr.x) * a, z: pr.z + (f.pos.z - pr.z) * a };
    });
    let cx = 0;
    let cz = 0;
    for (const q of pts) {
      cx += q.x;
      cz += q.z;
    }
    cx /= pts.length;
    cz /= pts.length;
    let spread = 0;
    for (const q of pts) spread = Math.max(spread, Math.hypot(q.x - cx, q.z - cz));

    const axis = fightAxis(w);
    // Direction de visée = (axis.z, -axis.x) : la droite de l'écran est l'axe P1→P2.
    const fx = axis.z;
    const fz = -axis.x;
    const dist = THREE.MathUtils.clamp(4.2 + spread * 2.2, 5.5, 13);
    tmp.set(cx - fx * dist, 2.5 + spread * 0.3, cz - fz * dist);
    look.set(cx, 1.15, cz);

    const k = 1 - Math.exp(-delta * 7);
    camera.position.lerp(tmp, k);
    const sh = runtime.shake * 0.12;
    camera.position.x += (Math.random() - 0.5) * sh;
    camera.position.y += (Math.random() - 0.5) * sh;
    camera.lookAt(look);
  });

  return null;
}
