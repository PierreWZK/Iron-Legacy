import { describe, expect, it } from 'vitest';
import { botInput, createWorld, stepWorld, type World } from './index';

const four = (ffa = true): World => createWorld({ heroes: ['kairo', 'vera', 'wolf', 'fox'], ffa, intro: false });

describe('combat à quatre — positions', () => {
  it('quatre emplacements distincts en cercle, orientés vers le centre', () => {
    const w = four();
    const ps = w.fighters.map((f) => `${f.pos.x.toFixed(2)},${f.pos.z.toFixed(2)}`);
    expect(new Set(ps).size).toBe(4);
    for (const f of w.fighters) {
      const d = Math.hypot(f.pos.x, f.pos.z);
      expect(d).toBeGreaterThan(2);
      expect(f.facing.x * f.pos.x + f.facing.z * f.pos.z).toBeLessThan(0);
    }
  });

  it('duel inchangé : deux combattants face à face sur l\'axe X', () => {
    const w = createWorld({ heroes: ['kairo', 'vera'] });
    expect(w.fighters[0]!.pos.x).toBeCloseTo(-1.5);
    expect(w.fighters[1]!.pos.x).toBeCloseTo(1.5);
  });
});

describe('combat à quatre — dernier debout', () => {
  it('chaque KO élimine un combattant ; le dernier gagne', () => {
    const w = four();
    stepWorld(w, [0, 0, 0, 0]);
    w.fighters[0]!.health = 0;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.placements).toEqual([0]);
    expect(w.match.phase).toBe('fight');
    w.fighters[2]!.health = 0;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.placements).toEqual([0, 2]);
    w.fighters[1]!.health = 0;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.phase).toBe('over');
    expect(w.match.matchWinner).toBe(3);
    expect(w.match.placements).toEqual([0, 2, 1, 3]);
  });

  it('temps écoulé : le plus de vie gagne, les autres sont classés par vie', () => {
    const w = four();
    w.fighters[0]!.health = 30;
    w.fighters[1]!.health = 90;
    w.fighters[2]!.health = 60;
    w.fighters[3]!.health = 60;
    w.match.clock = 1;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.phase).toBe('over');
    expect(w.match.matchWinner).toBe(1);
    expect(w.match.placements[w.match.placements.length - 1]).toBe(1);
    expect(w.match.placements).toHaveLength(4);
  });

  it('un combattant éliminé ne reçoit plus de coups et ne bloque plus les autres', () => {
    const w = four();
    w.fighters[0]!.health = 0;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.fighters[0]!.action).toBe('knockdown');
    expect(w.fighters[0]!.health).toBe(0);
  });

  it('quatre bots se battent jusqu\'à une fin, sans valeur non finie', () => {
    const w = four();
    for (let t = 0; t < 60 * 120 && w.match.phase !== 'over'; t++) {
      const inputs = w.fighters.map((f) => botInput(w, f, 4));
      stepWorld(w, inputs);
      for (const f of w.fighters) expect(Number.isFinite(f.pos.x + f.pos.z + f.health)).toBe(true);
    }
    expect(w.match.phase).toBe('over');
    expect(w.match.matchWinner).not.toBeNull();
    expect(new Set(w.match.placements).size).toBe(4);
  }, 60000);

  it('la cible d\'un bot est l\'ennemi vivant le plus proche', () => {
    const w = four();
    w.fighters[1]!.health = 0;
    const self = w.fighters[0]!;
    const near = w.fighters.filter((f) => f !== self && f.health > 0)
      .sort((a, b) => Math.hypot(a.pos.x - self.pos.x, a.pos.z - self.pos.z) - Math.hypot(b.pos.x - self.pos.x, b.pos.z - self.pos.z))[0]!;
    expect(near.id).not.toBe(1);
    expect(() => botInput(w, self, 3)).not.toThrow();
  });
});
