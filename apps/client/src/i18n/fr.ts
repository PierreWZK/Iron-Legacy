/** Textes de l'interface (FR). Ajouter `en.ts` plus tard sans toucher aux composants. */
export const fr = {
  title: 'IRON LEGACY',
  subtitle: 'Prototype — phase 1',
  controls: {
    heading: 'Commandes',
    move: 'Z / S : pas de côté (profondeur) — Q / D : avancer / reculer',
    jump: 'Espace : saut',
    shift: 'Maj + direction : course / pas de côté rapide',
    crouch: 'C : s\'accroupir',
    dummy: 'T : adversaire immobile / en patrouille',
    reset: 'Entrée : réinitialiser les positions',
  },
  debug: { state: 'État', distance: 'Distance', tick: 'Tick', fps: 'FPS', dummy: 'Adversaire' },
  dummyModes: { idle: 'immobile', patrol: 'patrouille' },
} as const;

export const t = fr;
