import { BASE_MOVES } from './baseMoves';
import type { CharacterDef, Limb, MoveDef, MoveId } from './types';

/**
 * Combos de chaque personnage. Les entrées sont les mêmes pour tous (ex. RK RK RK = circulaire, puis 2e
 * et 3e coup), mais chaque style a ses propres animations, noms et rythme : la même séquence de touches
 * ne donne pas le même enchaînement visuel d'un personnage à l'autre.
 */
export type ComboStyle = 'karate' | 'boxer' | 'feral' | 'heavy' | 'ninja' | 'judo' | 'shadow' | 'mech' | 'kick';

const CHAIN_IDS = ['lp2', 'lp3', 'rp2', 'rp3', 'lk2', 'lk3', 'rk2', 'rk3'] as const satisfies readonly MoveId[];

interface StyleDef {
  /** Animation et nom de chacun des 8 coups, dans l'ordre de CHAIN_IDS. */
  limbs: readonly Limb[];
  labels: readonly string[];
  /** Multiplicateurs de rythme (frames) et de puissance par rapport au personnage. */
  speed: number;
  power: number;
}

const STYLES: Record<ComboStyle, StyleDef> = {
  karate: {
    limbs: ['punchR', 'hook', 'punchL', 'uppercut', 'kickR', 'sideKick', 'kickL', 'spinKick'],
    labels: ['Double direct', 'Crochet du maître', 'Revers rapide', 'Montée du dragon', 'Double pied', 'Latéral final', 'Circulaire gauche', 'Tourbillon'],
    speed: 1, power: 1,
  },
  boxer: {
    limbs: ['punchR', 'uppercut', 'hook', 'risingHook', 'kickR', 'knee', 'kickL', 'kickR'],
    labels: ['Un-deux', 'Montée de boxe', 'Crochet du gauche', 'Crochet ascendant', 'Pied-poing', 'Genou de pression', 'Fouet gauche', 'Fouet final'],
    speed: 0.85, power: 0.95,
  },
  feral: {
    limbs: ['hook', 'elbow', 'elbow', 'backFist', 'knee', 'axe', 'kickL', 'spinKick'],
    labels: ['Griffe', 'Coup de coude féroce', 'Morsure', 'Revers sauvage', 'Coup de genou', 'Coup de hache', 'Ruade', 'Ruade tournante'],
    speed: 1, power: 1.1,
  },
  heavy: {
    limbs: ['hook', 'elbow', 'elbow', 'uppercut', 'knee', 'axe', 'kickR', 'axe'],
    labels: ['Coup de masse', 'Coude écrasant', 'Marteau', 'Uppercut de taureau', 'Genou lourd', 'Hache', 'Coup de pied écrasant', 'Piétinement'],
    speed: 1.2, power: 1.2,
  },
  ninja: {
    limbs: ['punchR', 'backFist', 'backFist', 'spinKick', 'kickR', 'spinKick', 'sideKick', 'spinKick'],
    labels: ['Kunaï double', 'Revers de l\'ombre', 'Lame arrière', 'Vrille', 'Pied de vent', 'Tourbillon final', 'Faucille', 'Lame du vent'],
    speed: 0.8, power: 0.9,
  },
  judo: {
    limbs: ['punchR', 'elbow', 'elbow', 'hook', 'kickR', 'knee', 'sideKick', 'axe'],
    labels: ['Frappe de main', 'Coude de judo', 'Pression', 'Crochet de col', 'Fauchage', 'Genou de hanche', 'Balayage latéral', 'Hache de judo'],
    speed: 1.05, power: 1.05,
  },
  shadow: {
    limbs: ['punchR', 'backFist', 'punchL', 'risingHook', 'kickR', 'axe', 'sideKick', 'spinKick'],
    labels: ['Riposte double', 'Revers fantôme', 'Contre-poing', 'Montée de l\'ombre', 'Pied fantôme', 'Chute de hache', 'Contre latéral', 'Dernier contre'],
    speed: 0.9, power: 1,
  },
  mech: {
    limbs: ['punchR', 'elbow', 'punchL', 'hook', 'kickR', 'knee', 'kickL', 'axe'],
    labels: ['Piston double', 'Coude hydraulique', 'Piston gauche', 'Crochet mécanique', 'Frappe de pied', 'Genou renforcé', 'Balayage du vérin', 'Marteau final'],
    speed: 1, power: 1,
  },
  kick: {
    limbs: ['punchR', 'elbow', 'punchL', 'hook', 'kickR', 'axe', 'sideKick', 'spinKick'],
    labels: ['Direct bref', 'Coude rapide', 'Revers court', 'Crochet', 'Double coup de pied', 'Coup de hache', 'Latéral rapide', 'Tournant royal'],
    speed: 0.95, power: 1,
  },
};

/** Style de combo de chaque personnage (les robots du mode robots y compris). */
export const COMBO_STYLE: Record<string, ComboStyle> = {
  kairo: 'karate', vera: 'boxer', wolf: 'feral', fox: 'ninja', bull: 'heavy', stag: 'kick', husky: 'feral', robot: 'mech',
  shin: 'ninja', brutus: 'heavy', akira: 'judo', nyx: 'shadow', titan: 'mech',
  scout: 'boxer', guardian: 'heavy', assassin: 'ninja', heavy: 'heavy', elite: 'karate',
};

/** Ajoute à un personnage ses 8 coups de combo, réglés d'après sa vitesse (jab) et sa puissance (direct). */
export function withCombos(def: CharacterDef): CharacterDef {
  const style = STYLES[COMBO_STYLE[def.id] ?? 'karate'];
  const speedK = (def.moves.jab.startup / BASE_MOVES.jab.startup) * style.speed;
  const powerK = Math.min(2, Math.max(0.6, (def.moves.cross.damage / BASE_MOVES.cross.damage) * style.power));
  const moves = { ...def.moves };
  CHAIN_IDS.forEach((id, i) => {
    const base: MoveDef = BASE_MOVES[id];
    const startup = Math.max(3, Math.round(base.startup * speedK));
    moves[id] = {
      ...base,
      label: style.labels[i]!,
      limb: style.limbs[i]!,
      startup,
      recovery: Math.max(6, Math.round(base.recovery * (0.7 + 0.3 * speedK))),
      damage: Math.max(2, Math.round(base.damage * powerK)),
    };
  });
  return { ...def, moves };
}
