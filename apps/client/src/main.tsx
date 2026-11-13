import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Nouvelle version déployée pendant que l'onglet était ouvert : un fichier de la scène n'existe plus.
// On recharge la page une fois (pas en boucle) pour récupérer la nouvelle version.
window.addEventListener('vite:preloadError', (e) => {
  try {
    const last = Number(sessionStorage.getItem('iron-legacy.reload') ?? 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem('iron-legacy.reload', String(Date.now()));
  } catch {
    /* stockage indisponible : on recharge quand même */
  }
  e.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
