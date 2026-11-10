import { KAIRO } from './kairo';
import { VERA } from './vera';
import { TITAN } from './titan';
import type { CharacterDef, MoveDef, MoveId } from './types';

export * from './types';

/** Roster jouable. Ajouter un personnage = ajouter une entrée ici. */
export const ROSTER: Record<string, CharacterDef> = { kairo: KAIRO, vera: VERA, titan: TITAN };
/** Personnages sélectionnables dans le menu (TITAN-01 est un boss d'arcade). */
export const CHARACTER_IDS: string[] = ['kairo', 'vera'];

export function getCharacter(id: string): CharacterDef {
  const c = ROSTER[id];
  if (!c) throw new Error(`Personnage inconnu : ${id}`);
  return c;
}

export function getMove(characterId: string, move: MoveId): MoveDef {
  return getCharacter(characterId).moves[move];
}
