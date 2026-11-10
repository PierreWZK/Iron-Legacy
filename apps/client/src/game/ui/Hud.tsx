import { t } from '../../i18n/fr';
import { useDebug } from '../store';

function HealthBar({ value, align, color }: { value: number; align: 'left' | 'right'; color: string }) {
  return (
    <div className="h-4 w-full overflow-hidden border border-white/30 bg-black/60 skew-x-[-18deg]">
      <div
        className={`h-full ${align === 'right' ? 'ml-auto' : ''}`}
        style={{ width: `${Math.max(0, value)}%`, background: color }}
      />
    </div>
  );
}

export function Hud() {
  const d = useDebug();
  return (
    <div className="pointer-events-none absolute inset-0 font-display text-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 pt-5">
        <HealthBar value={d.health[0]} align="right" color="#34e0ff" />
        <div className="shrink-0 tracking-[0.35em] text-iron-amber">{t.title}</div>
        <HealthBar value={d.health[1]} align="left" color="#ff4a3a" />
      </div>

      <div className="absolute bottom-4 left-4 w-80 space-y-1 bg-black/55 p-3 text-xs leading-relaxed text-white/80">
        <div className="mb-1 tracking-widest text-iron-cyan">{t.controls.heading}</div>
        <div>{t.controls.move}</div>
        <div>{t.controls.jump}</div>
        <div>{t.controls.shift}</div>
        <div>{t.controls.crouch}</div>
        <div>{t.controls.dummy}</div>
        <div>{t.controls.reset}</div>
      </div>

      <div className="absolute right-4 top-16 min-w-48 bg-black/55 p-3 text-xs tabular-nums text-white/80">
        <div className="mb-1 tracking-widest text-iron-amber">{t.subtitle}</div>
        <div>{t.debug.fps} : {d.fps}</div>
        <div>{t.debug.tick} : {d.tick}</div>
        <div>{t.debug.state} : {d.action}</div>
        <div>{t.debug.distance} : {d.distance.toFixed(2)} m</div>
        <div>{t.debug.dummy} : {t.dummyModes[d.dummy]}</div>
      </div>
    </div>
  );
}
