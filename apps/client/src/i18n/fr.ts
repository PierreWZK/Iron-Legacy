/** Textes de l'interface (FR). Ajouter `en.ts` plus tard sans toucher aux composants. */
export const fr = {
  title: 'IRON LEGACY',
  subtitle: 'Prototype — personnages en 3D',
  menu: {
    mode: 'Mode',
    ai: 'Combat contre IA',
    training: 'Entraînement',
    fighter: 'Votre combattant',
    opponent: 'Adversaire',
    level: 'Niveau de l\'IA',
    dummy: 'Mannequin',
    start: 'COMBATTRE',
    dummyModes: { idle: 'Immobile', block: 'Bloque', attack: 'Attaque', patrol: 'Patrouille' } as Record<string, string>,
  },
  controls: {
    heading: 'Commandes',
    lines: [
      'D : avancer · Q : reculer · Z / S : pas de côté (flèches aussi)',
      'A / E : poing gauche / droit · R / F : pied gauche / droit',
      'Direction + bouton = coup différent : avant, arrière, C (accroupi), C + avant',
      'Ex. : C + R = balayette · C + F = balayage · avant + F = coup de hache',
      'Maj + avant (course) puis un bouton : charge ou coup volant',
      'Deux boutons ensemble : projection (A+E, A+R, E+F, R+F)',
      'Arrière + A : parade · Maj + côté ou arrière : esquive · Espace : saut',
      'Enchaîner : bouton suivant pendant la récupération du coup',
      'Échap : menu · Entrée : recommencer · T mannequin · I vie infinie',
    ],
  },
  hud: {
    round: 'ROUND',
    ko: 'K.O.',
    time: 'TEMPS ÉCOULÉ',
    draw: 'ÉGALITÉ',
    victory: 'VICTOIRE',
    defeat: 'DÉFAITE',
    rematch: 'Rejouer',
    menu: 'Menu',
    combo: 'COMBO',
    counter: 'CONTRE !',
    infinite: 'VIE INFINIE',
  },
  debug: {
    fps: 'FPS',
    tick: 'Tick',
    state: 'État',
    distance: 'Distance',
    move: 'Coup',
    frame: 'Frame',
    dummy: 'Mannequin',
  },
} as const;

export const t = fr;
