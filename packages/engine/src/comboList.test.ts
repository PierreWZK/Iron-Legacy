import { describe, expect, it } from 'vitest';
import {
  Btn, createDuelWorld, getCharacter, ROSTER, stepWorld, type MoveId, type World,
} from './index';
import { inputCount } from './characters/combos';

const BTN: Record<string, number> = { lp: Btn.LP, rp: Btn.RP, lk: Btn.LK, rk: Btn.RK };
const DIR: Record<string, number> = {
  f: Btn.Fwd, b: Btn.Back, d: Btn.Crouch, u: Btn.Jump, df: Btn.Crouch | Btn.Fwd, db: Btn.Crouch | Btn.Back,
};

/** Entrée d'un jeton `f+rk` / `lp`. */
function frameOf(token: string): number {
  const [a, b] = token.includes('+') ? token.split('+') : ['', token];
  return (a ? DIR[a]! : 0) | BTN[b!]!;
}

const duel = (id: string): World => createDuelWorld({ p1: id, p2: 'kairo', distance: 6 });
const tick = (w: World, p1 = 0): void => stepWorld(w, [p1, 0]);

/** Coup attendu après chaque entrée, en suivant les liens `chain` des coups. */
function expectedPath(id: string, inputs: string[]): MoveId[] {
  const moves = getCharacter(id).moves;
  const path: MoveId[] = [];
  inputs.forEach((token, i) => {
    if (i === 0) {
      const first: Record<string, MoveId> = {
        lp: 'jab', rp: 'cross', lk: 'frontKick', rk: 'roundhouse', 'f+lp': 'lunge', 'f+rp': 'elbow', 'b+rp': 'backFist',
        'b+lk': 'sideKick', 'd+lp': 'lowJab', 'd+lk': 'lowKick', 'df+lp': 'hookPunch',
        'ff+lp': 'dashLP', 'ff+lk': 'dashLK', 'ff+rp': 'dashRP', 'ff+rk': 'dashRK',
      };
      path.push(first[token]!);
      return;
    }
    const prev = path[path.length - 1]!;
    const next = moves[prev]!.chain?.[token];
    path.push(next as MoveId);
  });
  return path;
}

/** Joue un combo : chaque entrée est pressée juste après le démarrage du coup précédent (mémorisée puis lancée). */
function play(id: string, inputs: string[]): MoveId[] {
  const w = duel(id);
  const seen: MoveId[] = [];
  const note = (): void => {
    const m = w.fighters[0]!.move;
    if (m && seen[seen.length - 1] !== m) seen.push(m);
  };
  inputs.forEach((token, i) => {
    if (token.startsWith('ff+')) {
      // Double appui avant, puis le bouton.
      tick(w, Btn.Fwd);
      tick(w, 0);
      tick(w, Btn.Fwd);
      tick(w, 0);
      tick(w, BTN[token.slice(3)]!);
    } else {
      tick(w, frameOf(token));
    }
    note();
    tick(w, 0); // relâche : l'appui suivant doit être un nouveau front montant
    note();
    if (i < inputs.length - 1) {
      // Laisse partir le coup suivant : on attend qu'il change, en gardant la direction lâchée.
      for (let g = 0; g < 45 && seen.length <= i; g++) {
        tick(w, 0);
        note();
      }
    }
  });
  for (let i = 0; i < 60; i++) {
    tick(w, 0);
    note();
  }
  return seen;
}

describe('liste des combos', () => {
  for (const id of Object.keys(ROSTER)) {
    const ch = getCharacter(id);

    it(`${id} : 20 combos (7 faciles, 7 moyens, 6 difficiles), noms uniques, longueurs respectées`, () => {
      const list = ch.combos!;
      expect(list).toHaveLength(20);
      const tiers = (t: string): number => list.filter((c) => c.tier === t).length;
      expect([tiers('easy'), tiers('medium'), tiers('hard')]).toEqual([7, 7, 6]);
      expect(new Set(list.map((c) => c.name)).size).toBe(20);
      expect(new Set(list.map((c) => c.inputs.join(' '))).size).toBe(20);
      for (const c of list) {
        const n = inputCount(c.inputs);
        const max = c.tier === 'easy' ? 4 : c.tier === 'medium' ? 6 : 10;
        expect(n, `${id} ${c.name}`).toBeLessThanOrEqual(max);
      }
    });

    it(`${id} : chaque combo se joue de bout en bout et enchaîne les bons coups`, () => {
      for (const c of ch.combos!) {
        if (c.inputs[0] === 'ff+rp' || c.inputs[0] === 'ff+rk') {
          const seen = play(id, c.inputs);
          expect(seen[0], `${id} ${c.name}`).toBe(c.inputs[0] === 'ff+rp' ? 'dashRP' : 'dashRK');
          continue;
        }
        if (c.inputs.length === 3 && c.inputs.every((t) => t === c.inputs[0])) continue; // triples : couverts par combos.test.ts
        const want = expectedPath(id, c.inputs);
        expect(want.every(Boolean), `${id} ${c.name} : lien manquant`).toBe(true);
        expect(play(id, c.inputs), `${id} ${c.name} (${c.inputs.join(' ')})`).toEqual(want);
      }
    });
  }

  it('les personnages n\'ont pas tous les mêmes combos longs', () => {
    const sets = Object.keys(ROSTER).map((id) => new Set(getCharacter(id).combos!.filter((c) => c.tier === 'hard').map((c) => c.inputs.join(' '))));
    const all = new Set(sets.flatMap((s) => [...s]));
    expect(all.size).toBeGreaterThan(sets.length * 4);
  });
});

describe('double appui et coups au sol', () => {
  it('double appui arrière : pas en arrière', () => {
    const w = duel('kairo');
    const x0 = w.fighters[0]!.pos.x;
    tick(w, Btn.Back);
    tick(w, 0);
    tick(w, Btn.Back);
    for (let i = 0; i < 6; i++) tick(w, 0);
    expect(w.fighters[0]!.action).toBe('dash');
    expect(w.fighters[0]!.pos.x).toBeLessThan(x0 - 0.2);
  });

  it('double appui avant puis pied droit : projection lancée ; puis poing droit : roulade', () => {
    for (const [btn, move] of [[Btn.RK, 'dashRK'], [Btn.RP, 'dashRP']] as const) {
      const w = createDuelWorld({ p1: 'kairo', p2: 'kairo', distance: 2 });
      tick(w, Btn.Fwd);
      tick(w, 0);
      tick(w, Btn.Fwd);
      tick(w, 0);
      tick(w, btn);
      for (let i = 0; i < 3; i++) tick(w, 0);
      expect(w.fighters[0]!.move, move).toBe(move);
    }
  });

  it('un bouton pressé au sol lance un coup au relevé', () => {
    const w = createDuelWorld({ p1: 'kairo', p2: 'kairo', distance: 1 });
    const f = w.fighters[0]!;
    f.action = 'knockdown';
    f.stun = 30;
    tick(w, 0);
    tick(w, Btn.LK);
    for (let i = 0; i < 40 && f.move !== 'wakeKick'; i++) tick(w, 0);
    expect(f.move).toBe('wakeKick');
  });
});
