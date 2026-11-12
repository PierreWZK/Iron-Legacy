import { CHARACTER_IDS } from './characters';

/** Mode histoire : 8 chapitres par personnage, le dernier est toujours TITAN-01. */
export const STORY_LENGTH = 8;

/** Niveau d'IA de chaque chapitre (index 0-based). */
export const STORY_LEVELS: readonly number[] = [1, 2, 3, 4, 4, 5, 6, 7];

/** Adversaire intermédiaire (chapitre 4) : ROBOT, sauf si le héros est ROBOT. */
const MIDBOSS = 'robot';
const FINAL_BOSS = 'titan';

/**
 * Adversaires d'un personnage, chapitre par chapitre. Déterministe : l'ordre des rivaux dépend
 * de la place du héros dans le roster, pour que chaque histoire soit différente.
 * Garanties : jamais le héros lui-même, jamais le même rival deux fois de suite dans l'histoire
 * (hors boss), dernier chapitre = TITAN-01.
 */
export function storyOpponents(self: string): string[] {
  if (!CHARACTER_IDS.includes(self)) throw new Error(`Personnage inconnu pour l'histoire : ${self}`);
  const mid = self === MIDBOSS ? 'shin' : MIDBOSS;
  const pool = CHARACTER_IDS.filter((c) => c !== self && c !== MIDBOSS);
  const start = (CHARACTER_IDS.indexOf(self) * 3) % pool.length;
  const out: string[] = [];
  let k = 0;
  for (let ch = 0; ch < STORY_LENGTH; ch++) {
    if (ch === 3) {
      out.push(mid);
      continue;
    }
    if (ch === STORY_LENGTH - 1) {
      out.push(FINAL_BOSS);
      continue;
    }
    let rival: string;
    do {
      rival = pool[(start + k) % pool.length]!;
      k++;
    } while (rival === mid || rival === out[out.length - 1]);
    out.push(rival);
  }
  return out;
}

/** Niveau d'IA du chapitre (0-based). */
export function storyLevel(chapter: number): number {
  const lvl = STORY_LEVELS[chapter];
  if (lvl === undefined) throw new Error(`Chapitre inconnu : ${chapter}`);
  return lvl;
}
