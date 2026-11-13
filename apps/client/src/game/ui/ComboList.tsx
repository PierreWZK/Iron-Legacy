import { getCharacter, type ComboTier } from '@iron/engine';
import { keyLabel, useBindings, type Bindings } from '../input/bindings';
import { useTouchEnabled } from '../input/touch';

/** Noms des boutons tactiles (écran de combat sur téléphone). */
const TOUCH_KEYS: Record<string, string> = { lp: 'POING G', rp: 'POING D', lk: 'PIED G', rk: 'PIED D' };

const DIRS: Record<string, string> = { f: '→', b: '←', d: '↓', u: '↑', df: '↘', db: '↙' };
const TIERS: [ComboTier, string, string][] = [
  ['easy', 'FACILES', '#7dff9a'],
  ['medium', 'MOYENS', '#ffb020'],
  ['hard', 'DIFFICILES', '#ff4a3a'],
];

/** Entrées d'un jeton de combo sous forme de puces : flèches relatives au combattant et touches réglées. */
export function tokenChips(token: string, b: Bindings, touch = false): string[] {
  const [a, btn] = token.includes('+') ? (token.split('+') as [string, string]) : ['', token];
  const key = touch ? (TOUCH_KEYS[btn] ?? btn) : keyLabel(b[btn as keyof Bindings]?.[0]);
  if (a === 'ff') return ['→', '→', key];
  return a ? [DIRS[a] ?? a, key] : [key];
}

/** Liste de tous les combos d'un personnage, par difficulté, avec les touches du joueur. */
export function ComboList({ characterId }: { characterId: string }) {
  const b = useBindings((s) => s.bindings);
  const touch = useTouchEnabled();
  const ch = getCharacter(characterId);
  const combos = ch.combos ?? [];
  return (
    <div className="w-[min(40rem,94vw)]">
      <h2 className="font-display text-2xl italic tracking-widest text-white">COMBOS · {ch.name}</h2>
      <p className="mb-2 text-xs text-white/55">
        → = vers l'adversaire, ← = reculer, ↓ = accroupi, ↑ = saut : la flèche se tient en même temps que le bouton.
        « → → » = double appui. Appuie sans attendre : l'appui suivant est gardé en mémoire.
      </p>
      <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-2">
        {TIERS.map(([tier, title, color]) => (
          <section key={tier}>
            <div className="mb-1 font-display text-xs tracking-[0.3em]" style={{ color }}>{title}</div>
            <div className="space-y-1">
              {combos.filter((c) => c.tier === tier).map((c) => (
                <div key={c.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 bg-black/40 px-2 py-1" style={{ borderColor: color }}>
                  <span className="w-56 shrink-0 text-sm text-white/90">{c.name}</span>
                  <span className="flex flex-wrap gap-1">
                    {c.inputs.flatMap((t, i) => tokenChips(t, b, touch).map((chip, j) => (
                      <kbd key={`${i}-${j}`} className="min-w-6 rounded border border-white/25 bg-white/10 px-1.5 text-center font-display text-[11px] text-white/90">{chip}</kbd>
                    )))}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
