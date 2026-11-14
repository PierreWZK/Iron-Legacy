import { ARENA_RADIUS } from '@iron/engine';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Particles, SkyDome, Stars } from './atmosphere';
import { modelProp } from './envModels';
import { LOOKS } from './looks';
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
  const look = LOOKS[id as keyof typeof LOOKS];
  const gl = useThree((t) => t.gl);
  useEffect(() => {
    const before = gl.toneMappingExposure;
    gl.toneMappingExposure = look?.exposure ?? 1;
    return () => {
      gl.toneMappingExposure = before;
    };
  }, [gl, look]);
  const ambient = look?.ambient ?? spec.ambient;
  const sun = look?.sun ?? spec.sun;
  const boost = look?.pointBoost ?? 1;
  // Brouillard teinté comme l'horizon : il fond le décor dans le ciel au lieu de le noircir.
  const fogColor = look ? '#' + new THREE.Color(look.horizon).lerp(new THREE.Color(look.skyTop), 0.45).getHexString() : spec.sky;
  const scenery = useMemo(() => {
    const rnd = mulberry32(id.length * 7919 + id.charCodeAt(0) * 31 + id.charCodeAt(1));
    const group = new THREE.Group();
    for (const layer of spec.layers) {
      for (let i = 0; i < layer.count; i++) {
        const o = modelProp(layer.kind, rnd, layer.colors) ?? makeProp(layer.kind, rnd, layer.colors);
        // En couronne régulière (murs, portes) : tourné vers le centre. Sinon semé au hasard.
        const angle = layer.ring ? ((i + 0.5) / layer.count) * Math.PI * 2 : rnd() * Math.PI * 2;
        const radius = layer.rMin + rnd() * (layer.rMax - layer.rMin);
        o.position.set(Math.cos(angle) * radius, layer.y ?? 0, Math.sin(angle) * radius);
        o.rotation.y = layer.ring ? -angle + (layer.turn ?? 0) : rnd() * Math.PI * 2;
        o.scale.setScalar(layer.scale[0] + rnd() * (layer.scale[1] - layer.scale[0]));
        group.add(o);
      }
    }
    return group;
  }, [id, spec]);

  return (
    <group>
      <color attach="background" args={[spec.sky]} />
      <fog attach="fog" args={[fogColor, spec.fog[0], spec.fog[1]]} />
      {look && <SkyDome top={look.skyTop} horizon={look.horizon} />}
      {look?.stars && <Stars />}
      {look && <hemisphereLight args={[look.hemi[0], look.hemi[1], look.hemi[2]]} />}
      {look && <directionalLight position={[-6, 5, -9]} intensity={look.rim[1]} color={look.rim[0]} />}
      <pointLight position={[0, 6.5, 0]} intensity={26} distance={16} color={sun[0]} />
      <ambientLight intensity={ambient[1]} color={ambient[0]} />
      <directionalLight
        position={[5, 12, 6]}
        intensity={sun[1]}
        color={sun[0]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      {(spec.points ?? []).slice(0, 3).map((p, i) => (
        <pointLight key={i} position={p.pos} intensity={p.intensity * boost} distance={20} color={p.color} />
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
      {look?.particles && <Particles kind={look.particles.kind} color={look.particles.color} />}
    </group>
  );
}
