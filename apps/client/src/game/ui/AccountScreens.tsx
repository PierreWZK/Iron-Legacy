import { useEffect, useState, type ReactNode } from 'react';
import { fetchRanking, login, logout, pushProgress, register, useAccount } from '../account/auth';
import { backToMenu } from '../store';

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

function Ranking() {
  const [rows, setRows] = useState<{ name: string; wins: number; games: number }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetchRanking().then(setRows).catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Classement indisponible.'));
  }, []);
  return (
    <section className="space-y-2">
      <h2 className="text-xs tracking-[0.35em] text-iron-cyan">Classement en ligne</h2>
      {err && <p className="text-sm text-white/50">{err}</p>}
      {rows && rows.length === 0 && <p className="text-sm text-white/50">Aucune partie en ligne pour l'instant.</p>}
      {rows && rows.length > 0 && (
        <ol className="space-y-1 text-sm">
          {rows.map((r, i) => (
            <li key={r.name} className="flex justify-between border-b border-white/10 py-1">
              <span>{i + 1}. {r.name}</span>
              <span className="text-white/60">{r.wins} victoire{r.wins > 1 ? 's' : ''} · {r.games} partie{r.games > 1 ? 's' : ''}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Connexion, inscription, sauvegarde et classement. */
export function AccountScreen() {
  const acc = useAccount();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (mode === 'login') void login(name, password);
    else void register(name, password);
  };

  return (
    <main className="relative mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto px-4 py-8 font-display text-white sm:px-6">
      <h1 className="text-3xl tracking-[0.3em] text-iron-amber">COMPTE</h1>

      {acc.name ? (
        <section className="space-y-3">
          <p className="text-lg">Connecté : <span className="text-iron-cyan">{acc.name}</span></p>
          <p className="max-w-xl text-sm text-white/60">
            La progression (personnages débloqués, meilleures vagues, histoire, classement d'arcade) est sauvegardée sur le serveur et récupérée à la connexion. Elle se sauvegarde aussi automatiquement au retour au menu.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button primary onClick={() => void pushProgress()} disabled={acc.busy}>SAUVEGARDER MAINTENANT</Button>
            <Button onClick={() => void logout()} disabled={acc.busy}>DÉCONNEXION</Button>
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`border px-4 py-2 text-xs tracking-widest ${mode === m ? 'border-iron-amber text-iron-amber' : 'border-white/20 text-white/70'}`}
              >
                {m === 'login' ? 'CONNEXION' : 'INSCRIPTION'}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-xs tracking-widest text-white/60">
            PSEUDO (3 à 16 caractères)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              autoComplete="username"
              className="w-64 border border-white/30 bg-black/50 px-3 py-2 text-base tracking-normal text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs tracking-widest text-white/60">
            MOT DE PASSE (6 caractères minimum)
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-64 border border-white/30 bg-black/50 px-3 py-2 text-base tracking-normal text-white"
            />
          </label>
          <Button primary onClick={submit} disabled={acc.busy || !name || !password}>
            {mode === 'login' ? 'SE CONNECTER' : 'CRÉER LE COMPTE'}
          </Button>
        </div>
      )}

      {acc.error && <p className="text-sm text-red-400">{acc.error}</p>}
      {acc.status && <p className="text-sm text-iron-cyan">{acc.status}</p>}

      <Ranking />

      <div>
        <Button onClick={backToMenu}>MENU</Button>
      </div>
    </main>
  );
}
