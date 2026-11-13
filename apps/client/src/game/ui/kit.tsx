import type { CSSProperties, ReactNode } from 'react';

/** Écran arcade plein cadre : fond animé teinté par `accent`. */
export function Screen({ accent = '#ffb020', children, className = '' }: { accent?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`relative h-full w-full overflow-hidden font-body text-white ${className}`} style={{ '--accent': accent } as CSSProperties}>
      <div className="arcade-bg" />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

/** Bouton incliné de style arcade. */
export function SlantButton({
  children, onClick, primary = false, disabled = false, accent, className = '', small = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  accent?: string;
  className?: string;
  small?: boolean;
}) {
  const style = accent ? ({ '--btn': accent } as CSSProperties) : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`group relative -skew-x-12 border-2 font-display tracking-[0.18em] transition-all duration-150 ${small ? 'px-5 py-2 text-xs short:px-3 short:py-1' : 'px-8 py-3 text-base short:px-4 short:py-1.5 short:text-xs'} ${
        disabled
          ? 'cursor-not-allowed border-white/10 bg-black/40 text-white/25'
          : primary
            ? 'border-[var(--btn,#ffb020)] bg-[var(--btn,#ffb020)] text-black shadow-[0_0_24px_-4px_var(--btn,#ffb020)] hover:brightness-110 active:translate-y-px'
            : 'border-white/30 bg-black/50 text-white/85 hover:border-[var(--btn,#ffb020)] hover:text-[var(--btn,#ffb020)] active:translate-y-px'
      } ${className}`}
    >
      <span className="inline-block skew-x-12">{children}</span>
    </button>
  );
}

/** Barre de caractéristique (0 à 1). */
export function StatBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] tracking-[0.2em]">
      <span className="w-24 shrink-0 text-white/60">{label}</span>
      <div className="relative h-2.5 flex-1 -skew-x-12 bg-white/10">
        <div className="absolute inset-y-0 left-0 transition-[width] duration-500" style={{ width: `${Math.round(value * 100)}%`, background: accent, boxShadow: `0 0 10px ${accent}` }} />
      </div>
    </div>
  );
}

/** Bandeau de titre d'écran. */
export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="anim-left">
      <h1 className="font-display text-3xl italic tracking-[0.15em] text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.6)] sm:text-4xl short:text-xl">{children}</h1>
      {sub && <p className="mt-1 text-xs tracking-[0.3em] text-[var(--accent)] short:mt-0 short:text-[10px]">{sub}</p>}
    </div>
  );
}
