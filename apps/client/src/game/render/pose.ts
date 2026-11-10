import type { ActionState } from '@iron/engine';
import type { BoneName } from './rig';

/**
 * Pose procédurale cible par état d'action (rotations Euler en radians, repère local de l'os).
 * Convention du modèle : il regarde +Z ; rotation.x < 0 = membre vers l'avant, > 0 = vers l'arrière ;
 * pour le buste, rotation.x > 0 = penché vers l'avant.
 * Sera remplacé par un AnimationMixer quand les GLB arriveront ; l'API (état → pose) reste la même.
 */
export type Euler3 = readonly [number, number, number];
export interface Pose {
  rot: Partial<Record<BoneName, Euler3>>;
  /** Décalage vertical du bassin (m). */
  hipsY: number;
  /** Rotation du corps entier autour de Y (pas de côté). */
  bodyYaw: number;
}

const guardArms = (sw: number) => ({
  upperArmL: [-1.1 + sw, 0, 0.15] as Euler3,
  forearmL: [-1.5, 0, 0] as Euler3,
  upperArmR: [-1.0 - sw, 0, -0.15] as Euler3,
  forearmR: [-1.6, 0, 0] as Euler3,
});

/** Cycle de marche/course : `amp` = amplitude des jambes, `phase` en radians. */
function cycle(phase: number, amp: number, lean: number, arms: number): Pose {
  const s = Math.sin(phase);
  const bendL = 0.45 + 0.7 * amp * Math.max(0, Math.cos(phase));
  const bendR = 0.45 + 0.7 * amp * Math.max(0, -Math.cos(phase));
  return {
    hipsY: -0.06 - 0.025 * Math.abs(Math.cos(phase)),
    bodyYaw: 0,
    rot: {
      ...guardArms(s * arms),
      spine: [lean, 0, 0],
      thighL: [-0.3 + s * amp, 0, 0],
      thighR: [0.15 - s * amp, 0, 0],
      shinL: [bendL, 0, 0],
      shinR: [bendR * 0.6, 0, 0],
      head: [-lean * 0.6, 0, 0],
    },
  };
}

export function poseFor(action: ActionState, t: number): Pose {
  switch (action) {
    case 'walkFwd':
      return cycle(t * 8, 0.45, 0.08, 0.15);
    case 'walkBack':
      return cycle(-t * 7, 0.35, -0.02, 0.1);
    case 'sideL':
    case 'sideR':
      return { ...cycle(t * 8, 0.3, 0.05, 0.1), bodyYaw: action === 'sideL' ? 0.5 : -0.5 };
    case 'runFwd':
      return cycle(t * 12, 0.9, 0.4, 0.5);
    case 'dashL':
    case 'dashR':
      return { ...cycle(t * 12, 0.7, 0.3, 0.3), bodyYaw: action === 'dashL' ? 0.9 : -0.9 };
    case 'crouch':
      return {
        hipsY: -0.38,
        bodyYaw: 0,
        rot: {
          ...guardArms(0),
          spine: [0.3, 0, 0],
          thighL: [-1.3, 0, 0],
          shinL: [1.6, 0, 0],
          thighR: [-1.1, 0, 0],
          shinR: [1.7, 0, 0],
        },
      };
    case 'jump':
      return {
        hipsY: 0,
        bodyYaw: 0,
        rot: {
          upperArmL: [-1.3, 0, 0.3],
          forearmL: [-1.3, 0, 0],
          upperArmR: [-1.3, 0, -0.3],
          forearmR: [-1.3, 0, 0],
          spine: [0.1, 0, 0],
          thighL: [-1.0, 0, 0],
          shinL: [1.3, 0, 0],
          thighR: [-0.5, 0, 0],
          shinR: [1.0, 0, 0],
        },
      };
    case 'idle':
    default: {
      const b = Math.sin(t * 2.4);
      return {
        hipsY: -0.06 + b * 0.012,
        bodyYaw: 0,
        rot: {
          ...guardArms(b * 0.04),
          spine: [0.06 + b * 0.015, 0, 0],
          chest: [b * 0.02, 0, 0],
          thighL: [-0.3, 0, 0],
          shinL: [0.45, 0, 0],
          thighR: [0.15, 0, 0],
          shinR: [0.15, 0, 0],
        },
      };
    }
  }
}
