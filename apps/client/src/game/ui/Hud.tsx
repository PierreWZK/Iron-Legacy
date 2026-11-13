import { useEffect, useState, type ReactNode } from 'react';
import { fr, t } from '../../i18n/fr';
import { useBindings } from '../input/bindings';
import { helpSections, toggleHelp, useHelp } from './help';
import { closePause, PauseMenu } from './PauseMenu';
import { backToMenu, startFight, useApp, useHud } from '../store';
import { useArcade } from '../arcade/session';
import { useStory } from '../story/session';
import { useRobots } from '../robots/session';
import { useOnline } from '../online/session';
import { runtime } from '../runtime';
import { ARCADE_STAGES, getChallenge, getCharacter, storyOpponents, waveSetup } from '@iron/engine';
import { accentOf, Portrait } from './Portrait';
import { SlantButton } from './kit';
import { TouchControls } from './TouchControls';
import { useTouchEnabled } from '../input/touch';

const useArenaRobot = (wave: number): string => waveSetup(wave).robot;

/** Barre de vie inclinée avec traînée de dégâts (la partie perdue s'efface lentement). */
function HealthBar({ value, max, mirrored, color }: { value: number; max: number; mirrored: boolean; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const low = pct < 25;
  return (
    <div className="relative h-5 w-full -skew-x-[20deg] overflow-hidden border-2 border-white/70 bg-black/70 shadow-[0_3px_0_rgba(0,0,0,0.6)]">
      <div className={`absolute inset-y-0 bg-white/80 transition-[width] delay-300 duration-700 ${mirrored ? 'right-0' : 'left-0'}`} style={{ width: `${pct}%` }} />
      <div
        className={`absolute inset-y-0 transition-[width] duration-100 ${mirrored ? 'right-0' : 'left-0'} ${low ? 'animate-pulse' : ''}`}
        style={{ width: `${pct}%`, background: `linear-gradient(180deg, color-mix(in srgb, ${color} 70%, white) 0%, ${color} 45%, color-mix(in srgb, ${color} 65%, black) 100%)` }}
      />
    </div>
  );
}

function Wins({ count, align }: { count: number; align: 'left' | 'right' }) {
  return (
    <div className={`flex gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
      {[0, 1].map((i) => (
        <span key={i} className={`h-3 w-3 rotate-45 border-2 border-iron-amber ${i < count ? 'bg-iron-amber shadow-[0_0_8px_#ffb020]' : ''}`} />
      ))}
    </div>
  );
}

/** Cartouche d'un combattant : portrait, nom, barre de vie, manches gagnées. */
function Corner({ id, name, value, max, wins, side }: { id: string; name: string; value: number; max: number; wins: number; side: 'left' | 'right' }) {
  const right = side === 'right';
  const color = accentOf(id);
  return (
    <div className={`flex flex-1 items-end gap-3 ${right ? 'flex-row-reverse' : ''}`}>
      <div className="relative h-16 w-16 shrink-0 -skew-x-6 overflow-hidden border-2 bg-black/70 sm:h-20 sm:w-20" style={{ borderColor: color, boxShadow: `0 0 14px -2px ${color}` }}>
        <Portrait id={id} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className={`font-display text-sm italic tracking-[0.2em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.8)] sm:text-base ${right ? 'text-right' : ''}`}>{name}</div>
        <HealthBar value={value} max={max} mirrored={right} color={right ? '#ff5a3a' : color} />
        <Wins count={wins} align={right ? 'right' : 'left'} />
      </div>
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
    <div key={last.stamp} className="popup absolute left-1/2 top-1/3 -translate-x-1/2 font-display text-5xl italic text-iron-amber [text-shadow:0_4px_0_#000,0_0_18px_#ffb020]">
      -{last.damage}
      {last.counter && <span className="ml-3 text-xl text-iron-cyan">{t.hud.counter}</span>}
    </div>
  );
}

function Banner({ children, color = '#fff', sub }: { children: ReactNode; color?: string; sub?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="anim-pop -skew-x-6 bg-gradient-to-r from-transparent via-black/70 to-transparent px-24 py-4 text-center">
        <div className="font-display text-6xl italic tracking-widest drop-shadow-[0_5px_0_rgba(0,0,0,0.8)] sm:text-8xl" style={{ color, textShadow: `0 0 30px ${color}66` }}>{children}</div>
        {sub && <div className="mt-1 text-sm tracking-[0.5em] text-white/70">{sub}</div>}
      </div>
    </div>
  );
}

function Overlay() {
  const h = useHud();
  const [fightFlash, setFightFlash] = useState(false);
  useEffect(() => {
    if (h.phase !== 'fight') return;
    setFightFlash(true);
    const id = window.setTimeout(() => setFightFlash(false), 900);
    return () => window.clearTimeout(id);
  }, [h.phase, h.round]);

  if (h.phase === 'intro') return <Banner key={h.round}>{t.hud.round} {h.round}</Banner>;
  if (h.phase === 'fight' && fightFlash) return <Banner color="#ffb020">FIGHT !</Banner>;
  if (h.phase === 'ko') {
    const text = h.roundWinner === null ? (h.clock <= 0 ? t.hud.time : t.hud.draw) : t.hud.ko;
    return <Banner color="#ffb020">{text}</Banner>;
  }
  if (h.phase === 'over') {
    const won = h.matchWinner === 0;
    const inCampaign = useArcade.getState().active || useStory.getState().active || useRobots.getState().active || useOnline.getState().screen === 'match';
    return (
      <>
        <Banner color={won ? '#34e0ff' : '#ff4a3a'}>{won ? t.hud.victory : t.hud.defeat}</Banner>
        {!inCampaign && (
          <div className="pointer-events-auto absolute inset-x-0 top-[64%] flex justify-center gap-4">
            <SlantButton primary onClick={startFight}>{t.hud.rematch.toUpperCase()}</SlantButton>
            <SlantButton onClick={backToMenu}>{t.hud.menu.toUpperCase()}</SlantButton>
          </div>
        )}
      </>
    );
  }
  return null;
}

/** Barres de vie des combattants à partir de trois (dernier debout). */
function RosterBars({ roster }: { roster: { name: string; hp: number; max: number; alive: boolean }[] }) {
  return (
    <div className="mx-auto mt-3 grid max-w-5xl grid-cols-2 gap-2 px-4 sm:grid-cols-4">
      {roster.map((r, i) => (
        <div key={i} className={`bg-black/50 p-2 ${r.alive ? '' : 'opacity-40'}`}>
          <div className="flex justify-between font-display text-[10px] tracking-widest">
            <span className="text-iron-cyan">{r.name}</span>
            <span>{r.alive ? `${Math.max(0, Math.round(r.hp))}` : 'KO'}</span>
          </div>
          <HealthBar value={r.hp} max={r.max} mirrored={false} color={r.alive ? '#34e0ff' : '#666'} />
        </div>
      ))}
    </div>
  );
}

function Tag({ children, color = '#ffb020' }: { children: ReactNode; color?: string }) {
  return (
    <div className="absolute left-1/2 top-[88px] -translate-x-1/2 -skew-x-12 bg-black/60 px-4 py-0.5 font-display text-[11px] tracking-[0.3em] sm:top-[104px]" style={{ color }}>
      <span className="inline-block skew-x-12">{children}</span>
    </div>
  );
}

/** Interface de combat : cartouches, horloge, combos, annonces, aide (touche H) et débogage (touche F3). */
export function Hud() {
  const h = useHud();
  const mode = useApp((s) => s.config.mode);
  const arcade = useArcade();
  const story = useStory();
  const robots = useRobots();
  const help = useHelp((s) => s.open);
  const bindings = useBindings((s) => s.bindings);
  const touch = useTouchEnabled();
  const [debug, setDebug] = useState(false);
  const comboCount = h.combo[0] >= h.combo[1] ? h.combo[0] : h.combo[1];
  const comboSide = h.combo[0] >= h.combo[1] ? 'left' : 'right';
  const ids = runtime.online ? runtime.heroes : [runtime.config.p1, runtime.config.p2];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') toggleHelp();
      else if (e.key === 'F3') {
        e.preventDefault();
        setDebug((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      closePause();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-body text-white">
      {h.roster.length > 2 && <RosterBars roster={h.roster} />}
      <div className={`mx-auto flex max-w-6xl items-start gap-3 px-4 pt-4 sm:px-6 ${h.roster.length > 2 ? 'hidden' : ''}`}>
        <Corner id={ids[0]!} name={h.names[0]} value={h.health[0]} max={h.maxHealth[0]} wins={h.wins[0]} side="left" />
        <div className="flex w-24 shrink-0 flex-col items-center pt-1 sm:w-28">
          <div className={`font-display text-5xl tabular-nums italic drop-shadow-[0_3px_0_rgba(0,0,0,0.8)] ${h.clock <= 10 && h.phase === 'fight' ? 'animate-pulse text-iron-red' : 'text-iron-amber'}`}>{h.clock}</div>
          <div className="text-[10px] tracking-[0.35em] text-white/60">{t.hud.round} {h.round}</div>
        </div>
        <Corner id={ids[1]!} name={h.names[1]} value={h.health[1]} max={h.maxHealth[1]} wins={h.wins[1]} side="right" />
      </div>

      {comboCount >= 2 && (
        <div key={comboCount} className={`anim-pop absolute top-32 ${comboSide === 'left' ? 'left-6' : 'right-6 text-right'}`}>
          <div className="font-display text-7xl italic text-iron-amber tabular-nums [text-shadow:0_4px_0_#000,0_0_22px_#ffb02088]">{comboCount}</div>
          <div className="font-display text-sm tracking-[0.4em] text-iron-amber">{t.hud.combo}</div>
        </div>
      )}

      <DamagePop />
      <Overlay />

      {arcade.active && <Tag color="#ffb020">ARCADE · ÉTAPE {arcade.stage + 1} / {ARCADE_STAGES.length} · {getCharacter(ARCADE_STAGES[arcade.stage]!.opponent).name}</Tag>}
      {robots.active && (
        <Tag color="#ffb020">
          {robots.mode === 'survival'
            ? `VAGUE ${robots.wave + 1} · ${getCharacter(useArenaRobot(robots.wave)).name}`
            : `DÉFI · ${getChallenge(robots.challengeId ?? '').label}`}
        </Tag>
      )}
      {story.active && <Tag color="#34e0ff">HISTOIRE · CHAPITRE {story.chapter + 1} / 8 · {getCharacter(storyOpponents(story.hero)[story.chapter]!).name}</Tag>}
      {h.infinite && mode === 'training' && <Tag color="#34e0ff">{t.hud.infinite}</Tag>}

      <TouchControls />

      <div className={`pointer-events-none absolute bottom-3 left-4 ${touch ? 'hidden' : 'flex'} max-w-[min(46rem,92vw)] flex-col items-start gap-2`}>
        {help && (
          <div className="anim-up grid gap-x-6 gap-y-2 border-l-4 border-iron-cyan bg-black/75 p-3 text-xs leading-relaxed text-white/85 md:grid-cols-2">
            {helpSections(bindings, ids[0]!).map((sec) => (
              <div key={sec.title} className="space-y-1">
                <div className="font-display tracking-widest text-iron-cyan">{sec.title.toUpperCase()}</div>
                {sec.lines.map((line) => <div key={line}>{line}</div>)}
              </div>
            ))}
          </div>
        )}
        <div className="pointer-events-auto flex items-center gap-3">
          <SlantButton small primary={help} onClick={toggleHelp}>AIDE</SlantButton>
          <span className="text-[10px] tracking-[0.3em] text-white/35">H : AIDE · F3 : DÉBOGAGE · ÉCHAP : PAUSE</span>
        </div>
      </div>

      <PauseMenu />

      {debug && (
        <div className="absolute right-4 top-32 w-56 bg-black/65 p-3 text-xs tabular-nums text-white/80">
          <div className="mb-1 font-display tracking-widest text-iron-amber">{fr.subtitle}</div>
          {h.mode === 'online' && <div className="text-iron-cyan">EN LIGNE · ping {useOnline.getState().ping ?? '—'} ms · désync {useOnline.getState().desyncs}</div>}
          <div>{fr.debug.fps} : {h.fps}</div>
          <div>{fr.debug.tick} : {h.tick}</div>
          <div>{fr.debug.distance} : {h.distance.toFixed(2)} m</div>
          <div>{fr.debug.state} P1 : {h.actions[0]}</div>
          <div>{fr.debug.state} P2 : {h.actions[1]}</div>
          <div>{fr.debug.move} P1 : {h.moves[0] ?? '—'} ({fr.debug.frame} {h.moveFrames[0]})</div>
          <div>{fr.debug.move} P2 : {h.moves[1] ?? '—'} ({fr.debug.frame} {h.moveFrames[1]})</div>
          {mode === 'training' && <div>{fr.debug.dummy} : {fr.menu.dummyModes[h.dummy]}</div>}
        </div>
      )}
    </div>
  );
}
