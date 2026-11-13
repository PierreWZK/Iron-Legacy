import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import type { MoveId } from '@iron/engine';
import { RigPlayer } from './RigPlayer';
import { visualFor } from './visuals';

const MOVES: MoveId[] = ['jab', 'cross', 'roundhouse', 'axeKick', 'uppercut', 'spinKick', 'lunge', 'frontKick'];

/** Deux combattants face à face qui s'échangent des coups : décor vivant du menu principal. */
function Duel({ a, b }: { a: string; b: string }) {
  const pa = useMemo(() => new RigPlayer(a, 0.02), [a]);
  const pb = useMemo(() => new RigPlayer(b, 0.02), [b]);
  const st = useMemo(() => ({ t: 0, next: 1.2, i: 0 }), []);
  pa.rig.root.position.x = -1.15;
  pa.rig.root.rotation.y = Math.PI / 2;
  pb.rig.root.position.x = 1.15;
  pb.rig.root.rotation.y = -Math.PI / 2;

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    st.t += d;
    st.next -= d;
    if (st.next <= 0) {
      const who = st.i % 2 === 0 ? pa : pb;
      who.play(MOVES[(st.i * 3 + 1) % MOVES.length]!);
      st.i++;
      st.next = 1.5;
    }
    pa.update(d);
    pb.update(d);
    const ang = Math.sin(st.t * 0.18) * 0.5;
    state.camera.position.set(Math.sin(ang) * 5 - 1.7, 1.45 + Math.sin(st.t * 0.3) * 0.15, Math.cos(ang) * 5);
    state.camera.lookAt(-1.7, 1.0, 0);
  });

  return (
    <>
      <primitive object={pa.rig.root} />
      <primitive object={pb.rig.root} />
    </>
  );
}

export default function MenuDiorama({ a, b }: { a: string; b: string }) {
  const ca = visualFor(a).accent;
  const cb = visualFor(b).accent;
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 36, position: [0, 1.5, 5.6] }} gl={{ antialias: true }}>
      <color attach="background" args={['#07090d']} />
      <fog attach="fog" args={['#07090d', 7, 16]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 5, 4]} intensity={2.2} />
      <directionalLight position={[-4, 3, -3]} intensity={3} color={ca} />
      <directionalLight position={[4, 3, -3]} intensity={3} color={cb} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#0d1118" roughness={0.5} metalness={0.5} />
      </mesh>
      <gridHelper args={[18, 36, '#233044', '#141b27']} position={[0, 0.005, 0]} />
      <Duel a={a} b={b} />
    </Canvas>
  );
}
