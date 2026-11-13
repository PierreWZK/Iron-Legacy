import { CHARACTER_IDS } from '@iron/engine';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { selectOpen } from '../select';
import { arcadeOpen } from '../arcade/session';
import { storyOpen } from '../story/session';
import { robotsOpen } from '../robots/session';
import { onlineOpen } from '../online/session';
import { useApp } from '../store';
import { Screen } from './kit';

const MenuDiorama = lazy(() => import('../render/MenuDiorama'));

interface Item {
  label: string;
  hint: string;
  run: () => void;
  accent: string;
}

/** Menu principal : titre, duel animé en fond, entrées de mode en grosses touches arcade. */
export function Menu() {
  const items: Item[] = useMemo(() => [
    { label: 'HISTOIRE', hint: '8 chapitres, dialogues, boss final', run: storyOpen, accent: '#ffb020' },
    { label: 'COMBAT', hint: 'Duel rapide contre l\'IA', run: () => selectOpen('versus'), accent: '#ff4a3a' },
    { label: 'ARCADE', hint: 'Enchaîne les adversaires', run: arcadeOpen, accent: '#34e0ff' },
    { label: 'EN LIGNE', hint: 'Duel, dernier debout, 2 contre 2', run: onlineOpen, accent: '#34e0ff' },
    { label: 'ROBOTS', hint: 'Survie et défis', run: robotsOpen, accent: '#ffb020' },
    { label: 'ENTRAÎNEMENT', hint: 'Teste tes coups sur un mannequin', run: () => selectOpen('training'), accent: '#7dff9a' },
    { label: 'RÉGLAGES', hint: 'Difficulté, commandes tactiles, côté des attaques', run: () => useApp.setState({ screen: 'settings' }), accent: '#c9d4e3' },
    { label: 'COMPTE', hint: 'Sauvegarde et classement', run: () => useApp.setState({ screen: 'account' }), accent: '#c9d4e3' },
  ], []);
  const [sel, setSel] = useState(0);
  const pair = useMemo(() => {
    const i = Math.floor(Math.random() * CHARACTER_IDS.length);
    return [CHARACTER_IDS[i]!, CHARACTER_IDS[(i + 5) % CHARACTER_IDS.length]!] as const;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') setSel((s) => (s + 1) % items.length);
      else if (e.key === 'ArrowUp') setSel((s) => (s - 1 + items.length) % items.length);
      else if (e.key === 'Enter') items[sel]!.run();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, sel]);

  const cur = items[sel]!;
  return (
    <Screen accent={cur.accent}>
      <div className="absolute inset-0 opacity-90">
        <Suspense fallback={null}>
          <MenuDiorama a={pair[0]} b={pair[1]} />
        </Suspense>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

      <main className="relative flex h-full flex-col justify-between px-8 py-8 sm:px-14 [@media(max-height:520px)]:py-3">
        <header className="anim-left">
          <div className="font-display text-6xl italic leading-[0.9] tracking-wide logo-text sm:text-8xl [@media(max-height:520px)]:text-4xl [@media(max-height:520px)]:leading-none">IRON<br />LEGACY</div>
          <div className="mt-3 text-xs tracking-[0.5em] text-white/60 [@media(max-height:520px)]:hidden">COMBAT 3D · HELIX · TITAN-01</div>
        </header>

        <nav aria-label="Modes de jeu" className="flex flex-col items-start gap-2.5 [@media(max-height:520px)]:grid [@media(max-height:520px)]:grid-cols-2 [@media(max-height:520px)]:justify-items-start [@media(max-height:520px)]:gap-x-4 [@media(max-height:520px)]:gap-y-1">
          {items.map((it, i) => {
            const on = i === sel;
            return (
              <button
                key={it.label}
                type="button"
                onClick={it.run}
                onMouseEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
                className="anim-left group relative -skew-x-12 text-left transition-all duration-150"
                style={{ animationDelay: `${i * 55}ms`, transform: on ? 'translateX(18px) skewX(-12deg)' : undefined }}
              >
                <span
                  className="block border-l-8 px-6 py-2 font-display text-2xl tracking-[0.12em] transition-colors sm:text-3xl [@media(max-height:520px)]:py-1 [@media(max-height:520px)]:text-base"
                  style={{
                    borderColor: it.accent,
                    background: on ? it.accent : 'rgba(0,0,0,0.55)',
                    color: on ? '#000' : '#fff',
                    boxShadow: on ? `0 0 28px -6px ${it.accent}` : undefined,
                  }}
                >
                  <span className="inline-block skew-x-12">{it.label}</span>
                </span>
              </button>
            );
          })}
          <p className="mt-2 h-5 pl-2 text-sm tracking-widest [@media(max-height:520px)]:hidden" style={{ color: cur.accent }}>{cur.hint}</p>
        </nav>

        <footer className="text-[10px] tracking-[0.3em] text-white/40 [@media(max-height:520px)]:hidden">↑ ↓ POUR CHOISIR · ENTRÉE POUR VALIDER</footer>
      </main>
    </Screen>
  );
}
