import { Scene } from './game/Scene';
import { Hud } from './game/ui/Hud';

export function App() {
  return (
    <div className="relative h-full w-full">
      <Scene />
      <Hud />
    </div>
  );
}
