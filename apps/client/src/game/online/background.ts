/**
 * Horloge de secours pour un onglet caché : le navigateur suspend requestAnimationFrame (donc la boucle de
 * rendu), mais le combat en ligne continue sur le serveur. Les minuteurs d'un Worker ne sont pas suspendus
 * (ou bien moins ralentis que ceux de la page) : ils font avancer la simulation tant que l'onglet est caché.
 */
const WORKER_SRC = 'let id=null;onmessage=(e)=>{clearInterval(id);id=e.data?setInterval(()=>postMessage(0),1000/60):null;};';

/** Appelle `tick(delta)` (en secondes) environ 60 fois par seconde tant que la page est cachée. Renvoie l'arrêt. */
export function whileHidden(tick: (delta: number) => void): () => void {
  let worker: Worker | null = null;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
  } catch {
    return () => {};
  }
  let last = performance.now();
  worker.onmessage = () => {
    const now = performance.now();
    const delta = (now - last) / 1000;
    last = now;
    if (document.hidden) tick(delta);
  };
  const sync = () => {
    last = performance.now();
    worker!.postMessage(document.hidden);
  };
  document.addEventListener('visibilitychange', sync);
  sync();
  return () => {
    document.removeEventListener('visibilitychange', sync);
    worker!.terminate();
  };
}
