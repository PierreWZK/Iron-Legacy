import { getMove, type MoveDef } from '../characters';
import {
  COMBO_RESET_TICKS, COUNTER_BONUS_STUN, COUNTER_DAMAGE, HEIGHT_Y, HITSTOP_BLOCK,
  HITSTOP_COUNTER, HITSTOP_HIT, KNOCKDOWN_TICKS, PARRY_STUN, PARRY_WINDOW, TECH_STUN, THROW_GRAB_DISTANCE, THROW_RANGE,
} from '../constants';
import { endMove, type Fighter, type World } from '../state';
import { canBeHit, comboScale, hitboxOverlaps, isAirborne, isBlocking } from './hit';

interface Candidate {
  a: Fighter;
  d: Fighter;
  m: MoveDef;
  kind: 'strike' | 'throw';
  counter: boolean;
  parry: boolean;
}

function stunFighter(f: Fighter, ticks: number, air: boolean): void {
  endMove(f);
  f.action = 'hitstun';
  f.stun = ticks;
  f.airStun = air;
}

function unit(dx: number, dz: number): { x: number; z: number } {
  const n = Math.hypot(dx, dz) || 1;
  return { x: dx / n, z: dz / n };
}

/** Projection : impossible sur un combattant en l'air, en attaque, en esquive ou déjà projeté. */
function canBeThrown(d: Fighter): boolean {
  if (d.pos.y > 0) return false;
  if (d.action === 'attack') return d.move !== null && getMove(d.characterId, d.move).throw === true;
  return !['dodge', 'jump', 'thrown', 'knockdown', 'getup'].includes(d.action);
}

/**
 * Détecte tous les impacts du tick sur l'état d'entrée (positions déjà déplacées), puis les applique.
 * Deux coups qui se touchent le même tick s'appliquent tous les deux (trade) : pas de priorité cachée.
 */
export function resolveCombat(w: World): void {
  if (w.match.phase !== 'fight') return;
  const cands: Candidate[] = [];
  for (const a of w.fighters) {
    if (a.action !== 'attack' || a.moveHit || !a.move) continue;
    const m = getMove(a.characterId, a.move);
    if (a.moveFrame <= m.startup || a.moveFrame > m.startup + m.active) continue;
    for (const d of w.fighters) {
      if (d === a || d.team === a.team || !canBeHit(d)) continue;
      if (m.throw) {
        if (!canBeThrown(d) || Math.hypot(d.pos.x - a.pos.x, d.pos.z - a.pos.z) > THROW_RANGE) continue;
        cands.push({ a, d, m, kind: 'throw', counter: false, parry: false });
        break;
      }
      if (!hitboxOverlaps(a, m, d)) continue;
      const counter = d.action === 'attack' && !!d.move && d.moveFrame <= getMove(d.characterId, d.move).startup;
      const parry = d.action === 'parry' && d.moveFrame <= PARRY_WINDOW && m.height !== 'low';
      cands.push({ a, d, m, kind: 'strike', counter, parry });
      break;
    }
  }
  for (const c of cands) {
    if (c.a.moveHit) continue;
    if (c.kind === 'throw') applyThrow(w, c);
    else applyStrike(w, c);
  }
}

function applyStrike(w: World, { a, d, m, counter, parry }: Candidate): void {
  a.moveHit = true;
  const hx = d.pos.x;
  const hy = d.pos.y + HEIGHT_Y[m.height];
  const hz = d.pos.z;
  const dir = unit(d.pos.x - a.pos.x, d.pos.z - a.pos.z);

  if (parry) {
    stunFighter(a, PARRY_STUN, isAirborne(a));
    w.events.push({ kind: 'parry', fighter: d.id, x: hx, y: hy, z: hz });
    w.hitstop = Math.max(w.hitstop, HITSTOP_BLOCK + 2);
    return;
  }

  if (isBlocking(d, m)) {
    const chip = Math.max(1, Math.round(m.damage * 0.1));
    d.health = Math.max(0, d.health - chip);
    endMove(d);
    d.action = d.crouched ? 'crouchBlock' : 'block';
    d.stun = m.blockstun;
    d.airStun = false;
    if (!isAirborne(d)) {
      d.vel.x = dir.x * m.knockback * 0.4;
      d.vel.z = dir.z * m.knockback * 0.4;
    }
    w.events.push({ kind: 'block', fighter: d.id, x: hx, y: hy, z: hz, damage: chip });
    w.hitstop = Math.max(w.hitstop, HITSTOP_BLOCK);
    return;
  }

  const dmg = Math.round(m.damage * comboScale(a.combo) * (counter ? COUNTER_DAMAGE : 1));
  d.health = Math.max(0, d.health - dmg);
  endMove(d);
  const air = isAirborne(d);
  if (m.knockdown && !air) {
    d.action = 'knockdown';
    d.stun = KNOCKDOWN_TICKS;
    d.airStun = false;
  } else {
    d.action = 'hitstun';
    d.stun = m.hitstun + (counter ? COUNTER_BONUS_STUN : 0);
    d.airStun = air || m.launch > 0;
  }
  const kb = m.knockback * (counter ? 1.3 : 1) * (air ? 0.5 : 1);
  d.vel.x = dir.x * kb;
  d.vel.z = dir.z * kb;
  if (m.launch > 0) d.vel.y = Math.max(d.vel.y, m.launch);
  d.lastHitBy = a.id;
  a.combo += 1;
  a.comboTimer = COMBO_RESET_TICKS;
  w.events.push({ kind: 'hit', fighter: d.id, x: hx, y: hy, z: hz, damage: dmg, counter, combo: a.combo, move: a.move ?? undefined });
  w.hitstop = Math.max(w.hitstop, counter ? HITSTOP_COUNTER : HITSTOP_HIT);
}

function applyThrow(w: World, { a, d, m }: Candidate): void {
  // Un projeteur déjà étourdi (tech ou coup reçu) ne projette plus.
  if (a.action !== 'attack' || !a.move || getMove(a.characterId, a.move).throw !== true) return;
  a.moveHit = true;
  const dm = d.action === 'attack' && d.move ? getMove(d.characterId, d.move) : null;
  const defenderThrowing = dm !== null && dm.throw === true && d.moveFrame > dm.startup && d.moveFrame <= dm.startup + dm.active;
  if (defenderThrowing) {
    // Tech : les deux projections s'annulent.
    d.moveHit = true;
    stunFighter(a, TECH_STUN, false);
    stunFighter(d, TECH_STUN, false);
    w.events.push({ kind: 'tech', fighter: d.id, x: d.pos.x, y: 1, z: d.pos.z });
    return;
  }
  endMove(d);
  d.action = 'thrown';
  // Séquence animée (l'attaquant la rejoue côté rendu), puis le projeté reste à terre.
  d.stun = (m.sequence ?? 40) + KNOCKDOWN_TICKS;
  d.airStun = false;
  d.vel = { x: 0, y: 0, z: 0 };
  d.thrownBy = a.id;
  d.pos = { x: a.pos.x + a.facing.x * THROW_GRAB_DISTANCE, y: 0, z: a.pos.z + a.facing.z * THROW_GRAB_DISTANCE };
  d.facing = { x: -a.facing.x, z: -a.facing.z };
  d.health = Math.max(0, d.health - m.damage);
  d.lastHitBy = a.id;
  a.combo += 1;
  a.comboTimer = COMBO_RESET_TICKS;
  w.events.push({ kind: 'throw', fighter: d.id, x: d.pos.x, y: 1, z: d.pos.z, damage: m.damage, move: a.move });
  w.hitstop = Math.max(w.hitstop, HITSTOP_HIT);
}
