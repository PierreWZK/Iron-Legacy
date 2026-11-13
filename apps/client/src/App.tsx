import { lazy, Suspense, useEffect } from 'react';
import { StoryScreen } from './game/ui/StoryScreens';
import { onlineLeave } from './game/online/session';
import { OnlineScreen } from './game/ui/OnlineScreens';
import { AccountScreen } from './game/ui/AccountScreens';
import { RobotScreen } from './game/ui/RobotScreens';
import { ArcadeScreen } from './game/ui/ArcadeScreens';
import { SettingsScreen } from './game/ui/Settings';
import { Hud } from './game/ui/Hud';
import { Menu } from './game/ui/Menu';
import { Screen } from './game/ui/kit';
import { SelectScreen } from './game/ui/SelectScreens';
import { VsScreen } from './game/ui/VsScreen';
import { selectBack } from './game/select';
import { escapePressed } from './game/ui/PauseMenu';
import { quitFight } from './game/quit';
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
        escapePressed();
      } else if (current === 'vs') {
        quitFight();
      } else if (current === 'select') {
        selectBack();
      } else if (current === 'account' || current === 'settings') {
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
  if (screen === 'select') return <div className="h-full w-full bg-iron-bg"><SelectScreen /></div>;
  if (screen === 'vs') return <div className="h-full w-full bg-iron-bg"><VsScreen /></div>;
  if (screen === 'arcade') return <Screen><ArcadeScreen /></Screen>;
  if (screen === 'story') return <div className="h-full w-full bg-iron-bg"><StoryScreen /></div>;
  if (screen === 'robots') return <Screen><RobotScreen /></Screen>;
  if (screen === 'account') return <Screen><AccountScreen /></Screen>;
  if (screen === 'settings') return <Screen><SettingsScreen /></Screen>;
  if (screen === 'online') return <Screen><OnlineScreen /></Screen>;
  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<div className="h-full w-full bg-iron-bg" />}>
        <Scene key={runId} />
      </Suspense>
      <Hud />
    </div>
  );
}
