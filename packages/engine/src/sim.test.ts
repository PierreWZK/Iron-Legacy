import { describe, expect, it } from 'vitest';
import {
  ARENA_RADIUS, FIGHTER_RADIUS, GRAVITY, PUSH_MAX_HEIGHT, TICK_RATE, Btn, cloneWorld,
  createDuelWorld, getCharacter, stepWorld, type World,
} from './index';

const duel = (distance = 4) => createDuelWorld({ p1: 'kairo', p2: 'kairo', distance });
const run = (w: World, ticks: number, p1 = 0, p2 = 0) => {
  for (let i = 0; i < ticks; i++) stepWorld(w, [p1, p2]);
};
const dist = (w: World) =>
  Math.hypot(w.fighters[0]!.pos.x - w.fighters[1]!.pos.x, w.fighters[0]!.pos.z - w.fighters[1]!.pos.z);

describe('moteur — déplacements', () => {
  it("avancer réduit la distance, reculer l'augmente", () => {
    const w = duel(6);
    run(w, 30, Btn.Fwd);
    const closer = dist(w);
    expect(closer).toBeLessThan(6);
    run(w, 30, Btn.Back);
    expect(dist(w)).toBeGreaterThan(closer);
  });

  it('le pas de côté orbite à distance constante et garde la face à la cible', () => {
    const w = duel(4);
    run(w, 60, Btn.SideR);
    run(w, 1);
    const p1 = w.fighters[0]!;
    expect(dist(w)).toBeCloseTo(4, 3);
    expect(Math.abs(p1.pos.z)).toBeGreaterThan(0.5);
    const tx = w.fighters[1]!.pos.x - p1.pos.x;
    const tz = w.fighters[1]!.pos.z - p1.pos.z;
    const n = Math.hypot(tx, tz);
    expect(p1.facing.x).toBeCloseTo(tx / n, 3);
    expect(p1.facing.z).toBeCloseTo(tz / n, 3);
  });

  it('SideL et SideR vont dans des sens opposés', () => {
    const a = duel(4);
    const b = duel(4);
    run(a, 30, Btn.SideL);
    run(b, 30, Btn.SideR);
    expect(a.fighters[0]!.pos.z).toBeCloseTo(-b.fighters[0]!.pos.z, 5);
    expect(Math.abs(a.fighters[0]!.pos.z)).toBeGreaterThan(0.1);
  });

  it('courir est plus rapide que marcher', () => {
    const walk = duel(8);
    const sprint = duel(8);
    run(walk, 30, Btn.Fwd);
    run(sprint, 30, Btn.Fwd | Btn.Shift);
    expect(dist(sprint)).toBeLessThan(dist(walk));
    expect(sprint.fighters[0]!.action).toBe('runFwd');
  });
});

describe('moteur — collisions', () => {
  it("deux combattants ne se traversent jamais (pushbox)", () => {
    const w = duel(3);
    run(w, 240, Btn.Fwd | Btn.Shift, Btn.Fwd | Btn.Shift);
    expect(dist(w)).toBeGreaterThanOrEqual(FIGHTER_RADIUS * 2 - 1e-6);
  });

  it("reste dans l'arène même en reculant vers le bord", () => {
    const w = duel(3);
    run(w, 900, Btn.Back, 0);
    for (const f of w.fighters) {
      expect(Math.hypot(f.pos.x, f.pos.z)).toBeLessThanOrEqual(ARENA_RADIUS - FIGHTER_RADIUS + 1e-6);
    }
  });

  it('superposition exacte résolue sans NaN', () => {
    const w = duel(3);
    w.fighters[1]!.pos = { ...w.fighters[0]!.pos };
    run(w, 5);
    for (const f of w.fighters) expect(Number.isFinite(f.pos.x + f.pos.z)).toBe(true);
    expect(dist(w)).toBeGreaterThanOrEqual(FIGHTER_RADIUS * 2 - 1e-6);
  });
});

describe('moteur — saut', () => {
  it('retombe au sol après la durée balistique, sans re-sauter en maintenant la touche', () => {
    const w = duel(4);
    run(w, 2, Btn.Jump);
    expect(w.fighters[0]!.pos.y).toBeGreaterThan(0);
    const v = getCharacter('kairo').speeds.jumpVel;
    const airTicks = Math.ceil(((2 * v) / GRAVITY) * TICK_RATE);
    run(w, airTicks + 3, Btn.Jump);
    expect(w.fighters[0]!.pos.y).toBe(0);
    expect(w.fighters[0]!.action).toBe('idle');
  });

  it("saut en avant : passe au-dessus de l'adversaire sans être bloqué", () => {
    const w = duel(1.6);
    run(w, 1, Btn.Jump | Btn.Fwd);
    let crossedAbove = false;
    for (let i = 0; i < 60; i++) {
      stepWorld(w, [0, 0]);
      const [a, b] = w.fighters as [typeof w.fighters[0], typeof w.fighters[0]];
      if (a!.pos.x > b!.pos.x && a!.pos.y > PUSH_MAX_HEIGHT) crossedAbove = true;
    }
    expect(crossedAbove).toBe(true);
  });
});

describe('moteur — déterminisme', () => {
  it('mêmes entrées → même état ; le clone ne partage pas de références', () => {
    const script = (t: number) => [(t * 7) % 128, (t * 13) % 128] as const;
    const a = duel();
    const b = duel();
    for (let t = 0; t < 500; t++) {
      stepWorld(a, [...script(t)]);
      stepWorld(b, [...script(t)]);
    }
    expect(a).toEqual(b);
    const snap = cloneWorld(a);
    stepWorld(a, [Btn.Fwd, 0]);
    expect(snap.tick).toBe(a.tick - 1);
    expect(snap.fighters[0]!.pos).not.toBe(a.fighters[0]!.pos);
  });
});
