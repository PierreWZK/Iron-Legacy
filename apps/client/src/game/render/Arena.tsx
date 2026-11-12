import { ARENA_RADIUS } from '@iron/engine';
import { useMemo } from 'react';
import * as THREE from 'three';

/** Arène « Dojo » (placeholder low-poly). Chaque arène future = un composant de ce type. */
export function Arena() {
  const pillars = useMemo(
    () => Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      return new THREE.Vector3(Math.cos(a) * (ARENA_RADIUS + 2.5), 0, Math.sin(a) * (ARENA_RADIUS + 2.5));
    }),
    [],
  );

  return (
    <group>
      <color attach="background" args={['#0b0d12']} />
      <fog attach="fog" args={['#0b0d12', 16, 42]} />
      <ambientLight intensity={0.35} color="#8fa3c7" />
      <directionalLight
        position={[5, 12, 6]}
        intensity={2.2}
        color="#ffe9c4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />

      {/* Tatami circulaire + anneau lumineux marquant la limite */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[ARENA_RADIUS + 4, 64]} />
        <meshStandardMaterial color="#2a1f17" roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} receiveShadow>
        <circleGeometry args={[ARENA_RADIUS, 64]} />
        <meshStandardMaterial color="#8a6a45" roughness={0.75} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <ringGeometry args={[ARENA_RADIUS - 0.12, ARENA_RADIUS, 96]} />
        <meshStandardMaterial color="#ffb020" emissive="#ffb020" emissiveIntensity={1.2} />
      </mesh>

      {/* Piliers + lanternes (un point lumineux sur deux pour limiter le coût) */}
      {pillars.map((p, i) => (
        <group key={i} position={p}>
          <mesh position-y={2.2} castShadow>
            <boxGeometry args={[0.45, 4.4, 0.45]} />
            <meshStandardMaterial color="#3a2a20" roughness={0.8} />
          </mesh>
          <mesh position-y={3.6}>
            <sphereGeometry args={[0.22, 12, 8]} />
            <meshStandardMaterial color="#ffd48a" emissive="#ffb020" emissiveIntensity={2} />
          </mesh>
          {i % 2 === 0 && <pointLight position-y={3.4} intensity={14} distance={11} color="#ffb766" />}
        </group>
      ))}
    </group>
  );
}
