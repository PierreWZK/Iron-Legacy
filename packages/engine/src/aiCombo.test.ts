import { describe, expect, it } from 'vitest';
import { aiInput, createDuelWorld, stepWorld } from './index';

function movesOfAi(level: number, ticks = 1500): Set<string> {
  const w = createDuelWorld({ p1: 'kairo', p2: 'bull', distance: 1.3 });
  const seen = new Set<string>();
  for (let i = 0; i < ticks; i++) {
    const ai = aiInput(w, w.fighters[1]!, w.fighters[0]!, level);
    stepWorld(w, [0, ai]);
    w.fighters[0]!.health = w.fighters[0]!.maxHealth; // le combat ne s'arrête pas
    const m = w.fighters[1]!.move;
    if (m) seen.add(m);
  }
  return seen;
}

describe('IA et combos', () => {
  it('niveau 1 : pas de combo long (au plus le triple appui, comme avant)', () => {
    expect([...movesOfAi(1)].filter((m) => /^c\d+$/.test(m))).toEqual([]);
  });
  it('niveau 7 et impossible (8) : enchaîne des combos longs (coups générés)', () => {
    for (const level of [7, 8]) {
      const seen = [...movesOfAi(level)];
      expect(seen.some((m) => /^c\d+$/.test(m)), `niveau ${level} : ${seen.join(',')}`).toBe(true);
    }
  });
});
