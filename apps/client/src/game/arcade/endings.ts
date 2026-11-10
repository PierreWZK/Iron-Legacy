/** Textes de fin par personnage (vainqueur du boss). Placeholders en texte : les cinématiques viendront plus tard. */
export const ENDINGS: Record<string, { title: string; text: string }> = {
  kairo: {
    title: 'Le dojo rouvre ses portes',
    text: "KAIRO quitte l'arène. Dans un dojo fermé depuis des années, quelqu'un rallume une lampe. HELIX n'est pas tombé, mais le premier geste qui ne lui appartient plus vient d'être fait.",
  },
  vera: {
    title: 'Les usines se taisent',
    text: "VERA traverse les ateliers où l'on fabriquait les combattants. Les chaînes s'arrêtent une à une. Elle ne sait pas encore qui allumera la suite, mais elle sait qui ne le fera plus.",
  },
};

export const BOSS_DEFEATED =
  "TITAN-01 s'effondre. Son signal s'éteint et les tours de HELIX perdent leur lumière. Le tournoi est terminé ; la légende commence.";
