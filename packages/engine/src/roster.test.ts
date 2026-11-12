import { describe, expect, it } from 'vitest';
import { aiInput, CHARACTER_IDS, createDuelWorld, getCharacter, stepWorld } from './index';

describe('roster — chaque personnage jouable', () => {
  for (const id of CHARACTER_IDS) {
    it(`${id} se bat contre kairo sans valeur non finie et inflige des dégâts`, () => {
      const w = createDuelWorld({ p1: id, p2: 'kairo', distance: 2.5 });
      let damage = 0;
      for (let t = 0; t < 60 * 40; t++) {
        stepWorld(w, [aiInput(w, w.fighters[0]!, w.fighters[1]!, 5), aiInput(w, w.fighters[1]!, w.fighters[0]!, 3)]);
        for (const f of w.fighters) expect(Number.isFinite(f.pos.x + f.pos.y + f.pos.z + f.health)).toBe(true);
        for (const e of w.events) if (e.kind === 'hit' && e.fighter === 1) damage += e.damage ?? 0;
        if (w.match.phase === 'over') break;
      }
      expect(damage).toBeGreaterThan(0);
    });
  }

  it('les personnages sont différenciés par la vie, la vitesse et les coups', () => {
    const stats = CHARACTER_IDS.map((id) => {
      const c = getCharacter(id);
      return `${c.health}|${c.speeds.runFwd}|${c.moves.roundhouse.startup}|${c.moves.jab.damage}`;
    });
    expect(new Set(stats).size).toBe(CHARACTER_IDS.length);
  });

  it('chaque personnage a un nom, un style et une biographie', () => {
    for (const id of CHARACTER_IDS) {
      const c = getCharacter(id);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.style.length).toBeGreaterThan(10);
      expect(c.bio.length).toBeGreaterThan(20);
    }
  });
});
