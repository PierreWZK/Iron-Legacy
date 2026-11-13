import { getCharacter, STORY_LENGTH } from '@iron/engine';
import { useEffect, useState } from 'react';
import { BOSS_DEFEATED, ENDINGS } from '../story/text';
import {
  storyChoose, storyNextLine, storyOpen, storyPercent, storyQuit, storyRetry, useStory,
} from '../story/session';
import { useProgress } from '../progress';
import { FighterSelect } from './FighterSelect';
import { accentOf, Portrait } from './Portrait';
import { Screen, SlantButton } from './kit';

/** Sélection du héros : avancement de chaque histoire, bouton pour lancer ou reprendre. */
function SelectView() {
  const unlocked = useProgress((s) => s.unlocked);
  const progress = useStory((s) => s.progress);
  const [hero, setHero] = useState(() => unlocked[0] ?? 'kairo');
  const done = progress[hero]?.done === true;
  const pct = storyPercent(hero, progress);
  return (
    <FighterSelect
      title="HISTOIRE"
      sub="CHOISIS TON HÉROS"
      unlocked={unlocked}
      value={hero}
      onChange={setHero}
      onConfirm={() => storyChoose(hero)}
      confirmLabel={done ? 'REJOUER' : pct > 0 ? 'REPRENDRE' : 'COMMENCER'}
      onBack={storyQuit}
      tag="HÉROS"
      info={(id) => {
        const p = storyPercent(id, progress);
        return (
          <div className="flex items-center gap-1.5" aria-label={`Chapitres terminés : ${p} sur ${STORY_LENGTH}`}>
            {Array.from({ length: STORY_LENGTH }, (_, i) => (
              <span key={i} className={`h-2.5 w-5 -skew-x-12 ${i < p ? 'bg-[var(--accent)]' : 'bg-white/15'}`} />
            ))}
            <span className="ml-2 text-[11px] tracking-widest text-white/55">{progress[id]?.done ? 'TERMINÉE' : `CHAPITRE ${Math.min(p + 1, STORY_LENGTH)} / ${STORY_LENGTH}`}</span>
          </div>
        );
      }}
    />
  );
}

/** Texte qui s'écrit lettre à lettre ; un clic l'affiche en entier. */
function useTypewriter(text: string): { shown: string; done: boolean; finish: () => void } {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = window.setInterval(() => setN((x) => x + 1), 22);
    return () => window.clearInterval(id);
  }, [text]);
  const done = n >= text.length;
  return { shown: text.slice(0, n), done, finish: () => setN(text.length) };
}

/** Dialogue avant un combat : portraits face à face, celui qui parle est mis en avant. */
function DialogueView() {
  const st = useStory();
  const line = st.lines[st.lineIndex];
  const hero = getCharacter(st.hero);
  const opp = getCharacter(st.opponent);
  const last = st.lineIndex >= st.lines.length - 1;
  const text = line?.text ?? '';
  const tw = useTypewriter(text);
  const who = line?.who ?? 'narr';
  const speaker = who === 'hero' ? hero : who === 'opp' ? opp : null;
  const accent = accentOf(who === 'opp' ? st.opponent : st.hero);

  const advance = () => {
    if (!tw.done) tw.finish();
    else storyNextLine();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Screen accent={accent}>
      <div className="absolute inset-x-0 top-5 z-20 flex items-start justify-between px-6">
        <div className="anim-left">
          <div className="font-display text-xl italic tracking-widest text-white sm:text-2xl">CHAPITRE {st.chapter + 1}<span className="text-white/40"> / {STORY_LENGTH}</span></div>
          <div className="text-[11px] tracking-[0.3em]" style={{ color: accent }}>{hero.name} CONTRE {opp.name}</div>
        </div>
        <SlantButton small onClick={storyQuit}>ABANDONNER</SlantButton>
      </div>

      <div className="absolute inset-0 grid grid-cols-2">
        <div className={`relative transition-all duration-300 ${who === 'opp' ? 'scale-95 opacity-45 saturate-50' : 'scale-100'}`}>
          <div className="absolute bottom-[26%] left-[2%] top-[8%] w-[92%]">
            <Portrait big contain id={st.hero} className="h-full w-full" />
          </div>
        </div>
        <div className={`relative transition-all duration-300 ${who === 'hero' ? 'scale-95 opacity-45 saturate-50' : 'scale-100'}`}>
          <div className="absolute bottom-[26%] right-[2%] top-[8%] w-[92%]">
            <Portrait big contain id={st.opponent} className="h-full w-full [&_img]:-scale-x-100" />
          </div>
        </div>
      </div>

      <button type="button" onClick={advance} aria-label="Réplique suivante" className="absolute inset-x-0 bottom-0 z-20 h-[34%] w-full cursor-pointer px-[6%] pb-[4%] text-left short:h-[38%] short:pb-[2%]">
        <div className="relative h-full -skew-x-3 border-2 bg-black/80 px-8 py-5 backdrop-blur-sm short:px-5 short:py-3" style={{ borderColor: accent, boxShadow: `0 0 36px -10px ${accent}` }}>
          {speaker && (
            <div className="absolute -top-5 left-6 -skew-x-6 px-5 py-1 font-display text-lg tracking-[0.2em] text-black short:-top-4 short:py-0.5 short:text-sm" style={{ background: accent }}>
              {speaker.name}
            </div>
          )}
          <p className={`mt-1 max-w-4xl text-lg leading-relaxed sm:text-2xl short:text-base short:leading-snug ${who === 'narr' ? 'italic text-white/75' : 'text-white'}`}>
            {tw.shown}
            <span className="opacity-0">{text.slice(tw.shown.length)}</span>
          </p>
          <span className="absolute bottom-3 right-6 animate-pulse font-display text-xs tracking-[0.3em] short:bottom-1.5 short:text-[10px]" style={{ color: accent }}>
            {tw.done ? (last ? 'COMBATTRE ▶' : 'SUIVANT ▶') : '…'}
          </span>
        </div>
      </button>
    </Screen>
  );
}

function LostView() {
  const st = useStory();
  const accent = accentOf(st.opponent);
  return (
    <Screen accent="#ff4a3a">
      <div className="absolute inset-0 grid grid-cols-[1fr_1fr]">
        <div className="relative">
          <div className="anim-left absolute inset-y-[10%] left-[8%] right-0">
            <Portrait big contain id={st.opponent} className="h-full w-full" />
          </div>
        </div>
        <div className="flex flex-col items-start justify-center gap-6 px-6">
          <div className="anim-pop font-display text-6xl italic text-iron-red drop-shadow-[0_4px_0_rgba(0,0,0,0.8)] sm:text-8xl">DÉFAITE</div>
          <p className="max-w-md text-lg text-white/80">Le chapitre {st.chapter + 1} n'est pas validé. <span style={{ color: accent }}>{getCharacter(st.opponent).name}</span> garde le terrain, pour l'instant.</p>
          <div className="flex gap-3">
            <SlantButton primary accent="#ff4a3a" onClick={storyRetry}>RÉESSAYER</SlantButton>
            <SlantButton onClick={storyQuit}>MENU</SlantButton>
          </div>
        </div>
      </div>
    </Screen>
  );
}

function EndingView() {
  const st = useStory();
  const ending = ENDINGS[st.hero];
  const unlockedName = st.unlockedByEnding ? getCharacter(st.unlockedByEnding).name : null;
  const accent = accentOf(st.hero);
  return (
    <Screen accent={accent}>
      <div className="absolute inset-0 grid grid-cols-[1fr_1.2fr]">
        <div className="relative">
          <div className="anim-left absolute inset-y-[6%] left-[4%] right-0">
            <Portrait big contain id={st.hero} className="h-full w-full" />
          </div>
        </div>
        <div className="flex flex-col items-start justify-center gap-5 px-6 pr-10">
          <div className="text-xs tracking-[0.5em]" style={{ color: accent }}>{getCharacter(st.hero).name} · FIN</div>
          <h1 className="anim-pop font-display text-5xl italic leading-none text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.8)] sm:text-7xl">{ending?.title ?? 'FIN'}</h1>
          <p className="anim-up max-w-xl text-lg leading-relaxed text-white/85" style={{ animationDelay: '300ms' }}>{ending?.text}</p>
          <p className="anim-up max-w-xl leading-relaxed text-white/60" style={{ animationDelay: '500ms' }}>{BOSS_DEFEATED}</p>
          {unlockedName ? (
            <p className="anim-up border-l-4 pl-3 font-display tracking-widest" style={{ borderColor: accent, color: accent, animationDelay: '700ms' }}>NOUVEAU COMBATTANT : {unlockedName}</p>
          ) : (
            <p className="text-white/50">Tous les combattants sont déjà débloqués.</p>
          )}
          <div className="flex gap-3">
            <SlantButton onClick={storyOpen}>CHOISIR UN HÉROS</SlantButton>
            <SlantButton primary accent={accent} onClick={storyQuit}>MENU</SlantButton>
          </div>
        </div>
      </div>
    </Screen>
  );
}

/** Écrans hors combat du mode histoire. */
export function StoryScreen() {
  const phase = useStory((s) => s.phase);
  switch (phase) {
    case 'dialogue':
      return <DialogueView />;
    case 'lost':
      return <LostView />;
    case 'ending':
      return <EndingView />;
    default:
      return <SelectView />;
  }
}
