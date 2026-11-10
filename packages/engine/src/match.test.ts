import { describe, expect, it } from 'vitest';
import { Btn, createDuelWorld, KO_TICKS, stepWorld, type World } from './index';

const duel = (): World => createDuelWorld({ p1: 'kairo', p2: 'kairo', distance: 1.2 });

/** Avance jusqu'à `cond` ou au plafond de ticks. */
function until(w: World, cond: (w: World) => boolean, max = 2000): void {
  for (let i = 0; i < max && !cond(w); i++) stepWorld(w, [0, 0]);
}

describe('match — rounds', () => {
  it('un KO donne un point, puis une nouvelle manche démarre', () => {
    const w = duel();
    until(w, (x) => x.match.phase === 'fight');
    w.fighters[1]!.health = 4;
    stepWorld(w, [Btn.LP, 0]);
    until(w, (x) => x.fighters[1]!.health === 0, 30);
    expect(w.fighters[1]!.health).toBe(0);
    until(w, (x) => x.match.phase === 'intro', KO_TICKS + 10);
    expect(w.match.wins[0]).toBe(1);
    expect(w.match.round).toBe(2);
    expect(w.fighters[1]!.health).toBe(100);
  });

  it('le match se termine après deux manches gagnées', () => {
    const w = duel();
    for (let round = 0; round < 2; round++) {
      until(w, (x) => x.match.phase === 'fight');
      w.fighters[0]!.pos.x = -0.6;
      w.fighters[1]!.pos.x = 0.6;
      w.fighters[1]!.health = 4;
      stepWorld(w, [Btn.LP, 0]);
      until(w, (x) => x.fighters[1]!.health === 0, 30);
      until(w, (x) => x.match.phase === 'intro' || x.match.phase === 'over', KO_TICKS + 10);
    }
    expect(w.match.phase).toBe('over');
    expect(w.match.matchWinner).toBe(0);
  });

  it('temps écoulé : le combattant le plus en vie gagne la manche', () => {
    const w = duel();
    until(w, (x) => x.match.phase === 'fight');
    w.fighters[0]!.health = 50;
    w.fighters[1]!.health = 80;
    w.match.clock = 1;
    stepWorld(w, [0, 0]);
    expect(w.match.phase).toBe('ko');
    expect(w.match.roundWinner).toBe(1);
    expect(w.fighters[1]!.action).toBe('victory');
  });

  it('temps écoulé à égalité : aucun point, manche rejouée', () => {
    const w = duel();
    until(w, (x) => x.match.phase === 'fight');
    w.match.clock = 1;
    stepWorld(w, [0, 0]);
    expect(w.match.roundWinner).toBeNull();
    until(w, (x) => x.match.phase === 'intro', KO_TICKS + 10);
    expect(w.match.wins).toEqual([0, 0]);
    expect(w.match.round).toBe(2);
  });

  it("pendant l'intro, les entrées sont ignorées", () => {
    const w = createDuelWorld({ p1: 'kairo', p2: 'kairo', intro: true, distance: 4 });
    const x0 = w.fighters[0]!.pos.x;
    for (let i = 0; i < 30; i++) stepWorld(w, [Btn.Fwd, 0]);
    expect(w.fighters[0]!.pos.x).toBe(x0);
    expect(w.match.phase).toBe('intro');
  });
});
