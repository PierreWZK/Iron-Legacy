import { lazy, Suspense, useEffect } from 'react';
import { runtime } from './game/runtime';
import { arcadeQuit, useArcade } from './game/arcade/session';
import { storyQuit, useStory } from './game/story/session';
import { StoryScreen } from './game/ui/StoryScreens';
import { robotsQuit, useRobots } from './game/robots/session';
import { onlineLeave } from './game/online/session';
import { OnlineScreen } from './game/ui/OnlineScreens';
import { AccountScreen } from './game/ui/AccountScreens';
import { RobotScreen } from './game/ui/RobotScreens';
import { ArcadeScreen } from './game/ui/ArcadeScreens';
import { Hud } from './game/ui/Hud';
import { Menu } from './game/ui/Menu';
import { backToMenu, useApp } from './game/store';

/** Scène 3D chargée à la demande : three.js n'est pas téléchargé pour le menu. */
const Scene = lazy(() => import('./game/Scene').then((m) => ({ default: m.Scene })));

export function App() {
  const screen = useApp((s) => s.screen);
  const runId = useApp((s) => s.runId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const current = useApp.getState().screen;
      if (current === 'fight') {
        if (useArcade.getState().active) arcadeQuit();
        else if (useStory.getState().active) storyQuit();
        else if (useRobots.getState().active) robotsQuit();
        else if (runtime.online) onlineLeave();
        else backToMenu();
      } else if (current === 'account') {
        backToMenu();
      } else if (current === 'online') {
        onlineLeave();
      } else if (current === 'robots') {
        backToMenu();
      } else if (current === 'story') {
        backToMenu();
      } else if (current === 'arcade') {
        backToMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (screen === 'menu') return <div className="h-full w-full bg-iron-bg"><Menu /></div>;
  if (screen === 'arcade') return <div className="h-full w-full bg-iron-bg"><ArcadeScreen /></div>;
  if (screen === 'story') return <div className="h-full w-full bg-iron-bg"><StoryScreen /></div>;
  if (screen === 'robots') return <div className="h-full w-full bg-iron-bg"><RobotScreen /></div>;
  if (screen === 'account') return <div className="h-full w-full bg-iron-bg"><AccountScreen /></div>;
  if (screen === 'online') return <div className="h-full w-full bg-iron-bg"><OnlineScreen /></div>;
  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<div className="h-full w-full bg-iron-bg" />}>
        <Scene key={runId} />
      </Suspense>
      <Hud />
    </div>
  );
}
