import { describe, expect, it } from 'vitest';
import { Btn, COUNTER_BONUS_STUN, PARRY_STUN, createDuelWorld, getCharacter, getMove, stepWorld, type World } from './index';

/** Duel à `distance` m, KAIRO contre KAIRO, sans intro. */
const duel = (distance = 1.2): World => createDuelWorld({ p1: 'kairo', p2: 'kairo', distance });

/** Joue `ticks` ticks avec des entrées fixes (un seul appui par tick si `pulse`). */
function feed(w: World, ticks: number, p1 = 0, p2 = 0): void {
  for (let i = 0; i < ticks; i++) stepWorld(w, [p1, p2]);
}

describe('frame data', () => {
  it('un jab touche au frame 5 (startup 4 + 1)', () => {
    const w = duel(1.2);
    let hitTick = -1;
    for (let t = 0; t < 20; t++) {
      stepWorld(w, [t === 0 ? Btn.LP : 0, 0]);
      if (hitTick < 0 && w.fighters[1]!.health < 100) hitTick = t;
    }
    expect(hitTick).toBe(4);
    expect(w.fighters[1]!.health).toBe(100 - getMove('kairo', 'jab').damage);
  });

  it('hors de portée, le coup ne touche pas', () => {
    const w = duel(3);
    feed(w, 1, Btn.LP);
    feed(w, 30);
    expect(w.fighters[1]!.health).toBe(100);
  });
});

describe('blocage', () => {
  it("bloquer une attaque haute réduit les dégâts à 1 (chip)", () => {
    const w = duel(1.2);
    feed(w, 1, Btn.LP, Btn.Back);
    feed(w, 10, 0, Btn.Back);
    expect(w.fighters[1]!.health).toBe(99);
  });

  it('une balayette basse passe un défenseur debout qui recule', () => {
    const w = duel(1.2);
    feed(w, 1, Btn.Crouch | Btn.LK, Btn.Back);
    feed(w, 12, 0, Btn.Back);
    expect(w.fighters[1]!.health).toBe(100 - getMove('kairo', 'lowKick').damage);
  });

  it('se baisser en reculant bloque une balayette basse', () => {
    const w = duel(1.2);
    feed(w, 1, Btn.Crouch | Btn.LK, Btn.Crouch | Btn.Back);
    feed(w, 12, 0, Btn.Crouch | Btn.Back);
    expect(w.fighters[1]!.health).toBe(99);
  });
});

describe('parade', () => {
  it('une parade en fenêtre active annule le coup et étourdit l attaquant', () => {
    const w = duel(1.2);
    feed(w, 1, Btn.LP, Btn.LP | Btn.Back);
    feed(w, 6, 0, 0);
    expect(w.fighters[1]!.health).toBe(100);
    expect(w.fighters[1]!.action).toBe('parry');
    expect(w.fighters[0]!.action).toBe('hitstun');
    expect(w.fighters[0]!.stun).toBeGreaterThan(PARRY_STUN - 10);
  });
});

describe('contre-attaque', () => {
  it('frapper un adversaire en démarrage de coup inflige des dégâts majorés et plus de stun', () => {
    const w = duel(1.2);
    const p2 = w.fighters[1]!;
    p2.action = 'attack';
    p2.move = 'roundhouse';
    p2.moveFrame = 3;
    feed(w, 5, Btn.LP, 0);
    expect(p2.health).toBe(100 - Math.round(getMove('kairo', 'jab').damage * 1.25));
    expect(p2.action).toBe('hitstun');
    expect(p2.stun).toBe(getMove('kairo', 'jab').hitstun + COUNTER_BONUS_STUN);
  });
});

describe('combos', () => {
  it("jab → rp2 → rk3 s'enchaîne avec mise à l'échelle des dégâts", () => {
    const w = duel(1.2);
    const p1 = w.fighters[0]!;
    const p2 = w.fighters[1]!;
    let phase = 0;
    let maxCombo = 0;
    for (let t = 0; t < 300; t++) {
      maxCombo = Math.max(maxCombo, p1.combo);
      let in1 = 0;
      if (phase === 0) {
        in1 = Btn.LP;
        phase = 1;
      } else if (phase === 1 && p1.moveHit && p1.move === 'jab' && w.hitstop === 0) {
        in1 = Btn.RP;
        phase = 2;
      } else if (phase === 2 && p1.move === 'rp2' && p1.moveHit && w.hitstop === 0) {
        in1 = Btn.RK;
        phase = 3;
      }
      stepWorld(w, [in1, 0]);
    }
    expect(phase).toBe(3);
    // jab + rp2 à 93 % + rk3 à 86 %
    const km = getCharacter('kairo').moves;
    expect(p2.health).toBe(100 - km.jab.damage - Math.round(km.rp2.damage * 0.93) - Math.round(km.rk3.damage * 0.86));
    expect(maxCombo).toBe(3);
  });
});

describe('projection', () => {
  it('LP+RP à portée projette le défenseur', () => {
    const w = duel(0.9);
    feed(w, 1, Btn.LP | Btn.RP, 0);
    feed(w, 8);
    expect(w.fighters[1]!.action).toBe('thrown');
    expect(w.fighters[1]!.health).toBe(100 - getMove('kairo', 'throw').damage);
  });

  it('une projection contrée par une projection adverse donne une tech', () => {
    const w = duel(0.9);
    feed(w, 1, Btn.LP | Btn.RP, Btn.LP | Btn.RP);
    feed(w, 8);
    expect(w.fighters[0]!.health).toBe(100);
    expect(w.fighters[1]!.health).toBe(100);
  });
});

describe('esquive', () => {
  it("l'esquive arrière rend invulnérable au coup d'entrée", () => {
    const w = duel(1.2);
    feed(w, 1, Btn.LP, Btn.Shift | Btn.Back);
    feed(w, 8, 0, 0);
    expect(w.fighters[1]!.health).toBe(100);
    expect(w.fighters[1]!.action).toBe('dodge');
  });
});

describe('impacts et physique', () => {
  it("le coup repousse le défenseur dans la direction de l'attaquant", () => {
    const w = duel(1.2);
    const x0 = w.fighters[1]!.pos.x;
    feed(w, 24, Btn.RP, 0); // impact au tick 7, hit-stop de 7 ticks, puis glissement
    expect(w.fighters[1]!.pos.x).toBeGreaterThan(x0);
  });

  it('un défenseur touché et soulevé retombe et se relève', () => {
    const w = duel(1.2);
    feed(w, 1, Btn.RK, 0);
    feed(w, 20);
    feed(w, 200);
    expect(w.fighters[1]!.pos.y).toBe(0);
    expect(['idle', 'getup', 'knockdown', 'hitstun']).toContain(w.fighters[1]!.action);
  });

  it('les événements d impact sont émis', () => {
    const w = duel(1.2);
    let kinds: string[] = [];
    for (let t = 0; t < 10; t++) {
      stepWorld(w, [t === 0 ? Btn.LP : 0, 0]);
      kinds = kinds.concat(w.events.map((e) => e.kind));
    }
    expect(kinds).toContain('hit');
  });
});
