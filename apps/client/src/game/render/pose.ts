import { GETUP_TICKS, getMove, type Fighter, type MoveDef } from '@iron/engine';
import type { BoneName } from './rig';

/**
 * Pose procédurale par état (rotations Euler en radians, repère local de l'os).
 * Convention : le modèle regarde +Z ; rotation.x < 0 = membre vers l'avant ; pour le buste, > 0 = penché avant.
 * Sera remplacé par des AnimationClip quand les GLB arriveront ; l'API (combattant → pose) reste identique.
 */
export type Euler3 = readonly [number, number, number];
export type RotMap = Partial<Record<BoneName, Euler3>>;

export interface Pose {
  rot: RotMap;
  /** Décalage vertical du bassin (m). */
  hipsY: number;
  /** Rotation du corps autour de Y (pas de côté, esquive). */
  bodyYaw: number;
  /** Le corps est à terre (knockdown, projection, relevé). */
  lying: boolean;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function pose(rot: RotMap, o: { hipsY?: number; bodyYaw?: number; lying?: boolean } = {}): Pose {
  return { rot, hipsY: o.hipsY ?? 0, bodyYaw: o.bodyYaw ?? 0, lying: o.lying ?? false };
}

/** Garde : bras relevés devant le visage. `sw` décale légèrement les bras (respiration). */
function guard(sw = 0): RotMap {
  return {
    upperArmL: [-1.1 + sw, 0, 0.15],
    forearmL: [-1.5, 0, 0],
    upperArmR: [-1.0 - sw, 0, -0.15],
    forearmR: [-1.6, 0, 0],
  };
}

/** Cycle de marche/course. `phase` en radians, `amp` amplitude des jambes. */
function cycle(phase: number, amp: number, lean: number, arms: number): Pose {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const bendL = 0.45 + 0.7 * amp * Math.max(0, c);
  const bendR = 0.45 + 0.7 * amp * Math.max(0, -c);
  return pose({
    ...guard(s * arms),
    spine: [lean, 0, 0],
    thighL: [-0.3 + s * amp, 0, 0],
    thighR: [0.15 - s * amp, 0, 0],
    shinL: [bendL, 0, 0],
    shinR: [bendR * 0.6, 0, 0],
    head: [-lean * 0.6, 0, 0],
  }, { hipsY: -0.04 - 0.025 * Math.abs(c) });
}

function idle(t: number): Pose {
  const b = Math.sin(t * 2.4);
  return pose({
    ...guard(b * 0.04),
    spine: [0.06 + b * 0.015, 0, 0],
    chest: [b * 0.02, 0, 0],
    thighL: [-0.3, 0, 0],
    shinL: [0.45, 0, 0],
    thighR: [0.15, 0, 0],
    shinR: [0.15, 0, 0],
  }, { hipsY: b * 0.012 });
}

/** Extension d'un coup entre 0 (repos) et 1 (impact) selon la frame. */
function extension(m: MoveDef, frame: number): number {
  if (frame <= m.startup) return (frame / m.startup) * 0.3;
  if (frame <= m.startup + m.active) return 1;
  return Math.max(0, 1 - (frame - m.startup - m.active) / m.recovery);
}

function kick(side: 'L' | 'R', e: number, hipsY: number, yaw: number): Pose {
  const rot: RotMap = { ...guard(0), spine: [lerp(0.05, -0.12, e), 0, 0] };
  const thigh = ('thigh' + side) as BoneName;
  const shin = ('shin' + side) as BoneName;
  rot[thigh] = [lerp(-0.3, -1.5, e), 0, 0];
  rot[shin] = [lerp(1.4, 0.05, e), 0, 0];
  return pose(rot, { hipsY, bodyYaw: lerp(0, yaw, e) });
}

function attackPose(m: MoveDef, frame: number): Pose {
  const e = extension(m, frame);
  const g = guard(0);
  switch (m.limb) {
    case 'punchL':
      return pose({
        ...g,
        upperArmL: [lerp(-1.1, -1.6, e), 0, 0.15],
        forearmL: [lerp(-1.5, 0, e), 0, 0],
        spine: [lerp(0.05, 0.2, e), 0, 0],
      });
    case 'punchR':
      return pose({
        ...g,
        upperArmR: [lerp(-1.0, -1.6, e), 0, -0.15],
        forearmR: [lerp(-1.6, 0, e), 0, 0],
        spine: [lerp(0.05, 0.25, e), 0, 0],
      });
    case 'kickL':
      return kick('L', e, m.height === 'low' ? -0.3 : 0, 0);
    case 'kickR':
      return kick('R', e, m.height === 'low' ? -0.3 : 0, m.height === 'high' ? -0.7 : 0);
    case 'airRound':
      return kick('R', e, 0, -0.9);
    case 'jumpKick':
      return pose({
        ...g,
        thighL: [lerp(-0.8, -1.5, e), 0, 0],
        shinL: [lerp(1.6, 0.05, e), 0, 0],
        spine: [-0.1 * e, 0, 0],
      });
    case 'lunge':
      return pose({
        ...g,
        upperArmL: [lerp(-1.1, -1.6, e), 0, 0.15],
        forearmL: [lerp(-1.5, 0, e), 0, 0],
        spine: [lerp(0.1, 0.35, e), 0, 0],
        thighL: [lerp(-0.3, -0.9, e), 0, 0],
        shinL: [lerp(1.2, 0.6, e), 0, 0],
        thighR: [lerp(0.15, 0.6, e), 0, 0],
        shinR: [0.1, 0, 0],
      });
    case 'elbow':
      return pose({
        ...g,
        upperArmR: [lerp(-0.2, -1.3, e), 0, -0.3],
        forearmR: [-2.2, 0, 0],
        spine: [lerp(0.05, 0.35, e), 0, 0],
      });
    case 'uppercut':
      return pose({
        ...g,
        upperArmR: [lerp(-0.8, -2.7, e), 0, -0.2],
        forearmR: [lerp(-1.6, -0.4, e), 0, 0],
        spine: [lerp(0.3, -0.05, e), 0, 0],
      }, { hipsY: lerp(-0.3, -0.05, e) });
    case 'throw':
      return pose({
        ...g,
        upperArmL: [-1.4, 0, 0.3],
        forearmL: [-1.2, 0, 0],
        upperArmR: [-1.4, 0, -0.3],
        forearmR: [-1.2, 0, 0],
        spine: [0.3, 0, 0],
      });
    default:
      return idle(0);
  }
}

function crouchPose(block: boolean): Pose {
  const arms: RotMap = block
    ? guard(0)
    : { upperArmL: [-0.5, 0, 0.2], forearmL: [-1.2, 0, 0], upperArmR: [-0.5, 0, -0.2], forearmR: [-1.2, 0, 0] };
  return pose({
    ...arms,
    spine: [0.3, 0, 0],
    thighL: [-1.3, 0, 0],
    shinL: [1.6, 0, 0],
    thighR: [-1.1, 0, 0],
    shinR: [1.7, 0, 0],
  }, { hipsY: -0.38 });
}

function jumpPose(): Pose {
  return pose({
    upperArmL: [-1.3, 0, 0.3],
    forearmL: [-1.3, 0, 0],
    upperArmR: [-1.3, 0, -0.3],
    forearmR: [-1.3, 0, 0],
    spine: [0.1, 0, 0],
    thighL: [-1.0, 0, 0],
    shinL: [1.3, 0, 0],
    thighR: [-0.5, 0, 0],
    shinR: [1.0, 0, 0],
  });
}

function dodgePose(sub: Fighter['sub'], frame: number): Pose {
  const k = Math.min(1, frame / 6);
  if (sub === 'back') {
    return pose({ ...guard(0), spine: [-0.25 * k, 0, 0], thighL: [-0.2, 0, 0], thighR: [0.3, 0, 0] }, { hipsY: -0.05 * k });
  }
  return pose({ ...guard(0), spine: [0.05, 0, 0] }, { bodyYaw: (sub === 'left' ? 0.6 : -0.6) * k });
}

/** Pose à partir de l'état complet du combattant (action, coup en cours, frame). */
export function poseFor(f: Fighter, t: number): Pose {
  switch (f.action) {
    case 'attack':
      return f.move ? attackPose(getMove(f.characterId, f.move), f.moveFrame) : idle(t);
    case 'walkFwd':
      return cycle(t * 8, 0.45, 0.08, 0.15);
    case 'walkBack':
      return cycle(-t * 7, 0.35, -0.02, 0.1);
    case 'sideL':
      return { ...cycle(t * 8, 0.3, 0.05, 0.1), bodyYaw: 0.5 };
    case 'sideR':
      return { ...cycle(t * 8, 0.3, 0.05, 0.1), bodyYaw: -0.5 };
    case 'runFwd':
      return cycle(t * 12, 0.9, 0.4, 0.5);
    case 'crouch':
      return crouchPose(false);
    case 'crouchBlock':
      return crouchPose(true);
    case 'block':
      return pose({ ...guard(0), spine: [-0.05, 0, 0] });
    case 'jump':
      return jumpPose();
    case 'dodge':
      return dodgePose(f.sub, f.moveFrame);
    case 'parry':
      return pose({
        upperArmL: [-1.2, 0, 0.3],
        forearmL: [-1.0, 0, 0],
        upperArmR: [-1.2, 0, -0.3],
        forearmR: [-1.0, 0, 0],
        spine: [0.1, 0, 0],
      });
    case 'hitstun':
      return pose({
        spine: [-0.35, 0, 0],
        head: [-0.3, 0, 0],
        upperArmL: [-0.4, 0, 0.6],
        forearmL: [-0.6, 0, 0],
        upperArmR: [-0.4, 0, -0.6],
        forearmR: [-0.6, 0, 0],
        thighL: [-0.2, 0, 0],
        shinL: [0.6, 0, 0],
        thighR: [0.2, 0, 0],
        shinR: [0.4, 0, 0],
      });
    case 'knockdown':
    case 'thrown':
      return pose({
        upperArmL: [0, 0, 0.9],
        upperArmR: [0, 0, -0.9],
        thighL: [0, 0, 0],
        thighR: [0, 0, 0],
      }, { lying: true });
    case 'getup': {
      const k = f.stun / GETUP_TICKS;
      return pose({ ...guard(0), spine: [0.5 * k, 0, 0] }, { hipsY: -0.3 * k, lying: k > 0.5 });
    }
    case 'victory':
      return pose({
        upperArmL: [-2.6, 0, 0.2],
        forearmL: [-0.2, 0, 0],
        upperArmR: [-2.6, 0, -0.2],
        forearmR: [-0.2, 0, 0],
        spine: [-0.05 + 0.03 * Math.sin(t * 4), 0, 0],
      });
    default:
      return idle(t);
  }
}
