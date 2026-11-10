import { BASE_MOVES } from './baseMoves';
import type { CharacterDef, MoveDef, MoveId } from './types';

/** Coup dérivé de la table de référence, réglé pour le robot. */
function tune(id: MoveId, patch: Partial<MoveDef>): MoveDef {
  return { ...BASE_MOVES[id], ...patch };
}

/** Éclaireur : rapide, frappes courtes, recule après chaque attaque. */
export const SCOUT: CharacterDef = {
  id: 'scout',
  name: 'ROBOT SCOUT',
  epithet: 'Éclaireur rapide',
  style: 'Rapide et agile : frappes courtes, retraite après chaque attaque',
  bio: "Unité de reconnaissance de HELIX. Il frappe puis recule avant la riposte.",
  health: 80,
  speeds: { walkFwd: 3.0, walkBack: 2.6, runFwd: 7.0, side: 3.2, dodge: 4.8, jumpVel: 11 },
  look: { skin: 0xb8c0c8, suit: 0x3a4450, accent: 0x34e0ff, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: tune('jab', { label: 'Frappe éclair', startup: 3, damage: 3, hitstun: 11 }),
    cross: tune('cross', { startup: 5, damage: 5 }),
    backFist: tune('backFist', { startup: 5 }),
  },
  aiStyle: 'hitAndRun',
};

/** Gardien : très résistant, pousse sans cesse, bloque beaucoup. */
export const GUARDIAN: CharacterDef = {
  id: 'guardian',
  name: 'ROBOT GARDIEN',
  epithet: 'Mur mécanique',
  style: 'Puissant et résistant : pression constante, blocage solide',
  bio: "Chargé de protéger les chaînes de production. Il ne recule jamais d'un pas.",
  health: 170,
  speeds: { walkFwd: 2.0, walkBack: 1.4, runFwd: 4.2, side: 1.6, dodge: 2.6, jumpVel: 8 },
  look: { skin: 0x7a8490, suit: 0x2a3440, accent: 0xff8a2a, scale: 1.1 },
  moves: {
    ...BASE_MOVES,
    cross: tune('cross', { label: 'Poing de fer', startup: 9, damage: 10 }),
    roundhouse: tune('roundhouse', { label: 'Balayage massif', damage: 15, knockback: 1.8 }),
    lowKick: tune('lowKick', { label: 'Piston bas', damage: 7 }),
  },
  aiStyle: 'pressure',
};

/** Assassin : enchaînements rapides, coups en série. */
export const ASSASSIN: CharacterDef = {
  id: 'assassin',
  name: 'ROBOT ASSASSIN',
  epithet: 'Lame sans bruit',
  style: 'Rapide et précis : enchaînements longs, coups en série',
  bio: "Conçu pour éliminer les cibles sans laisser le temps de réagir. Il enchaîne jusqu'à ce que la cible tombe.",
  health: 110,
  speeds: { walkFwd: 2.8, walkBack: 2.2, runFwd: 6.0, side: 2.8, dodge: 4.0, jumpVel: 10 },
  look: { skin: 0x5a1a1a, suit: 0x1a1214, accent: 0xff2a3a, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: tune('jab', { label: 'Coup de lame', startup: 3, damage: 3, hitstun: 11, string: true }),
    cross: tune('cross', { label: 'Estoc', startup: 5, damage: 6, string: true }),
    lowJab: tune('lowJab', { startup: 4, damage: 3, string: true }),
  },
  aiStyle: 'combo',
};

/** Lourd : très lent, énorme vie, projections et coups de charge. */
export const HEAVY: CharacterDef = {
  id: 'heavy',
  name: 'ROBOT LOURD',
  epithet: 'Broyeur de cellules',
  style: 'Très lent : vie énorme, projections, coups de charge à distance',
  bio: "Machine de chantier reconvertie en combattant. Il lui faut une seconde pour se retourner, et le reste du combat pour te faire tomber.",
  health: 220,
  speeds: { walkFwd: 1.3, walkBack: 1.0, runFwd: 3.0, side: 1.1, dodge: 2.0, jumpVel: 6.5 },
  look: { skin: 0x5a5f68, suit: 0x3a3228, accent: 0xffc23a, scale: 1.2 },
  moves: {
    ...BASE_MOVES,
    jab: tune('jab', { label: 'Coup de pilon', startup: 7, damage: 7 }),
    tackle: tune('tackle', { label: 'Charge de chantier', damage: 20, lunge: 4 }),
    throw: tune('throw', { label: 'Étreinte', damage: 22 }),
    hipToss: tune('hipToss', { damage: 24 }),
    suplex: tune('suplex', { damage: 30 }),
  },
  aiStyle: 'heavy',
};

/** Élite : IA avancée, parade et contres, mouvements complets. */
export const ELITE: CharacterDef = {
  id: 'elite',
  name: 'ROBOT ÉLITE',
  epithet: 'Prototype de contrôle',
  style: 'Équilibré et adaptatif : parades, contres, tous les coups',
  bio: "Le modèle de référence de HELIX. Il lit les attaques du combattant et répond à chacune.",
  health: 150,
  speeds: { walkFwd: 2.4, walkBack: 1.9, runFwd: 5.4, side: 2.3, dodge: 3.6, jumpVel: 9.5 },
  look: { skin: 0x9a8a5a, suit: 0x3a3424, accent: 0xffe08a, scale: 1.05 },
  moves: { ...BASE_MOVES },
  aiStyle: 'adaptive',
};

export const ROBOT_DEFS: readonly CharacterDef[] = [SCOUT, GUARDIAN, ASSASSIN, HEAVY, ELITE];
