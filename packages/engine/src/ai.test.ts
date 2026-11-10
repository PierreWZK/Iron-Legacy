import { describe, expect, it } from 'vitest';
import { aiInput, Btn, createDuelWorld, stepWorld } from './index';

describe('IA', () => {
  it("s'approche quand elle est loin", () => {
    const w = createDuelWorld({ p1: 'kairo', p2: 'vera', distance: 4 });
    const bits = aiInput(w, w.fighters[1]!, w.fighters[0]!, 3);
    expect(bits & Btn.Fwd).not.toBe(0);
  });

  it('deux IA se battent sans erreur ni valeur non finie, et des coups sont échangés', () => {
    const w = createDuelWorld({ p1: 'kairo', p2: 'vera', distance: 2.5 });
    let hits = 0;
    let prevHealth = w.fighters.map((f) => f.health);
    for (let t = 0; t < 60 * 60 * 3; t++) {
      const in0 = aiInput(w, w.fighters[0]!, w.fighters[1]!, 3);
      const in1 = aiInput(w, w.fighters[1]!, w.fighters[0]!, 3);
      stepWorld(w, [in0, in1]);
      for (const f of w.fighters) {
        expect(Number.isFinite(f.pos.x + f.pos.z + f.pos.y)).toBe(true);
      }
      if (w.fighters.some((f, i) => f.health !== prevHealth[i])) hits++;
      prevHealth = w.fighters.map((f) => f.health);
      if (w.match.phase === 'over') break;
    }
    expect(hits).toBeGreaterThan(0);
  });

  it('est déterministe : même seed, même combat', () => {
    const run = () => {
      const w = createDuelWorld({ p1: 'kairo', p2: 'vera', distance: 2.5 });
      for (let t = 0; t < 600; t++) {
        stepWorld(w, [aiInput(w, w.fighters[0]!, w.fighters[1]!, 4), aiInput(w, w.fighters[1]!, w.fighters[0]!, 4)]);
      }
      return w.fighters.map((f) => [f.health, f.pos.x]);
    };
    expect(run()).toEqual(run());
  });
});
