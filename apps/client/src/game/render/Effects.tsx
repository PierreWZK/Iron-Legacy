import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { runtime } from '../runtime';
import { useHud } from '../store';

const N = 64;
const GRAVITY = 9;
const COLORS: Record<string, number> = {
  hit: 0xffb020,
  block: 0x9fd8ff,
  parry: 0xfff27a,
  throw: 0xff5555,
  tech: 0xffffff,
};

interface Particle {
  p: THREE.Vector3;
  v: THREE.Vector3;
  life: number;
}

/**
 * Étincelles d'impact : pool de N particules instanciées, alimenté par les événements de la sim.
 * Lecture seule côté sim : ce composant consomme `runtime.drainEvents()` et ne modifie rien dedans.
 */
export function Effects() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo<Particle[]>(
    () => Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 })),
    [],
  );
  const next = useRef(0);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < N; i++) mesh.setColorAt(i, color.setHex(0xffffff));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [color]);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    for (const e of runtime.drainEvents()) {
      if (e.kind === 'ko') continue;
      if (e.kind === 'hit') {
        useHud.setState({
          lastHit: { damage: e.damage ?? 0, counter: !!e.counter, combo: e.combo ?? 0, stamp: performance.now() },
        });
      }
      const count = e.kind === 'hit' ? (e.counter ? 22 : 14) : 10;
      color.setHex(COLORS[e.kind] ?? 0xffffff);
      for (let i = 0; i < count; i++) {
        const idx = next.current;
        next.current = (idx + 1) % N;
        const q = parts[idx]!;
        q.p.set(e.x, e.y, e.z);
        q.v.set((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4);
        q.life = 0.35 + Math.random() * 0.25;
        mesh.setColorAt(idx, color);
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < N; i++) {
      const q = parts[i]!;
      if (q.life > 0) {
        q.life -= dt;
        q.v.y -= GRAVITY * dt;
        q.p.addScaledVector(q.v, dt);
      }
      const s = q.life > 0 ? 0.07 : 0;
      scale.set(s, s, s);
      m4.compose(q.p, quat, scale);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
