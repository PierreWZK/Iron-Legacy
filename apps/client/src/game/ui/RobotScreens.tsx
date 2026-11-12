import { CHALLENGES, getCharacter } from '@iron/engine';
import type { ReactNode } from 'react';
import { useProgress } from '../progress';
import {
  robotsBack, robotsChallengeStart, robotsNextWave, robotsQuit, robotsSetHero, robotsSurvivalStart, useRobots,
} from '../robots/session';

function Button({ onClick, children, primary = false }: { onClick: () => void; children: ReactNode; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-6 py-3 text-sm tracking-[0.25em] transition-colors ${
        primary ? 'border-iron-amber bg-iron-amber text-black hover:brightness-110' : 'border-white/30 bg-black/40 text-white/80 hover:border-white/70'
      }`}
    >
      {children}
    </button>
  );
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="relative mx-auto flex h-full max-w-4xl flex-col gap-6 overflow-y-auto px-4 py-8 font-display text-white sm:px-6">
      <h1 className="text-3xl tracking-[0.3em] text-iron-amber">{title}</h1>
      {children}
    </main>
  );
}

/** Choix du héros, vagues, défis. */
function MenuView() {
  const st = useRobots();
  const unlocked = useProgress((s) => s.unlocked);
  return (
    <Frame title="ROBOT ASSAULT">
      <section className="space-y-2">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Votre combattant</h2>
        <div className="flex flex-wrap gap-3">
          {unlocked.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={st.hero === id}
              onClick={() => robotsSetHero(id)}
              className={`border px-4 py-2 text-sm tracking-widest ${st.hero === id ? 'border-iron-amber text-iron-amber' : 'border-white/20 text-white/80'}`}
            >
              {getCharacter(id).name}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Vagues</h2>
        <p className="max-w-2xl text-sm text-white/70">
          Un robot par vague, de plus en plus fort. Ta vie se reporte d'une vague à l'autre, avec une récupération partielle entre deux vagues. Un boss (TITAN-01) toutes les dix vagues.
        </p>
        <p className="text-sm text-white/60">Meilleure vague : {st.bestWave || '—'}</p>
        <div>
          <Button primary onClick={robotsSurvivalStart}>COMMENCER LES VAGUES</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Défis</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CHALLENGES.map((c) => {
            const done = st.done.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => robotsChallengeStart(c.id)}
                className={`border px-4 py-3 text-left ${done ? 'border-iron-cyan/60 bg-iron-cyan/5' : 'border-white/20 bg-black/40 hover:border-iron-amber'}`}
              >
                <div className="flex items-center justify-between tracking-widest">
                  <span>{c.label}</span>
                  {done && <span className="text-xs text-iron-cyan">RÉUSSI</span>}
                </div>
                <div className="text-xs text-white/60">{c.description}</div>
                <div className="mt-1 text-[11px] text-white/40">Contre {getCharacter(c.robot).name}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div>
        <Button onClick={robotsQuit}>MENU</Button>
      </div>
    </Frame>
  );
}

function BetweenView() {
  const st = useRobots();
  const cleared = st.wave + 1;
  const heroMax = getCharacter(st.hero).health;
  return (
    <Frame title={`VAGUE ${cleared} RÉUSSIE`}>
      <p className="text-white/80">
        Vie restaurée pour la vague suivante : <span className="text-iron-cyan">{st.playerHealth}</span> / {heroMax}.
      </p>
      <div className="flex gap-3">
        <Button primary onClick={robotsNextWave}>VAGUE {cleared + 1}</Button>
        <Button onClick={robotsQuit}>ABANDONNER</Button>
      </div>
    </Frame>
  );
}

function OverView() {
  const st = useRobots();
  return (
    <Frame title="FIN DES VAGUES">
      <p className="text-lg">Vagues réussies : <span className="text-iron-amber">{st.bestWave}</span></p>
      <div className="flex gap-3">
        <Button primary onClick={robotsSurvivalStart}>RECOMMENCER</Button>
        <Button onClick={robotsBack}>CHOIX</Button>
        <Button onClick={robotsQuit}>MENU</Button>
      </div>
    </Frame>
  );
}

function ChallengeView() {
  const st = useRobots();
  const r = st.result;
  return (
    <Frame title={r?.passed ? 'DÉFI RÉUSSI' : 'DÉFI MANQUÉ'}>
      <p className="text-lg text-white/85">{r?.label ?? ''}</p>
      <p className="text-sm text-white/60">{r?.passed ? 'Défi validé et enregistré.' : 'Conditions non remplies. Tu peux réessayer.'}</p>
      <div className="flex gap-3">
        <Button primary onClick={robotsBack}>CHOIX</Button>
        <Button onClick={robotsQuit}>MENU</Button>
      </div>
    </Frame>
  );
}

/** Écrans hors combat du mode robots. */
export function RobotScreen() {
  const phase = useRobots((s) => s.phase);
  switch (phase) {
    case 'between':
      return <BetweenView />;
    case 'over':
      return <OverView />;
    case 'challenge':
      return <ChallengeView />;
    default:
      return <MenuView />;
  }
}
