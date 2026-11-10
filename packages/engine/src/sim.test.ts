import { describe, expect, it } from 'vitest';
import { ARENA_RADIUS, FIGHTER_RADIUS, GRAVITY, JUMP_VELOCITY, TICK_RATE } from './constants';
import { Btn } from './input';
import { stepWorld } from './sim';
import { cloneWorld, createDuelWorld, type World } from './state';

const run = (w: World, ticks: number, p1 = 0, p2 = 0) => {
  for (let i = 0; i < ticks; i++) stepWorld(w, [p1, p2]);
};
const dist = (w: World) =>
  Math.hypot(w.fighters[0]!.pos.x - w.fighters[1]!.pos.x, w.fighters[0]!.pos.z - w.fighters[1]!.pos.z);

describe('moteur — déplacements', () => {
  it('avancer réduit la distance, reculer l\'augmente', () => {
    const w = createDuelWorld(6);
    run(w, 30, Btn.Fwd);
    const closer = dist(w);
    expect(closer).toBeLessThan(6);
    run(w, 30, Btn.Back);
    expect(dist(w)).toBeGreaterThan(closer);
  });

  it('le pas de côté orbite à distance constante et garde la face à la cible', () => {
    const w = createDuelWorld(4);
    run(w, 60, Btn.SideR);
    run(w, 1); // la face est recalculée au début du tick suivant
    const p1 = w.fighters[0]!;
    expect(dist(w)).toBeCloseTo(4, 3);
    expect(Math.abs(p1.pos.z)).toBeGreaterThan(0.5); // a vraiment quitté l'axe initial
    const toTarget = { x: w.fighters[1]!.pos.x - p1.pos.x, z: w.fighters[1]!.pos.z - p1.pos.z };
    const n = Math.hypot(toTarget.x, toTarget.z);
    expect(p1.facing.x).toBeCloseTo(toTarget.x / n, 3);
    expect(p1.facing.z).toBeCloseTo(toTarget.z / n, 3);
  });

  it('SideL et SideR vont dans des sens opposés', () => {
    const a = createDuelWorld(4);
    const b = createDuelWorld(4);
    run(a, 30, Btn.SideL);
    run(b, 30, Btn.SideR);
    expect(a.fighters[0]!.pos.z).toBeCloseTo(-b.fighters[0]!.pos.z, 5);
    expect(a.fighters[0]!.pos.z).not.toBeCloseTo(0, 1);
  });

  it('courir est plus rapide que marcher', () => {
    const walk = createDuelWorld(8);
    const sprint = createDuelWorld(8);
    run(walk, 30, Btn.Fwd);
    run(sprint, 30, Btn.Fwd | Btn.Shift);
    expect(dist(sprint)).toBeLessThan(dist(walk));
    expect(sprint.fighters[0]!.action).toBe('runFwd');
  });
});

describe('moteur — collisions', () => {
  it('deux combattants ne se traversent jamais (pushbox)', () => {
    const w = createDuelWorld(3);
    run(w, 240, Btn.Fwd | Btn.Shift, Btn.Fwd | Btn.Shift);
    expect(dist(w)).toBeGreaterThanOrEqual(FIGHTER_RADIUS * 2 - 1e-6);
  });

  it('reste dans l\'arène même en courant vers le bord', () => {
    const w = createDuelWorld(3);
    run(w, 600, Btn.Back | Btn.Shift, 0);
    for (const f of w.fighters) expect(Math.hypot(f.pos.x, f.pos.z)).toBeLessThanOrEqual(ARENA_RADIUS - FIGHTER_RADIUS + 1e-6);
  });

  it('superposition exacte résolue sans NaN', () => {
    const w = createDuelWorld(3);
    w.fighters[1]!.pos = { ...w.fighters[0]!.pos };
    run(w, 5);
    for (const f of w.fighters) expect(Number.isFinite(f.pos.x + f.pos.z)).toBe(true);
    expect(dist(w)).toBeGreaterThanOrEqual(FIGHTER_RADIUS * 2 - 1e-6);
  });
});

describe('moteur — saut', () => {
  it('retombe au sol après la durée balistique et ne re-saute pas en maintenant la touche', () => {
    const w = createDuelWorld(4);
    run(w, 2, Btn.Jump);
    expect(w.fighters[0]!.pos.y).toBeGreaterThan(0);
    const airTicks = Math.ceil(((2 * JUMP_VELOCITY) / GRAVITY) * TICK_RATE);
    run(w, airTicks + 2, Btn.Jump);
    expect(w.fighters[0]!.pos.y).toBe(0);
    expect(w.fighters[0]!.action).toBe('idle');
  });

  it('on peut sauter par-dessus l\'adversaire sans collision', () => {
    const w = createDuelWorld(2);
    run(w, 1, Btn.Jump | Btn.Fwd | Btn.Shift);
    // En l'air, la pushbox est désactivée au-dessus de PUSH_MAX_HEIGHT.
    let crossed = false;
    for (let i = 0; i < 40; i++) {
      stepWorld(w, [0, 0]);
      if (w.fighters[0]!.pos.x > w.fighters[1]!.pos.x) crossed = true;
    }
    expect(crossed).toBe(true);
  });
});

describe('moteur — déterminisme', () => {
  it('mêmes entrées → même état, et cloneWorld ne partage pas de références', () => {
    const script = (t: number) => [(t * 7) % 128, (t * 13) % 128] as const;
    const a = createDuelWorld();
    const b = createDuelWorld();
    for (let t = 0; t < 500; t++) {
      stepWorld(a, script(t));
      stepWorld(b, script(t));
    }
    expect(a).toEqual(b);
    const snap = cloneWorld(a);
    stepWorld(a, [Btn.Fwd, 0]);
    expect(snap.tick).toBe(a.tick - 1);
    expect(snap.fighters[0]!.pos).not.toBe(a.fighters[0]!.pos);
  });
});
