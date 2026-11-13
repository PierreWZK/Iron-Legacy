import { describe, expect, it } from 'vitest';
import {
  attackIntent, Btn, createDuelWorld, getMove, MOVE_IDS, stepWorld, THROW_IDS, type MoveId, type Stance, type World,
} from './index';

const duel = (distance = 1.2): World => createDuelWorld({ p1: 'kairo', p2: 'kairo', distance });
const feed = (w: World, ticks: number, p1 = 0, p2 = 0) => {
  for (let i = 0; i < ticks; i++) stepWorld(w, [p1, p2]);
};
const BUTTONS = [Btn.LP, Btn.RP, Btn.LK, Btn.RK] as const;

/** Les quatre coups d'un contexte (direction + posture), dans l'ordre LP, RP, LK, RK. */
const ids = (dir: number, stance: Stance, running = false): (MoveId | null)[] =>
  BUTTONS.map((b) => attackIntent(dir, b, stance, running));

describe('coups par direction + bouton', () => {
  it('accroupi : bas + pied gauche et bas + pied droit lancent des coups différents', () => {
    expect(attackIntent(Btn.Crouch, Btn.LK, 'crouch')).toBe('lowKick');
    expect(attackIntent(Btn.Crouch, Btn.RK, 'crouch')).toBe('sweep');
    expect(attackIntent(Btn.Crouch, Btn.LP, 'crouch')).toBe('lowJab');
    expect(attackIntent(Btn.Crouch, Btn.RP, 'crouch')).toBe('uppercut');
  });

  it('avant, accroupi + avant, arrière, course, saut : chaque contexte a ses coups', () => {
    expect(ids(Btn.Fwd, 'stand')).toEqual(['lunge', 'elbow', 'kneeLift', 'axeKick']);
    expect(ids(Btn.Crouch | Btn.Fwd, 'crouch')).toEqual(['hookPunch', 'risingHook', 'slideKick', 'dragonKick']);
    expect(ids(Btn.Back, 'stand')).toEqual(['jab', 'backFist', 'sideKick', 'spinKick']);
    expect(ids(Btn.Fwd | Btn.Shift, 'stand', true)).toEqual(['tackle', 'tackle', 'flyingKick', 'flyingKick']);
    expect(ids(0, 'air')).toEqual(['airPunch', 'airElbow', 'jumpKick', 'airRound']);
    expect(ids(0, 'stand')).toEqual(['jab', 'cross', 'frontKick', 'roundhouse']);
  });

  it('dans une même direction, chaque bouton lance un coup différent', () => {
    for (const [dir, stance] of [[0, 'stand'], [Btn.Fwd, 'stand'], [Btn.Crouch, 'crouch'], [Btn.Crouch | Btn.Fwd, 'crouch'], [0, 'air']] as const) {
      const moves = ids(dir, stance);
      expect(new Set(moves).size).toBe(4);
    }
  });

  it('tous les coups non-projection sont accessibles depuis les entrées', () => {
    const reachable = new Set<MoveId>();
    const contexts: [number, Stance, boolean][] = [
      [0, 'stand', false], [Btn.Fwd, 'stand', false], [Btn.Back, 'stand', false], [Btn.Crouch, 'crouch', false],
      [Btn.Crouch | Btn.Fwd, 'crouch', false], [Btn.Fwd | Btn.Shift, 'stand', true], [0, 'air', false],
    ];
    for (const [dir, stance, run] of contexts) for (const m of ids(dir, stance, run)) if (m) reachable.add(m);
    const expected = MOVE_IDS.filter((m) => !THROW_IDS.includes(m) && !/^(lp|rp|lk|rk)[23]$|^dash|^wake/.test(m)); // les combos passent par la chaîne (combos.test.ts)
    expect([...reachable].sort()).toEqual([...expected].sort());
  });

  it('en simulation, bas + LK et bas + RK déclenchent deux coups différents', () => {
    const a = duel();
    const b = duel();
    feed(a, 1, Btn.Crouch | Btn.LK);
    feed(b, 1, Btn.Crouch | Btn.RK);
    expect(a.fighters[0]!.move).toBe('lowKick');
    expect(b.fighters[0]!.move).toBe('sweep');
  });

  it("l'attaque en courant déclenche une charge ou un coup volant", () => {
    const a = duel(6);
    feed(a, 20, Btn.Fwd | Btn.Shift);
    expect(a.fighters[0]!.action).toBe('runFwd');
    feed(a, 1, Btn.Fwd | Btn.Shift | Btn.LP);
    expect(a.fighters[0]!.move).toBe('tackle');
    const b = duel(6);
    feed(b, 20, Btn.Fwd | Btn.Shift);
    feed(b, 1, Btn.Fwd | Btn.Shift | Btn.RK);
    expect(b.fighters[0]!.move).toBe('flyingKick');
  });
});

describe('enchaînements (strings)', () => {
  it('un jab peut être suivi d\'un direct pendant la récupération, même à vide', () => {
    const w = duel(4);
    feed(w, 1, Btn.LP);
    feed(w, 7, 0); // frame 8 : récupération (le jab a 4+2 frames avant la récupération)
    feed(w, 1, Btn.RP);
    expect(w.fighters[0]!.move).toBe('rp2');
  });

  it('pas d\'enchaînement pendant les frames de démarrage (le coup en cours continue)', () => {
    const w = duel(4);
    feed(w, 1, Btn.LP);
    feed(w, 4, 0);
    feed(w, 1, Btn.LP);
    expect(w.fighters[0]!.move).toBe('jab');
  });

  it('LP puis RP presque ensemble : la projection remplace le jab', () => {
    const w = duel(4);
    feed(w, 1, Btn.LP);
    feed(w, 1, 0);
    feed(w, 1, Btn.RP);
    expect(w.fighters[0]!.move).toBe('throw');
  });

  it("l'enchaînement respecte la direction tenue (jab puis bas + RK = balayage)", () => {
    const w = duel(4);
    feed(w, 1, Btn.LP);
    feed(w, 7, 0);
    feed(w, 1, Btn.Crouch | Btn.RK);
    expect(w.fighters[0]!.move).toBe('sweep');
  });
});

describe('projections', () => {
  it('deux boutons pressés ensemble lancent la projection correspondante', () => {
    const pairs: [number, MoveId][] = [
      [Btn.LP | Btn.RP, 'throw'], [Btn.LP | Btn.LK, 'hipToss'], [Btn.RP | Btn.RK, 'suplex'], [Btn.LK | Btn.RK, 'legThrow'],
    ];
    for (const [input, move] of pairs) {
      const w = duel(0.9);
      feed(w, 1, input);
      expect(w.fighters[0]!.move, move).toBe(move);
    }
  });

  it("chaque projection inflige ses dégâts et met l'adversaire à terre", () => {
    for (const move of THROW_IDS) {
      const input = { throw: Btn.LP | Btn.RP, hipToss: Btn.LP | Btn.LK, suplex: Btn.RP | Btn.RK, legThrow: Btn.LK | Btn.RK }[move as 'throw']!;
      const w = duel(0.9);
      feed(w, 8, input);
      expect(w.fighters[1]!.action, move).toBe('thrown');
      expect(w.fighters[1]!.thrownBy, move).toBe(0);
      expect(w.fighters[1]!.health, move).toBe(100 - getMove('kairo', move).damage);
    }
  });

  it("l'adversaire atterrit à l'endroit prévu (devant ou derrière le projeteur)", () => {
    for (const [move, input] of [['hipToss', Btn.LP | Btn.LK], ['suplex', Btn.RP | Btn.RK]] as const) {
      const w = duel(0.9);
      const m = getMove('kairo', move);
      feed(w, 1, input);
      const facing = { ...w.fighters[0]!.facing }; // orientation au moment de la prise (le projeteur se retourne ensuite)
      feed(w, m.startup + 1 + (m.sequence ?? 40) + 20 + 7, 0);
      const a = w.fighters[0]!;
      const d = w.fighters[1]!;
      const along = (d.pos.x - a.pos.x) * facing.x + (d.pos.z - a.pos.z) * facing.z;
      expect(along, move).toBeCloseTo(m.landing ?? 0, 1);
    }
  });

  it('le suplex envoie derrière le projeteur, la projection de hanche devant', () => {
    expect(getMove('kairo', 'suplex').landing).toBeLessThan(0);
    expect(getMove('kairo', 'hipToss').landing).toBeGreaterThan(0);
  });

  it('le projeteur est intouchable pendant la séquence', () => {
    const w = duel(0.9);
    feed(w, 8, Btn.LP | Btn.RP);
    const before = w.fighters[0]!.health;
    // L'adversaire est projeté : aucun coup ne peut toucher le projeteur pendant la séquence.
    feed(w, 20, 0, Btn.LP);
    expect(w.fighters[0]!.health).toBe(before);
  });

  it("un défenseur qui projette en même temps contre la prise (tech) annule les deux", () => {
    const w = duel(0.9);
    feed(w, 1, Btn.RP | Btn.RK, Btn.LK | Btn.RK);
    feed(w, 10, 0, 0);
    expect(w.fighters[0]!.health).toBe(100);
    expect(w.fighters[1]!.health).toBe(100);
  });
});
