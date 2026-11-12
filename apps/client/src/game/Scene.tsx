import { Canvas, useFrame } from '@react-three/fiber';
import { getCharacter, TICK_RATE } from '@iron/engine';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { FightCamera } from './camera/FightCamera';
import { KeyboardInput } from './input/keyboard';
import { ArenaScene, arenaFor } from './render/arenas';
import { Effects } from './render/Effects';
import { FighterView } from './render/FighterView';
import { runtime } from './runtime';
import { useHud } from './store';
import { arcadeFightOver } from './arcade/session';
import { storyFightOver } from './story/session';
import { robotFightOver } from './robots/session';
import { onlineFightOver } from './online/session';
import type { ArenaId } from './render/arenas';

/** Pilote la sim à pas fixe depuis la boucle de rendu et pousse un résumé vers l'interface (10 Hz). */
function Simulation({ kb }: { kb: KeyboardInput }) {
  const acc = useMemo(() => ({ since: 0, frames: 0, ended: false }), []);

  useFrame((_, delta) => {
    runtime.advance(delta, kb);
    const w = runtime.world;
    if (!w) return;
    if (w.match.phase === 'over' && !acc.ended) {
      // Fin du combat : en arcade, on enchaîne après une courte pause (sans effet hors arcade).
      acc.ended = true;
      window.setTimeout(() => {
        arcadeFightOver();
        storyFightOver();
        robotFightOver();
        onlineFightOver();
      }, 2500);
    }
    acc.since += delta;
    acc.frames++;
    if (acc.since < 0.1) return;

    const [f0, f1] = [w.fighters[0]!, w.fighters[1]!];
    useHud.setState({
      fps: Math.round(acc.frames / acc.since),
      tick: w.tick,
      names: [getCharacter(f0.characterId).name, getCharacter(f1.characterId).name],
      health: [f0.health, f1.health],
      maxHealth: [f0.maxHealth, f1.maxHealth],
      actions: [f0.action, f1.action],
      moves: [f0.move, f1.move],
      moveFrames: [f0.moveFrame, f1.moveFrame],
      combo: [f0.combo, f1.combo],
      distance: Math.hypot(f0.pos.x - f1.pos.x, f0.pos.z - f1.pos.z),
      phase: w.match.phase,
      clock: Math.ceil(w.match.clock / TICK_RATE),
      round: w.match.round,
      wins: [w.match.wins[0], w.match.wins[1]],
      roundWinner: w.match.roundWinner,
      matchWinner: w.match.matchWinner,
      dummy: runtime.config.dummy,
      mode: runtime.config.mode,
      infinite: runtime.infinite,
    });
    useHud.setState({
      ffa: w.match.mode === 'ffa',
      roster: w.fighters.map((f) => ({
        name: getCharacter(f.characterId).name, hp: f.health, max: f.maxHealth, alive: f.health > 0,
      })),
    });
    acc.since = 0;
    acc.frames = 0;
  }, -1); // priorité négative : la sim passe avant les vues et la caméra

  return null;
}

/** Scène de combat. Montée seulement pendant un combat (remontée à chaque nouveau combat). */
export function Scene() {
  const kb = useMemo(() => new KeyboardInput(), []);
  useEffect(() => kb.attach(), [kb]);
  const { p1, p2 } = runtime.config;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __iron: unknown }).__iron = runtime;
  }, []);

  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.75]}
      camera={{ fov: 42, near: 0.1, position: [0, 2, 8] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Simulation kb={kb} />
      <FightCamera />
      <ArenaScene id={(runtime.config.arena as ArenaId | undefined) ?? arenaFor(p2)} />
      {(runtime.online ? runtime.heroes : [p1, p2]).map((hero, i) => (
        <FighterView key={i} index={i} characterId={hero} />
      ))}
      <Effects />
    </Canvas>
  );
}
