import { create } from 'zustand';
import { getCharacter, storyLevel, storyOpponents, STORY_LENGTH } from '@iron/engine';
import { runtime } from '../runtime';
import { backToMenu, toFight, useApp } from '../store';
import { nextLocked, unlockCharacter, useProgress } from '../progress';
import { chapterScript, type Line } from './text';

export type StoryPhase = 'select' | 'dialogue' | 'lost' | 'ending';

/** Avancement d'un personnage : `chapter` = prochain chapitre à jouer (0-based), `done` = histoire terminée. */
export interface StoryProgress {
  chapter: number;
  done: boolean;
}

const KEY = 'iron-legacy.story';

function loadProgress(): Record<string, StoryProgress> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? (data as Record<string, StoryProgress>) : {};
  } catch {
    return {};
  }
}

function saveProgress(p: Record<string, StoryProgress>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Stockage indisponible : la progression vaut pour la session seulement.
  }
}

export interface StoryState {
  /** Une histoire est en cours (dialogue ou combat). */
  active: boolean;
  phase: StoryPhase;
  hero: string;
  /** Adversaire du chapitre en cours. */
  opponent: string;
  chapter: number;
  lines: Line[];
  lineIndex: number;
  progress: Record<string, StoryProgress>;
  /** Personnage débloqué par la dernière fin, pour l'écran de fin. */
  unlockedByEnding: string | null;
}

export const useStory = create<StoryState>(() => ({
  active: false,
  phase: 'select',
  hero: 'kairo',
  opponent: 'vera',
  chapter: 0,
  lines: [],
  lineIndex: 0,
  progress: loadProgress(),
  unlockedByEnding: null,
}));

/** Ouvre l'écran de sélection de l'histoire. */
export function storyOpen(): void {
  useStory.setState({ active: false, phase: 'select', progress: loadProgress(), unlockedByEnding: null });
  useApp.setState({ screen: 'story' });
}

/** Lance (ou reprend) l'histoire d'un personnage débloqué. Une histoire terminée repart du chapitre 1. */
export function storyChoose(hero: string): void {
  if (!useProgress.getState().unlocked.includes(hero)) return;
  const p = useStory.getState().progress[hero];
  const chapter = p && !p.done ? p.chapter : 0;
  showChapter(hero, chapter);
}

function showChapter(hero: string, chapter: number): void {
  const opp = storyOpponents(hero)[chapter]!;
  const lines = chapterScript(hero, chapter, opp, getCharacter(opp).name);
  useStory.setState({ active: true, phase: 'dialogue', hero, opponent: opp, chapter, lines, lineIndex: 0, unlockedByEnding: null });
  useApp.setState({ screen: 'story' });
}

/** Passe à la ligne suivante, puis lance le combat quand le dialogue est lu. */
export function storyNextLine(): void {
  const st = useStory.getState();
  if (st.lineIndex < st.lines.length - 1) {
    useStory.setState({ lineIndex: st.lineIndex + 1 });
    return;
  }
  launchChapter();
}

function launchChapter(): void {
  const { hero, chapter } = useStory.getState();
  const opp = storyOpponents(hero)[chapter]!;
  runtime.start({ p1: hero, p2: opp, mode: 'ai', level: storyLevel(chapter), dummy: 'idle' });
  useStory.setState({ phase: 'dialogue' });
  toFight(`HISTOIRE · CHAPITRE ${chapter + 1}`);
}

/** Rejoue le chapitre où l'on a perdu. */
export function storyRetry(): void {
  const { hero } = useStory.getState();
  storyChoose(hero);
}

/** Abandonne l'histoire en cours et revient au menu. La progression sauvegardée est conservée. */
export function storyQuit(): void {
  useStory.setState({ active: false, phase: 'select' });
  backToMenu();
}

/**
 * Appelée après la fin d'un combat d'histoire : chapitre suivant, défaite, ou fin du personnage
 * (ce qui débloque le personnage suivant dans l'ordre).
 */
export function storyFightOver(): void {
  const st = useStory.getState();
  if (!st.active || useApp.getState().screen !== 'fight') return;
  const w = runtime.world;
  if (!w) return;
  if (w.match.matchWinner !== 0) {
    useStory.setState({ active: false, phase: 'lost' });
    useApp.setState({ screen: 'story' });
    return;
  }
  const next = st.chapter + 1;
  const progress = { ...st.progress };
  if (next < STORY_LENGTH) {
    progress[st.hero] = { chapter: next, done: false };
    saveProgress(progress);
    useStory.setState({ progress });
    showChapter(st.hero, next);
    return;
  }
  progress[st.hero] = { chapter: STORY_LENGTH, done: true };
  saveProgress(progress);
  const unlock = nextLocked();
  if (unlock) unlockCharacter(unlock);
  useStory.setState({
    active: false,
    phase: 'ending',
    progress,
    unlockedByEnding: unlock,
  });
  useApp.setState({ screen: 'story' });
}

/** Nombre de chapitres terminés pour l'affichage de la sélection (0 à 8). */
export function storyPercent(hero: string, progress: Record<string, StoryProgress>): number {
  const p = progress[hero];
  if (!p) return 0;
  return p.done ? STORY_LENGTH : p.chapter;
}


// Accès de test (mode dev uniquement) : permet de vérifier l'enchaînement des chapitres sans jouer chaque combat.
if (import.meta.env.DEV) {
  (window as unknown as { __story: unknown }).__story = { useStory, storyFightOver, storyChoose, storyNextLine };
}
