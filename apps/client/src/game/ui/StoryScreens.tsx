import { CHARACTER_IDS, getCharacter, STORY_LENGTH } from '@iron/engine';
import type { ReactNode } from 'react';
import { ENDINGS, BOSS_DEFEATED } from '../story/text';
import {
  storyChoose, storyNextLine, storyPercent, storyOpen, storyQuit, storyRetry, useStory,
} from '../story/session';
import { useProgress } from '../progress';

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

/** Sélection du héros : personnages débloqués, avancement, bouton pour lancer ou reprendre. */
function SelectView() {
  const unlocked = useProgress((s) => s.unlocked);
  const progress = useStory((s) => s.progress);
  return (
    <Frame title="HISTOIRE">
      <p className="max-w-2xl text-sm text-white/70">
        Huit chapitres par personnage, le dernier contre TITAN-01. Terminer l'histoire d'un personnage débloque le suivant.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CHARACTER_IDS.map((id) => {
          const c = getCharacter(id);
          const locked = !unlocked.includes(id);
          const done = progress[id]?.done === true;
          const pct = storyPercent(id, progress);
          return (
            <button
              key={id}
              type="button"
              disabled={locked}
              onClick={() => storyChoose(id)}
              className={`border px-4 py-3 text-left ${locked ? 'cursor-not-allowed border-white/10 bg-black/60 text-white/30' : 'border-white/20 bg-black/40 hover:border-iron-amber'}`}
            >
              <div className="tracking-widest">{locked ? '???' : c.name}</div>
              <div className="text-xs text-white/60">
                {locked ? 'Verrouillé : terminer une histoire' : done ? 'Histoire terminée' : `Chapitre ${pct + 1} / ${STORY_LENGTH}`}
              </div>
            </button>
          );
        })}
      </div>
      <div>
        <Button onClick={storyQuit}>MENU</Button>
      </div>
    </Frame>
  );
}

/** Dialogue avant un combat. */
function DialogueView() {
  const st = useStory();
  const line = st.lines[st.lineIndex] ?? '';
  const hero = getCharacter(st.hero);
  const last = st.lineIndex >= st.lines.length - 1;
  return (
    <Frame title={`${hero.name} · CHAPITRE ${st.chapter + 1} / ${STORY_LENGTH}`}>
      <div className="min-h-40 max-w-3xl border border-white/15 bg-black/50 p-6 text-lg leading-relaxed text-white/90">
        {line}
      </div>
      <div className="flex gap-3">
        <Button primary onClick={storyNextLine}>{last ? 'COMBATTRE' : 'SUIVANT'}</Button>
        <Button onClick={storyQuit}>ABANDONNER</Button>
      </div>
    </Frame>
  );
}

function LostView() {
  const st = useStory();
  return (
    <Frame title="DÉFAITE">
      <p className="text-white/80">Le chapitre {st.chapter + 1} n'est pas validé. Tu peux le reprendre.</p>
      <div className="flex gap-3">
        <Button primary onClick={storyRetry}>RÉESSAYER LE CHAPITRE</Button>
        <Button onClick={storyQuit}>MENU</Button>
      </div>
    </Frame>
  );
}

function EndingView() {
  const st = useStory();
  const ending = ENDINGS[st.hero];
  const unlockedName = st.unlockedByEnding ? getCharacter(st.unlockedByEnding).name : null;
  return (
    <Frame title={ending?.title ?? 'FIN'}>
      <p className="max-w-2xl leading-relaxed text-white/85">{ending?.text}</p>
      <p className="max-w-2xl leading-relaxed text-iron-amber/90">{BOSS_DEFEATED}</p>
      {unlockedName ? (
        <p className="text-iron-cyan">Nouveau combattant débloqué : {unlockedName}</p>
      ) : (
        <p className="text-white/60">Tous les combattants sont déjà débloqués.</p>
      )}
      <div className="flex gap-3">
        <Button onClick={storyOpen}>CHOISIR UN HÉROS</Button>
        <Button primary onClick={storyQuit}>MENU</Button>
      </div>
    </Frame>
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
