import {
  ARENA_RADIUS,
  DT,
  FIGHTER_RADIUS,
  GRAVITY,
  JUMP_VELOCITY,
  MIN_DIST,
  PUSH_MAX_HEIGHT,
  RUN_FWD,
  SIDE_DASH,
  SIDE_WALK,
  WALK_BACK,
  WALK_FWD,
} from './constants';
import { Btn, has, type InputFrame } from './input';
import type { ActionState, Fighter, Vec3, World } from './state';

/** Cible = adversaire vivant (autre équipe) le plus proche, mesuré sur la position du début de tick. */
function pickTarget(self: Fighter, snap: Vec3[], all: Fighter[]): Vec3 | null {
  let best: Vec3 | null = null;
  let bestD = Infinity;
  for (const o of all) {
    if (o.id === self.id || o.team === self.team || o.health <= 0) continue;
    const p = snap[o.id]!;
    const d = (p.x - self.pos.x) ** 2 + (p.z - self.pos.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function setAction(f: Fighter, a: ActionState): void {
  if (f.action !== a) {
    f.action = a;
    f.actionTicks = 0;
  } else {
    f.actionTicks++;
  }
}

/**
 * Déplacement au sol relatif à la cible : avancer/reculer change la distance, le pas de côté
 * fait ORBITER autour de la cible à distance constante (pas de trigonométrie : renormalisation).
 */
function moveGrounded(f: Fighter, target: Vec3, fwd: number, side: number, fwdSpeed: number, sideSpeed: number): void {
  let rx = f.pos.x - target.x;
  let rz = f.pos.z - target.z;
  const dist = Math.max(Math.hypot(rx, rz), MIN_DIST);
  rx /= dist;
  rz /= dist;
  const newDist = Math.max(dist - fwd * fwdSpeed * DT, MIN_DIST);
  if (side !== 0) {
    // Droite du combattant r = (-fz, fx) ; side > 0 = droite.
    const tx = -f.facing.z * side;
    const tz = f.facing.x * side;
    const k = (sideSpeed * DT) / newDist;
    rx += tx * k;
    rz += tz * k;
    const n = Math.hypot(rx, rz) || 1;
    rx /= n;
    rz /= n;
  }
  f.pos.x = target.x + rx * newDist;
  f.pos.z = target.z + rz * newDist;
}

function stepFighter(f: Fighter, input: InputFrame, snap: Vec3[], all: Fighter[]): void {
  const target = pickTarget(f, snap, all);
  if (target) {
    const dx = target.x - f.pos.x;
    const dz = target.z - f.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > MIN_DIST) {
      f.facing.x = dx / d;
      f.facing.z = dz / d;
    }
  }

  const grounded = f.pos.y <= 0 && f.vel.y <= 0;
  const before = { x: f.pos.x, z: f.pos.z };

  if (grounded) {
    f.pos.y = 0;
    f.vel.y = 0;
    const fwd = (has(input, Btn.Fwd) ? 1 : 0) - (has(input, Btn.Back) ? 1 : 0);
    const side = (has(input, Btn.SideR) ? 1 : 0) - (has(input, Btn.SideL) ? 1 : 0);
    const shift = has(input, Btn.Shift);
    const crouching = has(input, Btn.Crouch);
    const jumpPressed = has(input, Btn.Jump) && !has(f.prevInput, Btn.Jump);

    let action: ActionState = 'idle';
    if (crouching) {
      action = 'crouch';
    } else if (target) {
      const fwdSpeed = fwd > 0 ? (shift ? RUN_FWD : WALK_FWD) : WALK_BACK;
      const sideSpeed = shift ? SIDE_DASH : SIDE_WALK;
      moveGrounded(f, target, fwd, side, fwdSpeed, sideSpeed);
      if (side !== 0) action = side > 0 ? (shift ? 'dashR' : 'sideR') : shift ? 'dashL' : 'sideL';
      else if (fwd > 0) action = shift ? 'runFwd' : 'walkFwd';
      else if (fwd < 0) action = 'walkBack';
    }

    if (jumpPressed && !crouching) {
      f.vel.x = (f.pos.x - before.x) / DT;
      f.vel.z = (f.pos.z - before.z) / DT;
      f.vel.y = JUMP_VELOCITY;
      action = 'jump';
    }
    setAction(f, action);
  } else {
    // En l'air : trajectoire balistique, la vitesse horizontale est celle du décollage.
    f.pos.x += f.vel.x * DT;
    f.pos.z += f.vel.z * DT;
    f.vel.y -= GRAVITY * DT;
    f.pos.y += f.vel.y * DT;
    if (f.pos.y <= 0) {
      f.pos.y = 0;
      f.vel.x = f.vel.y = f.vel.z = 0;
    }
    setAction(f, 'jump');
  }
  f.prevInput = input;
}

/** Sépare deux pushboxes qui se chevauchent (sauf si l'un saute par-dessus l'autre). */
function resolvePushboxes(fighters: Fighter[]): void {
  const minD = FIGHTER_RADIUS * 2;
  for (let i = 0; i < fighters.length; i++) {
    for (let j = i + 1; j < fighters.length; j++) {
      const a = fighters[i]!;
      const b = fighters[j]!;
      if (a.health <= 0 || b.health <= 0) continue;
      if (a.pos.y > PUSH_MAX_HEIGHT || b.pos.y > PUSH_MAX_HEIGHT) continue;
      let dx = b.pos.x - a.pos.x;
      let dz = b.pos.z - a.pos.z;
      let d = Math.hypot(dx, dz);
      if (d >= minD) continue;
      if (d < MIN_DIST) {
        // Superposition exacte : axe arbitraire mais déterministe.
        dx = 1;
        dz = 0;
        d = 1;
      }
      const push = (minD - Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z)) / 2;
      const nx = dx / d;
      const nz = dz / d;
      a.pos.x -= nx * push;
      a.pos.z -= nz * push;
      b.pos.x += nx * push;
      b.pos.z += nz * push;
    }
  }
}

function clampToArena(f: Fighter): void {
  const max = ARENA_RADIUS - FIGHTER_RADIUS;
  const d = Math.hypot(f.pos.x, f.pos.z);
  if (d > max) {
    f.pos.x *= max / d;
    f.pos.z *= max / d;
  }
}

/** Avance le monde d'UN tick. Déterministe : mêmes entrées → même résultat. Mute `w`. */
export function stepWorld(w: World, inputs: readonly InputFrame[]): void {
  const snap = w.fighters.map((f) => ({ x: f.pos.x, y: f.pos.y, z: f.pos.z }));
  for (const f of w.fighters) stepFighter(f, inputs[f.id] ?? 0, snap, w.fighters);
  // Deux passes : la correction d'arène peut recréer un chevauchement.
  resolvePushboxes(w.fighters);
  for (const f of w.fighters) clampToArena(f);
  resolvePushboxes(w.fighters);
  for (const f of w.fighters) clampToArena(f);
  w.tick++;
}
