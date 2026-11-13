import { create } from 'zustand';

import type { Action } from './bindings';

/** Réglages tactiles, gardés dans le navigateur. */
export interface TouchPrefs {
  /** true : attaques à droite, déplacement à gauche (défaut). */
  attacksRight: boolean;
  /** `auto` : affichés sur les écrans tactiles seulement. */
  controls: 'auto' | 'on' | 'off';
}

const KEY = 'iron-legacy.touch';
const DEFAULTS: TouchPrefs = { attacksRight: true, controls: 'auto' };

function load(): TouchPrefs {
  try {
    const data = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<TouchPrefs> | null;
    return {
      attacksRight: typeof data?.attacksRight === 'boolean' ? data.attacksRight : DEFAULTS.attacksRight,
      controls: data?.controls === 'on' || data?.controls === 'off' ? data.controls : 'auto',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export const useTouchPrefs = create<TouchPrefs>(() => load());

export function setTouchPrefs(p: Partial<TouchPrefs>): void {
  useTouchPrefs.setState(p);
  try {
    const { attacksRight, controls } = useTouchPrefs.getState();
    window.localStorage.setItem(KEY, JSON.stringify({ attacksRight, controls }));
  } catch {
    // Stockage indisponible : le réglage vaut pour la session.
  }
}

/** Écran tactile sans souris (téléphone, tablette). */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

export function useTouchEnabled(): boolean {
  const c = useTouchPrefs((s) => s.controls);
  return c === 'on' || (c === 'auto' && isTouchDevice());
}

/** Actions tenues par les doigts. `KeyboardInput` les lit comme des touches. */
export const touchHeld = new Set<Action>();
/** Appuis brefs depuis le dernier tick (un tap entre deux ticks ne doit pas être perdu). */
export const touchTapped = new Set<Action>();

export function touchDown(a: Action): void {
  touchHeld.add(a);
  touchTapped.add(a);
}

export function touchUp(a: Action): void {
  touchHeld.delete(a);
}

export function touchReleaseAll(): void {
  touchHeld.clear();
  touchTapped.clear();
}
