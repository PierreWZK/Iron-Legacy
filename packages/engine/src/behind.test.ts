import { describe, expect, it } from 'vitest';
import { Btn, createDuelWorld, stepWorld } from './index';

describe('passer derrière l adversaire', () => {
  it('en tournant autour de lui, P1 finit de l autre côté et les deux se regardent toujours', () => {
    const w = createDuelWorld({ p1: 'kairo', p2: 'vera', distance: 1.4 });
    expect(w.fighters[0]!.pos.x).toBeLessThan(w.fighters[1]!.pos.x);
    for (let i = 0; i < 400; i++) stepWorld(w, [Btn.SideR, 0]);
    const [a, b] = w.fighters;
    const dist = Math.hypot(a!.pos.x - b!.pos.x, a!.pos.z - b!.pos.z);
    expect(dist).toBeLessThan(2.5);
    // Chacun regarde l autre.
    const dx = (b!.pos.x - a!.pos.x) / dist;
    const dz = (b!.pos.z - a!.pos.z) / dist;
    expect(a!.facing.x * dx + a!.facing.z * dz).toBeGreaterThan(0.95);
    expect(b!.facing.x * -dx + b!.facing.z * -dz).toBeGreaterThan(0.95);
  });

  it('un demi-tour complet place P1 à droite de P2 sur l axe X', () => {
    const w = createDuelWorld({ p1: 'kairo', p2: 'vera', distance: 1.4 });
    let swapped = false;
    for (let i = 0; i < 600 && !swapped; i++) {
      stepWorld(w, [Btn.SideR, 0]);
      swapped = w.fighters[0]!.pos.x > w.fighters[1]!.pos.x + 0.3;
    }
    expect(swapped).toBe(true);
  });
});
