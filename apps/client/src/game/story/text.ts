/** Textes de l'histoire (FR). Écrits sans pronoms de personne (genre non fixé) ; à réécrire avec toi. */

/** Accroche de chaque chapitre ; `{opp}` = nom de l'adversaire. */
export const CHAPTER_HOOKS: readonly string[] = [
  "{opp} attend à l'entrée de la ville. Pas un mot, juste la garde levée.",
  "On raconte que {opp} a déjà vaincu trois membres du tournoi. La raison reste à découvrir.",
  "Le tournoi avance. {opp} ne combat que pour un contrat, et le tien est sur la liste.",
  "{opp} attend au laboratoire de HELIX. Les combats précédents ont été analysés.",
  "{opp} faisait partie de la même équipe, avant. Le souvenir n'a pas disparu.",
  "Plus le tournoi avance, plus les signaux de TITAN-01 se renforcent dans la ville.",
  "{opp} est le dernier rempart avant le boss. Rien à perdre, tout à défendre.",
  "La forteresse s'ouvre. TITAN-01 attend au centre de l'arène.",
];

/** Présentation du héros, lue avant le premier combat. */
export const INTROS: Record<string, [string, string]> = {
  kairo: ['Un dojo fermé par HELIX, des élèves dispersés. KAIRO veut les retrouver.', 'Le tournoi est le seul endroit où les rumeurs se rencontrent.'],
  vera: ['Les ateliers de HELIX, VERA les connaît par cœur.', "Le tournoi pourrait faire fermer les usines. C'est le plan."],
  wolf: ['La meute a été capturée par les ouvriers de HELIX. LOUP suit leur piste.', 'La piste mène au tournoi.'],
  fox: ['Une embuscade a laissé RENARD pour mort. Il a disparu sans laisser de trace.', 'Le retour se prépare dans les clairières.'],
  bull: ['Les arènes clandestines ont été rachetées par HELIX. TAUREAU veut son nom en retour.', 'Le sable du tournoi garde les traces de tous les combats.'],
  stag: ['La forêt de montagne doit être rasée par HELIX. CERF garde la forêt.', 'Le tournoi est une occasion de faire entendre la menace.'],
  husky: ['L\'équipe de traîneau n\'est jamais arrivée au bout de la toundra. HUSKY cherche la fin de ce chemin.', 'Le tournoi semble être le dernier endroit où la trace s\'arrête.'],
  robot: ['ROBOT a quitté le laboratoire. Son origine reste à prouver.', 'Le tournoi est l\'endroit où les réponses se trouvent.'],
  shin: ['Le clan de SHIN a été effacé par HELIX. Un seul nom reste à porter.', 'Le tournoi est la dernière chance de faire savoir ce qui s\'est passé.'],
  brutus: ['HELIX a utilisé BRUTUS comme cobaye. La force est restée, les souvenirs non.', 'Le tournoi est le seul endroit où le passé peut ressurgir.'],
  akira: ['AKIRA n\'a jamais frappé pour blesser. HELIX a voulu s\'en servir.', 'Le tournoi est la scène où mettre fin à leur projet, sans coup inutile.'],
  nyx: ['NYX attend toujours que l\'adversaire frappe en premier.', 'Au tournoi, une seule réponse suffit.'],
};

/** Fin de chaque personnage (vainqueur du boss). */
export const ENDINGS: Record<string, { title: string; text: string }> = {
  kairo: { title: 'Le dojo rouvre', text: 'Dans un dojo fermé depuis des années, une lampe est rallumée. Le premier geste qui ne dépend plus de HELIX vient d\'être fait.' },
  vera: { title: 'Les ateliers se taisent', text: 'Les usines de HELIX traversées une à une. Les chaînes s\'arrêtent, les ouvriers rentrent chez eux.' },
  wolf: { title: 'La meute revient', text: 'Dans la forêt, la meute se retrouve. Elle ne s\'était jamais vraiment dispersée.' },
  fox: { title: 'Le piège se referme', text: 'Les clairières ont retenu le souvenir de l\'embuscade. Cette fois, les poursuivants tombent.' },
  bull: { title: 'Le nom retrouvé', text: 'Ceux que HELIX avait numérotés retrouvent leur nom. Le sable garde la trace du tournoi.' },
  stag: { title: 'La forêt est sauve', text: 'La montagne reste debout. HELIX ne rasera plus la forêt.' },
  husky: { title: 'Le chemin continue', text: 'La route de la toundra reprend, et cette fois l\'équipe est là pour la suivre.' },
  robot: { title: 'Sa propre voix', text: 'Le signal qui contrôlait ROBOT est coupé. Ce qu\'il devient se décide sans HELIX.' },
  shin: { title: 'Le clan renaît', text: 'Le nom du clan est gravé sur un toit de la ville. Quelqu\'un le lira.' },
  brutus: { title: 'Mémoire retrouvée', text: 'Les souvenirs reviennent : le ring, les noms, la vie d\'avant HELIX.' },
  akira: { title: 'Le judo gagne', text: 'Le laboratoire tombe sans un coup porté. Seule la force de l\'adversaire a fini par le faire tomber.' },
  nyx: { title: 'Le dernier contre', text: 'TITAN-01 frappe. Une seule réponse suffit, et elle est juste.' },
};

export const BOSS_DEFEATED =
  "TITAN-01 s'effondre. Son signal s'éteint et les tours de HELIX perdent leur lumière. Le tournoi est terminé.";

/** Lignes de dialogue d'un chapitre : présentation (ch. 1 seulement), puis accroche. */
export function chapterLines(hero: string, chapter: number, opponentName: string): string[] {
  const hook = (CHAPTER_HOOKS[chapter] ?? '').replace('{opp}', opponentName);
  const lines = chapter === 0 ? [...(INTROS[hero] ?? [])] : [];
  lines.push(`Chapitre ${chapter + 1} / 8 : ${opponentName}`);
  lines.push(hook);
  return lines;
}
