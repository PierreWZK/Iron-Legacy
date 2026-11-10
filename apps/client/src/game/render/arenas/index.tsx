import { Arena as DojoArena } from '../Arena';
import { LabArena } from './LabArena';
import { NatureArena } from './NatureArena';

export type ArenaId = 'dojo' | 'forest' | 'autumn' | 'canyon' | 'snow' | 'tundra' | 'lab';

/** Décor d'origine de chaque personnage (on combat dans le décor de l'adversaire). */
export const ARENA_OF: Record<string, ArenaId> = {
  kairo: 'dojo',
  vera: 'dojo',
  wolf: 'forest',
  fox: 'autumn',
  bull: 'canyon',
  stag: 'snow',
  husky: 'tundra',
  robot: 'lab',
  titan: 'lab',
};

export function arenaFor(characterId: string): ArenaId {
  return ARENA_OF[characterId] ?? 'dojo';
}

export function ArenaScene({ id }: { id: ArenaId }) {
  switch (id) {
    case 'lab':
      return <LabArena />;
    case 'dojo':
      return <DojoArena />;
    default:
      return <NatureArena theme={id} />;
  }
}
