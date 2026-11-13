import { ARENA_IDS, getCharacter, MODE_PLAYERS, ROOM_MODES, type RoomMode } from '@iron/engine';
import { useState, type ReactNode } from 'react';
import { useProgress } from '../progress';
import { FighterSelect } from './FighterSelect';
import {
  inviteLink, onlineBackToLobby, onlineBot, onlineHost, onlineJoin, onlineLeave, onlineRematch, onlineSetArena,
  onlineSetHero, onlineSetMode, onlineSetName, onlineSetReady, onlineStart, useOnline,
} from '../online/session';

const MODES: Record<RoomMode, { label: string; players: string; hint: string }> = {
  duel: { label: 'DUEL', players: '1 contre 1', hint: 'Manches au meilleur des 3.' },
  ffa: { label: 'DERNIER DEBOUT', players: '1v1v1 ou à 4', hint: 'Chacun pour soi, le dernier en vie gagne.' },
  team: { label: '2 CONTRE 2', players: '4 joueurs', hint: 'Équipe A (places 1 et 3) contre équipe B (2 et 4).' },
};

function Button({ onClick, children, primary = false, disabled = false }: {
  onClick: () => void; children: ReactNode; primary?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border px-5 py-3 text-sm tracking-[0.25em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 short:py-2 ${
        primary ? 'border-iron-amber bg-iron-amber text-black hover:brightness-110' : 'border-white/30 bg-black/40 text-white/80 hover:border-white/70'
      }`}
    >
      {children}
    </button>
  );
}

function Frame({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <main className="relative mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-y-auto px-4 py-8 font-display text-white sm:px-6 short:gap-3 short:py-3">
      <header>
        <h1 className="text-3xl tracking-[0.3em] text-iron-amber short:text-xl">{title}</h1>
        {sub && <p className="mt-1 text-xs tracking-[0.3em] text-iron-cyan">{sub}</p>}
      </header>
      {children}
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border border-white/15 bg-black/40 p-4 short:p-3">
      <h2 className="text-xs tracking-[0.35em] text-iron-cyan">{title}</h2>
      {children}
    </section>
  );
}

/** Copie dans le presse-papiers, avec repli pour les pages non sécurisées (http). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

function NameField() {
  const name = useOnline((s) => s.name);
  return (
    <label className="flex flex-col gap-1 text-xs tracking-widest text-white/60">
      PSEUDO
      <input
        value={name}
        onChange={(e) => onlineSetName(e.target.value)}
        maxLength={16}
        className="w-64 max-w-full border border-white/30 bg-black/50 px-3 py-2 text-base tracking-normal text-white"
      />
    </label>
  );
}

function HomeView() {
  const st = useOnline();
  const [code, setCode] = useState(st.invite);
  const [busy, setBusy] = useState(false);
  const run = (p: Promise<void>) => {
    setBusy(true);
    void p.finally(() => setBusy(false));
  };

  if (st.invite) {
    return (
      <Frame title="INVITATION" sub={`SALON ${st.invite}`}>
        <p className="max-w-xl text-sm text-white/70">On t'invite à un combat en ligne. Choisis ton pseudo puis rejoins le salon.</p>
        <NameField />
        {st.error && <p className="text-sm text-red-400">{st.error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button primary disabled={busy} onClick={() => run(onlineJoin(st.invite))}>REJOINDRE LE SALON</Button>
          <Button onClick={() => useOnline.setState({ invite: '', error: null })}>AUTRE SALON</Button>
          <Button onClick={onlineLeave}>MENU</Button>
        </div>
      </Frame>
    );
  }

  return (
    <Frame title="EN LIGNE" sub="JUSQU'À 4 COMBATTANTS · BOTS POSSIBLES">
      <NameField />
      <Panel title="CRÉER UN SALON">
        <p className="text-xs text-white/50">Choisis un mode de départ : tu pourras le changer dans le salon. Tu recevras un lien à envoyer.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROOM_MODES.map((m) => (
            <button
              key={m}
              type="button"
              disabled={busy}
              onClick={() => run(onlineHost(m))}
              className="border border-white/20 bg-black/40 p-3 text-left transition-colors hover:border-iron-amber disabled:opacity-40"
            >
              <div className="text-sm tracking-[0.2em] text-iron-amber">{MODES[m].label}</div>
              <div className="text-xs tracking-widest text-white/70">{MODES[m].players}</div>
              <div className="mt-1 font-body text-xs text-white/45">{MODES[m].hint}</div>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="REJOINDRE UN SALON">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(onlineJoin(code));
          }}
        >
          <label className="flex flex-col gap-1 text-xs tracking-widest text-white/60">
            CODE DU SALON
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="ABCDE"
              className="w-40 border border-white/30 bg-black/50 px-3 py-2 text-lg tracking-[0.3em] text-white placeholder:text-white/20"
            />
          </label>
          <button type="submit" disabled={busy} className="border border-white/30 bg-black/40 px-5 py-3 text-sm tracking-[0.25em] text-white/80 hover:border-white/70 disabled:opacity-40 short:py-2">
            REJOINDRE
          </button>
        </form>
      </Panel>
      {st.error && <p className="text-sm text-red-400">{st.error}</p>}
      <div>
        <Button onClick={onlineLeave}>MENU</Button>
      </div>
    </Frame>
  );
}

function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState<'link' | 'code' | 'fail' | null>(null);
  const copy = async (what: 'link' | 'code') => {
    const ok = await copyText(what === 'link' ? inviteLink(code) : code);
    setCopied(ok ? what : 'fail');
    window.setTimeout(() => setCopied(null), 2000);
  };
  const canShare = typeof navigator.share === 'function';
  return (
    <Panel title="INVITE TES ADVERSAIRES">
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-4xl tracking-[0.4em] text-iron-amber short:text-2xl">{code}</div>
        <div className="flex flex-wrap gap-2">
          <Button primary onClick={() => void copy('link')}>COPIER LE LIEN</Button>
          <Button onClick={() => void copy('code')}>COPIER LE CODE</Button>
          {canShare && (
            <Button onClick={() => void navigator.share({ title: 'Iron Legacy', text: `Rejoins mon salon ${code}`, url: inviteLink(code) }).catch(() => {})}>
              PARTAGER
            </Button>
          )}
        </div>
      </div>
      <p className="min-h-4 text-xs text-white/50" aria-live="polite">
        {copied === 'link' ? 'Lien copié : il ouvre le jeu directement sur ce salon.'
          : copied === 'code' ? 'Code copié.'
            : copied === 'fail' ? `Copie impossible : envoie ce lien à la main, ${inviteLink(code)}`
              : 'Le lien ouvre le jeu directement sur ce salon.'}
      </p>
    </Panel>
  );
}

function LobbyView() {
  const st = useOnline();
  const lobby = st.lobby;
  const me = st.slot;
  const isHost = me === 0;
  const size = lobby?.size ?? st.size;
  const mode: RoomMode = lobby?.mode ?? 'duel';
  const seats = lobby?.players ?? Array.from({ length: size }, () => null);
  const taken = seats.filter((p) => p !== null);
  const counts = MODE_PLAYERS[mode];
  const maxPlayers = Math.max(...counts);
  const countOk = counts.includes(taken.length);
  const botCount = taken.filter((p) => p.bot).length;
  const canAddBot = taken.length < maxPlayers && seats.some((p) => p === null);
  const status = !countOk
    ? `${taken.length} combattant${taken.length > 1 ? 's' : ''} : ce mode se joue à ${counts.join(' ou ')}${isHost && taken.length < maxPlayers ? ' (invite quelqu\'un ou ajoute un bot)' : ''}.`
    : isHost ? 'Prêt à lancer : chacun choisira ensuite son combattant.' : 'En attente de l\'hôte : chacun choisira ensuite son combattant.';

  return (
    <Frame title="SALON" sub={`${MODES[mode].label} · ${st.connected ? 'CONNECTÉ' : 'CONNEXION…'}${st.ping !== null ? ` · PING ${st.ping} MS` : ''}`}>
      <InviteCard code={st.code} />
      {st.error && <p className="text-sm text-red-400">{st.error}</p>}

      <Panel title="MODE DE JEU">
        <div className="flex flex-wrap gap-2">
          {ROOM_MODES.map((m) => (
            <button
              key={m}
              type="button"
              disabled={!isHost}
              aria-pressed={mode === m}
              onClick={() => onlineSetMode(m)}
              className={`border px-3 py-2 text-left disabled:cursor-default ${mode === m ? 'border-iron-amber text-iron-amber' : 'border-white/20 text-white/70 enabled:hover:border-white/60'} ${!isHost && mode !== m ? 'opacity-40' : ''}`}
            >
              <div className="text-xs tracking-[0.2em]">{MODES[m].label}</div>
              <div className="text-[10px] tracking-widest text-white/50">{MODES[m].players}</div>
            </button>
          ))}
        </div>
        <p className="font-body text-xs text-white/50">{MODES[mode].hint}{!isHost && ' Seul l\'hôte change le mode.'}</p>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2 short:grid-cols-4 short:gap-2">
        {seats.map((p, i) => (
          <div key={i} className={`border bg-black/40 p-4 short:p-2 ${i === me ? 'border-iron-amber/60' : 'border-white/15'}`}>
            <div className="text-[10px] tracking-widest text-white/50">
              PLACE {i + 1}{i === 0 ? ' · HÔTE' : ''}{i === me ? ' · TOI' : ''}{p?.bot ? ' · BOT' : ''}{mode === 'team' ? ` · ÉQUIPE ${i % 2 === 0 ? 'A' : 'B'}` : ''}
            </div>
            {p ? (
              <>
                <div className="mt-1 truncate text-lg tracking-widest short:text-sm">{p.name}</div>
                <div className="text-sm text-white/70 short:text-xs">{getCharacter(p.hero).name}</div>
                <div className={`mt-1 text-xs ${p.ready ? 'text-iron-cyan' : 'text-white/40'}`}>
                  {p.ready ? 'PRÊT' : 'pas prêt'}{!p.connected ? ' · déconnecté' : ''}
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-white/30">Place libre</div>
            )}
          </div>
        ))}
      </section>

      <Panel title="DÉCOR">
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
      </Panel>

      <p className={`text-sm ${countOk ? 'text-iron-cyan' : 'text-white/60'}`}>{status}</p>
      <div className="flex flex-wrap gap-3">
        {isHost && (
          <>
            <Button onClick={() => onlineBot(true)} disabled={!canAddBot}>+ BOT</Button>
            <Button onClick={() => onlineBot(false)} disabled={botCount === 0}>− BOT</Button>
            <Button primary onClick={onlineStart} disabled={!countOk}>LANCER LA PARTIE</Button>
          </>
        )}
        <Button onClick={onlineLeave}>QUITTER</Button>
      </div>
    </Frame>
  );
}

/** Sélection des combattants après le lancement : chacun valide, le combat part quand tout le monde est prêt. */
function PickView() {
  const st = useOnline();
  const unlocked = useProgress((s) => s.unlocked);
  const lobby = st.lobby;
  const seats = lobby?.players ?? [];
  const mine = seats[st.slot];
  const isHost = st.slot === 0;
  if (!mine) return null;
  const waiting = seats.filter((p) => p && !p.ready).length;
  return (
    <FighterSelect
      title="CHOISIS TON COMBATTANT"
      sub={`${lobby ? MODES[lobby.mode].label : ''} · ${mine.ready ? (waiting > 0 ? `EN ATTENTE DE ${waiting} JOUEUR${waiting > 1 ? 'S' : ''}` : 'C\'EST PARTI') : 'VALIDE QUAND TU ES PRÊT'}`}
      unlocked={unlocked}
      value={mine.hero}
      onChange={(id) => onlineSetHero(id)}
      onConfirm={() => onlineSetReady(!mine.ready)}
      confirmLabel={mine.ready ? 'ANNULER' : 'PRÊT'}
      onBack={isHost ? onlineBackToLobby : onlineLeave}
      tag="TOI"
      footer={
        <div className="flex flex-wrap justify-center gap-2 text-[11px] tracking-widest">
          {seats.map((p, i) => p && (
            <span key={i} className={`border px-2 py-1 ${p.ready ? 'border-iron-cyan text-iron-cyan' : 'border-white/20 text-white/60'}`}>
              {i === st.slot ? 'TOI' : p.name} · {getCharacter(p.hero).name} · {p.ready ? 'PRÊT' : 'choisit…'}
            </span>
          ))}
        </div>
      }
    />
  );
}

function ResultView() {
  const st = useOnline();
  const lobby = st.lobby;
  const winner = lobby?.winner ?? null;
  const won = winner === st.slot;
  const ffa = lobby?.ffa === true;
  const team = lobby?.team === true;
  const myTeam = st.slot % 2;
  const teamWon = lobby?.winnerTeam ?? null;
  const votes = lobby?.rematch ?? [];
  const humans = (lobby?.players ?? []).map((p, i) => (p && !p.bot ? i : -1)).filter((i) => i >= 0);
  const myVote = votes[st.slot] === true;
  const votesDone = humans.filter((i) => votes[i]).length;
  const title = team
    ? (teamWon == null ? 'ÉGALITÉ' : teamWon === myTeam ? 'VICTOIRE' : 'DÉFAITE')
    : ffa
      ? (won ? 'PREMIER' : `${(lobby?.placements.length ?? 0) - (lobby?.placements.indexOf(st.slot) ?? 0)}e`)
      : (winner == null ? 'ÉGALITÉ' : won ? 'VICTOIRE' : 'DÉFAITE');
  const name = (i: number) => lobby?.players[i]?.name ?? `Place ${i + 1}`;
  return (
    <Frame title={title} sub={lobby ? MODES[lobby.mode].label : undefined}>
      {ffa || team ? (
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
        Revanche : {myVote ? 'tu as voté' : 'en attente de ton vote'} · {votesDone}/{humans.length} joueurs prêts
      </p>
      <div className="flex flex-wrap gap-3">
        <Button primary onClick={onlineRematch} disabled={myVote}>REVANCHE</Button>
        {st.slot === 0 && <Button onClick={onlineBackToLobby}>RETOUR AU SALON</Button>}
        <Button onClick={onlineLeave}>QUITTER LE SALON</Button>
      </div>
      {st.slot !== 0 && <p className="text-xs text-white/40">L'hôte peut ramener tout le monde au salon (changer de mode, inviter d'autres joueurs).</p>}
    </Frame>
  );
}

/** Écrans du mode en ligne hors combat. Le combat lui-même est affiché par la scène 3D. */
export function OnlineScreen() {
  const screen = useOnline((s) => s.screen);
  if (screen === 'lobby') return <LobbyView />;
  if (screen === 'pick') return <PickView />;
  if (screen === 'result') return <ResultView />;
  return <HomeView />;
}
