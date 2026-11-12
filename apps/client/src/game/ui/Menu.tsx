import { CHARACTER_IDS, getCharacter } from '@iron/engine';
import type { ReactNode } from 'react';
import { fr, t } from '../../i18n/fr';
import { DUMMY_MODES, type DummyMode, type MatchConfig } from '../runtime';
import { startFight, useApp } from '../store';
import { arcadeOpen } from '../arcade/session';
import { storyOpen } from '../story/session';
import { robotsOpen } from '../robots/session';
import { onlineOpen } from '../online/session';
import { useProgress } from '../progress';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs tracking-[0.35em] text-iron-cyan">{title}</h2>
      <div className="flex flex-wrap gap-3">{children}</div>
    </section>
  );
}

function Choice({ active, onClick, children, disabled = false }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`min-w-44 border px-4 py-3 text-left transition-colors ${
        disabled ? 'cursor-not-allowed border-white/10 bg-black/60 text-white/30'
          : active ? 'border-iron-amber bg-iron-amber/15 text-iron-amber' : 'border-white/20 bg-black/40 text-white/80 hover:border-white/50'
      }`}
    >
      {children}
    </button>
  );
}

/** Menu principal : mode, personnages, niveau d'IA, mannequin. Toute option est reliée à la sim. */
export function Menu() {
  const cfg = useApp((s) => s.config);
  const unlocked = useProgress((s) => s.unlocked);
  const patch = (p: Partial<MatchConfig>) => useApp.setState((s) => ({ config: { ...s.config, ...p } }));

  return (
    <main className="relative mx-auto flex h-full max-w-5xl flex-col gap-7 overflow-y-auto px-4 py-8 font-display text-white sm:px-6">
      <header>
        <h1 className="text-4xl tracking-[0.3em] text-iron-amber">{t.title}</h1>
        <p className="mt-2 text-xs tracking-widest text-white/50">{t.subtitle}</p>
      </header>

      <Section title={fr.menu.mode}>
        <Choice active={cfg.mode === 'ai'} onClick={() => patch({ mode: 'ai' })}>{fr.menu.ai}</Choice>
        <Choice active={cfg.mode === 'training'} onClick={() => patch({ mode: 'training' })}>{fr.menu.training}</Choice>
      </Section>

      <Section title={fr.menu.fighter}>
        {CHARACTER_IDS.map((id) => {
          const c = getCharacter(id);
          const locked = !unlocked.includes(id);
          return (
            <Choice key={id} active={cfg.p1 === id} disabled={locked} onClick={() => patch({ p1: id })}>
              <div className="text-lg tracking-widest">{locked ? '???' : c.name}</div>
              <div className="text-xs text-white/60">{locked ? 'Verrouillé : terminer une histoire' : c.epithet}</div>
              {!locked && <div className="mt-1 text-[11px] text-white/40">{c.style}</div>}
            </Choice>
          );
        })}
      </Section>

      {cfg.mode === 'ai' ? (
        <>
          <Section title={fr.menu.opponent}>
            {CHARACTER_IDS.map((id) => {
              const c = getCharacter(id);
              return (
                <Choice key={id} active={cfg.p2 === id} onClick={() => patch({ p2: id })}>
                  <div className="text-lg tracking-widest">{c.name}</div>
                  <div className="text-xs text-white/60">{c.epithet}</div>
                </Choice>
              );
            })}
          </Section>
          <Section title={fr.menu.level}>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <Choice key={lvl} active={cfg.level === lvl} onClick={() => patch({ level: lvl })}>
                Niveau {lvl}
              </Choice>
            ))}
          </Section>
        </>
      ) : (
        <Section title={fr.menu.dummy}>
          {DUMMY_MODES.map((m: DummyMode) => (
            <Choice key={m} active={cfg.dummy === m} onClick={() => patch({ dummy: m })}>
              {fr.menu.dummyModes[m]}
            </Choice>
          ))}
        </Section>
      )}

      <div>
        <button
          type="button"
          onClick={startFight}
          className="border border-iron-amber bg-iron-amber px-10 py-4 text-lg tracking-[0.3em] text-black hover:brightness-110"
        >
          {fr.menu.start}
        </button>
        <button
          type="button"
          onClick={arcadeOpen}
          className="ml-4 border border-iron-cyan px-10 py-4 text-lg tracking-[0.3em] text-iron-cyan hover:bg-iron-cyan/10"
        >
          ARCADE
        </button>
        <button
          type="button"
          onClick={storyOpen}
          className="ml-4 border border-iron-amber px-10 py-4 text-lg tracking-[0.3em] text-iron-amber hover:bg-iron-amber/10"
        >
          HISTOIRE
        </button>
        <button
          type="button"
          onClick={robotsOpen}
          className="ml-4 border border-iron-amber px-10 py-4 text-lg tracking-[0.3em] text-iron-amber hover:bg-iron-amber/10"
        >
          ROBOTS
        </button>
        <button
          type="button"
          onClick={onlineOpen}
          className="ml-4 border border-iron-cyan px-10 py-4 text-lg tracking-[0.3em] text-iron-cyan hover:bg-iron-cyan/10"
        >
          EN LIGNE
        </button>
        <button
          type="button"
          onClick={() => useApp.setState({ screen: 'account' })}
          className="ml-4 border border-white/40 px-10 py-4 text-lg tracking-[0.3em] text-white/80 hover:bg-white/5"
        >
          COMPTE
        </button>
      </div>
    </main>
  );
}
