import { BASE_MOVES } from './baseMoves';
import type { CharacterDef, MoveDef, MoveId } from './types';

/** Coup dérivé de la table de référence, avec un libellé propre à la créature. */
function mv(id: MoveId, patch: Partial<MoveDef>): MoveDef {
  return { ...BASE_MOVES[id], ...patch };
}

/** Loup : rapide et fragile, pression constante, bond long. */
export const WOLF: CharacterDef = {
  id: 'wolf',
  name: 'LOUP',
  epithet: 'Chasseur de la forêt',
  style: 'Rapide et fragile : coups très vifs, bond long, peu de vie',
  bio: "Meute dispersée par les ouvriers de HELIX, il traque les combattants un par un. Il ne chasse jamais deux fois la même proie.",
  health: 95,
  speeds: { walkFwd: 2.6, walkBack: 2.0, runFwd: 6.2, side: 2.5, dodge: 3.8, jumpVel: 10 },
  look: { skin: 0x8a8f98, suit: 0x4a4f58, accent: 0x9fd8ff, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: mv('jab', { label: 'Morsure vive', startup: 3, damage: 3, hitstun: 12 }),
    cross: mv('cross', { label: 'Coup de griffe', startup: 6, damage: 7 }),
    lunge: mv('lunge', { label: 'Bond', startup: 10, damage: 11, lunge: 5.0, reach: 1.45 }),
    roundhouse: mv('roundhouse', { label: 'Charge latérale', startup: 12, recovery: 20, damage: 12 }),
    throw: mv('throw', { label: 'Prise de gueule', damage: 15 }),
  },
};

/** Renard : le plus agile, esquive très longue, coups bas et lancers. */
export const FOX: CharacterDef = {
  id: 'fox',
  name: 'RENARD',
  epithet: 'Illusionniste des clairières',
  style: 'Agile : esquive très longue, coups bas rapides, lanceur',
  bio: "Il a appris à survivre en laissant ses poursuivants frapper dans le vide. Chaque coup manqué lui appartient.",
  health: 90,
  speeds: { walkFwd: 2.6, walkBack: 2.2, runFwd: 6.0, side: 2.8, dodge: 4.4, jumpVel: 10.5 },
  look: { skin: 0xd9732a, suit: 0x7a3a12, accent: 0xffd9a0, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: mv('jab', { label: 'Coup de museau', startup: 3, damage: 3, hitstun: 12 }),
    lowKick: mv('lowKick', { label: 'Croche-patte', startup: 4, damage: 5 }),
    sweep: mv('sweep', { label: 'Balayage de queue', startup: 10, recovery: 18 }),
    uppercut: mv('uppercut', { label: 'Saut de renard', launch: 7, startup: 8 }),
  },
};

/** Taureau : lent, résistant, coups très lourds, charge qui renverse. */
export const BULL: CharacterDef = {
  id: 'bull',
  name: 'TAUREAU',
  epithet: 'Force des arènes',
  style: 'Lourd : très résistant, coups lents et dévastateurs, charge',
  bio: "Champion d'arènes clandestines. Il ne cherche pas à esquiver : il avance, encaisse, et fait tomber ce qui lui résiste.",
  health: 135,
  speeds: { walkFwd: 1.7, walkBack: 1.2, runFwd: 4.4, side: 1.4, dodge: 2.6, jumpVel: 7.5 },
  look: { skin: 0x5a3a28, suit: 0x2a1a12, accent: 0xff6a3a, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: mv('jab', { label: 'Coup de corne', startup: 6, damage: 6, hitstun: 14 }),
    cross: mv('cross', { label: 'Coup de tête', startup: 10, damage: 12 }),
    frontKick: mv('frontKick', { label: 'Ruade', startup: 12, damage: 13 }),
    roundhouse: mv('roundhouse', { label: 'Ruade circulaire', startup: 16, damage: 20, knockback: 2.0, knockdown: true }),
    lunge: mv('lunge', { label: 'Charge', startup: 14, recovery: 24, damage: 16, lunge: 5.5, knockdown: true }),
    throw: mv('throw', { label: 'Projection de taureau', damage: 20 }),
  },
};

/** Cerf : allonge supérieure, coups de bois qui renversent. */
export const STAG: CharacterDef = {
  id: 'stag',
  name: 'CERF',
  epithet: 'Roi des sommets',
  style: 'Allonge : coups à très longue portée, coups de bois qui renversent',
  bio: "Gardien d'une forêt de montagne que HELIX voulait raser. Sa ramure frappe avant que l'adversaire ne voie venir le coup.",
  health: 105,
  speeds: { walkFwd: 2.0, walkBack: 1.5, runFwd: 5.2, side: 1.9, dodge: 3.0, jumpVel: 9.5 },
  look: { skin: 0xb08a5a, suit: 0x5a4328, accent: 0xe8f0ff, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: mv('jab', { label: 'Coup de museau', reach: 1.25 }),
    cross: mv('cross', { label: 'Coup de ramure', reach: 1.45 }),
    frontKick: mv('frontKick', { label: 'Ruade', reach: 1.55 }),
    elbow: mv('elbow', { label: 'Coup de bois', reach: 1.35, damage: 15 }),
    roundhouse: mv('roundhouse', { label: 'Balayage de ramure', damage: 15, reach: 1.6, radius: 0.45 }),
  },
};

/** Husky : endurance, enchaînements faciles, bonne vie. */
export const HUSKY: CharacterDef = {
  id: 'husky',
  name: 'HUSKY',
  epithet: 'Marathonien du froid',
  style: 'Endurant : bonne vie, enchaînements faciles, régulier',
  bio: "Il a tiré un traîneau à travers la toundra pendant que HELIX perdait ses signaux. Rien ne l'épuise, rien ne le ralentit.",
  health: 115,
  speeds: { walkFwd: 2.3, walkBack: 1.8, runFwd: 5.6, side: 2.1, dodge: 3.4, jumpVel: 9.5 },
  look: { skin: 0x9aa8b8, suit: 0x3a4658, accent: 0x7fd4ff, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: mv('jab', { label: 'Coup de patte', startup: 4, damage: 4 }),
    cross: mv('cross', { label: 'Griffe', cancel: true }),
    lowKick: mv('lowKick', { label: 'Croc bas', damage: 5, cancel: true }),
    roundhouse: mv('roundhouse', { label: 'Charge', damage: 13 }),
  },
};

/** Robot HELIX : puissant, un peu lent, uppercut qui soulève (juggle). */
export const ROBOT: CharacterDef = {
  id: 'robot',
  name: 'ROBOT',
  epithet: 'Unité de combat HELIX',
  style: 'Puissant : poings lourds, uppercut qui soulève, garde sûre',
  bio: "Prototype échappé du laboratoire, il n'obéit plus à ses concepteurs. Il frappe pour comprendre ce qu'il est.",
  health: 120,
  speeds: { walkFwd: 1.9, walkBack: 1.4, runFwd: 4.6, side: 1.7, dodge: 2.8, jumpVel: 8.5 },
  look: { skin: 0x9aa3ad, suit: 0x3b4450, accent: 0x34e0ff, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: mv('jab', { label: 'Frappe rapide', damage: 5 }),
    cross: mv('cross', { label: 'Poing hydraulique', startup: 8, damage: 11 }),
    uppercut: mv('uppercut', { label: 'Uppercut', damage: 14, launch: 7 }),
    frontKick: mv('frontKick', { label: 'Coup de pied mécanique', damage: 10 }),
    roundhouse: mv('roundhouse', { label: 'Frappe circulaire', startup: 16, damage: 16 }),
  },
};
