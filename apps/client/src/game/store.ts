import { create } from 'zustand';
import type { ActionState } from '@iron/engine';
import type { DummyMode } from './runtime';

/** État d'UI uniquement (rafraîchi ~10 Hz). L'état de combat vit dans `runtime`, jamais ici. */
interface DebugState {
  fps: number;
  tick: number;
  action: ActionState;
  distance: number;
  dummy: DummyMode;
  health: [number, number];
}

export const useDebug = create<DebugState>(() => ({
  fps: 0,
  tick: 0,
  action: 'idle',
  distance: 0,
  dummy: 'idle',
  health: [100, 100],
}));
