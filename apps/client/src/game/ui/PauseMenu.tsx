import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useArcade } from '../arcade/session';
import {
  ACTIONS, ACTION_LABELS, bindKey, clearKey, keyLabel, resetBindings, SLOTS, useBindings, type Action,
} from '../input/bindings';
import { quitFight } from '../quit';
import { runtime } from '../runtime';
import { startFight, useApp } from '../store';
import { useRobots } from '../robots/session';
import { useStory } from '../story/session';
import { toggleHelp, useHelp } from './help';
import { SlantButton } from './kit';

interface PauseState {
  open: boolean;
  view: 'menu' | 'keys';
  /** Emplacement de touche en attente d'une touche du clavier. */
  capturing: { action: Action; slot: number } | null;
}

export const usePause = create<PauseState>(() => ({ open: false, view: 'menu', capturing: null }));

export function openPause(): void {
  if (!runtime.online) runtime.paused = true;
  usePause.setState({ open: true, view: 'menu', capturing: null });
}

export function closePause(): void {
  runtime.paused = false;
  usePause.setState({ open: false, view: 'menu', capturing: null });
}

/** Touche Échap pendant un combat : annule la saisie, revient au menu pause, ou ouvre/ferme la pause. */
export function escapePressed(): void {
  const s = usePause.getState();
  if (s.capturing) usePause.setState({ capturing: null });
  else if (s.open && s.view === 'keys') usePause.setState({ view: 'menu' });
  else if (s.open) closePause();
  else openPause();
}

function KeyRow({ action }: { action: Action }) {
  const keys = useBindings((s) => s.bindings[action]);
  const capturing = usePause((s) => s.capturing);
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-1.5">
      <span className="text-sm text-white/80">{ACTION_LABELS[action]}</span>
      <div className="flex gap-2">
        {Array.from({ length: SLOTS }, (_, slot) => {
          const armed = capturing?.action === action && capturing.slot === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => usePause.setState({ capturing: { action, slot } })}
              onContextMenu={(e) => {
                e.preventDefault();
                clearKey(action, slot);
              }}
              className={`min-w-24 -skew-x-12 border px-3 py-1 font-display text-xs tracking-widest transition-colors ${
                armed ? 'animate-pulse border-iron-amber bg-iron-amber text-black' : 'border-white/30 bg-black/50 text-white hover:border-iron-cyan'
              }`}
            >
              <span className="inline-block skew-x-12">{armed ? 'APPUIE…' : keyLabel(keys[slot])}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KeysView() {
  const capturing = usePause((s) => s.capturing);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return; // géré par `escapePressed`
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Backspace' || e.key === 'Delete') {
        clearKey(capturing.action, capturing.slot);
        usePause.setState({ capturing: null });
        setMsg('');
        return;
      }
      const res = bindKey(capturing.action, capturing.slot, e.key);
      setMsg(res.ok ? '' : (res.reason ?? ''));
      if (res.ok) usePause.setState({ capturing: null });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing]);

  return (
    <div className="w-[min(34rem,92vw)]">
      <h2 className="mb-1 font-display text-2xl italic tracking-widest text-white">COMMANDES</h2>
      <p className="mb-3 text-xs text-white/55">Clique sur une touche puis appuie sur la nouvelle. Retour arrière : effacer. Clic droit : retirer. Échap : annuler.</p>
      <div className="max-h-[52vh] overflow-y-auto pr-2">
        {ACTIONS.map((a) => <KeyRow key={a} action={a} />)}
      </div>
      <p className="mt-2 h-4 text-xs text-iron-red">{msg}</p>
      <div className="mt-3 flex gap-3">
        <SlantButton small onClick={() => usePause.setState({ view: 'menu', capturing: null })}>RETOUR</SlantButton>
        <SlantButton small onClick={resetBindings}>PAR DÉFAUT</SlantButton>
      </div>
    </div>
  );
}

/** Menu Échap en combat : reprendre, régler les touches, aide, recommencer, quitter. */
export function PauseMenu() {
  const { open, view } = usePause();
  const help = useHelp((s) => s.open);
  const story = useStory((s) => s.active);
  const arcade = useArcade((s) => s.active);
  const robots = useRobots((s) => s.active);
  const mode = useApp((s) => s.config.mode);
  if (!open) return null;
  const online = runtime.online !== null;
  const canRestart = !online && !story && !arcade && !robots && (mode === 'ai' || mode === 'training');

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/70 backdrop-blur-sm" role="dialog" aria-label="Pause">
      <div className="anim-pop border-l-8 border-iron-amber bg-black/85 px-8 py-6 shadow-[0_0_60px_-10px_#ffb020]">
        {view === 'keys' ? (
          <KeysView />
        ) : (
          <div className="flex min-w-72 flex-col gap-3">
            <h2 className="font-display text-4xl italic tracking-widest text-iron-amber">{online ? 'MENU' : 'PAUSE'}</h2>
            {online && <p className="max-w-64 text-xs text-white/55">En ligne : le combat continue pendant que ce menu est ouvert.</p>}
            <SlantButton primary onClick={closePause}>REPRENDRE</SlantButton>
            <SlantButton onClick={() => usePause.setState({ view: 'keys' })}>COMMANDES</SlantButton>
            <SlantButton onClick={toggleHelp}>AIDE : {help ? 'AFFICHÉE' : 'MASQUÉE'}</SlantButton>
            {canRestart && <SlantButton onClick={() => { closePause(); startFight(); }}>RECOMMENCER</SlantButton>}
            <SlantButton onClick={() => { closePause(); quitFight(); }}>QUITTER LE COMBAT</SlantButton>
          </div>
        )}
      </div>
    </div>
  );
}
