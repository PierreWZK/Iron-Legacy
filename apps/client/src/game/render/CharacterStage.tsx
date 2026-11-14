import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { MoveId } from '@iron/engine';
import * as THREE from 'three';
import { RigPlayer, SHOWCASE_MOVES } from './RigPlayer';
import { visualFor } from './visuals';

export interface MoveRequest {
  move: MoveId;
  n: number;
}

/** Plateau tournant : le personnage joue ses coups à la demande, puis en boucle. */
function Showcase({ id, request, yaw }: { id: string; request: MoveRequest | null; yaw: { current: number } }) {
  const player = useMemo(() => new RigPlayer(id, 0.017), [id]);
  const st = useMemo(() => ({ next: 2.2, i: 0, last: 0, idle: 0 }), [id]);
  const holder = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const accent = player.spec.accent;

  useEffect(() => {
    if (!request || request.n === st.last) return;
    st.last = request.n;
    player.victory(false);
    player.play(request.move);
    st.next = 3.2;
  }, [request, player, st]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    player.update(d);
    st.idle += d;
    if (!player.busy) {
      st.next -= d;
      if (st.next <= 0) {
        player.victory(false);
        player.play(SHOWCASE_MOVES[st.i++ % SHOWCASE_MOVES.length]!);
        st.next = 2.6;
      }
    }
    if (holder.current) holder.current.rotation.y += (yaw.current - holder.current.rotation.y) * (1 - Math.exp(-d * 8));
    if (ring.current) ring.current.rotation.z += d * 0.4;
    state.camera.lookAt(0, 1.0, 0);
  });

  return (
    <group ref={holder}>
      <primitive object={player.root} />
      <mesh position={[0, 0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.7, 48]} />
        <meshStandardMaterial color="#10131a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.45, 1.55, 6, 1]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.62, 1.66, 64, 1]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Aperçu 3D d'un personnage (faire glisser pour tourner). */
export default function CharacterStage({ id, request }: { id: string; request: MoveRequest | null }) {
  const yaw = useRef(-0.55);
  const drag = useRef<number | null>(null);
  const accent = useMemo(() => new THREE.Color(visualFor(id).accent), [id]);
  return (
    <div
      className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={(e) => {
        drag.current = e.clientX;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current === null) return;
        yaw.current += (e.clientX - drag.current) * 0.012;
        drag.current = e.clientX;
      }}
      onPointerUp={() => {
        drag.current = null;
        yaw.current = -0.55;
      }}
    >
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 32, position: [0, 1.35, 5.6], near: 0.1, far: 40 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 5, 4]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 3, -3]} intensity={3} color={accent} />
        <pointLight position={[0, 0.3, 2]} intensity={6} color={accent} distance={5} />
        <Showcase id={id} request={request} yaw={yaw} />
      </Canvas>
    </div>
  );
}
