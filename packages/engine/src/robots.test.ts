import { describe, expect, it } from 'vitest';
import {
  aiInput, CHALLENGES, checkChallenge, CHARACTER_IDS, createDuelWorld, getCharacter, getChallenge,
  healBetweenWaves, ROBOT_IDS, ROSTER, stepWorld, waveSetup, WAVE_ORDER, BOSS_EVERY,
} from './index';

describe('robots — données', () => {
  it('5 robots, chacun avec un style d\'IA différent, absents du menu principal', () => {
    expect(ROBOT_IDS).toHaveLength(5);
    const styles = ROBOT_IDS.map((id) => getCharacter(id).aiStyle);
    expect(new Set(styles).size).toBe(5);
    for (const id of ROBOT_IDS) expect(CHARACTER_IDS).not.toContain(id);
  });

  it('les robots ont des statistiques distinctes (vie et vitesse)', () => {
    const sig = ROBOT_IDS.map((id) => `${getCharacter(id).health}|${getCharacter(id).speeds.runFwd}`);
    expect(new Set(sig).size).toBe(ROBOT_IDS.length);
  });

  it('TITAN-01 a un style d\'IA lourd', () => {
    expect(ROSTER['titan']!.aiStyle).toBe('heavy');
  });

  for (const id of ROBOT_IDS) {
    it(`${id} combat un personnage jouable sans valeur non finie`, () => {
      const w = createDuelWorld({ p1: 'kairo', p2: id, distance: 2.5 });
      for (let t = 0; t < 60 * 40; t++) {
        stepWorld(w, [aiInput(w, w.fighters[0]!, w.fighters[1]!, 4), aiInput(w, w.fighters[1]!, w.fighters[0]!, 5)]);
        for (const f of w.fighters) expect(Number.isFinite(f.pos.x + f.pos.z + f.health)).toBe(true);
        if (w.match.phase === 'over') break;
      }
      expect(w.fighters[1]!.health).toBeGreaterThanOrEqual(0);
    });
  }
});

describe('vagues', () => {
  it('ordre des robots, boss toutes les 10 vagues, niveaux et vie croissants', () => {
    for (let n = 0; n < 30; n++) {
      const s = waveSetup(n);
      expect(s.boss).toBe(n % BOSS_EVERY === BOSS_EVERY - 1);
      if (s.boss) expect(s.robot).toBe('titan');
      else expect(WAVE_ORDER).toContain(s.robot);
      expect(s.level).toBeGreaterThanOrEqual(1);
      expect(s.level).toBeLessThanOrEqual(7);
      if (n > 0) {
        expect(s.healthScale).toBeGreaterThanOrEqual(waveSetup(n - 1).healthScale);
        expect(s.level).toBeGreaterThanOrEqual(waveSetup(n - 1).level);
      }
    }
    expect(waveSetup(0).robot).toBe('scout');
    expect(waveSetup(9).robot).toBe('titan');
    expect(waveSetup(9).boss).toBe(true);
  });

  it('vie max du robot plafonnée (×2,2 au plus)', () => {
    expect(waveSetup(1000).healthScale).toBeLessThanOrEqual(2.2);
  });

  it('entrée de vague invalide rejetée', () => {
    expect(() => waveSetup(-1)).toThrow(/invalide/);
    expect(() => waveSetup(1.5)).toThrow(/invalide/);
  });

  it('récupération entre vagues : partielle et plafonnée à la vie max', () => {
    expect(healBetweenWaves(50, 100)).toBe(75);
    expect(healBetweenWaves(95, 100)).toBe(100);
    expect(healBetweenWaves(0, 100)).toBe(25);
  });

  it('un combat avec vie de départ et vie max imposées respecte ces valeurs', () => {
    const w = createDuelWorld({ p1: 'kairo', p2: 'scout', maxHealth: [100, 176], health: [60, 176] });
    expect(w.fighters[0]!.health).toBe(60);
    expect(w.fighters[1]!.maxHealth).toBe(176);
    expect(w.fighters[1]!.health).toBe(176);
  });
});

describe('défis', () => {
  it('chaque défi cible un robot valide, avec un niveau d\'IA valide', () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(5);
    for (const c of CHALLENGES) {
      expect(ROBOT_IDS).toContain(c.robot);
      expect(c.level).toBeGreaterThanOrEqual(1);
      expect(c.level).toBeLessThanOrEqual(7);
    }
  });

  it('chaque défi a un critère distinct et des conditions de réussite vérifiables', () => {
    const base = { won: true, robotId: 'scout', damageTaken: 10, secondsLeft: 10, throws: 0, blocks: 0, comboMax: 1 };
    expect(checkChallenge('perfect', { ...base, damageTaken: 0 })).toBe(true);
    expect(checkChallenge('perfect', base)).toBe(false);
    expect(checkChallenge('speed', { ...base, secondsLeft: 40 })).toBe(true);
    expect(checkChallenge('throws', { ...base, throws: 2 })).toBe(true);
    expect(checkChallenge('throws', { ...base, throws: 1 })).toBe(false);
    expect(checkChallenge('combo', { ...base, won: false, comboMax: 5 })).toBe(true);
    expect(checkChallenge('blocker', { ...base, blocks: 5 })).toBe(true);
    expect(checkChallenge('elite', { ...base, robotId: 'elite' })).toBe(true);
    expect(checkChallenge('elite', base)).toBe(false);
  });

  it('défi inconnu rejeté', () => {
    expect(() => getChallenge('nope')).toThrow(/inconnu/);
  });
});
