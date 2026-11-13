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
  // Combos : 2e et 3e coup d'un enchaînement par bouton (ex. RK RK RK = roundhouse, rk2, rk3)
  'lp2', 'lp3', 'rp2', 'rp3', 'lk2', 'lk3', 'rk2', 'rk3',
  // Après un double appui vers l'avant (élan) : + LP, RP (roulade), LK, RK (projection)
  'dashLP', 'dashRP', 'dashLK', 'dashRK',
  // Relevé : coups lancés depuis le sol (LK / RK pressé pendant la chute)
  'wakeKick', 'wakeSweep',
] as const;

/** Bouton d'attaque tel qu'utilisé dans les enchaînements. */
export type ChainButton = 'lp' | 'rp' | 'lk' | 'rk';
export const CHAIN_BUTTONS: readonly ChainButton[] = ['lp', 'rp', 'lk', 'rk'];

export type BaseMoveId = (typeof MOVE_IDS)[number];
/** Coups générés pour les combos longs d'un personnage (`c0`, `c1`…, voir `combos.ts`). */
export type ComboMoveId = `c${number}`;
export type MoveId = BaseMoveId | ComboMoveId;

/** Les 4 projections (voir `MoveDef.throw`). */
export const THROW_IDS: readonly MoveId[] = ['throw', 'hipToss', 'suplex', 'legThrow'];

export type Height = 'high' | 'mid' | 'low';

/** Style d'animation procédurale du coup (une pose par style, voir le client). */
export type Limb =
  | 'punchL' | 'punchR' | 'hook' | 'risingHook' | 'backFist' | 'elbow' | 'uppercut' | 'lunge'
  | 'kickL' | 'kickR' | 'knee' | 'axe' | 'sideKick' | 'spinKick' | 'slide' | 'dragon'
  | 'tackle' | 'flying' | 'airPunch' | 'airElbow' | 'jumpKick' | 'airRound'
  | 'throw' | 'hipToss' | 'suplex' | 'legThrow' | 'roll';

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
  /**
   * Combo : bouton pressé (sans direction) à partir de `chainFrame` → coup suivant. Marche même si le
   * coup a manqué ; un appui un peu en avance est mémorisé (buffer).
   */
  chain?: Partial<Record<string, MoveId>>;
  /** Frame à partir de laquelle l'enchaînement est possible (défaut : startup + active + 2). */
  chainFrame?: number;
  /** Niveau d'accroupi de la pose (0 debout, 1 accroupi). */
  crouch?: number;
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

/** Comportement de l'IA quand ce personnage est contrôlé par l'ordinateur. */
export type AiStyle = 'balanced' | 'hitAndRun' | 'pressure' | 'combo' | 'adaptive' | 'heavy';

export interface CharacterDef {
  id: string;
  /** Style d'IA (défaut : équilibré). */
  aiStyle?: AiStyle;
  name: string;
  epithet: string;
  style: string;
  bio: string;
  health: number;
  speeds: Speeds;
  look: Look;
  moves: Record<BaseMoveId, MoveDef> & Record<ComboMoveId, MoveDef>;
  /** Liste des combos du personnage (rempli par `withCombos`). */
  combos?: ComboDef[];
}

export type ComboTier = 'easy' | 'medium' | 'hard';

/**
 * Un combo : suite d'entrées. Chaque entrée = direction éventuelle + bouton, ex. `lp`, `f+rk`, `df+rp`, `u+lk`,
 * ou `ff+rk` (double appui vers l'avant puis bouton). Les directions : f avant, b arrière, d bas, u haut (saut),
 * df bas+avant, db bas+arrière.
 */
export interface ComboDef {
  name: string;
  tier: ComboTier;
  inputs: string[];
}
