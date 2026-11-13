import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';

import type { Action } from '../input/bindings';
import { touchDown, touchReleaseAll, touchUp, useTouchEnabled, useTouchPrefs } from '../input/touch';
import { openPause } from './PauseMenu';

/** Bouton tenu au doigt : actif tant que le doigt reste posé. */
function HoldButton({ action, label, className = '', color = '#fff' }: { action: Action; label: string; className?: string; color?: string }) {
  const [on, setOn] = useState(false);
  const end = () => {
    touchUp(action);
    setOn(false);
  };
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        touchDown(action);
        setOn(true);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      className={`grid touch-none select-none place-items-center rounded-full border-2 font-display leading-none tracking-wider transition-transform ${on ? 'scale-90 text-black' : 'bg-black/45 text-white/90'} ${className}`}
      style={{ borderColor: color, background: on ? color : undefined, boxShadow: `0 0 12px -3px ${color}` }}
    >
      {label}
    </button>
  );
}

const DEAD = 0.32;

/** Croix directionnelle analogique : gauche/droite = marche, haut = saut, bas = accroupi. */
function Stick() {
  const pad = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<Set<Action>>(new Set());

  const apply = (next: Set<Action>) => {
    for (const a of active.current) if (!next.has(a)) touchUp(a);
    for (const a of next) if (!active.current.has(a)) touchDown(a);
    active.current = next;
  };
  const move = (e: RPointerEvent) => {
    const r = pad.current!.getBoundingClientRect();
    const half = r.width / 2;
    let dx = (e.clientX - (r.left + half)) / half;
    let dy = (e.clientY - (r.top + half)) / half;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    setKnob({ x: dx, y: dy });
    const next = new Set<Action>();
    if (dx > DEAD) next.add('screenRight');
    if (dx < -DEAD) next.add('screenLeft');
    if (dy < -DEAD) next.add('jump');
    if (dy > DEAD) next.add('crouch');
    apply(next);
  };
  const end = () => {
    apply(new Set());
    setKnob({ x: 0, y: 0 });
  };

  return (
    <div
      ref={pad}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.buttons > 0 && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      className="relative size-36 shrink-0 touch-none select-none rounded-full border-2 border-white/30 bg-black/35 sm:size-44"
    >
      <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] text-white/40">SAUT</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/40">BAS</span>
      <div
        className="absolute left-1/2 top-1/2 size-14 rounded-full border-2 border-iron-cyan bg-iron-cyan/30 shadow-[0_0_16px_-2px_#34e0ff]"
        style={{ transform: `translate(calc(-50% + ${knob.x * 40}%), calc(-50% + ${knob.y * 40}%))` }}
      />
    </div>
  );
}

/** Commandes tactiles : croix d'un côté, quatre attaques de l'autre (côté réglable), bouton pause. */
export function TouchControls() {
  const enabled = useTouchEnabled();
  const attacksRight = useTouchPrefs((s) => s.attacksRight);

  useEffect(() => {
    window.addEventListener('blur', touchReleaseAll);
    return () => {
      window.removeEventListener('blur', touchReleaseAll);
      touchReleaseAll();
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Pause"
        onClick={openPause}
        className="pointer-events-auto absolute bottom-3 left-1/2 z-20 grid size-10 -translate-x-1/2 place-items-center rounded-full border-2 border-white/40 bg-black/50 font-display text-sm text-white/80"
      >
        II
      </button>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${attacksRight ? '' : 'flex-row-reverse'}`}
      >
        <div className="pointer-events-auto flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <HoldButton action="intoScreen" label="FOND" className="h-9 w-14 text-[10px]" />
            <HoldButton action="towardScreen" label="ÉCRAN" className="h-9 w-14 text-[10px]" />
            <HoldButton action="shift" label="COURSE" className="h-9 w-16 text-[10px]" color="#ffb020" />
          </div>
          <Stick />
        </div>

        <div className="pointer-events-auto mb-2 grid grid-cols-2 gap-3">
          <HoldButton action="lp" label="POING G" className="size-16 text-[10px] sm:size-20" color="#ffb020" />
          <HoldButton action="rp" label="POING D" className="size-16 text-[10px] sm:size-20" color="#ff4a3a" />
          <HoldButton action="lk" label="PIED G" className="size-16 text-[10px] sm:size-20" color="#34e0ff" />
          <HoldButton action="rk" label="PIED D" className="size-16 text-[10px] sm:size-20" color="#7dff9a" />
        </div>
      </div>

      <div className="pointer-events-auto absolute inset-0 z-40 hidden place-items-center bg-black/90 p-8 text-center font-display text-xl tracking-widest text-white portrait:grid">
        TOURNE TON TÉLÉPHONE<br />EN MODE PAYSAGE
      </div>
    </>
  );
}
