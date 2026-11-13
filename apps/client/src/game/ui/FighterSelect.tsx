import { CHARACTER_IDS, getCharacter, type MoveId } from '@iron/engine';
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MoveRequest } from '../render/CharacterStage';
import { accentOf, Portrait } from './Portrait';
import { Screen, SlantButton, StatBar, Title } from './kit';

const CharacterStage = lazy(() => import('../render/CharacterStage'));

/** Coups proposés à l'essai dans l'aperçu (existent chez tous les personnages). */
const SHOWN: { id: MoveId; keys: string }[] = [
  { id: 'jab', keys: 'A' },
  { id: 'cross', keys: 'E' },
  { id: 'frontKick', keys: 'R' },
  { id: 'roundhouse', keys: 'F' },
  { id: 'axeKick', keys: '→ + F' },
  { id: 'uppercut', keys: 'C + E' },
  { id: 'dragonKick', keys: 'C → + F' },
  { id: 'spinKick', keys: '← + F' },
];

interface Raw {
  power: number;
  speed: number;
  reach: number;
  vitality: number;
}

function raw(id: string): Raw {
  const c = getCharacter(id);
  const mv = Object.values(c.moves);
  const avg = (f: (m: (typeof mv)[number]) => number) => mv.reduce((a, m) => a + f(m), 0) / mv.length;
  return {
    power: avg((m) => m.damage),
    speed: c.speeds.walkFwd + c.speeds.runFwd * 0.4 - avg((m) => m.startup) * 0.05,
    reach: avg((m) => m.reach),
    vitality: c.health,
  };
}

/** Caractéristiques normalisées sur le roster (de 0,25 à 1). */
const STATS = (() => {
  const all = CHARACTER_IDS.map((id) => [id, raw(id)] as const);
  const keys: (keyof Raw)[] = ['power', 'speed', 'reach', 'vitality'];
  const range = Object.fromEntries(keys.map((k) => {
    const v = all.map(([, r]) => r[k]);
    return [k, [Math.min(...v), Math.max(...v)] as const];
  })) as Record<keyof Raw, readonly [number, number]>;
  const norm = (k: keyof Raw, x: number) => {
    const [lo, hi] = range[k];
    return hi - lo < 1e-6 ? 0.6 : 0.25 + 0.75 * ((x - lo) / (hi - lo));
  };
  return new Map(all.map(([id, r]) => [id, {
    power: norm('power', r.power), speed: norm('speed', r.speed), reach: norm('reach', r.reach), vitality: norm('vitality', r.vitality),
  }]));
})();

export interface FighterSelectProps {
  title: string;
  sub?: string;
  /** Personnages sélectionnables (les autres s'affichent verrouillés). */
  unlocked: string[];
  value: string;
  onChange: (id: string) => void;
  onConfirm: () => void;
  confirmLabel: string;
  onBack: () => void;
  /** Étiquette du curseur de sélection sur la grille (J1, CPU, …). */
  tag?: string;
  /** Contenu libre au-dessus du bouton de validation (niveau, mannequin, avancement). */
  footer?: ReactNode;
  /** Ligne d'information sous le nom (avancement d'histoire). */
  info?: (id: string) => ReactNode;
}

/** Sélection de personnage : aperçu 3D animé, caractéristiques, coups à tester, grille de portraits. */
export function FighterSelect(p: FighterSelectProps) {
  const [request, setRequest] = useState<MoveRequest | null>(null);
  const c = getCharacter(p.value);
  const accent = accentOf(p.value);
  const stats = STATS.get(p.value)!;
  const playable = useMemo(() => CHARACTER_IDS.filter((id) => p.unlocked.includes(id)), [p.unlocked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = playable.indexOf(p.value);
      const cols = 6;
      let next = i;
      if (e.key === 'ArrowRight') next = i + 1;
      else if (e.key === 'ArrowLeft') next = i - 1;
      else if (e.key === 'ArrowDown') next = i + cols;
      else if (e.key === 'ArrowUp') next = i - cols;
      else if (e.key === 'Enter') {
        p.onConfirm();
        return;
      } else return;
      e.preventDefault();
      const target = playable[(next + playable.length) % playable.length];
      if (target) p.onChange(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p, playable]);

  return (
    <Screen accent={accent}>
      <div className="pointer-events-none absolute inset-x-0 top-[12%] z-0 select-none text-center font-display text-[17vw] italic leading-none ghost-text opacity-60">
        {c.name}
      </div>

      <div className="relative flex h-full flex-col">
        <header className="flex items-center justify-between px-6 pt-5 short:pt-2">
          <Title sub={p.sub}>{p.title}</Title>
          <SlantButton small onClick={p.onBack}>RETOUR</SlantButton>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 px-6 py-2 lg:grid-cols-[minmax(280px,360px)_1fr_minmax(220px,280px)] short:grid-cols-[minmax(200px,250px)_1fr] short:py-0">
          <section key={p.value} className="anim-up flex flex-col justify-center gap-3 lg:py-4 short:gap-1 short:py-0">
            <div className="font-display text-5xl italic tracking-wider text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.7)] sm:text-6xl short:text-3xl">{c.name}</div>
            <div className="-mt-1 text-sm tracking-[0.25em]" style={{ color: accent }}>{c.epithet.toUpperCase()}</div>
            {p.info?.(p.value)}
            <p className="max-w-sm text-sm leading-relaxed text-white/70 short:hidden">{c.bio}</p>
            <div className="max-w-sm space-y-2 pt-1 short:space-y-0.5">
              <StatBar label="PUISSANCE" value={stats.power} accent={accent} />
              <StatBar label="VITESSE" value={stats.speed} accent={accent} />
              <StatBar label="ALLONGE" value={stats.reach} accent={accent} />
              <StatBar label="ENDURANCE" value={stats.vitality} accent={accent} />
            </div>
            <div className="max-w-sm text-[11px] leading-relaxed tracking-wide text-white/45 short:hidden">{c.style}</div>
          </section>

          <section className="relative min-h-56 short:min-h-0">
            <Suspense fallback={<div className="grid h-full place-items-center text-xs tracking-[0.3em] text-white/40">CHARGEMENT…</div>}>
              <CharacterStage id={p.value} request={request} />
            </Suspense>
            <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] text-white/35">GLISSER POUR TOURNER</div>
          </section>

          <section className="hidden flex-col justify-center gap-1.5 lg:flex">
            <div className="mb-1 text-[11px] tracking-[0.3em] text-white/50">ESSAYER UN COUP</div>
            {SHOWN.map((m, i) => {
              const def = c.moves[m.id]!;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setRequest({ move: m.id, n: (request?.n ?? 0) + 1 })}
                  className="anim-up group flex -skew-x-12 items-center justify-between border border-white/15 bg-black/45 px-3 py-1.5 text-left text-xs transition-colors hover:border-[var(--accent)] hover:bg-black/70"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className="skew-x-12 tracking-wider">{def.label}</span>
                  <span className="skew-x-12 text-[10px] tabular-nums text-white/45 group-hover:text-[var(--accent)]">{m.keys} · {def.damage} dmg · {def.startup}f</span>
                </button>
              );
            })}
          </section>
        </div>

        <footer className="flex flex-col items-center gap-3 px-6 pb-5 short:flex-row short:flex-wrap short:justify-center short:gap-2 short:pb-2">
          <div className="grid grid-cols-6 gap-2 short:basis-full short:grid-cols-12 short:justify-center short:gap-1.5">
            {CHARACTER_IDS.map((id) => {
              const locked = !p.unlocked.includes(id);
              const active = id === p.value;
              const a = accentOf(id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={locked}
                  onClick={() => p.onChange(id)}
                  aria-label={locked ? 'Personnage verrouillé' : getCharacter(id).name}
                  aria-pressed={active}
                  className={`relative h-16 w-16 -skew-x-6 overflow-hidden border-2 transition-all sm:h-20 sm:w-20 short:h-11 short:w-11 ${locked ? 'cursor-not-allowed border-white/10 bg-black/60' : active ? 'z-10 scale-110' : 'border-white/25 bg-black/50 hover:scale-105 hover:border-white/70'}`}
                  style={active ? { borderColor: a, boxShadow: `0 0 22px ${a}`, background: `linear-gradient(160deg, ${a}55, #000)` } : undefined}
                >
                  <Portrait id={id} className="h-full w-full" dim={locked} />
                  {locked && <span className="absolute inset-0 grid place-items-center font-display text-2xl text-white/50">?</span>}
                  {active && <span className="absolute left-0 top-0 bg-[var(--accent)] px-1.5 py-0.5 font-display text-[9px] text-black">{p.tag ?? 'J1'}</span>}
                  {!locked && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center font-display text-[9px] tracking-wider">{getCharacter(id).name}</span>}
                </button>
              );
            })}
          </div>
          {p.footer}
          <SlantButton primary accent={accent} onClick={p.onConfirm}>{p.confirmLabel}</SlantButton>
        </footer>
      </div>
    </Screen>
  );
}
