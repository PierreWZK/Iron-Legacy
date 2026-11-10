/**
 * Identifiants de coups. Un coup = une entrée de table par personnage (données, pas de code).
 * Convention de notation (comme Tekken) : LP/RP = poing gauche/droit, LK/RK = pied gauche/droit ;
 * f = avant, b = arrière, d = accroupi, df = accroupi + avant, run = en courant, air = en l'air.
 */
export const MOVE_IDS = [
  // Debout, sans direction : LP, RP, LK, RK
  'jab', 'cross', 'frontKick', 'roundhouse',
  // Avant + bouton : f+LP, f+RP, f+LK, f+RK
  'lunge', 'elbow', 'kneeLift', 'axeKick',
  // Arrière + bouton (arrière + LP = parade) : b+RP, b+LK, b+RK
  'backFist', 'sideKick', 'spinKick',
  // Accroupi + bouton : d+LP, d+RP, d+LK, d+RK
  'lowJab', 'uppercut', 'lowKick', 'sweep',
  // Accroupi + avant + bouton : df+LP, df+RP, df+LK, df+RK
  'hookPunch', 'risingHook', 'slideKick', 'dragonKick',
  // En courant : run+poing, run+pied
  'tackle', 'flyingKick',
  // En l'air : LP, RP, LK, RK
  'airPunch', 'airElbow', 'jumpKick', 'airRound',
  // Projections : LP+RP, LP+LK, RP+RK, LK+RK
  'throw', 'hipToss', 'suplex', 'legThrow',
] as const;

export type MoveId = (typeof MOVE_IDS)[number];

/** Les 4 projections (voir `MoveDef.throw`). */
export const THROW_IDS: readonly MoveId[] = ['throw', 'hipToss', 'suplex', 'legThrow'];

export type Height = 'high' | 'mid' | 'low';

/** Style d'animation procédurale du coup (une pose par style, voir le client). */
export type Limb =
  | 'punchL' | 'punchR' | 'hook' | 'risingHook' | 'backFist' | 'elbow' | 'uppercut' | 'lunge'
  | 'kickL' | 'kickR' | 'knee' | 'axe' | 'sideKick' | 'spinKick' | 'slide' | 'dragon'
  | 'tackle' | 'flying' | 'airPunch' | 'airElbow' | 'jumpKick' | 'airRound'
  | 'throw' | 'hipToss' | 'suplex' | 'legThrow';

/** Données d'un coup. Frames à 60 Hz : total = startup + active + recovery. */
export interface MoveDef {
  label: string;
  limb: Limb;
  height: Height;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  /** Frames de hitstun (défenseur touché) et de blockstun (défenseur bloquant). */
  hitstun: number;
  blockstun: number;
  /** Impulsion horizontale (m/s) reçue par le défenseur. */
  knockback: number;
  /** Vitesse verticale donnée au défenseur (juggle). 0 = aucune. */
  launch: number;
  knockdown: boolean;
  /** Distance du point d'impact devant le combattant (m). */
  reach: number;
  /** Rayon de la hitbox autour du point d'impact (m). */
  radius: number;
  /** Vitesse d'avancée pendant les frames actives (m/s). */
  lunge: number;
  /** Peut être annulé en un autre coup une fois le coup touché ou bloqué. */
  cancel: boolean;
  /** Enchaînement « string » : le coup suivant peut être lancé pendant la récupération, même si le coup a manqué ou été bloqué. */
  string?: boolean;
  /** Projection : saisit l'adversaire puis joue une séquence. */
  throw?: boolean;
  /** Durée (ticks) de la séquence de projection après la prise. */
  sequence?: number;
  /** Position d'atterrissage de l'adversaire projeté, en mètres devant l'attaquant (négatif = derrière). */
  landing?: number;
}

export interface Speeds {
  walkFwd: number;
  walkBack: number;
  runFwd: number;
  side: number;
  dodge: number;
  jumpVel: number;
}

export interface Look {
  skin: number;
  suit: number;
  accent: number;
  scale: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  epithet: string;
  style: string;
  bio: string;
  health: number;
  speeds: Speeds;
  look: Look;
  moves: Record<MoveId, MoveDef>;
}
