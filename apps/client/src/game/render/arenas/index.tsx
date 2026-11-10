import { Arena as DojoArena } from '../Arena';
import { ARENAS, type ArenaId } from './specs';
import { ThemedArena } from './ThemedArena';

export type { ArenaId } from './specs';

/** Décor d'origine de chaque personnage (on combat dans le décor de l'adversaire). */
export const ARENA_OF: Record<string, ArenaId> = {
  kairo: 'dojo',
  vera: 'street',
  wolf: 'forest',
  fox: 'autumn',
  bull: 'canyon',
  stag: 'snow',
  husky: 'tundra',
  robot: 'lab',
  shin: 'rooftop',
  brutus: 'factory',
  akira: 'temple',
  nyx: 'desert',
  titan: 'fortress',
  scout: 'factory',
  guardian: 'lab',
  assassin: 'fortress',
  heavy: 'factory',
  elite: 'lab',
};

export function arenaFor(characterId: string): ArenaId {
  return ARENA_OF[characterId] ?? 'dojo';
}

export function ArenaScene({ id }: { id: ArenaId }) {
  if (id === 'dojo') return <DojoArena />;
  return <ThemedArena id={id} spec={ARENAS[id]} />;
}
