import { BASE_MOVES } from './baseMoves';
import type { BaseMoveId, CharacterDef, MoveDef } from './types';

/** Coup dérivé de la table de référence. */
function tune(id: BaseMoveId, patch: Partial<MoveDef>): MoveDef {
  return { ...BASE_MOVES[id], ...patch };
}

/** Shin : ninja, très rapide et fragile, coups acrobatiques. */
export const SHIN: CharacterDef = {
  id: 'shin',
  name: 'SHIN',
  epithet: 'Ombre des toits',
  style: 'Ninjutsu : très rapide, acrobatique, coups tournants et volants',
  bio: "Dernier d'un clan que HELIX a tenté d'effacer. Il frappe depuis les toits et disparaît avant que l'on comprenne d'où vient le coup.",
  health: 90,
  speeds: { walkFwd: 2.6, walkBack: 2.1, runFwd: 6.4, side: 2.7, dodge: 4.2, jumpVel: 11 },
  look: { skin: 0xc9a07a, suit: 0x16181d, accent: 0xb02a3a, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: tune('jab', { label: 'Coup de kunaï', startup: 3, damage: 3, hitstun: 12 }),
    cross: tune('cross', { label: 'Frappe éclair', startup: 6, damage: 6 }),
    backFist: tune('backFist', { label: 'Revers de l\'ombre', startup: 6 }),
    spinKick: tune('spinKick', { label: 'Tourbillon', startup: 12 }),
    roundhouse: tune('roundhouse', { label: 'Lame du vent', startup: 12 }),
    lowKick: tune('lowKick', { startup: 4 }),
    flyingKick: tune('flyingKick', { label: 'Faucon', startup: 10, damage: 12 }),
    dragonKick: tune('dragonKick', { label: 'Vol du faucon', launch: 8, startup: 13 }),
    throw: tune('throw', { label: 'Projection ninja', damage: 12 }),
  },
};

/** Brutus : lutteur, énorme vie, projections dévastatrices, très lent. */
export const BRUTUS: CharacterDef = {
  id: 'brutus',
  name: 'BRUTUS',
  epithet: 'Roi du ring',
  style: 'Lutte : vie énorme, projections dévastatrices, très lent',
  bio: "Ancien champion de catch devenu cobaye de HELIX. Ce que ses mains attrapent ne se relève pas tout de suite.",
  health: 140,
  speeds: { walkFwd: 1.8, walkBack: 1.3, runFwd: 4.2, side: 1.5, dodge: 2.4, jumpVel: 7 },
  look: { skin: 0xc4896a, suit: 0x7a1a1a, accent: 0xffc23a, scale: 1 },
  moves: {
    ...BASE_MOVES,
    jab: tune('jab', { label: 'Gifle', startup: 5, damage: 5 }),
    cross: tune('cross', { label: 'Coup de massue', startup: 9, damage: 11 }),
    elbow: tune('elbow', { damage: 17 }),
    roundhouse: tune('roundhouse', { label: 'Clothesline', startup: 17, damage: 18, knockback: 1.8 }),
    tackle: tune('tackle', { label: 'Spear', damage: 16 }),
    throw: tune('throw', { label: 'Slam', startup: 4, damage: 20 }),
    hipToss: tune('hipToss', { startup: 4, damage: 22 }),
    suplex: tune('suplex', { label: 'Suplex allemand', startup: 5, damage: 30 }),
    legThrow: tune('legThrow', { label: 'Prise de jambe', startup: 5, damage: 18 }),
  },
};

/** Akira : judoka, projections rapides et variées, bonne vie. */
export const AKIRA: CharacterDef = {
  id: 'akira',
  name: 'AKIRA',
  epithet: 'Maître du judo',
  style: 'Judo : projections très rapides et variées, frappes modestes',
  bio: "Il n'a jamais frappé pour blesser : il retourne la force de l'adversaire contre lui. HELIX l'a recruté pour la même raison.",
  health: 110,
  speeds: { walkFwd: 2.1, walkBack: 1.6, runFwd: 5.0, side: 1.9, dodge: 3.0, jumpVel: 9 },
  look: { skin: 0xd2a27c, suit: 0xf0f0ec, accent: 0x222222, scale: 1 },
  moves: {
    ...BASE_MOVES,
    throw: tune('throw', { label: 'Ippon seoi', startup: 4, damage: 16 }),
    hipToss: tune('hipToss', { label: 'O-goshi', startup: 4, damage: 20 }),
    suplex: tune('suplex', { label: 'Sutemi', startup: 5, damage: 24 }),
    legThrow: tune('legThrow', { label: 'Ashi-barai', startup: 5, damage: 16 }),
    lowKick: tune('lowKick', { label: 'Fauchage', damage: 6 }),
    sweep: tune('sweep', { label: 'Osoto-gari', startup: 11 }),
  },
};

/** Nyx : combattante des contres, rapide à l'esquive, frappes précises. */
export const NYX: CharacterDef = {
  id: 'nyx',
  name: 'NYX',
  epithet: 'Spécialiste des contres',
  style: 'Contres : esquive rapide, coups bas vifs, crochets précis',
  bio: "Elle laisse l'adversaire commencer, puis termine. Dans l'ombre des dunes industrielles, personne n'a jamais frappé en premier.",
  health: 100,
  speeds: { walkFwd: 2.4, walkBack: 1.9, runFwd: 5.6, side: 2.4, dodge: 3.8, jumpVel: 10 },
  look: { skin: 0x8a5a44, suit: 0x2a1f3a, accent: 0xb04aff, scale: 1 },
  moves: {
    ...BASE_MOVES,
    lowJab: tune('lowJab', { startup: 4, damage: 4 }),
    hookPunch: tune('hookPunch', { label: 'Crochet contre', startup: 8, damage: 11 }),
    risingHook: tune('risingHook', { launch: 8 }),
    backFist: tune('backFist', { startup: 6, damage: 8 }),
    sideKick: tune('sideKick', { label: 'Coup de pied de contre', damage: 12, reach: 1.7 }),
    sweep: tune('sweep', { startup: 11 }),
  },
};
