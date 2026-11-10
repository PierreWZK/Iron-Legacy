import { KAIRO } from './kairo';
import { VERA } from './vera';
import type { CharacterDef, MoveDef, MoveId } from './types';

export * from './types';

/** Roster jouable. Ajouter un personnage = ajouter une entrée ici. */
export const ROSTER: Record<string, CharacterDef> = { kairo: KAIRO, vera: VERA };
export const CHARACTER_IDS: string[] = Object.keys(ROSTER);

export function getCharacter(id: string): CharacterDef {
  const c = ROSTER[id];
  if (!c) throw new Error(`Personnage inconnu : ${id}`);
  return c;
}

export function getMove(characterId: string, move: MoveId): MoveDef {
  return getCharacter(characterId).moves[move];
}
