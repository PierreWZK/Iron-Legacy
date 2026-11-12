import { describe, expect, it } from 'vitest';
import { botInput, createWorld, stepWorld, type World } from './index';

const team2v2 = (): World => createWorld({ heroes: ['kairo', 'vera', 'wolf', 'fox'], team: true, intro: false });

describe('équipes 2v2 — départs et équipes', () => {
  it('équipe 0 = combattants 0 et 2, équipe 1 = 1 et 3, à gauche et à droite', () => {
    const w = team2v2();
    expect(w.match.mode).toBe('team');
    expect(w.fighters.map((f) => f.team)).toEqual([0, 1, 0, 1]);
    expect(w.fighters[0]!.pos.x).toBeLessThan(0);
    expect(w.fighters[1]!.pos.x).toBeGreaterThan(0);
  });

  it('refuse un mode équipes sans quatre combattants', () => {
    expect(() => createWorld({ heroes: ['kairo', 'vera'], team: true })).toThrow(/quatre/);
  });
});

describe('équipes 2v2 — victoire', () => {
  it('une équipe entière éliminée : l\'autre gagne', () => {
    const w = team2v2();
    stepWorld(w, [0, 0, 0, 0]);
    w.fighters[1]!.health = 0;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.phase).toBe('fight');
    w.fighters[3]!.health = 0;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.phase).toBe('over');
    expect(w.match.winnerTeam).toBe(0);
    expect(w.match.matchWinner).toBe(0);
  });

  it('un seul coéquipier éliminé : l\'équipe continue', () => {
    const w = team2v2();
    w.fighters[0]!.health = 0;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.phase).toBe('fight');
    expect(w.match.winnerTeam).toBeNull();
  });

  it('temps écoulé : la vie totale d\'équipe la plus haute gagne', () => {
    const w = team2v2();
    w.fighters[0]!.health = 50;
    w.fighters[2]!.health = 50;
    w.fighters[1]!.health = 60;
    w.fighters[3]!.health = 60;
    w.match.clock = 1;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.phase).toBe('over');
    expect(w.match.winnerTeam).toBe(1);
    expect(w.match.placements).toHaveLength(4);
  });

  it('temps écoulé à égalité : pas de gagnant, la partie se termine quand même', () => {
    const w = team2v2();
    for (const f of w.fighters) f.health = 70;
    w.match.clock = 1;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.phase).toBe('over');
    expect(w.match.winnerTeam).toBeNull();
    expect(w.match.matchWinner).toBeNull();
  });

  it('classement : les vivants de l\'équipe gagnante sont en dernier, après les éliminés', () => {
    const w = team2v2();
    w.fighters[1]!.health = 0;
    stepWorld(w, [0, 0, 0, 0]);
    w.fighters[3]!.health = 0;
    stepWorld(w, [0, 0, 0, 0]);
    expect(w.match.placements.slice(0, 2)).toEqual([1, 3]);
    expect(new Set(w.match.placements.slice(2))).toEqual(new Set([0, 2]));
  });

  it('quatre bots en équipes se battent jusqu\'à une fin sans valeur non finie', () => {
    const w = team2v2();
    for (let t = 0; t < 60 * 150 && w.match.phase !== 'over'; t++) {
      stepWorld(w, w.fighters.map((f) => botInput(w, f, 4)));
      for (const f of w.fighters) expect(Number.isFinite(f.pos.x + f.pos.z + f.health)).toBe(true);
    }
    expect(w.match.phase).toBe('over');
  }, 60000);
});
