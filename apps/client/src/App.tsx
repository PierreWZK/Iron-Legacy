import { useEffect } from 'react';
import { arcadeQuit, useArcade } from './game/arcade/session';
import { storyQuit, useStory } from './game/story/session';
import { StoryScreen } from './game/ui/StoryScreens';
import { robotsQuit, useRobots } from './game/robots/session';
import { RobotScreen } from './game/ui/RobotScreens';
import { Scene } from './game/Scene';
import { ArcadeScreen } from './game/ui/ArcadeScreens';
import { Hud } from './game/ui/Hud';
import { Menu } from './game/ui/Menu';
import { backToMenu, useApp } from './game/store';

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
        else backToMenu();
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
  return (
    <div className="relative h-full w-full">
      <Scene key={runId} />
      <Hud />
    </div>
  );
}
