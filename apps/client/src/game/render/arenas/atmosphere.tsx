import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ParticleKind } from './looks';
import { mulberry32 } from './scenery';

/** Ciel : grande sphère à dégradé vertical (zénith → horizon), non touchée par le brouillard. */
export function SkyDome({ top, horizon }: { top: string; horizon: string }) {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6 + 0.12, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.7)), 1.0); }',
    }),
    [top, horizon],
  );
  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[120, 24, 16]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

/** Étoiles : points fixes dans la moitié haute du ciel. */
export function Stars() {
  const positions = useMemo(() => {
    const rnd = mulberry32(4242);
    const a = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const u = rnd() * Math.PI * 2;
      const v = 0.12 + rnd() * 0.85;
      const r = 100;
      a[i * 3] = Math.cos(u) * Math.sqrt(1 - v * v) * r;
      a[i * 3 + 1] = v * r;
      a[i * 3 + 2] = Math.sin(u) * Math.sqrt(1 - v * v) * r;
    }
    return a;
  }, []);
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.9} sizeAttenuation={false} transparent opacity={0.85} fog={false} depthWrite={false} />
    </points>
  );
}

interface Flow { n: number; size: number; vy: number; drift: number; height: number; spread: number; bob: number }
const FLOWS: Record<ParticleKind, Flow> = {
  leaves: { n: 150, size: 0.16, vy: -0.9, drift: 1.1, height: 11, spread: 16, bob: 0 },
  petals: { n: 120, size: 0.14, vy: -0.6, drift: 0.9, height: 11, spread: 16, bob: 0 },
  snow: { n: 520, size: 0.08, vy: -1.2, drift: 0.5, height: 12, spread: 16, bob: 0 },
  embers: { n: 170, size: 0.09, vy: 1.5, drift: 0.7, height: 10, spread: 14, bob: 0 },
  dust: { n: 280, size: 0.06, vy: -0.08, drift: 1.4, height: 6, spread: 16, bob: 0 },
  fireflies: { n: 70, size: 0.14, vy: 0, drift: 0.35, height: 3.6, spread: 12, bob: 1.2 },
  sparks: { n: 130, size: 0.07, vy: 1.9, drift: 0.25, height: 9, spread: 14, bob: 0 },
};

/** Particules d'ambiance (rendu seulement) : feuilles, neige, braises, lucioles… */
export function Particles({ kind, color }: { kind: ParticleKind; color: string }) {
  const f = FLOWS[kind];
  const ref = useRef<THREE.Points>(null);
  const base = useMemo(() => {
    const rnd = mulberry32(777 + kind.length);
    const a = new Float32Array(f.n * 3);
    for (let i = 0; i < f.n; i++) {
      a[i * 3] = (rnd() - 0.5) * f.spread * 2;
      a[i * 3 + 1] = rnd() * f.height;
      a[i * 3 + 2] = (rnd() - 0.5) * f.spread * 2;
    }
    return a;
  }, [f, kind]);
  const pos = useMemo(() => new Float32Array(base), [base]);
  useFrame(({ clock }, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < f.n; i++) {
      let y = pos[i * 3 + 1]! + f.vy * dt;
      if (y < 0) y += f.height;
      if (y > f.height) y -= f.height;
      pos[i * 3 + 1] = y;
      pos[i * 3] = base[i * 3]! + Math.sin(t * 0.7 + i) * f.drift * (1 + (i % 3));
      pos[i * 3 + 2] = base[i * 3 + 2]! + Math.cos(t * 0.5 + i * 1.7) * f.drift * (1 + (i % 2));
      if (f.bob) pos[i * 3 + 1] = (base[i * 3 + 1]! % f.height) * 0.5 + 0.4 + Math.sin(t * f.bob + i) * 0.5;
    }
    const attr = pts.geometry.attributes['position']!;
    (attr.array as Float32Array).set(pos);
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={f.size} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
