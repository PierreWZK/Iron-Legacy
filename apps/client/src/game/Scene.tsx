import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FightCamera } from './camera/FightCamera';
import { KeyboardInput } from './input/keyboard';
import { Arena } from './render/Arena';
import { FighterView } from './render/FighterView';
import type { FighterLook } from './render/rig';
import { runtime } from './runtime';
import { useDebug } from './store';

const P1_LOOK: FighterLook = { skin: 0xc68e6a, suit: 0x35506b, accent: 0x34e0ff, scale: 1.0 };
const P2_LOOK: FighterLook = { skin: 0x8d5a3b, suit: 0x703030, accent: 0xff4a3a, scale: 1.05 };

/** Pilote la sim à pas fixe depuis la boucle de rendu, et pousse l'état de debug vers l'UI. */
function Simulation() {
  const kb = useMemo(() => new KeyboardInput(), []);
  const hud = useRef({ since: 0, frames: 0 });

  useEffect(() => kb.attach(), [kb]);
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __iron: unknown }).__iron = runtime;
  }, []);

  useFrame((_, delta) => {
    runtime.advance(delta, kb);
    const h = hud.current;
    h.since += delta;
    h.frames++;
    if (h.since >= 0.1) {
      const [a, b] = runtime.world.fighters;
      useDebug.setState({
        fps: Math.round(h.frames / h.since),
        tick: runtime.world.tick,
        action: a!.action,
        distance: Math.hypot(a!.pos.x - b!.pos.x, a!.pos.z - b!.pos.z),
        dummy: runtime.dummyMode,
        health: [a!.health, b!.health],
      });
      h.since = 0;
      h.frames = 0;
    }
  }, -1); // priorité négative : la sim passe avant les vues et la caméra

  return null;
}

export function Scene() {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.75]}
      camera={{ fov: 42, near: 0.1, position: [0, 2, 8] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Simulation />
      <FightCamera />
      <Arena />
      <FighterView index={0} look={P1_LOOK} />
      <FighterView index={1} look={P2_LOOK} />
    </Canvas>
  );
}
