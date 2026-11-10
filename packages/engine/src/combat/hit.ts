import { Btn, has } from '../input';
import { getMove, type MoveDef } from '../characters';
import {
  CROUCH_HURT_TOP, DODGE_INVULN, HEIGHT_Y, HITBOX_HALF, HURT_RADIUS, STAND_HURT_TOP,
} from '../constants';
import type { Fighter } from '../state';

/** Actions dans lesquelles le défenseur peut bloquer (pas en attaque, stun, esquive…). */
const BLOCKABLE = new Set<string>([
  'idle', 'walkFwd', 'walkBack', 'sideL', 'sideR', 'runFwd', 'crouch', 'crouchBlock', 'block',
]);

export const isAirborne = (f: Fighter): boolean => f.pos.y > 0 || f.vel.y > 0;

/** Un combattant peut-il recevoir un coup ? (knockdown et projection = immunisés ; esquive = invulnérable en début). */
export function canBeHit(d: Fighter): boolean {
  if (d.health <= 0) return false;
  switch (d.action) {
    case 'knockdown':
    case 'thrown':
    case 'victory':
      return false;
    case 'dodge':
      return d.moveFrame > DODGE_INVULN;
    case 'attack':
      // Pendant la séquence d'une projection réussie, le projeteur est intouchable.
      return !(d.move !== null && d.moveHit && getMove(d.characterId, d.move).throw === true);
    default:
      return true;
  }
}

/** Plage verticale touchable du défenseur (hurtbox). */
export function hurtSpan(d: Fighter): [number, number] {
  if (isAirborne(d)) return [d.pos.y, d.pos.y + STAND_HURT_TOP];
  return d.crouched ? [0, CROUCH_HURT_TOP] : [0, STAND_HURT_TOP];
}

/** Hitbox du coup (sphère au point d'impact) contre hurtbox (cylindre) du défenseur. */
export function hitboxOverlaps(a: Fighter, m: MoveDef, d: Fighter): boolean {
  const hx = a.pos.x + a.facing.x * m.reach;
  const hz = a.pos.z + a.facing.z * m.reach;
  const hy = a.pos.y + HEIGHT_Y[m.height];
  if (Math.hypot(hx - d.pos.x, hz - d.pos.z) > m.radius + HURT_RADIUS) return false;
  const [lo, hi] = hurtSpan(d);
  return hy + HITBOX_HALF >= lo && hy - HITBOX_HALF <= hi;
}

/**
 * Blocage : maintenir arrière (et bas pour les attaques basses).
 * Ne bloque pas pendant une attaque, un stun ou une esquive.
 */
export function isBlocking(d: Fighter, m: MoveDef): boolean {
  if (!BLOCKABLE.has(d.action) || m.throw) return false;
  if (!has(d.input, Btn.Back)) return false;
  if (m.height === 'low') return d.crouched;
  return true;
}

/** Multiplicateur de dégâts selon le nombre de coups déjà enchaînés (combo scaling). */
export function comboScale(previousHits: number): number {
  return Math.max(0.5, 1 - 0.07 * previousHits);
}
