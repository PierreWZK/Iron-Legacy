import { arcadeQuit, useArcade } from './arcade/session';
import { onlineLeave } from './online/session';
import { robotsQuit, useRobots } from './robots/session';
import { runtime } from './runtime';
import { backToMenu } from './store';
import { storyQuit, useStory } from './story/session';

/** Quitte le combat en cours en suivant le mode (arcade, histoire, robots, en ligne ou combat simple). */
export function quitFight(): void {
  runtime.paused = false;
  if (useArcade.getState().active) arcadeQuit();
  else if (useStory.getState().active) storyQuit();
  else if (useRobots.getState().active) robotsQuit();
  else if (runtime.online) onlineLeave();
  else backToMenu();
}
