import { describe, expect, it } from 'vitest';
import {
  Btn, CHAIN_BUTTONS, CHARACTER_IDS, createDuelWorld, getCharacter, ROSTER, stepWorld, type MoveId, type World,
} from './index';

const duel = (p1 = 'kairo', distance = 1.1): World => createDuelWorld({ p1, p2: 'kairo', distance });
const tick = (w: World, p1 = 0) => stepWorld(w, [p1, 0]);

/** Joue des appuis rapides (un appui, `gap` ticks de relâche) et note le coup en cours à chaque tick. */
function mash(w: World, button: number, presses: number, gap: number): MoveId[] {
  const seen: MoveId[] = [];
  const note = () => {
    const m = w.fighters[0]!.move;
    if (m && seen[seen.length - 1] !== m) seen.push(m);
  };
  for (let i = 0; i < presses; i++) {
    tick(w, button);
    note();
    for (let g = 0; g < gap; g++) {
      tick(w, 0);
      note();
    }
  }
  for (let i = 0; i < 40; i++) {
    tick(w, 0);
    note();
  }
  return seen;
}

describe('combos', () => {
  it('trois appuis sur un même bouton lancent trois coups enchaînés (pour chaque bouton)', () => {
    const expected: [number, MoveId[]][] = [
      [Btn.LP, ['jab', 'lp2', 'lp3']],
      [Btn.RP, ['cross', 'rp2', 'rp3']],
      [Btn.LK, ['frontKick', 'lk2', 'lk3']],
      [Btn.RK, ['roundhouse', 'rk2', 'rk3']],
    ];
    for (const [btn, seq] of expected) expect(mash(duel(), btn, 3, 12), seq.join()).toEqual(seq);
  });

  it("un appui en avance est mémorisé : le coup suivant part dès que la fenêtre s'ouvre", () => {
    const w = duel();
    tick(w, Btn.RK);
    tick(w, 0);
    tick(w, 0);
    tick(w, Btn.RK); // bien trop tôt : le circulaire est encore en démarrage
    let startedAt = -1;
    for (let i = 0; i < 40 && startedAt < 0; i++) {
      tick(w, 0);
      if (w.fighters[0]!.move === 'rk2') startedAt = w.fighters[0]!.moveFrame === 1 ? i : -1;
    }
    expect(w.fighters[0]!.move).toBe('rk2');
    expect(startedAt).toBeGreaterThanOrEqual(0);
  });

  it("le troisième coup n'a pas de suite : un 4e appui relance un nouvel enchaînement", () => {
    const seq = mash(duel(), Btn.LP, 6, 14);
    expect(seq.slice(0, 4)).toEqual(['jab', 'lp2', 'lp3', 'jab']);
  });

  it('les boutons se mélangent : LP, RP, RK = jab, rp2, rk3', () => {
    const w = duel();
    const seen: MoveId[] = [];
    for (const btn of [Btn.LP, Btn.RP, Btn.RK]) {
      tick(w, btn);
      for (let i = 0; i < 16; i++) tick(w, 0);
      seen.push(w.fighters[0]!.move!);
    }
    expect(seen).toEqual(['jab', 'rp2', 'rk3']);
  });

  it('le combo continue même si le premier coup rate', () => {
    const w = createDuelWorld({ p1: 'kairo', p2: 'kairo', distance: 4 });
    expect(mash(w, Btn.LK, 3, 12)).toEqual(['frontKick', 'lk2', 'lk3']);
    expect(w.fighters[1]!.health).toBe(100);
  });

  it('les trois coups touchent un adversaire immobile', () => {
    const w = duel();
    mash(w, Btn.LP, 3, 4);
    const taken = 100 - w.fighters[1]!.health;
    const c = getCharacter('kairo').moves;
    expect(taken).toBeGreaterThanOrEqual(c.jab.damage + c.lp2.damage);
  });

  it('une direction tenue ne déclenche pas le combo (coup directionnel normal)', () => {
    const w = duel();
    tick(w, Btn.LP);
    for (let i = 0; i < 12; i++) tick(w, 0);
    tick(w, Btn.Crouch | Btn.RK);
    expect(w.fighters[0]!.move).toBe('sweep');
  });

  it('chaque personnage a un combo complet pour chaque bouton, avec des animations propres à son style', () => {
    const limbs = new Map<string, string>();
    for (const id of Object.keys(ROSTER)) {
      const moves = getCharacter(id).moves;
      for (const btn of CHAIN_BUTTONS) {
        const second = moves[`${btn}2` as MoveId]!;
        const third = moves[`${btn}3` as MoveId]!;
        expect(second.startup, `${id}.${btn}2`).toBeGreaterThan(0);
        expect(third.startup, `${id}.${btn}3`).toBeGreaterThan(0);
        expect(second.chain, `${id}.${btn}2 mène à ${btn}3`).toBeDefined();
        expect(third.chain, `${id}.${btn}3 est un final`).toBeUndefined();
      }
      limbs.set(id, CHAIN_BUTTONS.map((b) => `${moves[`${b}2` as MoveId]!.limb}/${moves[`${b}3` as MoveId]!.limb}`).join(','));
    }
    // Tous les personnages jouables n'ont pas la même chorégraphie de combo.
    expect(new Set(CHARACTER_IDS.map((id) => limbs.get(id))).size).toBeGreaterThanOrEqual(6);
  });

  it('le combo reste déterministe (mêmes entrées, même résultat)', () => {
    const run = () => {
      const w = duel();
      mash(w, Btn.RP, 3, 3);
      return JSON.stringify(w.fighters);
    };
    expect(run()).toBe(run());
  });
});

describe("élan de marche", () => {
  it("la vitesse monte en quelques ticks (pas de départ instantané) puis s'arrête vite", () => {
    const w = createDuelWorld({ p1: 'kairo', p2: 'kairo', distance: 6 });
    const x0 = w.fighters[0]!.pos.x;
    tick(w, Btn.Fwd);
    const first = w.fighters[0]!.pos.x - x0;
    for (let i = 0; i < 10; i++) tick(w, Btn.Fwd);
    const before = w.fighters[0]!.pos.x;
    tick(w, Btn.Fwd);
    const steady = w.fighters[0]!.pos.x - before;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(steady);
    tick(w, 0);
    expect(w.fighters[0]!.pace).toBeLessThan(1);
  });
});
