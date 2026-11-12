import { describe, expect, it } from 'vitest';
import { aiLevelFor, ARCADE_STAGES, CHARACTER_IDS, MAX_AI_LEVEL, ROSTER, scoreFight, STARTER_IDS } from './index';

describe('arcade — échelle', () => {
  it('8 combats puis un boss final', () => {
    expect(ARCADE_STAGES).toHaveLength(9);
    expect(ARCADE_STAGES.filter((s) => s.boss)).toHaveLength(1);
    expect(ARCADE_STAGES[ARCADE_STAGES.length - 1]!.boss).toBe(true);
    expect(ARCADE_STAGES[ARCADE_STAGES.length - 1]!.opponent).toBe('titan');
  });

  it('chaque adversaire existe dans le roster', () => {
    for (const s of ARCADE_STAGES) expect(ROSTER[s.opponent]).toBeDefined();
  });

  it("le niveau d'IA monte d'étape en étape (non décroissant)", () => {
    for (let i = 1; i < ARCADE_STAGES.length; i++) {
      expect(ARCADE_STAGES[i]!.level).toBeGreaterThanOrEqual(ARCADE_STAGES[i - 1]!.level);
    }
  });

  it("la difficulté décale le niveau, borné entre 1 et MAX_AI_LEVEL", () => {
    expect(aiLevelFor(0, 'facile')).toBe(1);
    expect(aiLevelFor(0, 'normal')).toBe(1);
    expect(aiLevelFor(8, 'expert')).toBe(MAX_AI_LEVEL);
    expect(aiLevelFor(4, 'difficile')).toBeGreaterThan(aiLevelFor(4, 'normal'));
  });

  it('une étape inconnue lève une erreur explicite', () => {
    expect(() => aiLevelFor(42, 'normal')).toThrow(/inconnue/);
  });

  it("le boss n'est pas jouable, et les deux personnages de départ sont les premiers de l'ordre de déblocage", () => {
    expect(CHARACTER_IDS).not.toContain('titan');
    expect(CHARACTER_IDS.slice(0, STARTER_IDS.length)).toEqual(STARTER_IDS);
    expect(STARTER_IDS).toEqual(['kairo', 'vera']);
  });
});

describe('arcade — score', () => {
  const base = { stage: 3, difficulty: 'normal' as const, healthRatio: 0.5, secondsLeft: 40, perfect: false };

  it('une victoire parfaite rapporte plus qu une victoire sans perfection', () => {
    expect(scoreFight({ ...base, perfect: true })).toBeGreaterThan(scoreFight(base));
  });

  it('plus de vie restante et plus de temps rapportent plus', () => {
    expect(scoreFight({ ...base, healthRatio: 1 })).toBeGreaterThan(scoreFight(base));
    expect(scoreFight({ ...base, secondsLeft: 80 })).toBeGreaterThan(scoreFight(base));
  });

  it('la difficulté multiplie le score', () => {
    expect(scoreFight({ ...base, difficulty: 'expert' })).toBeGreaterThan(scoreFight(base));
    expect(scoreFight({ ...base, difficulty: 'facile' })).toBeLessThan(scoreFight(base));
  });

  it('valeurs hors bornes sont ramenées dans les bornes', () => {
    expect(scoreFight({ ...base, healthRatio: 5 })).toBe(scoreFight({ ...base, healthRatio: 1 }));
    expect(scoreFight({ ...base, healthRatio: -3 })).toBe(scoreFight({ ...base, healthRatio: 0 }));
  });
});
