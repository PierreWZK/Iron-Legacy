import { ARENA_RADIUS, START_DISTANCE } from './constants';
import type { InputFrame } from './input';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type ActionState =
  | 'idle'
  | 'walkFwd'
  | 'walkBack'
  | 'sideL'
  | 'sideR'
  | 'runFwd'
  | 'dashL'
  | 'dashR'
  | 'crouch'
  | 'jump';

export interface Fighter {
  id: number;
  team: number;
  pos: Vec3;
  /** Vitesse monde (m/s). Horizontale figée au saut, verticale = gravité. */
  vel: Vec3;
  /** Direction unitaire (x,z) vers la cible. */
  facing: { x: number; z: number };
  action: ActionState;
  actionTicks: number;
  prevInput: InputFrame;
  health: number;
  maxHealth: number;
}

export interface World {
  tick: number;
  fighters: Fighter[];
}

/** Crée un combattant face à l'origine, à `x` sur l'axe X. */
function makeFighter(id: number, team: number, x: number, z: number): Fighter {
  const len = Math.hypot(x, z) || 1;
  return {
    id,
    team,
    pos: { x, y: 0, z },
    vel: { x: 0, y: 0, z: 0 },
    facing: { x: -x / len, z: -z / len },
    action: 'idle',
    actionTicks: 0,
    prevInput: 0,
    health: 100,
    maxHealth: 100,
  };
}

/** Duel : P1 à gauche, P2 à droite, face à face. */
export function createDuelWorld(distance = START_DISTANCE): World {
  const half = Math.min(distance, ARENA_RADIUS * 2) / 2;
  return { tick: 0, fighters: [makeFighter(0, 0, -half, 0), makeFighter(1, 1, half, 0)] };
}

/** Copie profonde (snapshots pour rollback / interpolation). */
export function cloneWorld(w: World): World {
  return {
    tick: w.tick,
    fighters: w.fighters.map((f) => ({
      ...f,
      pos: { ...f.pos },
      vel: { ...f.vel },
      facing: { ...f.facing },
    })),
  };
}
