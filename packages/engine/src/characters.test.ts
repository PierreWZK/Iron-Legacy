import { describe, expect, it } from 'vitest';
import { getCharacter, MOVE_IDS, ROSTER, type MoveId } from './index';

describe('roster', () => {
  it('chaque personnage définit tous les coups avec des frames valides', () => {
    for (const id of Object.keys(ROSTER)) {
      const ch = getCharacter(id);
      for (const move of MOVE_IDS) {
        const m = ch.moves[move as MoveId];
        expect(m, `${id}.${move}`).toBeDefined();
        expect(m.startup, `${id}.${move} startup`).toBeGreaterThan(0);
        expect(m.active, `${id}.${move} active`).toBeGreaterThan(0);
        expect(m.recovery, `${id}.${move} recovery`).toBeGreaterThan(0);
      }
    }
  });

  it('seule la projection est marquée throw', () => {
    for (const ch of Object.values(ROSTER)) {
      for (const move of MOVE_IDS) {
        expect(Boolean(ch.moves[move].throw)).toBe(move === 'throw');
      }
    }
  });

  it('les deux personnages ont des réglages de jeu différents', () => {
    const a = getCharacter('kairo');
    const b = getCharacter('vera');
    expect(a.moves.roundhouse.startup).not.toBe(b.moves.roundhouse.startup);
    expect(a.speeds.runFwd).not.toBe(b.speeds.runFwd);
  });

  it('un personnage inconnu lève une erreur explicite', () => {
    expect(() => getCharacter('nobody')).toThrow(/Personnage inconnu/);
  });
});
