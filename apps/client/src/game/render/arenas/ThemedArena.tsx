import { ARENA_RADIUS } from '@iron/engine';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { makeProp, mulberry32 } from './scenery';
import type { ArenaId, ArenaSpec } from './specs';

/** Pluie : points qui tombent autour de la scène (rendu seulement). */
function Rain() {
  const ref = useRef<THREE.Points>(null);
  const N = 700;
  const positions = useMemo(() => {
    const rnd = mulberry32(99);
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      a[i * 3] = (rnd() - 0.5) * 30;
      a[i * 3 + 1] = rnd() * 14;
      a[i * 3 + 2] = (rnd() - 0.5) * 30;
    }
    return a;
  }, []);
  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes['position']!.array as Float32Array;
    for (let i = 0; i < N; i++) {
      let y = arr[i * 3 + 1]! - dt * 18;
      if (y < 0) y += 14;
      arr[i * 3 + 1] = y;
    }
    pts.geometry.attributes['position']!.needsUpdate = true;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9fb4d8" size={0.06} transparent opacity={0.7} />
    </points>
  );
}

/** Décor générique : sol, anneau lumineux, lumières, couches d'éléments posés en couronne (tout en code). */
export function ThemedArena({ id, spec }: { id: ArenaId; spec: ArenaSpec }) {
  const scenery = useMemo(() => {
    const rnd = mulberry32(id.length * 7919 + id.charCodeAt(0) * 31 + id.charCodeAt(1));
    const group = new THREE.Group();
    for (const layer of spec.layers) {
      for (let i = 0; i < layer.count; i++) {
        const o = makeProp(layer.kind, rnd, layer.colors);
        const angle = rnd() * Math.PI * 2;
        const radius = layer.rMin + rnd() * (layer.rMax - layer.rMin);
        o.position.set(Math.cos(angle) * radius, layer.y ?? 0, Math.sin(angle) * radius);
        o.rotation.y = rnd() * Math.PI * 2;
        o.scale.setScalar(layer.scale[0] + rnd() * (layer.scale[1] - layer.scale[0]));
        group.add(o);
      }
    }
    return group;
  }, [id, spec]);

  return (
    <group>
      <color attach="background" args={[spec.sky]} />
      <fog attach="fog" args={[spec.sky, spec.fog[0], spec.fog[1]]} />
      <ambientLight intensity={spec.ambient[1]} color={spec.ambient[0]} />
      <directionalLight
        position={[5, 12, 6]}
        intensity={spec.sun[1]}
        color={spec.sun[0]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      {(spec.points ?? []).slice(0, 3).map((p, i) => (
        <pointLight key={i} position={p.pos} intensity={p.intensity} distance={18} color={p.color} />
      ))}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[80, 48]} />
        <meshStandardMaterial color={spec.ground} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} receiveShadow>
        <circleGeometry args={[ARENA_RADIUS + 1.5, 64]} />
        <meshStandardMaterial color={spec.floor} roughness={0.9} />
      </mesh>
      {spec.grid && (
        <gridHelper args={[ARENA_RADIUS * 2 + 3, spec.grid.division, spec.grid.color, spec.grid.color]} position-y={0.012} />
      )}
      <mesh rotation-x={-Math.PI / 2} position-y={0.015}>
        <ringGeometry args={[ARENA_RADIUS - 0.12, ARENA_RADIUS, 96]} />
        <meshStandardMaterial color={spec.ring} emissive={spec.ring} emissiveIntensity={1.2} />
      </mesh>
      <primitive object={scenery} />
      {spec.rain && <Rain />}
    </group>
  );
}
