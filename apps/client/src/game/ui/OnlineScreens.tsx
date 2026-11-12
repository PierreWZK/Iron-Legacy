import { ARENA_IDS, CHARACTER_IDS, getCharacter } from '@iron/engine';
import { useState, type ReactNode } from 'react';
import { useProgress } from '../progress';
import {
  onlineBot, onlineHost, onlineJoin, onlineLeave, onlineRematch, onlineSetArena, onlineSetHero, onlineSetName,
  onlineSetReady, onlineStart, useOnline,
} from '../online/session';

function Button({ onClick, children, primary = false, disabled = false }: {
  onClick: () => void; children: ReactNode; primary?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border px-6 py-3 text-sm tracking-[0.25em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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

function HomeView() {
  const st = useOnline();
  const [code, setCode] = useState('');
  return (
    <Frame title="EN LIGNE">
      <p className="max-w-2xl text-sm text-white/70">
        Crée un salon et envoie le code à tes adversaires, ou rejoins un salon avec son code. Duel à deux, ou dernier debout à quatre (les places libres peuvent être comblées par des bots).
      </p>
      <label className="flex flex-col gap-1 text-xs tracking-widest text-white/60">
        PSEUDO
        <input
          value={st.name}
          onChange={(e) => onlineSetName(e.target.value)}
          maxLength={16}
          className="w-64 border border-white/30 bg-black/50 px-3 py-2 text-base tracking-normal text-white"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <Button primary onClick={() => void onlineHost(2)}>CRÉER UN DUEL (2)</Button>
        <Button primary onClick={() => void onlineHost(4)}>CRÉER À QUATRE</Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs tracking-widest text-white/60">
          CODE DU SALON
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={5}
            className="w-40 border border-white/30 bg-black/50 px-3 py-2 text-lg tracking-[0.3em] text-white"
          />
        </label>
        <Button onClick={() => void onlineJoin(code)}>REJOINDRE</Button>
      </div>
      {st.error && <p className="text-sm text-red-400">{st.error}</p>}
      <div>
        <Button onClick={onlineLeave}>MENU</Button>
      </div>
    </Frame>
  );
}

function LobbyView() {
  const st = useOnline();
  const unlocked = useProgress((s) => s.unlocked);
  const lobby = st.lobby;
  const me = st.slot;
  const isHost = me === 0;
  const size = lobby?.size ?? st.size;
  const seats = lobby?.players ?? Array.from({ length: size }, () => null);
  const mine = seats[me];
  const allReady = seats.length === size && seats.every((p) => p !== null && p.ready);
  const botCount = seats.filter((p) => p?.bot).length;
  const freeSeats = seats.some((p) => p === null);

  return (
    <Frame title={`SALON · ${size} JOUEURS`}>
      <p className="text-sm text-white/60">
        Code du salon : <span className="text-2xl tracking-[0.4em] text-iron-amber">{st.code}</span>
        {' '}· {st.connected ? 'connecté' : 'connexion…'}
        {st.ping !== null && <> · ping {st.ping} ms</>}
      </p>
      {st.error && <p className="text-sm text-red-400">{st.error}</p>}

      <section className={`grid gap-3 ${size > 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
        {seats.map((p, i) => (
          <div key={i} className="border border-white/15 bg-black/40 p-4">
            <div className="text-xs tracking-widest text-white/50">
              PLACE {i + 1}{i === me ? ' (toi)' : ''}{p?.bot ? ' · BOT' : ''}
            </div>
            {p ? (
              <>
                <div className="mt-1 text-lg tracking-widest">{p.name}</div>
                <div className="text-sm text-white/70">{getCharacter(p.hero).name}</div>
                <div className={`mt-1 text-xs ${p.ready ? 'text-iron-cyan' : 'text-white/40'}`}>
                  {p.ready ? 'PRÊT' : 'pas prêt'}{!p.connected ? ' · déconnecté' : ''}
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-white/40">Place libre…</div>
            )}
          </div>
        ))}
      </section>

      {mine && (
        <section className="space-y-2">
          <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Ton combattant</h2>
          <div className="flex flex-wrap gap-2">
            {CHARACTER_IDS.filter((id) => unlocked.includes(id)).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={mine.hero === id}
                onClick={() => onlineSetHero(id)}
                className={`border px-3 py-2 text-sm tracking-widest ${mine.hero === id ? 'border-iron-amber text-iron-amber' : 'border-white/20 text-white/80'}`}
              >
                {getCharacter(id).name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Décor</h2>
        <div className="flex flex-wrap gap-2">
          {ARENA_IDS.map((a) => (
            <button
              key={a}
              type="button"
              disabled={!isHost}
              aria-pressed={lobby?.arena === a}
              onClick={() => onlineSetArena(a)}
              className={`border px-3 py-1 text-xs tracking-widest disabled:opacity-60 ${lobby?.arena === a ? 'border-iron-amber text-iron-amber' : 'border-white/20 text-white/70'}`}
            >
              {a}
            </button>
          ))}
        </div>
        {!isHost && <p className="text-xs text-white/40">Seul l'hôte choisit le décor.</p>}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => onlineSetReady(!mine?.ready)} disabled={!mine}>
          {mine?.ready ? 'PAS PRÊT' : 'PRÊT'}
        </Button>
        {isHost && (
          <>
            <Button onClick={() => onlineBot(true)} disabled={!freeSeats}>+ BOT</Button>
            <Button onClick={() => onlineBot(false)} disabled={botCount === 0}>− BOT</Button>
            <Button primary onClick={onlineStart} disabled={!allReady}>LANCER LE COMBAT</Button>
          </>
        )}
        <Button onClick={onlineLeave}>QUITTER</Button>
      </div>
    </Frame>
  );
}

function ResultView() {
  const st = useOnline();
  const lobby = st.lobby;
  const winner = lobby?.winner ?? null;
  const won = winner === st.slot;
  const ffa = lobby?.ffa === true;
  const votes = lobby?.rematch ?? [];
  const humans = (lobby?.players ?? []).map((p, i) => (p && !p.bot ? i : -1)).filter((i) => i >= 0);
  const myVote = votes[st.slot] === true;
  const votesDone = humans.filter((i) => votes[i]).length;
  const title = ffa
    ? (won ? 'PREMIER' : `${(lobby?.placements.length ?? 0) - (lobby?.placements.indexOf(st.slot) ?? 0)}e`)
    : (winner == null ? 'ÉGALITÉ' : won ? 'VICTOIRE' : 'DÉFAITE');
  const name = (i: number) => lobby?.players[i]?.name ?? `Place ${i + 1}`;
  return (
    <Frame title={title}>
      {ffa ? (
        <ol className="space-y-1 text-sm">
          {[...(lobby?.placements ?? [])].reverse().map((id, rank) => (
            <li key={id} className={`flex justify-between border-b border-white/10 py-1 ${id === st.slot ? 'text-iron-amber' : 'text-white/80'}`}>
              <span>{rank + 1}. {name(id)}{lobby?.players[id]?.bot ? ' (bot)' : ''}</span>
              <span className="text-white/50">{getCharacter(lobby?.players[id]?.hero ?? 'kairo').name}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-white/70">{name(st.slot)} contre {name(1 - st.slot)}</p>
      )}
      <p className="text-sm text-white/60">
        Revanche : {myVote ? 'tu as voté' : 'en attente de ton vote'} · {votesDone}/{humans.length} humains prêts
      </p>
      <div className="flex gap-3">
        <Button primary onClick={onlineRematch} disabled={myVote}>REVANCHE</Button>
        <Button onClick={onlineLeave}>QUITTER LE SALON</Button>
      </div>
    </Frame>
  );
}

/** Écrans du mode en ligne hors combat. Le combat lui-même est affiché par la scène 3D. */
export function OnlineScreen() {
  const screen = useOnline((s) => s.screen);
  if (screen === 'lobby') return <LobbyView />;
  if (screen === 'result') return <ResultView />;
  return <HomeView />;
}
