import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, STORY_LENGTH, STORY_LEVELS, storyLevel, storyOpponents } from './index';

describe('histoire — adversaires', () => {
  for (const self of CHARACTER_IDS) {
    it(`${self} : 8 chapitres, jamais soi-même, boss final TITAN-01`, () => {
      const opp = storyOpponents(self);
      expect(opp).toHaveLength(STORY_LENGTH);
      expect(opp).not.toContain(self);
      expect(opp[STORY_LENGTH - 1]).toBe('titan');
      expect(opp[3]).toBe(self === 'robot' ? 'shin' : 'robot');
    });
  }

  it('deux héros différents ont deux histoires différentes', () => {
    const stories = new Set(CHARACTER_IDS.map((c) => storyOpponents(c).join(',')));
    expect(stories.size).toBe(CHARACTER_IDS.length);
  });

  it("aucun rival ne se répète deux chapitres de suite (hors boss)", () => {
    for (const self of CHARACTER_IDS) {
      const opp = storyOpponents(self).slice(0, STORY_LENGTH - 1);
      for (let i = 1; i < opp.length; i++) expect(opp[i]).not.toBe(opp[i - 1]);
    }
  });

  it('niveaux non décroissants, chapitre inconnu rejeté', () => {
    for (let i = 1; i < STORY_LEVELS.length; i++) expect(STORY_LEVELS[i]!).toBeGreaterThanOrEqual(STORY_LEVELS[i - 1]!);
    expect(storyLevel(0)).toBe(1);
    expect(() => storyLevel(STORY_LENGTH)).toThrow(/inconnu/);
    expect(() => storyOpponents('nobody')).toThrow(/inconnu/);
  });
});
