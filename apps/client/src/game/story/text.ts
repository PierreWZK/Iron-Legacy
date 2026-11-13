/** Textes de l'histoire (FR). Écrits sans pronoms de personne (genre non fixé) ; à réécrire avec toi. */

/** Accroche de chaque chapitre ; `{opp}` = nom de l'adversaire. */
export const CHAPTER_HOOKS: readonly string[] = [
  "{opp} attend à l'entrée de la ville. Pas un mot, juste la garde levée.",
  'On raconte que {opp} a déjà vaincu trois membres du tournoi. La raison reste à découvrir.',
  'Le tournoi avance. {opp} ne combat que pour un contrat, et le tien est sur la liste.',
  "{opp} attend au laboratoire de HELIX. Les combats précédents ont été analysés.",
  '{opp} faisait partie de la même équipe, avant. Le souvenir n\'a pas disparu.',
  'Plus le tournoi avance, plus les signaux de TITAN-01 se renforcent dans la ville.',
  '{opp} est le dernier rempart avant le boss. Rien à perdre, tout à défendre.',
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
  husky: ["L'équipe de traîneau n'est jamais arrivée au bout de la toundra. HUSKY cherche la fin de ce chemin.", "Le tournoi semble être le dernier endroit où la trace s'arrête."],
  robot: ["ROBOT a quitté le laboratoire. Son origine reste à prouver.", "Le tournoi est l'endroit où les réponses se trouvent."],
  shin: ['Le clan de SHIN a été effacé par HELIX. Un seul nom reste à porter.', "Le tournoi est la dernière chance de faire savoir ce qui s'est passé."],
  brutus: ['HELIX a utilisé BRUTUS comme cobaye. La force est restée, les souvenirs non.', 'Le tournoi est le seul endroit où le passé peut ressurgir.'],
  akira: ["AKIRA n'a jamais frappé pour blesser. HELIX a voulu s'en servir.", 'Le tournoi est la scène où mettre fin à leur projet, sans coup inutile.'],
  nyx: ["NYX attend toujours que l'adversaire frappe en premier.", 'Au tournoi, une seule réponse suffit.'],
};

/** Fin de chaque personnage (vainqueur du boss). */
export const ENDINGS: Record<string, { title: string; text: string }> = {
  kairo: { title: 'Le dojo rouvre', text: "Dans un dojo fermé depuis des années, une lampe est rallumée. Le premier geste qui ne dépend plus de HELIX vient d'être fait." },
  vera: { title: 'Les ateliers se taisent', text: 'Les usines de HELIX traversées une à une. Les chaînes s\'arrêtent, les ouvriers rentrent chez eux.' },
  wolf: { title: 'La meute revient', text: "Dans la forêt, la meute se retrouve. Elle ne s'était jamais vraiment dispersée." },
  fox: { title: 'Le piège se referme', text: "Les clairières ont retenu le souvenir de l'embuscade. Cette fois, les poursuivants tombent." },
  bull: { title: 'Le nom retrouvé', text: 'Ceux que HELIX avait numérotés retrouvent leur nom. Le sable garde la trace du tournoi.' },
  stag: { title: 'La forêt est sauve', text: 'La montagne reste debout. HELIX ne rasera plus la forêt.' },
  husky: { title: 'Le chemin continue', text: "La route de la toundra reprend, et cette fois l'équipe est là pour la suivre." },
  robot: { title: 'Sa propre voix', text: 'Le signal qui contrôlait ROBOT est coupé. Ce qu\'il devient se décide sans HELIX.' },
  shin: { title: 'Le clan renaît', text: 'Le nom du clan est gravé sur un toit de la ville. Quelqu\'un le lira.' },
  brutus: { title: 'Mémoire retrouvée', text: "Les souvenirs reviennent : le ring, les noms, la vie d'avant HELIX." },
  akira: { title: 'Le judo gagne', text: "Le laboratoire tombe sans un coup porté. Seule la force de l'adversaire a fini par le faire tomber." },
  nyx: { title: 'Le dernier contre', text: "TITAN-01 frappe. Une seule réponse suffit, et elle est juste." },
};

export const BOSS_DEFEATED =
  "TITAN-01 s'effondre. Son signal s'éteint et les tours de HELIX perdent leur lumière. Le tournoi est terminé.";

/** Une réplique : qui parle (le héros, l'adversaire ou le narrateur) et ce qui est dit. */
export interface Line {
  who: 'hero' | 'opp' | 'narr';
  text: string;
}

/** Ce que chaque combattant dit quand il fait face au héros (une réplique par chapitre, en boucle). */
export const OPP_LINES: Record<string, string[]> = {
  kairo: ["Mon dojo n'a pas fermé, il s'est déplacé. Ici.", "Garde haute, respiration lente. Je t'écoute.", "Le karaté n'est pas une arme. C'est une réponse."],
  vera: ['Tu es en retard. Les ouvriers, eux, étaient à l\'heure.', "J'ai monté ces ateliers pièce par pièce. Je les démonterai de même.", 'Un direct, un crochet, et tu comprendras.'],
  wolf: ["La meute observe depuis les arbres. Elle n'aime pas ton odeur.", 'Je flaire la peur sous ton calme.', "On ne m'arrête pas. On m'esquive, au mieux."],
  fox: ['Tu me cherches ? Regarde derrière toi.', 'Rien de ce que tu vois n\'est là où tu le crois.', 'Un piège bien tendu se fait toujours en souriant.'],
  bull: ['Le sable se souvient de chaque combat. Du tien aussi.', 'Je ne recule pas. Je ne sais pas faire.', 'Viens. Que la foule entende le bruit.'],
  stag: ['Ces sommets ont vu plus de tempêtes que toi.', 'Je garde la forêt. Passe-moi d\'abord.', 'Le silence avant le choc est ma meilleure arme.'],
  husky: ['Encore trois cents kilomètres, et je suis arrivé. Écarte-toi.', 'Le froid ne m\'a pas arrêté. Toi non plus.', "Je tiens l'allure bien après que les autres ont lâché."],
  robot: ['Analyse en cours. Probabilité de victoire adverse : faible.', 'Mes ordres sont clairs. Mes doutes, nouveaux.', 'Signal HELIX perdu par intermittence. Combat maintenu.'],
  shin: ["Tu ne m'as pas entendu arriver. C'est déjà une défaite.", 'Les toits connaissent mon nom. Pas le tien.', 'Une ombre ne se frappe pas. Elle se laisse traverser.'],
  brutus: ["Le ring m'appartient. Le public aussi.", "On m'a rendu plus fort. On a oublié de me rendre mes souvenirs.", 'Un seul coup, champion. Un seul.'],
  akira: ["La force de l'autre est le seul levier dont j'ai besoin.", "Attaque. Je prendrai ce que tu m'offres.", 'Un judoka ne frappe pas. Il attend la chute.'],
  nyx: ["Frappe en premier. Je t'en prie.", "Chaque attaque est une porte ouverte. Je les connais toutes.", "Je n'ai rien à prouver. Juste à répondre."],
  titan: ["IDENTIFICATION : INTRUS. PROTOCOLE D'ÉLIMINATION ACTIVÉ.", 'HELIX NE PERD PAS. HELIX CALCULE.', 'TOUTE RÉSISTANCE EST UNE ERREUR DE DONNÉES.'],
};

/** Ce que chaque héros répond (une réplique par chapitre, en boucle). */
export const HERO_LINES: Record<string, string[]> = {
  kairo: ['Je ne cherche pas la victoire. Seulement ceux qui ont perdu leur voix.', "Le dojo attendra. Il a l'habitude.", 'Respire. Frappe juste.'],
  vera: ["J'ai les mains pleines de ces usines. Je sais où appuyer.", 'Pas de discours. Des gants.', 'Tu parles comme HELIX. Ça me suffit.'],
  wolf: ["Ma meute m'attend au bout de cette piste.", 'Je suis déjà derrière toi.', "La chasse commence là où ta patience s'arrête."],
  fox: ['Cherche-moi. Tu me trouveras trop tard.', 'Un sourire, un pas de côté, et tu es à terre.', "Rien n'est jamais ce qu'il semble."],
  bull: ['Mon nom m\'attend dans ce sable.', 'Charge, et je te rends la monnaie.', 'La foule ne ment pas. Écoute-la.'],
  stag: ['La forêt ne tombera pas sous mon regard.', 'Je suis la montagne. Essaie de la déplacer.', 'Un souffle, et la tempête change de camp.'],
  husky: ['Chaque kilomètre me rapproche de la meute.', "Le chemin est long. Je n'ai pas de raison de m'arrêter.", 'Reste si tu veux. Je file.'],
  robot: ['Mes circuits sont à moi, désormais.', 'Je rejette ce signal. Combat engagé.', 'Calcul terminé : je ne perdrai pas.'],
  shin: ["Mon clan n'a pas de tombe. Alors j'écris son nom partout.", 'Tu parles trop. Les ombres, non.', "Un instant. C'est tout ce qu'il me faut."],
  brutus: ['Je ne sais plus qui j\'étais. Je sais qui je serai.', "Montre-moi ce que tu as. J'ai tout oublié, sauf frapper.", 'Les souvenirs reviennent à chaque coup reçu.'],
  akira: ['Je ne veux blesser personne. Mais je ne tomberai pas.', 'Ton élan fera le travail.', 'Respire. Je m\'occupe du reste.'],
  nyx: ["J'attends. Toujours.", 'Ton geste était lisible depuis le départ.', 'Une seule réponse. La bonne.'],
};

/** Script d'un chapitre : introduction du héros (chapitre 1), accroche, échange avec l'adversaire. */
export function chapterScript(hero: string, chapter: number, opponentId: string, opponentName: string): Line[] {
  const out: Line[] = [];
  if (chapter === 0) for (const t of INTROS[hero] ?? []) out.push({ who: 'narr', text: t });
  out.push({ who: 'narr', text: (CHAPTER_HOOKS[chapter] ?? '').replace('{opp}', opponentName) });
  const theirs = OPP_LINES[opponentId] ?? [];
  const mine = HERO_LINES[hero] ?? [];
  if (theirs.length) out.push({ who: 'opp', text: theirs[chapter % theirs.length]! });
  if (mine.length) out.push({ who: 'hero', text: mine[(chapter * 2 + 1) % mine.length]! });
  if (chapter === 7 && theirs.length) out.push({ who: 'opp', text: theirs[(chapter + 1) % theirs.length]! });
  return out.filter((l) => l.text);
}
