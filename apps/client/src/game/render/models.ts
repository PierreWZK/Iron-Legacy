import type { MoveId } from '@iron/engine';

/** Clips d'animation à utiliser pour chaque état de combat. Les noms viennent des fichiers eux-mêmes. */
export interface ClipMap {
  idle: string;
  walk: string;
  run: string;
  jump: string;
  /** Garde, accroupi, parade. */
  guard: string;
  /** Réactions aux coups (alternées). */
  hit: readonly [string, string];
  death: string;
  getup: string;
  victory: string;
  attackDefault: string;
  attack: Partial<Record<MoveId, string>>;
}

export interface ModelSpec {
  kind: 'gltf' | 'fbx';
  url: string;
  /** Le modèle est mis à l'échelle pour que cette dimension fasse `size` mètres. */
  fit: 'height' | 'length';
  size: number;
  /** Rotation Y appliquée pour que le modèle regarde vers +Z (l'avant de la sim). */
  yaw: number;
  clips: ClipMap;
}

const KICKS: MoveId[] = ['frontKick', 'lowKick', 'sweep', 'roundhouse', 'jumpKick', 'airRound'];

/** Canidés (loup, renard, husky) : une seule attaque. */
function canid(file: string, size: number): ModelSpec {
  return {
    kind: 'gltf',
    url: `/models/creatures/${file}.gltf`,
    fit: 'length',
    size,
    yaw: 0,
    clips: {
      idle: 'Idle', walk: 'Walk', run: 'Gallop', jump: 'Gallop_Jump', guard: 'Idle_2_HeadLow',
      hit: ['Idle_HitReact1', 'Idle_HitReact2'], death: 'Death', getup: 'Jump_ToIdle', victory: 'Idle_2',
      attackDefault: 'Attack', attack: {},
    },
  };
}

/** Ongulés (cerf, taureau) : coup de tête et ruade. */
function ungulate(file: string, size: number): ModelSpec {
  return {
    kind: 'gltf',
    url: `/models/creatures/${file}.gltf`,
    fit: 'length',
    size,
    yaw: 0,
    clips: {
      idle: 'Idle', walk: 'Walk', run: 'Gallop', jump: 'Gallop_Jump', guard: 'Idle_Headlow',
      hit: ['Idle_HitReact1', 'Idle_HitReact2'], death: 'Death', getup: 'Jump_toIdle', victory: 'Idle_2',
      attackDefault: 'Attack_Headbutt',
      attack: Object.fromEntries(KICKS.map((m) => [m, 'Attack_Kick'])) as Partial<Record<MoveId, string>>,
    },
  };
}

/** Modèles animés par personnage. Les personnages absents d'ici utilisent le corps procédural. */
export const MODELS: Record<string, ModelSpec> = {
  wolf: canid('Wolf', 2.0),
  fox: canid('Fox', 1.7),
  husky: canid('Husky', 1.9),
  stag: ungulate('Stag', 2.5),
  bull: ungulate('Bull', 2.5),
  robot: {
    kind: 'fbx',
    url: '/models/creatures/Robot.fbx',
    fit: 'height',
    size: 1.7,
    yaw: 0,
    clips: {
      idle: 'RobotArmature|Robot_Idle',
      walk: 'RobotArmature|Robot_Walking',
      run: 'RobotArmature|Robot_Running',
      jump: 'RobotArmature|Robot_Jump',
      guard: 'RobotArmature|Robot_Idle',
      hit: ['RobotArmature|Robot_Standing', 'RobotArmature|Robot_Standing'],
      death: 'RobotArmature|Robot_Death',
      getup: 'RobotArmature|Robot_Standing',
      victory: 'RobotArmature|Robot_Dance',
      attackDefault: 'RobotArmature|Robot_Punch',
      attack: {},
    },
  },
};
