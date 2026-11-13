import { useEffect, useState } from 'react';
import { visualFor } from '../render/visuals';

/** Couleur d'accent d'un personnage en CSS (#rrggbb). */
export function accentOf(id: string): string {
  return `#${visualFor(id).accent.toString(16).padStart(6, '0')}`;
}

/** Portrait 3D en buste (rendu par le même rig que le combat), chargé à la demande. */
export function Portrait({ id, className = '', dim = false, big = false, contain = false }: { id: string; className?: string; dim?: boolean; big?: boolean; contain?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setSrc(null);
    void import('../render/portraits').then((m) => m.getPortrait(id, big ? m.PORTRAIT_BIG : undefined)).then((u) => {
      if (live) setSrc(u || null);
    });
    return () => {
      live = false;
    };
  }, [id, big]);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {src ? (
        <img src={src} alt="" draggable={false} className={`h-full w-full ${contain ? 'object-contain object-bottom' : 'object-cover object-top'} transition-opacity duration-300 ${dim ? 'opacity-30 grayscale' : ''}`} />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-white/5" />
      )}
    </div>
  );
}
