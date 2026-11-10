import {
  ARCADE_STAGES, CHARACTER_IDS, DIFFICULTIES, DIFFICULTY_IDS, getCharacter, type Difficulty,
} from '@iron/engine';
import type { ReactNode } from 'react';
import { BOSS_DEFEATED, ENDINGS } from '../arcade/endings';
import {
  arcadeNext, arcadeQuit, arcadeRetry, arcadeSetChoice, arcadeStart, useArcade, type ArcadeState, type StageResult,
} from '../arcade/session';
import type { RankEntry } from '../arcade/ranking';
import { useProgress } from '../progress';

const fmt = (n: number) => n.toLocaleString('fr-FR');

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

function RankingTable({ entries }: { entries: RankEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-white/50">Aucun score enregistré sur ce navigateur.</p>;
  return (
    <table className="w-full text-left text-sm tabular-nums">
      <thead className="text-xs tracking-widest text-white/50">
        <tr><th className="py-2">#</th><th>Combattant</th><th>Difficulté</th><th>Combats</th><th className="text-right">Score</th></tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={`${e.date}-${i}`} className="border-t border-white/10">
            <td className="py-2 text-iron-amber">{i + 1}</td>
            <td>{getCharacter(e.fighter).name}</td>
            <td>{DIFFICULTIES[e.difficulty].label}</td>
            <td>{e.stages}/{ARCADE_STAGES.length}</td>
            <td className="text-right">{fmt(e.score)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResultsList({ results }: { results: StageResult[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {results.map((r) => (
        <li key={r.stage} className="flex justify-between border-b border-white/10 py-1">
          <span>Étape {r.stage} · {r.opponent}</span>
          <span className={r.won ? 'text-iron-cyan' : 'text-red-400'}>{r.won ? fmt(r.score) : 'Défaite'}</span>
        </li>
      ))}
    </ul>
  );
}

function SelectView(a: ArcadeState) {
  const unlocked = useProgress((s) => s.unlocked);
  return (
    <Frame title="ARCADE">
      <section className="space-y-3">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Votre combattant</h2>
        <div className="flex flex-wrap gap-3">
          {CHARACTER_IDS.map((id) => {
            const c = getCharacter(id);
            const active = a.fighter === id;
            const locked = !unlocked.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={locked}
                aria-pressed={active}
                onClick={() => arcadeSetChoice({ fighter: id })}
                className={`min-w-44 border px-4 py-3 text-left ${locked ? 'cursor-not-allowed border-white/10 bg-black/60 text-white/30' : active ? 'border-iron-amber bg-iron-amber/15 text-iron-amber' : 'border-white/20 bg-black/40 text-white/80'}`}
              >
                <div className="tracking-widest">{locked ? '???' : c.name}</div>
                <div className="text-xs text-white/60">{locked ? 'Verrouillé' : c.epithet}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Difficulté</h2>
        <div className="flex flex-wrap gap-3">
          {DIFFICULTY_IDS.map((d: Difficulty) => (
            <button
              key={d}
              type="button"
              aria-pressed={a.difficulty === d}
              onClick={() => arcadeSetChoice({ difficulty: d })}
              className={`min-w-32 border px-4 py-3 ${a.difficulty === d ? 'border-iron-amber bg-iron-amber/15 text-iron-amber' : 'border-white/20 bg-black/40 text-white/80'}`}
            >
              {DIFFICULTIES[d].label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Parcours</h2>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {ARCADE_STAGES.map((s, i) => (
            <li key={i} className={s.boss ? 'text-red-400' : 'text-white/70'}>
              {i + 1}. {getCharacter(s.opponent).name} {s.boss ? '(boss)' : ''}
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button primary onClick={arcadeStart}>COMMENCER</Button>
        <Button onClick={arcadeQuit}>MENU</Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Classement local</h2>
        <RankingTable entries={a.ranking} />
      </section>
    </Frame>
  );
}

function BetweenView(a: ArcadeState) {
  const last = a.results[a.results.length - 1];
  const next = ARCADE_STAGES[a.stage];
  return (
    <Frame title={`ÉTAPE ${last?.stage ?? ''} RÉUSSIE`}>
      <p className="text-lg">Score de l'étape : <span className="text-iron-amber">{fmt(last?.score ?? 0)}</span></p>
      <p className="text-lg">Total : <span className="text-iron-amber">{fmt(a.total)}</span></p>
      {next && (
        <p className="text-sm text-white/70">
          Prochain adversaire : {getCharacter(next.opponent).name}{next.boss ? ' (boss final)' : ''}
        </p>
      )}
      <ResultsList results={a.results} />
      <div className="flex gap-3">
        <Button primary onClick={arcadeNext}>ÉTAPE SUIVANTE</Button>
        <Button onClick={arcadeQuit}>ABANDONNER</Button>
      </div>
    </Frame>
  );
}

function LostView(a: ArcadeState) {
  return (
    <Frame title="DÉFAITE">
      <p className="text-lg">Score final : <span className="text-iron-amber">{fmt(a.total)}</span></p>
      <ResultsList results={a.results} />
      <div className="flex gap-3">
        <Button primary onClick={arcadeRetry}>RÉESSAYER</Button>
        <Button onClick={arcadeQuit}>MENU</Button>
      </div>
      <section className="space-y-2">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Classement local</h2>
        <RankingTable entries={a.ranking} />
      </section>
    </Frame>
  );
}

function EndingView(a: ArcadeState) {
  const ending = ENDINGS[a.fighter];
  return (
    <Frame title={ending?.title ?? 'FIN'}>
      <p className="max-w-2xl leading-relaxed text-white/85">{ending?.text}</p>
      <p className="max-w-2xl leading-relaxed text-iron-amber/90">{BOSS_DEFEATED}</p>
      <p className="text-lg">Score final : <span className="text-iron-amber">{fmt(a.total)}</span></p>
      <ResultsList results={a.results} />
      <div className="flex gap-3">
        <Button primary onClick={arcadeStart}>REJOUER</Button>
        <Button onClick={arcadeQuit}>MENU</Button>
      </div>
      <section className="space-y-2">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Classement local</h2>
        <RankingTable entries={a.ranking} />
      </section>
    </Frame>
  );
}

/** Écrans de l'arcade hors combat : sélection, entre-combats, défaite, fin. */
export function ArcadeScreen() {
  const a = useArcade();
  switch (a.phase) {
    case 'between':
      return <BetweenView {...a} />;
    case 'lost':
      return <LostView {...a} />;
    case 'ending':
      return <EndingView {...a} />;
    default:
      return <SelectView {...a} />;
  }
}
