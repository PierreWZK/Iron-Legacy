import { describe, expect, it } from 'vitest';
import { Btn, createDuelWorld, getMove, stepWorld, type World } from './index';

const duel = (distance = 1.2): World => createDuelWorld({ p1: 'kairo', p2: 'kairo', distance });

/** Tient `bits` pour P1 pendant `n` ticks (P2 immobile). */
function hold(w: World, bits: number, n = 1): void {
  for (let i = 0; i < n; i++) stepWorld(w, [bits, 0]);
}

/** Lance le coup `bits` depuis le neutre et attend la fin du coup ; renvoie sa durée en ticks. */
function strikeOnce(w: World, bits: number): number {
  const f = w.fighters[0]!;
  hold(w, bits);
  let n = 1;
  while (f.action === 'attack' && n < 200) {
    hold(w, bits & (Btn.Crouch | Btn.Fwd | Btn.Back));
    n++;
  }
  return n;
}

describe('projection : petit délai entre les deux boutons', () => {
  it('LP puis RP 4 ticks plus tard (RP continuerait un combo) : projection', () => {
    const w = duel(0.9);
    hold(w, Btn.LP);
    hold(w, 0, 3);
    hold(w, Btn.RP);
    expect(w.fighters[0]!.move).toBe('throw');
  });

  it('LK puis RK 4 ticks plus tard : projection de jambe', () => {
    const w = duel(0.9);
    hold(w, Btn.LK);
    hold(w, 0, 3);
    hold(w, Btn.RK);
    expect(w.fighters[0]!.move).toBe('legThrow');
  });

  it('trop tard (12 ticks) : pas de projection', () => {
    const w = duel(0.9);
    hold(w, Btn.LP);
    hold(w, 0, 11);
    hold(w, Btn.RP);
    expect(w.fighters[0]!.move).not.toBe('throw');
  });
});

describe('anti-répétition des coups de base', () => {
  it('le même coup relancé coup sur coup récupère de plus en plus lentement', () => {
    const w = duel(3);
    const base = getMove('kairo', 'lowKick');
    const plain = base.startup + base.active + base.recovery;
    const d1 = strikeOnce(w, Btn.Crouch | Btn.LK);
    const d2 = strikeOnce(w, Btn.Crouch | Btn.LK);
    const d3 = strikeOnce(w, Btn.Crouch | Btn.LK);
    expect(d1).toBeLessThanOrEqual(plain + 2);
    expect(d2).toBeGreaterThan(d1);
    expect(d3).toBeGreaterThan(d2);
    expect(w.fighters[0]!.spam).toBe(2);
  });

  it('changer de coup ou attendre remet à zéro', () => {
    const w = duel(3);
    strikeOnce(w, Btn.LK);
    strikeOnce(w, Btn.LK);
    expect(w.fighters[0]!.spam).toBe(1);
    strikeOnce(w, Btn.RP);
    expect(w.fighters[0]!.spam).toBe(0);
    strikeOnce(w, Btn.RP);
    hold(w, 0, 60);
    strikeOnce(w, Btn.RP);
    expect(w.fighters[0]!.spam).toBe(0);
  });

  it('dégâts réduits sur un coup répété', () => {
    const hit = (repeats: number): number => {
      const w = duel(3);
      for (let i = 0; i < repeats; i++) strikeOnce(w, Btn.LK);
      // Rapproche P1 juste avant le dernier coup.
      w.fighters[0]!.pos.x = w.fighters[1]!.pos.x - 1.0;
      const hp = w.fighters[1]!.health;
      strikeOnce(w, Btn.LK);
      return hp - w.fighters[1]!.health;
    };
    const fresh = hit(0);
    const stale = hit(3);
    expect(fresh).toBeGreaterThan(0);
    expect(stale).toBeLessThan(fresh);
  });
});
