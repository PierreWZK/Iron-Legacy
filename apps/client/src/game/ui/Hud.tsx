import { useEffect, useState } from 'react';
import { fr, t } from '../../i18n/fr';
import { backToMenu, startFight, useApp, useHud } from '../store';
import { useArcade } from '../arcade/session';
import { useStory } from '../story/session';
import { ARCADE_STAGES, getCharacter, storyOpponents } from '@iron/engine';

function HealthBar({ value, max, mirrored, color }: { value: number; max: number; mirrored: boolean; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-4 w-full overflow-hidden border border-white/30 bg-black/60 skew-x-[-18deg]">
      <div
        className={`h-full transition-[width] duration-150 ${mirrored ? 'ml-auto' : ''}`}
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function Wins({ count, align }: { count: number; align: 'left' | 'right' }) {
  return (
    <div className={`flex gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
      {[0, 1].map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rotate-45 border border-iron-amber ${i < count ? 'bg-iron-amber' : ''}`} />
      ))}
    </div>
  );
}

/** Dégâts flottants : le key = stamp relance l'animation à chaque impact. */
function DamagePop() {
  const last = useHud((s) => s.lastHit);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!last) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 900);
    return () => window.clearTimeout(id);
  }, [last]);
  if (!last || !visible) return null;
  return (
    <div key={last.stamp} className="popup absolute left-1/2 top-1/3 -translate-x-1/2 text-3xl font-bold text-iron-amber">
      -{last.damage}
      {last.counter && <span className="ml-2 text-base text-iron-cyan">{t.hud.counter}</span>}
    </div>
  );
}

function Overlay() {
  const h = useHud();
  if (h.phase === 'intro') {
    return <Centered className="text-5xl tracking-[0.3em]">{t.hud.round} {h.round}</Centered>;
  }
  if (h.phase === 'ko') {
    const text = h.roundWinner === null ? (h.clock <= 0 ? t.hud.time : t.hud.draw) : t.hud.ko;
    return <Centered className="text-6xl tracking-widest text-iron-amber">{text}</Centered>;
  }
  if (h.phase === 'over' && (useArcade.getState().active || useStory.getState().active)) {
    return (
      <Centered className={`text-6xl tracking-widest ${h.matchWinner === 0 ? 'text-iron-cyan' : 'text-red-400'}`}>
        {h.matchWinner === 0 ? t.hud.victory : t.hud.defeat}
      </Centered>
    );
  }
  if (h.phase === 'over') {
    const won = h.matchWinner === 0;
    return (
      <Centered>
        <div className={`text-6xl tracking-widest ${won ? 'text-iron-cyan' : 'text-red-400'}`}>
          {won ? t.hud.victory : t.hud.defeat}
        </div>
        <div className="pointer-events-auto mt-8 flex justify-center gap-4 text-sm">
          <button type="button" onClick={startFight} className="border border-iron-amber bg-black/70 px-6 py-3 tracking-widest hover:bg-iron-amber hover:text-black">
            {t.hud.rematch}
          </button>
          <button type="button" onClick={backToMenu} className="border border-white/40 bg-black/70 px-6 py-3 tracking-widest hover:bg-white hover:text-black">
            {t.hud.menu}
          </button>
        </div>
      </Centered>
    );
  }
  return null;
}

function Centered({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className={`bg-black/40 px-8 py-4 text-center ${className}`}>{children}</div>
    </div>
  );
}

/** Interface de combat : barres de vie, round, horloge, combos, dégâts, aide, débogage. */
export function Hud() {
  const h = useHud();
  const mode = useApp((s) => s.config.mode);
  const arcade = useArcade();
  const story = useStory();
  const comboCount = h.combo[0] >= h.combo[1] ? h.combo[0] : h.combo[1];
  const comboSide = h.combo[0] >= h.combo[1] ? 'left' : 'right';

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-display text-white">
      <div className="mx-auto flex max-w-5xl items-start gap-4 px-6 pt-5">
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-xs tracking-widest">
            <span className="text-iron-cyan">{h.names[0]}</span>
          </div>
          <HealthBar value={h.health[0]} max={h.maxHealth[0]} mirrored={true} color="#34e0ff" />
          <Wins count={h.wins[0]} align="left" />
        </div>
        <div className="flex w-28 shrink-0 flex-col items-center">
          <div className="text-3xl tabular-nums text-iron-amber">{h.clock}</div>
          <div className="text-[10px] tracking-[0.3em] text-white/60">{t.hud.round} {h.round}</div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-xs tracking-widest">
            <span className="text-red-400">{h.names[1]}</span>
          </div>
          <HealthBar value={h.health[1]} max={h.maxHealth[1]} mirrored={false} color="#ff4a3a" />
          <Wins count={h.wins[1]} align="right" />
        </div>
      </div>

      {comboCount >= 2 && (
        <div className={`absolute top-28 ${comboSide === 'left' ? 'left-6' : 'right-6'} text-right`}>
          <div className="text-5xl font-bold text-iron-amber tabular-nums">{comboCount}</div>
          <div className="text-xs tracking-[0.3em] text-iron-amber">{t.hud.combo}</div>
        </div>
      )}

      <DamagePop />
      <Overlay />

      {arcade.active && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 text-xs tracking-[0.3em] text-iron-amber">
          ARCADE · ÉTAPE {arcade.stage + 1} / {ARCADE_STAGES.length} · {getCharacter(ARCADE_STAGES[arcade.stage]!.opponent).name}
        </div>
      )}
      {story.active && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 text-xs tracking-[0.3em] text-iron-cyan">
          HISTOIRE · CHAPITRE {story.chapter + 1} / 8 · {getCharacter(storyOpponents(story.hero)[story.chapter]!).name}
        </div>
      )}
      {h.infinite && mode === 'training' && (
        <div className="absolute left-1/2 top-24 -translate-x-1/2 text-xs tracking-[0.3em] text-iron-cyan">{t.hud.infinite}</div>
      )}

      <div className="absolute bottom-4 left-4 w-96 space-y-1 bg-black/55 p-3 text-xs leading-relaxed text-white/80">
        <div className="mb-1 tracking-widest text-iron-cyan">{fr.controls.heading}</div>
        {fr.controls.lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      <div className="absolute right-4 top-28 w-56 bg-black/55 p-3 text-xs tabular-nums text-white/80">
        <div className="mb-1 tracking-widest text-iron-amber">{fr.subtitle}</div>
        <div>{fr.debug.fps} : {h.fps}</div>
        <div>{fr.debug.tick} : {h.tick}</div>
        <div>{fr.debug.distance} : {h.distance.toFixed(2)} m</div>
        <div>{fr.debug.state} P1 : {h.actions[0]}</div>
        <div>{fr.debug.state} P2 : {h.actions[1]}</div>
        <div>{fr.debug.move} P1 : {h.moves[0] ?? '—'} ({fr.debug.frame} {h.moveFrames[0]})</div>
        <div>{fr.debug.move} P2 : {h.moves[1] ?? '—'} ({fr.debug.frame} {h.moveFrames[1]})</div>
        {mode === 'training' && <div>{fr.debug.dummy} : {fr.menu.dummyModes[h.dummy]}</div>}
      </div>
    </div>
  );
}
