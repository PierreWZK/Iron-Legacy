import { GETUP_TICKS, getMove, type Fighter, type MoveDef, type MoveId, type World } from '@iron/engine';
import type { BoneName } from './rig';

/**
 * Pose procédurale par état (rotations Euler en radians, repère local de l'os).
 * Convention : le modèle regarde +Z ; rotation.x < 0 = membre vers l'avant ; pour le buste, > 0 = penché avant.
 * Chaque style de coup (`MoveDef.limb`) a sa pose ; les projections ont une chorégraphie à deux corps.
 */
export type Euler3 = readonly [number, number, number];
export type RotMap = Partial<Record<BoneName, Euler3>>;

/** Transformation globale du corps (chute, projection) autour de son centre. */
export interface RootXform {
  /** Hauteur du centre du corps au-dessus du sol (m). */
  centerY: number;
  rotX: number;
  rotZ: number;
}

export interface Pose {
  rot: RotMap;
  /** Décalage vertical du bassin (m). */
  hipsY: number;
  /** Rotation du corps autour de Y (pas de côté, esquive, coups tournants). */
  bodyYaw: number;
  /** Le corps est à terre (knockdown, relevé). */
  lying: boolean;
  /** Si défini, remplace le calcul de `lying` (projection en cours). */
  root?: RootXform;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
/** Interpolation lissée : 0 avant a, 1 après b. */
const sm = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function pose(rot: RotMap, o: { hipsY?: number; bodyYaw?: number; lying?: boolean; root?: RootXform } = {}): Pose {
  return { rot, hipsY: o.hipsY ?? 0, bodyYaw: o.bodyYaw ?? 0, lying: o.lying ?? false, root: o.root };
}

const STANCE: RotMap = {
  thighL: [-0.3, 0, 0], shinL: [0.45, 0, 0], thighR: [0.15, 0, 0], shinR: [0.15, 0, 0],
};
const CROUCH_LEGS: RotMap = {
  thighL: [-1.3, 0, 0], shinL: [1.6, 0, 0], thighR: [-1.1, 0, 0], shinR: [1.7, 0, 0],
};
const JUMP_LEGS: RotMap = {
  thighL: [-1.0, 0, 0], shinL: [1.3, 0, 0], thighR: [-0.5, 0, 0], shinR: [1.0, 0, 0],
};

/** Jambes entre la garde (0) et l'accroupi complet (1). */
function legsBlend(c: number): RotMap {
  const out: RotMap = {};
  for (const k of ['thighL', 'shinL', 'thighR', 'shinR'] as const) {
    const a = STANCE[k]!;
    const b = CROUCH_LEGS[k]!;
    out[k] = [lerp(a[0], b[0], c), 0, 0];
  }
  return out;
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
    ...STANCE,
    spine: [0.06 + b * 0.015, 0, 0],
    chest: [b * 0.02, 0, 0],
  }, { hipsY: b * 0.012 });
}

/** Extension d'un coup entre 0 (repos) et 1 (impact) selon la frame. */
function extension(m: MoveDef, frame: number): number {
  if (frame <= m.startup) return (frame / m.startup) * 0.3;
  if (frame <= m.startup + m.active) return 1;
  return Math.max(0, 1 - (frame - m.startup - m.active) / m.recovery);
}

/** Niveau d'accroupi pendant le coup (0 debout, 1 accroupi). */
const CROUCH_LEVEL: Partial<Record<MoveId, number>> = {
  lowJab: 1, uppercut: 1, lowKick: 1, sweep: 1, hookPunch: 0.6, risingHook: 0.6, slideKick: 0.8, dragonKick: 0.4,
};

function attackPose(id: MoveId, m: MoveDef, frame: number): Pose {
  const e = extension(m, frame);
  const c = CROUCH_LEVEL[id] ?? 0;
  const base = legsBlend(c);
  const g = guard(0);
  const mk = (rot: RotMap, o: { hipsY?: number; bodyYaw?: number } = {}): Pose =>
    pose({ ...base, ...rot }, { hipsY: (o.hipsY ?? 0) - 0.38 * c, bodyYaw: o.bodyYaw });

  switch (m.limb) {
    case 'punchL':
      return mk({ ...g, upperArmL: [lerp(-1.1, -1.6, e), 0, 0.15], forearmL: [lerp(-1.5, 0, e), 0, 0], spine: [lerp(0.05, 0.2, e), 0, 0] });
    case 'punchR':
      return mk({ ...g, upperArmR: [lerp(-1.0, -1.6, e), 0, -0.15], forearmR: [lerp(-1.6, 0, e), 0, 0], spine: [lerp(0.05, 0.25, e), 0, 0] });
    case 'hook':
      return mk({ ...g, upperArmR: [-1.45, 0, lerp(-0.2, -1.3, e)], forearmR: [-1.7, 0, 0], spine: [lerp(0.05, 0.25, e), 0, 0] }, { bodyYaw: lerp(0, -0.6, e) });
    case 'risingHook':
      return mk({ ...g, upperArmR: [lerp(-0.6, -2.4, e), 0, -0.3], forearmR: [lerp(-1.8, -0.6, e), 0, 0], spine: [lerp(0.4, -0.1, e), 0, 0] });
    case 'backFist':
      return mk({ ...g, upperArmR: [-0.3, 0, lerp(-0.3, -1.55, e)], forearmR: [lerp(-1.6, 0, e), 0, 0], spine: [0.1, 0, 0] }, { bodyYaw: lerp(0, -1.1, e) });
    case 'elbow':
      return mk({ ...g, upperArmR: [lerp(-0.2, -1.3, e), 0, -0.3], forearmR: [-2.2, 0, 0], spine: [lerp(0.05, 0.35, e), 0, 0] });
    case 'uppercut':
      return mk({ ...g, upperArmR: [lerp(-0.8, -2.7, e), 0, -0.2], forearmR: [lerp(-1.6, -0.4, e), 0, 0], spine: [lerp(0.3, -0.05, e), 0, 0] }, { hipsY: lerp(0, 0.25, e) });
    case 'lunge':
      return mk({
        ...g, upperArmL: [lerp(-1.1, -1.6, e), 0, 0.15], forearmL: [lerp(-1.5, 0, e), 0, 0], spine: [lerp(0.1, 0.35, e), 0, 0],
        thighL: [lerp(-0.3, -0.9, e), 0, 0], shinL: [lerp(1.2, 0.6, e), 0, 0], thighR: [lerp(0.15, 0.6, e), 0, 0], shinR: [0.1, 0, 0],
      });
    case 'kickL':
      if (m.height === 'low') {
        return mk({ ...g, thighL: [lerp(-1.3, -1.45, e), 0, 0], shinL: [lerp(1.6, 0.1, e), 0, 0], spine: [lerp(0.3, 0.15, e), 0, 0] });
      }
      return mk({ ...g, spine: [lerp(0.05, -0.12, e), 0, 0], thighL: [lerp(-0.3, -1.5, e), 0, 0], shinL: [lerp(1.4, 0.05, e), 0, 0] });
    case 'kickR':
      if (m.height === 'low') {
        return mk({ ...g, thighR: [lerp(-1.1, -1.45, e), 0, lerp(0, 0.9, e)], shinR: [lerp(1.7, 0.1, e), 0, 0], spine: [0.25, 0, 0] }, { bodyYaw: lerp(0, -1.0, e) });
      }
      return mk({ ...g, spine: [lerp(0.05, -0.12, e), 0, 0], thighR: [lerp(-0.3, -1.3, e), 0, 0], shinR: [lerp(1.4, 0.1, e), 0, 0] }, { bodyYaw: lerp(0, -0.7, e) });
    case 'knee':
      return mk({ ...g, thighL: [lerp(-0.3, -2.0, e), 0, 0], shinL: [lerp(0.45, 2.1, e), 0, 0], spine: [lerp(0.05, 0.35, e), 0, 0] });
    case 'axe':
      return mk({ ...g, thighR: [lerp(-0.3, -2.6, Math.min(1, e * 1.15)), 0, 0], shinR: [lerp(1.4, 0.1, e), 0, 0], spine: [lerp(0.05, -0.3, e), 0, 0] });
    case 'sideKick':
      return mk({ ...g, thighR: [lerp(-0.3, -1.25, e), 0, lerp(0, 0.2, e)], shinR: [lerp(1.4, 0.05, e), 0, 0], spine: [lerp(0.05, -0.25, e), 0, 0] }, { bodyYaw: lerp(0, 1.0, e) });
    case 'spinKick':
      // Coup tournant : le corps se retourne, la jambe part vers l'arrière (donc vers l'adversaire).
      return mk({ ...g, thighR: [lerp(0.15, 1.5, e), 0, 0], shinR: [lerp(0.15, 0.1, e), 0, 0], spine: [lerp(0.05, 0.8, e), 0, 0] }, { bodyYaw: lerp(0, Math.PI, e) });
    case 'slide':
      return mk({
        upperArmL: [lerp(-1.1, 0.4, e), 0, 0.5], forearmL: [-0.3, 0, 0], upperArmR: [lerp(-1.0, 0.4, e), 0, -0.5], forearmR: [-0.3, 0, 0],
        thighL: [lerp(-0.6, -1.5, e), 0, 0], shinL: [lerp(0.8, 0.1, e), 0, 0], thighR: [-1.4, 0, 0], shinR: [1.8, 0, 0],
        spine: [lerp(0, -0.5, e), 0, 0],
      }, { hipsY: lerp(0, -0.2, e) });
    case 'dragon':
      return mk({
        upperArmL: [-0.6, 0, 0.5], forearmL: [-0.4, 0, 0], upperArmR: [-0.6, 0, -0.5], forearmR: [-0.4, 0, 0],
        thighL: [lerp(-0.3, -1.6, e), 0, 0], shinL: [lerp(1.4, 0.05, e), 0, 0], thighR: [-0.5, 0, 0], shinR: [1.5, 0, 0],
        spine: [lerp(0.05, -0.35, e), 0, 0],
      }, { hipsY: lerp(0, 0.2, e) });
    case 'tackle':
      return mk({
        upperArmL: [-0.9, 0, 0.4], forearmL: [-1.4, 0, 0], upperArmR: [-0.9, 0, -0.4], forearmR: [-1.4, 0, 0],
        thighL: [-0.9, 0, 0], shinL: [0.6, 0, 0], thighR: [0.5, 0, 0], shinR: [0.4, 0, 0], spine: [lerp(0.3, 1.1, e), 0, 0],
      }, { hipsY: lerp(0, -0.25, e), bodyYaw: lerp(0, 0.35, e) });
    case 'flying':
      return mk({
        upperArmL: [-0.3, 0, 0.7], forearmL: [-0.5, 0, 0], upperArmR: [-0.3, 0, -0.7], forearmR: [-0.5, 0, 0],
        thighL: [lerp(-0.4, -1.55, e), 0, 0], shinL: [lerp(1.2, 0.05, e), 0, 0], thighR: [0.4, 0, 0], shinR: [0.6, 0, 0],
        spine: [lerp(0.1, 0.6, e), 0, 0],
      }, { hipsY: lerp(0, 0.2, e) });
    case 'airPunch':
      return mk({ ...g, ...JUMP_LEGS, upperArmL: [lerp(-1.1, -1.6, e), 0, 0.15], forearmL: [lerp(-1.5, 0, e), 0, 0], spine: [0.1, 0, 0] });
    case 'airElbow':
      return mk({ ...g, ...JUMP_LEGS, upperArmR: [lerp(-0.2, -1.3, e), 0, -0.3], forearmR: [-2.2, 0, 0], spine: [lerp(0.05, 0.35, e), 0, 0] });
    case 'jumpKick':
      return mk({ ...g, thighL: [lerp(-0.8, -1.5, e), 0, 0], shinL: [lerp(1.6, 0.05, e), 0, 0], thighR: [-0.5, 0, 0], shinR: [1.0, 0, 0], spine: [-0.1 * e, 0, 0] });
    case 'airRound':
      return mk({ ...g, thighR: [lerp(-0.3, -1.4, e), 0, 0], shinR: [lerp(1.4, 0.05, e), 0, 0], thighL: [-0.8, 0, 0], shinL: [1.0, 0, 0], spine: [lerp(0.05, -0.12, e), 0, 0] }, { bodyYaw: lerp(0, -0.9, e) });
    default:
      return throwAttackerPose(m.limb, extensionToProgress(m, frame));
  }
}

/** Avant la prise (p < 0) : bras tendus vers l'adversaire ; ensuite chorégraphie (p de 0 à 1). */
function extensionToProgress(m: MoveDef, frame: number): number {
  return (frame - (m.startup + 1)) / (m.sequence ?? 40);
}

/** Pose de l'attaquant pendant une projection. `p` < 0 : approche ; 0 à 1 : séquence ; > 1 : récupération. */
export function throwAttackerPose(limb: MoveDef['limb'], p: number): Pose {
  if (p < 0) {
    const e = clamp01(1 + p * 6); // les ~6 dernières frames avant la prise : bras qui se tendent
    return pose({
      ...STANCE,
      upperArmL: [lerp(-1.1, -1.4, e), 0, lerp(0.15, 0.35, e)], forearmL: [lerp(-1.5, -0.9, e), 0, 0],
      upperArmR: [lerp(-1.0, -1.4, e), 0, lerp(-0.15, -0.35, e)], forearmR: [lerp(-1.6, -0.9, e), 0, 0],
      spine: [lerp(0.05, 0.3, e), 0, 0],
    });
  }
  const q = clamp01(p);
  const rec = sm(0.82, 1, q);
  const settle = (v: number, rest: number) => lerp(v, rest, rec);
  switch (limb) {
    case 'hipToss': {
      const turn = sm(0.1, 0.5, q);
      const toss = sm(0.5, 0.8, q);
      const yaw = lerp(lerp(0, 1.3, turn), -0.2, toss);
      return pose({
        ...legsBlend(0.4 * (1 - rec)),
        upperArmL: [settle(-1.0, -1.1), 0, 0.7], forearmL: [-1.0, 0, 0], upperArmR: [settle(-1.0, -1.0), 0, -0.7], forearmR: [-1.0, 0, 0],
        spine: [settle(lerp(0.2, 0.7, toss), 0.06), 0, 0],
      }, { bodyYaw: settle(yaw, 0), hipsY: -0.15 * (1 - rec) });
    }
    case 'suplex': {
      const bridge = sm(0.2, 0.6, q);
      const slam = sm(0.6, 0.85, q);
      const arms = lerp(lerp(-1.3, -2.6, bridge), -0.6, slam);
      return pose({
        ...legsBlend(0.2 * (1 - rec)),
        upperArmL: [settle(arms, -1.1), 0, 0.25], forearmL: [-0.7, 0, 0], upperArmR: [settle(arms, -1.0), 0, -0.25], forearmR: [-0.7, 0, 0],
        spine: [settle(lerp(lerp(0.35, -1.1, bridge), 0.7, slam), 0.06), 0, 0],
      }, { hipsY: -0.18 * bridge * (1 - slam) * (1 - rec) });
    }
    case 'legThrow': {
      const drop = sm(0, 0.25, q);
      const pull = sm(0.3, 0.65, q);
      return pose({
        ...legsBlend(lerp(drop, 0.2, pull) * (1 - rec)),
        upperArmL: [settle(lerp(-0.6, -1.3, pull), -1.1), 0, 0.3], forearmL: [-0.5, 0, 0],
        upperArmR: [settle(lerp(-0.6, -1.3, pull), -1.0), 0, -0.3], forearmR: [-0.5, 0, 0],
        spine: [settle(lerp(lerp(0.2, 0.95, drop), 0.2, pull), 0.06), 0, 0],
      }, { hipsY: -0.5 * drop * (1 - 0.6 * pull) * (1 - rec) });
    }
    default: {
      // 'throw' : prise, élévation à deux mains, projection vers le bas.
      const lift = sm(0.15, 0.5, q);
      const slam = sm(0.5, 0.78, q);
      const arms = lerp(lerp(-1.4, -2.9, lift), -0.5, slam);
      return pose({
        ...STANCE,
        upperArmL: [settle(arms, -1.1), 0, 0.25], forearmL: [-0.8, 0, 0], upperArmR: [settle(arms, -1.0), 0, -0.25], forearmR: [-0.8, 0, 0],
        spine: [settle(lerp(lerp(0.3, -0.3, lift), 1.0, slam), 0.06), 0, 0],
      }, { hipsY: -0.2 * slam * (1 - rec) });
    }
  }
}

/** Pose et transformation du corps de l'adversaire pendant la projection (arc, rotations, chute). */
export function throwDefenderPose(limb: MoveDef['limb'], p: number): Pose {
  const q = clamp01(p);
  const land = sm(0.78, 0.95, q);
  const lying = -Math.PI / 2;
  const flail: RotMap = {
    upperArmL: [-2.4, 0, 0.6], forearmL: [-0.4, 0, 0], upperArmR: [-2.4, 0, -0.6], forearmR: [-0.4, 0, 0],
    thighL: [-0.9, 0, 0], shinL: [0.8, 0, 0], thighR: [-0.5, 0, 0], shinR: [0.6, 0, 0], spine: [-0.2, 0, 0],
  };
  const relaxed: RotMap = { upperArmL: [0, 0, 0.9], upperArmR: [0, 0, -0.9] };
  const rot = land > 0.5 ? relaxed : flail;
  const settleY = (y: number) => lerp(y, 0.2, land);

  switch (limb) {
    case 'hipToss': {
      const arc = Math.sin(sm(0.2, 0.78, q) * Math.PI);
      return pose(rot, { root: {
        centerY: settleY(0.9 + 0.2 * sm(0, 0.2, q) + 1.1 * arc),
        rotX: lying * sm(0.5, 0.92, q),
        rotZ: 2.0 * Math.sin(sm(0.2, 0.75, q) * Math.PI),
      } });
    }
    case 'suplex': {
      // Salto avant par-dessus l'attaquant, atterrissage sur le dos derrière lui.
      const arc = Math.sin(sm(0.25, 0.8, q) * Math.PI);
      return pose(rot, { root: {
        centerY: settleY(0.9 + 0.3 * sm(0, 0.25, q) + 2.0 * arc),
        rotX: (3 * Math.PI / 2) * sm(0.25, 0.86, q),
        rotZ: 0,
      } });
    }
    case 'legThrow': {
      const arc = Math.sin(sm(0.3, 0.8, q) * Math.PI);
      return pose({ ...rot, ...(land > 0.5 ? {} : { thighL: [-1.4, 0, 0], thighR: [-1.4, 0, 0] }) }, { root: {
        centerY: settleY(0.9 - 0.2 * sm(0, 0.3, q) + 0.5 * arc),
        rotX: lying * sm(0.3, 0.72, q),
        rotZ: 0,
      } });
    }
    default: {
      const arc = Math.sin(sm(0.12, 0.78, q) * Math.PI);
      return pose(rot, { root: {
        centerY: settleY(0.9 + 0.3 * sm(0, 0.12, q) + 1.4 * arc),
        rotX: -0.5 * Math.sin(sm(0.1, 0.7, q) * Math.PI) + lying * sm(0.45, 0.88, q),
        rotZ: 0,
      } });
    }
  }
}

function crouchPose(block: boolean): Pose {
  const arms: RotMap = block
    ? guard(0)
    : { upperArmL: [-0.5, 0, 0.2], forearmL: [-1.2, 0, 0], upperArmR: [-0.5, 0, -0.2], forearmR: [-1.2, 0, 0] };
  return pose({ ...arms, ...CROUCH_LEGS, spine: [0.3, 0, 0] }, { hipsY: -0.38 });
}

function jumpPose(): Pose {
  return pose({
    upperArmL: [-1.3, 0, 0.3], forearmL: [-1.3, 0, 0], upperArmR: [-1.3, 0, -0.3], forearmR: [-1.3, 0, 0],
    ...JUMP_LEGS, spine: [0.1, 0, 0],
  });
}

function dodgePose(sub: Fighter['sub'], frame: number): Pose {
  const k = Math.min(1, frame / 6);
  if (sub === 'back') {
    return pose({ ...guard(0), spine: [-0.25 * k, 0, 0], thighL: [-0.2, 0, 0], thighR: [0.3, 0, 0] }, { hipsY: -0.05 * k });
  }
  return pose({ ...guard(0), ...STANCE, spine: [0.05, 0, 0] }, { bodyYaw: (sub === 'left' ? 0.6 : -0.6) * k });
}

/** Pose à partir de l'état complet du combattant (action, coup en cours, frame) et du monde (projections). */
export function poseFor(f: Fighter, t: number, w: World): Pose {
  if (f.action === 'thrown' && f.thrownBy !== null) {
    const a = w.fighters[f.thrownBy];
    const m = a && a.move ? getMove(a.characterId, a.move) : null;
    if (a && m && m.throw) return throwDefenderPose(m.limb, extensionToProgress(m, a.moveFrame));
  }
  switch (f.action) {
    case 'attack':
      if (!f.move) return idle(t);
      return attackPose(f.move, getMove(f.characterId, f.move), f.moveFrame);
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
      return pose({ ...guard(0), ...STANCE, spine: [-0.05, 0, 0] });
    case 'jump':
      return jumpPose();
    case 'dodge':
      return dodgePose(f.sub, f.moveFrame);
    case 'parry':
      return pose({
        upperArmL: [-1.2, 0, 0.3], forearmL: [-1.0, 0, 0], upperArmR: [-1.2, 0, -0.3], forearmR: [-1.0, 0, 0], ...STANCE, spine: [0.1, 0, 0],
      });
    case 'hitstun':
      return pose({
        spine: [-0.35, 0, 0], head: [-0.3, 0, 0],
        upperArmL: [-0.4, 0, 0.6], forearmL: [-0.6, 0, 0], upperArmR: [-0.4, 0, -0.6], forearmR: [-0.6, 0, 0],
        thighL: [-0.2, 0, 0], shinL: [0.6, 0, 0], thighR: [0.2, 0, 0], shinR: [0.4, 0, 0],
      });
    case 'knockdown':
    case 'thrown':
      return pose({ upperArmL: [0, 0, 0.9], upperArmR: [0, 0, -0.9], thighL: [0, 0, 0], thighR: [0, 0, 0] }, { lying: true });
    case 'getup': {
      const k = f.stun / GETUP_TICKS;
      return pose({ ...guard(0), ...STANCE, spine: [0.5 * k, 0, 0] }, { hipsY: -0.3 * k, lying: k > 0.5 });
    }
    case 'victory':
      return pose({
        upperArmL: [-2.6, 0, 0.2], forearmL: [-0.2, 0, 0], upperArmR: [-2.6, 0, -0.2], forearmR: [-0.2, 0, 0],
        ...STANCE, spine: [-0.05 + 0.03 * Math.sin(t * 4), 0, 0],
      });
    default:
      return idle(t);
  }
}
