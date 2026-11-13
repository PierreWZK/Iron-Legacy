import { create } from 'zustand';

/** Actions du combat qu'on peut lier à des touches. */
export const ACTIONS = [
  'screenLeft', 'screenRight', 'jump', 'crouch', 'shift', 'lp', 'rp', 'lk', 'rk',
] as const;
export type Action = (typeof ACTIONS)[number];
export type Bindings = Record<Action, string[]>;

export const ACTION_LABELS: Record<Action, string> = {
  screenLeft: 'Aller à gauche',
  screenRight: 'Aller à droite',
  jump: 'Haut : sauter (double appui : pas vers le fond)',
  crouch: 'Bas : s\'accroupir (double appui : pas vers l\'écran)',
  shift: 'Courir / esquiver',
  lp: 'Poing gauche',
  rp: 'Poing droit',
  lk: 'Pied gauche',
  rk: 'Pied droit',
};

/** Touches par défaut, en `KeyboardEvent.key` minuscule (étiquette de la touche → marche en AZERTY et QWERTY). */
export const DEFAULT_BINDINGS: Bindings = {
  screenLeft: ['q', 'arrowleft'],
  screenRight: ['d', 'arrowright'],
  jump: ['z', 'arrowup'],
  crouch: ['s', 'arrowdown'],
  shift: ['shift'],
  lp: ['a'],
  rp: ['e'],
  lk: ['r'],
  rk: ['f'],
};

/** Touches réservées à l'interface (pause, aide, débogage, raccourcis d'entraînement). */
export const RESERVED_KEYS = ['escape', 'enter', 'h', 't', 'i', 'f3'];

/** Nombre d'emplacements de touche par action. */
export const SLOTS = 2;

// v2 : haut / bas remplacent espace / C (les anciens réglages ne sont pas repris).
const KEY = 'iron-legacy.keys.v2';

function load(): Bindings {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : null;
    if (!data || typeof data !== 'object') return clone(DEFAULT_BINDINGS);
    const out = clone(DEFAULT_BINDINGS);
    for (const a of ACTIONS) {
      const v = (data as Record<string, unknown>)[a];
      if (Array.isArray(v)) out[a] = v.filter((x): x is string => typeof x === 'string').slice(0, SLOTS);
    }
    return out;
  } catch {
    return clone(DEFAULT_BINDINGS);
  }
}

function save(b: Bindings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    // Stockage indisponible : les touches valent pour la session seulement.
  }
}

function clone(b: Bindings): Bindings {
  return Object.fromEntries(ACTIONS.map((a) => [a, [...b[a]]])) as Bindings;
}

export const useBindings = create<{ bindings: Bindings }>(() => ({ bindings: load() }));

/** Lie `key` à l'emplacement `slot` de `action`. Une touche déjà utilisée ailleurs lui est retirée. */
export function bindKey(action: Action, slot: number, key: string): { ok: boolean; reason?: string } {
  const k = key.toLowerCase();
  if (RESERVED_KEYS.includes(k)) return { ok: false, reason: 'Touche réservée à l\'interface.' };
  const next = clone(useBindings.getState().bindings);
  for (const a of ACTIONS) next[a] = next[a].filter((x) => x !== k);
  const list = next[action];
  while (list.length < slot) list.push('');
  list[slot] = k;
  next[action] = list.filter((x) => x !== '');
  useBindings.setState({ bindings: next });
  save(next);
  return { ok: true };
}

/** Retire la touche d'un emplacement (il doit rester au moins une touche par action). */
export function clearKey(action: Action, slot: number): void {
  const next = clone(useBindings.getState().bindings);
  if (next[action].length <= 1) return;
  next[action].splice(slot, 1);
  useBindings.setState({ bindings: next });
  save(next);
}

export function resetBindings(): void {
  const next = clone(DEFAULT_BINDINGS);
  useBindings.setState({ bindings: next });
  save(next);
}

/** Nom lisible d'une touche. */
export function keyLabel(key: string | undefined): string {
  if (!key) return '—';
  const names: Record<string, string> = {
    ' ': 'Espace', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', shift: 'Maj', control: 'Ctrl', alt: 'Alt',
    tab: 'Tab', backspace: 'Retour', capslock: 'Verr. maj',
  };
  return names[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}
