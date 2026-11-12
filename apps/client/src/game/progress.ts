import { create } from 'zustand';
import { CHARACTER_IDS, STARTER_IDS } from '@iron/engine';

const KEY = 'iron-legacy.unlocked';

function stored(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** `?unlockAll` dans l'URL : tout est jouable (outil de test, ne modifie pas la sauvegarde). */
function unlockAllRequested(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('unlockAll');
  } catch {
    return false;
  }
}

function initial(): string[] {
  if (unlockAllRequested()) return [...CHARACTER_IDS];
  const known = new Set([...STARTER_IDS, ...stored()]);
  return CHARACTER_IDS.filter((id) => known.has(id));
}

/** Personnages débloqués. Départ : KAIRO et VERA ; chaque fin d'histoire en débloque un autre (phase 6). */
export const useProgress = create<{ unlocked: string[] }>(() => ({ unlocked: initial() }));

/** Débloque un personnage et sauvegarde (localStorage, propre au navigateur). Sans effet s'il l'est déjà. */
export function unlockCharacter(id: string): boolean {
  if (!CHARACTER_IDS.includes(id) || useProgress.getState().unlocked.includes(id)) return false;
  const unlocked = CHARACTER_IDS.filter((c) => c === id || useProgress.getState().unlocked.includes(c));
  useProgress.setState({ unlocked });
  try {
    window.localStorage.setItem(KEY, JSON.stringify(unlocked));
  } catch {
    // Stockage indisponible : le déblocage vaut pour la session seulement.
  }
  return true;
}

/** Prochain personnage verrouillé dans l'ordre de déblocage (null si tout est débloqué). */
export function nextLocked(): string | null {
  const { unlocked } = useProgress.getState();
  return CHARACTER_IDS.find((id) => !unlocked.includes(id)) ?? null;
}
