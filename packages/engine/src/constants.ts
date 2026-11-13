/** Constantes de simulation. Unités : mètres et secondes ; la sim avance par ticks fixes. */
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export const ARENA_RADIUS = 8;
/** Rayon de la pushbox (cercle au sol). */
export const FIGHTER_RADIUS = 0.45;
/** Rayon de la hurtbox (corps) et demi-hauteur de la hitbox. */
export const HURT_RADIUS = 0.4;
export const HITBOX_HALF = 0.2;
export const STAND_HURT_TOP = 1.8;
export const CROUCH_HURT_TOP = 1.1;
/** Hauteur de l'impact par niveau d'attaque (haut / moyen / bas). */
export const HEIGHT_Y = { high: 1.4, mid: 0.95, low: 0.25 } as const;
/** Au-dessus de cette hauteur, la pushbox ne bloque plus : on peut sauter par-dessus. */
export const PUSH_MAX_HEIGHT = 1.0;
export const START_DISTANCE = 3;
export const MIN_DIST = 0.05;

export const GRAVITY = 28;
export const KNOCK_DECAY = 0.9;

export const DODGE_TICKS = 20;
/** Frames pendant lesquelles l'esquive déplace le combattant. */
export const DODGE_MOVE_TICKS = 12;
/** Frames pendant lesquelles l'esquive rend invulnérable. */
export const DODGE_INVULN = 12;
/** Double appui avant / arrière : fenêtre (ticks) et pas lancé. */
export const DOUBLE_TAP_TICKS = 14;
export const DASH_TICKS = 16;
export const DASH_MOVE_TICKS = 10;
export const DASH_FWD_SPEED = 8.4;
export const DASH_BACK_SPEED = 6.6;
export const PARRY_TICKS = 16;
/** Fenêtre de parade active (frames depuis le début de la garde). */
export const PARRY_WINDOW = 8;
export const PARRY_STUN = 24;
export const THROW_RANGE = 1.25;
/** Distance (m) à laquelle l'adversaire est tenu pendant une prise. */
export const THROW_GRAB_DISTANCE = 0.7;
export const TECH_STUN = 14;
export const KNOCKDOWN_TICKS = 40;
export const GETUP_TICKS = 16;
export const COUNTER_BONUS_STUN = 6;
export const COUNTER_DAMAGE = 1.25;
export const HITSTOP_HIT = 7;
export const HITSTOP_COUNTER = 9;
export const HITSTOP_BLOCK = 4;
export const COMBO_RESET_TICKS = 60;

export const INTRO_TICKS = 150;
export const KO_TICKS = 150;
export const ROUND_SECONDS = 99;
export const ROUNDS_TO_WIN = 2;
