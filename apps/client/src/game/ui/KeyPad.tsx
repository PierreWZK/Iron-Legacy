import { useEffect, useState } from 'react';
import { keyLabel, useBindings, type Action, ACTION_LABELS } from '../input/bindings';

/** Touches du clavier enfoncées en ce moment, affichées en bas à droite (PC uniquement). */
export function KeyPad() {
  const bindings = useBindings((s) => s.bindings);
  const [down, setDown] = useState<Set<string>>(new Set());
  useEffect(() => {
    const add = (e: KeyboardEvent) => setDown((s) => (s.has(e.key.toLowerCase()) ? s : new Set(s).add(e.key.toLowerCase())));
    const del = (e: KeyboardEvent) => setDown((s) => {
      const n = new Set(s);
      n.delete(e.key.toLowerCase());
      return n;
    });
    const clear = (): void => setDown(new Set());
    window.addEventListener('keydown', add);
    window.addEventListener('keyup', del);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', add);
      window.removeEventListener('keyup', del);
      window.removeEventListener('blur', clear);
    };
  }, []);
  const active = (Object.keys(bindings) as Action[]).filter((a) => bindings[a].some((k) => down.has(k)));
  return (
    <div className="pointer-events-none absolute bottom-3 right-4 flex flex-col items-end gap-1">
      {(
        <div className="flex flex-wrap justify-end gap-1">
          {active.map((a) => (
            <span key={a} className="rounded border border-iron-amber bg-iron-amber/30 px-2 py-0.5 font-display text-[10px] tracking-widest text-white">
              {keyLabel(bindings[a][0])} {ACTION_LABELS[a]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
