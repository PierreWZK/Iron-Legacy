import { ARENA_IDS, CHARACTER_IDS, getCharacter } from '@iron/engine';
import { useState, type ReactNode } from 'react';
import { useProgress } from '../progress';
import {
  onlineHost, onlineJoin, onlineLeave, onlineRematch, onlineSetArena, onlineSetHero, onlineSetName,
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
        Crée un salon et envoie le code à ton adversaire, ou rejoins un salon avec son code. Duel à deux joueurs, serveur autoritaire.
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
        <Button primary onClick={() => void onlineHost()}>CRÉER UN SALON</Button>
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
  const seats = lobby?.players ?? [null, null];
  const mine = seats[me];
  const bothReady = !!seats[0] && !!seats[1] && seats[0].ready && seats[1].ready;

  return (
    <Frame title="SALON">
      <p className="text-sm text-white/60">
        Code du salon : <span className="text-2xl tracking-[0.4em] text-iron-amber">{st.code}</span>
        {' '}· {st.connected ? 'connecté' : 'connexion…'}
        {st.ping !== null && <> · ping {st.ping} ms</>}
      </p>
      {st.error && <p className="text-sm text-red-400">{st.error}</p>}

      <section className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => {
          const p = seats[i];
          return (
            <div key={i} className="border border-white/15 bg-black/40 p-4">
              <div className="text-xs tracking-widest text-white/50">JOUEUR {i + 1}{i === me ? ' (toi)' : ''}</div>
              {p ? (
                <>
                  <div className="mt-1 text-lg tracking-widest">{p.name}</div>
                  <div className="text-sm text-white/70">{getCharacter(p.hero).name}</div>
                  <div className={`mt-1 text-xs ${p.ready ? 'text-iron-cyan' : 'text-white/40'}`}>
                    {p.ready ? 'PRÊT' : 'pas prêt'}{!p.connected ? ' · déconnecté' : ''}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-white/40">En attente d'un adversaire…</div>
              )}
            </div>
          );
        })}
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
        {isHost && <Button primary onClick={onlineStart} disabled={!bothReady}>LANCER LE COMBAT</Button>}
        <Button onClick={onlineLeave}>QUITTER</Button>
      </div>
    </Frame>
  );
}

function ResultView() {
  const st = useOnline();
  const lobby = st.lobby;
  const won = lobby?.winner === st.slot;
  const votes = lobby?.rematch ?? [false, false];
  const myVote = votes[st.slot];
  const otherVote = votes[1 - st.slot];
  return (
    <Frame title={lobby?.winner == null ? 'ÉGALITÉ' : won ? 'VICTOIRE' : 'DÉFAITE'}>
      <p className="text-white/70">
        {lobby?.players[st.slot]?.name ?? 'Toi'} contre {lobby?.players[1 - st.slot]?.name ?? 'l\'adversaire'}
      </p>
      <p className="text-sm text-white/60">
        Revanche : {myVote ? 'tu as voté' : 'en attente de ton vote'} · {otherVote ? 'adversaire prêt' : 'adversaire pas encore'}
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
