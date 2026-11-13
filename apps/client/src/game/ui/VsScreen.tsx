import { getCharacter } from '@iron/engine';
import { useEffect } from 'react';
import { enterFight, useApp } from '../store';
import { accentOf, Portrait } from './Portrait';
import { Screen } from './kit';

/** Écran VS : les deux combattants face à face avant le combat (clic ou Entrée pour passer). */
export function VsScreen() {
  const vs = useApp((s) => s.vs);
  useEffect(() => {
    const id = window.setTimeout(enterFight, 2600);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') enterFight();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  if (!vs) return null;
  const a = accentOf(vs.p1);
  const b = accentOf(vs.p2);
  const c1 = getCharacter(vs.p1);
  const c2 = getCharacter(vs.p2);
  return (
    <Screen accent="#ffb020">
      <button type="button" aria-label="Passer" onClick={enterFight} className="absolute inset-0 z-20 cursor-pointer" />
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="relative overflow-hidden" style={{ background: `linear-gradient(110deg, ${a}66, transparent 70%)` }}>
          <div className="anim-left absolute inset-y-[8%] left-[4%] right-[-8%]">
            <Portrait big contain id={vs.p1} className="h-full w-full" />
          </div>
          <div className="anim-left absolute bottom-[10%] left-[6%] origin-left">
            <div className="font-display text-5xl italic text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.8)] sm:text-7xl">{c1.name}</div>
            <div className="text-xs tracking-[0.3em] sm:text-sm" style={{ color: a }}>{c1.epithet.toUpperCase()}</div>
          </div>
        </div>
        <div className="relative overflow-hidden" style={{ background: `linear-gradient(250deg, ${b}66, transparent 70%)` }}>
          <div className="anim-right absolute inset-y-[8%] left-[-8%] right-[4%]">
            <Portrait big contain id={vs.p2} className="h-full w-full [&_img]:-scale-x-100" />
          </div>
          <div className="anim-right absolute bottom-[10%] right-[6%] text-right">
            <div className="font-display text-5xl italic text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.8)] sm:text-7xl">{c2.name}</div>
            <div className="text-xs tracking-[0.3em] sm:text-sm" style={{ color: b }}>{c2.epithet.toUpperCase()}</div>
          </div>
        </div>
      </div>
      <div className="anim-pop pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-display text-[16vw] italic leading-none logo-text">VS</div>
      {vs.sub && <div className="anim-up absolute inset-x-0 top-6 text-center text-xs tracking-[0.5em] text-white/70">{vs.sub}</div>}
      <div className="absolute inset-x-0 bottom-4 text-center text-[10px] tracking-[0.4em] text-white/40">ENTRÉE POUR PASSER</div>
    </Screen>
  );
}
