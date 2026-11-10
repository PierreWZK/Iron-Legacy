import { KAIRO } from './kairo';
import { VERA } from './vera';
import { TITAN } from './titan';
import { BULL, FOX, HUSKY, ROBOT, STAG, WOLF } from './creatures';
import { AKIRA, BRUTUS, NYX, SHIN } from './humanoids';
import { ASSASSIN, ELITE, GUARDIAN, HEAVY, SCOUT } from './robots';
import type { CharacterDef, MoveDef, MoveId } from './types';

export * from './types';

/** Roster jouable. Ajouter un personnage = ajouter une entrée ici. */
export const ROSTER: Record<string, CharacterDef> = {
  kairo: KAIRO, vera: VERA, wolf: WOLF, fox: FOX, bull: BULL, stag: STAG, husky: HUSKY, robot: ROBOT,
  shin: SHIN, brutus: BRUTUS, akira: AKIRA, nyx: NYX, titan: TITAN,
  scout: SCOUT, guardian: GUARDIAN, assassin: ASSASSIN, heavy: HEAVY, elite: ELITE,
};
/** Robots du mode robots (non jouables dans le menu principal). */
export const ROBOT_IDS: string[] = ['scout', 'guardian', 'assassin', 'heavy', 'elite'];
/** Personnages jouables, dans l'ordre de déblocage (TITAN-01 est un boss d'arcade, non jouable). */
export const CHARACTER_IDS: string[] = [
  'kairo', 'vera', 'wolf', 'fox', 'bull', 'stag', 'husky', 'robot', 'shin', 'brutus', 'akira', 'nyx',
];
/** Personnages disponibles dès le départ. */
export const STARTER_IDS: string[] = ['kairo', 'vera'];

export function getCharacter(id: string): CharacterDef {
  const c = ROSTER[id];
  if (!c) throw new Error(`Personnage inconnu : ${id}`);
  return c;
}

export function getMove(characterId: string, move: MoveId): MoveDef {
  return getCharacter(characterId).moves[move];
}
