/** Identifiants de coups : un coup = une entrée de table par personnage (données, pas de code). */
export type MoveId =
  | 'jab' | 'cross' | 'uppercut' | 'frontKick' | 'roundhouse' | 'lowKick'
  | 'sweep' | 'lunge' | 'elbow' | 'jumpKick' | 'airRound' | 'throw';

export const MOVE_IDS: readonly MoveId[] = [
  'jab', 'cross', 'uppercut', 'frontKick', 'roundhouse', 'lowKick',
  'sweep', 'lunge', 'elbow', 'jumpKick', 'airRound', 'throw',
];

export type Height = 'high' | 'mid' | 'low';
/** Membre utilisé pour l'animation procédurale du coup. */
export type Limb =
  | 'punchL' | 'punchR' | 'kickL' | 'kickR' | 'lunge' | 'elbow'
  | 'uppercut' | 'jumpKick' | 'airRound' | 'throw';

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
  throw?: boolean;
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
