import { create } from 'zustand';
import { backToMenu, useApp } from './store';

export type SelectKind = 'versus' | 'training';

/** Parcours de sélection d'un combat rapide : joueur 1, puis adversaire (+ niveau ou mannequin). */
export const useSelect = create<{ kind: SelectKind; step: 'p1' | 'p2' }>(() => ({ kind: 'versus', step: 'p1' }));

export function selectOpen(kind: SelectKind): void {
  useSelect.setState({ kind, step: 'p1' });
  useApp.setState((s) => ({ screen: 'select', config: { ...s.config, mode: kind === 'versus' ? 'ai' : 'training' } }));
}

/** Retour d'un cran : de l'adversaire vers le joueur, puis au menu. */
export function selectBack(): void {
  if (useSelect.getState().step === 'p2') useSelect.setState({ step: 'p1' });
  else backToMenu();
}
