import { Btn, cloneWorld, createDuelWorld, DT, stepWorld, type InputFrame, type World } from '@iron/engine';
import type { Axis, KeyboardInput } from './input/keyboard';

export type DummyMode = 'idle' | 'patrol';

const MAX_STEPS_PER_FRAME = 5;

/** Axe P1 → P2 (repli sur X si superposés). */
export function fightAxis(w: World): Axis {
  const a = w.fighters[0]!.pos;
  const b = w.fighters[1]!.pos;
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  return d > 1e-4 ? { x: (b.x - a.x) / d, z: (b.z - a.z) / d } : { x: 1, z: 0 };
}

/** Adversaire factice : séquence répétitive pour tester suivi caméra, orbite et collisions. */
function patrolInput(tick: number): InputFrame {
  const seq = [Btn.Fwd, Btn.SideR, Btn.Back, Btn.SideL];
  return seq[Math.floor(tick / 50) % seq.length]!;
}

/** Boucle à pas fixe : accumule le temps réel, avance la sim par ticks, garde l'état précédent pour interpoler. */
export class Runtime {
  world = createDuelWorld();
  prev = cloneWorld(this.world);
  alpha = 0;
  dummyMode: DummyMode = 'idle';
  private acc = 0;

  reset(): void {
    this.world = createDuelWorld();
    this.prev = cloneWorld(this.world);
    this.acc = 0;
  }

  advance(delta: number, kb: KeyboardInput): void {
    if (kb.consume('t')) this.dummyMode = this.dummyMode === 'idle' ? 'patrol' : 'idle';
    if (kb.consume('enter')) this.reset();

    this.acc += Math.min(delta, 0.25);
    let steps = 0;
    while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME) {
      this.prev = cloneWorld(this.world);
      const p1 = kb.sample(this.world.fighters[0]!, fightAxis(this.world));
      const p2 = this.dummyMode === 'patrol' ? patrolInput(this.world.tick) : 0;
      stepWorld(this.world, [p1, p2]);
      this.acc -= DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0; // trop de retard : on abandonne le rattrapage
    this.alpha = this.acc / DT;
  }
}

export const runtime = new Runtime();
