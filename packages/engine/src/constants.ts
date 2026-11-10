/** Constantes de simulation. Unités : mètres et secondes ; la sim avance par ticks fixes. */
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export const ARENA_RADIUS = 8;
/** Rayon de la pushbox (cercle au sol) d'un combattant. */
export const FIGHTER_RADIUS = 0.45;
/** Sous cette hauteur, deux combattants se repoussent ; au-dessus, on peut sauter par-dessus. */
export const PUSH_MAX_HEIGHT = 1.0;
export const START_DISTANCE = 3;

export const WALK_FWD = 2.0;
export const WALK_BACK = 1.5;
export const RUN_FWD = 5.0;
export const SIDE_WALK = 1.8;
export const SIDE_DASH = 4.5;

export const GRAVITY = 28;
export const JUMP_VELOCITY = 9;

/** Distance minimale au centre de l'adversaire pour éviter toute division par zéro. */
export const MIN_DIST = 0.05;
