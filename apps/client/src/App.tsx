import { useEffect } from 'react';
import { Scene } from './game/Scene';
import { backToMenu, useApp } from './game/store';
import { Hud } from './game/ui/Hud';
import { Menu } from './game/ui/Menu';

export function App() {
  const screen = useApp((s) => s.screen);
  const runId = useApp((s) => s.runId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useApp.getState().screen === 'fight') backToMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (screen === 'menu') return <div className="h-full w-full bg-iron-bg"><Menu /></div>;
  return (
    <div className="relative h-full w-full">
      <Scene key={runId} />
      <Hud />
    </div>
  );
}
