import {
  ARENA_RADIUS, DODGE_MOVE_TICKS, DODGE_TICKS, DT, FIGHTER_RADIUS, GETUP_TICKS, GRAVITY,
  KNOCKDOWN_TICKS, KNOCK_DECAY, MIN_DIST, PARRY_TICKS, PUSH_MAX_HEIGHT,
} from './constants';
import { getCharacter, getMove, type Speeds } from './characters';
import { attackIntent, type Stance } from './combat/intent';
import { isAirborne } from './combat/hit';
import { resolveCombat } from './combat/resolve';
import { Btn, has, type InputFrame } from './input';
import { updateMatch } from './match';
import { endMove, type DodgeSub, type Fighter, type Vec3, type World } from './state';

const ATTACK_BUTTONS = Btn.LP | Btn.RP | Btn.LK | Btn.RK;
const DODGE_TRIGGERS = Btn.Shift | Btn.Back | Btn.SideL | Btn.SideR;
/** Fenêtre (ticks) entre LP et RP pour déclencher une projection. */
const THROW_WINDOW = 4;

/**
 * Avance le monde d'UN tick. Déterministe : mêmes entrées → même résultat.
 * Ordre : intentions et physique des combattants → pushboxes → impacts → match.
 * Pendant un hit-stop, rien n'avance (ni timers ni positions).
 */
export function stepWorld(w: World, inputs: readonly InputFrame[]): void {
  w.events.length = 0;
  if (w.hitstop > 0) {
    w.hitstop--;
    w.tick++;
    return;
  }
  const snap: Vec3[] = w.fighters.map((f) => ({ x: f.pos.x, y: f.pos.y, z: f.pos.z }));
  for (const f of w.fighters) stepFighter(w, f, inputs[f.id] ?? 0, snap);
  resolvePushboxes(w.fighters);
  for (const f of w.fighters) clampToArena(f);
  resolvePushboxes(w.fighters);
  for (const f of w.fighters) clampToArena(f);
  resolveCombat(w);
  updateMatch(w);
  w.tick++;
}

function stepFighter(w: World, f: Fighter, input: InputFrame, snap: Vec3[]): void {
  const pressed = input & ~f.prevInput;
  f.prevInput = input;
  f.input = input;
  if (pressed & Btn.LP) f.lastLP = w.tick;
  if (pressed & Btn.RP) f.lastRP = w.tick;
  if (f.comboTimer > 0) f.comboTimer--;
  else f.combo = 0;
  if (w.match.phase === 'fight') control(w, f, input, pressed, snap);
  integrate(f);
  f.actionTicks++;
}

/** Décide l'action du combattant pour ce tick (états contrôlés par les entrées ou par des timers). */
function control(w: World, f: Fighter, input: InputFrame, pressed: InputFrame, snap: Vec3[]): void {
  if (f.stun > 0) {
    f.stun--;
    if (f.stun === 0) afterStun(f);
    return;
  }
  const speeds = getCharacter(f.characterId).speeds;
  const target = nearestOpponent(f, snap, w.fighters);

  switch (f.action) {
    case 'attack':
      advanceAttack(f, input, pressed);
      return;
    case 'dodge':
      advanceDodge(f, target, speeds.dodge);
      return;
    case 'parry':
      f.moveFrame++;
      if (f.moveFrame > PARRY_TICKS) endAction(f);
      return;
    default:
      break;
  }

  if (isAirborne(f)) {
    f.action = 'jump';
    if (pressed & (Btn.LK | Btn.RK)) {
      const id = attackIntent(input, pressed, 'air');
      if (id) startMove(f, id);
    }
    return;
  }

  const crouch = has(input, Btn.Crouch);
  f.crouched = crouch;
  if (target) face(f, target);
  const fwd = has(input, Btn.Fwd);
  const back = has(input, Btn.Back);
  const shift = has(input, Btn.Shift);
  const side = (has(input, Btn.SideR) ? 1 : 0) - (has(input, Btn.SideL) ? 1 : 0);

  if (throwPressed(w, f, pressed)) {
    startMove(f, 'throw');
    return;
  }
  if ((pressed & Btn.LP) && back && !crouch) {
    startAction(f, 'parry');
    return;
  }
  if (shift && !crouch && !fwd && (pressed & DODGE_TRIGGERS)) {
    if (back && side === 0) {
      startAction(f, 'dodge', 'back');
      return;
    }
    if (side !== 0) {
      startAction(f, 'dodge', side > 0 ? 'right' : 'left');
      return;
    }
  }
  if (pressed & ATTACK_BUTTONS) {
    const id = attackIntent(input, pressed, crouch ? 'crouch' : 'stand');
    if (id) {
      startMove(f, id);
      return;
    }
  }
  if ((pressed & Btn.Jump) && !crouch) {
    startJump(f, fwd, back, side, speeds);
    return;
  }
  if (crouch) {
    f.action = back ? 'crouchBlock' : 'crouch';
    return;
  }
  if (!fwd && !back && side === 0) {
    f.action = 'idle';
    return;
  }

  // Déplacement au sol. Arrière seul = recul en gardant la garde (le blocage lit l'entrée).
  const fwdSign = fwd ? 1 : back ? -1 : 0;
  const fwdSpeed = fwd ? (shift ? speeds.runFwd : speeds.walkFwd) : speeds.walkBack;
  if (target) moveGrounded(f, target, fwdSign, side, fwdSpeed, speeds.side);
  if (fwd) f.action = shift ? 'runFwd' : 'walkFwd';
  else if (side !== 0) f.action = side > 0 ? 'sideR' : 'sideL';
  else f.action = 'walkBack';
}

function advanceAttack(f: Fighter, input: InputFrame, pressed: InputFrame): void {
  if (!f.move) {
    endAction(f);
    return;
  }
  const m = getMove(f.characterId, f.move);
  f.moveFrame++;
  const total = m.startup + m.active + m.recovery;
  if (m.lunge > 0 && f.moveFrame > m.startup && f.moveFrame <= m.startup + m.active) {
    f.pos.x += f.facing.x * m.lunge * DT;
    f.pos.z += f.facing.z * m.lunge * DT;
  }
  if (f.moveFrame > total) {
    endAction(f);
    return;
  }
  if (m.cancel && f.moveHit && (pressed & ATTACK_BUTTONS)) {
    const next = attackIntent(input, pressed, stanceOf(input, f));
    if (next) startMove(f, next);
  }
}

function advanceDodge(f: Fighter, target: Vec3 | null, speed: number): void {
  f.moveFrame++;
  if (target && f.moveFrame <= DODGE_MOVE_TICKS) {
    const fwd = f.sub === 'back' ? -1 : 0;
    const side = f.sub === 'right' ? 1 : f.sub === 'left' ? -1 : 0;
    moveGrounded(f, target, fwd, side, speed, speed);
  }
  if (f.moveFrame > DODGE_TICKS) endAction(f);
}

function stanceOf(input: InputFrame, f: Fighter): Stance {
  if (isAirborne(f)) return 'air';
  return has(input, Btn.Crouch) ? 'crouch' : 'stand';
}

function throwPressed(w: World, f: Fighter, pressed: InputFrame): boolean {
  const lp = (pressed & Btn.LP) !== 0;
  const rp = (pressed & Btn.RP) !== 0;
  return (lp && w.tick - f.lastRP <= THROW_WINDOW) || (rp && w.tick - f.lastLP <= THROW_WINDOW);
}

function startAction(f: Fighter, action: Fighter['action'], sub: DodgeSub = null): void {
  f.action = action;
  f.move = null;
  f.moveFrame = 1;
  f.moveHit = false;
  f.sub = sub;
}

function startMove(f: Fighter, id: NonNullable<Fighter['move']>): void {
  f.action = 'attack';
  f.move = id;
  f.moveFrame = 1;
  f.moveHit = false;
  f.sub = null;
}

function endAction(f: Fighter): void {
  f.action = 'idle';
  endMove(f);
}

function startJump(f: Fighter, fwd: boolean, back: boolean, side: number, s: Speeds): void {
  f.action = 'jump';
  f.vel.y = s.jumpVel;
  const along = fwd ? s.runFwd * 0.8 : back ? -s.walkBack * 0.6 : 0;
  const lateral = side * s.side * 0.6;
  // Repère du combattant : droite = (-fz, fx).
  f.vel.x = f.facing.x * along + -f.facing.z * lateral;
  f.vel.z = f.facing.z * along + f.facing.x * lateral;
}

/** Fin d'un stun : les projetés se relèvent, le reste redevient neutre. */
function afterStun(f: Fighter): void {
  f.airStun = false;
  if (f.action === 'knockdown' || f.action === 'thrown') {
    f.action = 'getup';
    f.stun = GETUP_TICKS;
    return;
  }
  f.action = 'idle';
}

/** Intégration : saut et gravité en l'air, glissement et friction au sol. */
function integrate(f: Fighter): void {
  const air = isAirborne(f);
  f.pos.x += f.vel.x * DT;
  f.pos.z += f.vel.z * DT;
  if (air) {
    f.vel.y -= GRAVITY * DT;
    f.pos.y += f.vel.y * DT;
    if (f.pos.y <= 0 && f.vel.y <= 0) {
      f.pos.y = 0;
      f.vel.y = 0;
      f.vel.x = 0;
      f.vel.z = 0;
      onLand(f);
    }
  } else {
    f.vel.x *= KNOCK_DECAY;
    f.vel.z *= KNOCK_DECAY;
    if (Math.abs(f.vel.x) < 1e-3) f.vel.x = 0;
    if (Math.abs(f.vel.z) < 1e-3) f.vel.z = 0;
  }
}

function onLand(f: Fighter): void {
  if (f.action === 'attack') endMove(f);
  if (f.action === 'attack' || f.action === 'jump') f.action = 'idle';
  if (f.airStun && f.stun > 0) {
    f.action = 'knockdown';
    f.stun = KNOCKDOWN_TICKS;
    f.airStun = false;
  }
}

function nearestOpponent(f: Fighter, snap: Vec3[], all: Fighter[]): Vec3 | null {
  let best: Vec3 | null = null;
  let bestD = Infinity;
  for (const o of all) {
    if (o === f || o.team === f.team || o.health <= 0) continue;
    const p = snap[o.id]!;
    const d = (p.x - f.pos.x) ** 2 + (p.z - f.pos.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function face(f: Fighter, t: Vec3): void {
  const dx = t.x - f.pos.x;
  const dz = t.z - f.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > MIN_DIST) {
    f.facing.x = dx / d;
    f.facing.z = dz / d;
  }
}

/**
 * Déplacement au sol relatif à la cible : avancer/reculer change la distance,
 * le pas de côté fait ORBITER autour de la cible à distance constante.
 */
function moveGrounded(
  f: Fighter, target: Vec3, fwd: number, side: number, fwdSpeed: number, sideSpeed: number,
): void {
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

/** Sépare deux pushboxes qui se chevauchent (sauf si l'un saute par-dessus). */
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
      const push = (minD - d) / 2;
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
