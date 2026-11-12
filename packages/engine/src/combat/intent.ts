import { Btn, has } from '../input';
import type { MoveId } from '../characters';

export type Stance = 'stand' | 'crouch' | 'air';

/**
 * Choisit le coup à partir des boutons PRESSÉS ce tick (edge), de la direction tenue et de la posture :
 * - en l'air : LP, RP, LK, RK
 * - en courant (`running`) : poing = charge, pied = coup volant
 * - accroupi + avant (df), accroupi (d), avant (f), arrière (b), puis sans direction
 * Chaque combinaison direction + bouton lance un coup différent (voir MOVE_IDS).
 * Les projections (deux boutons), la parade (arrière + LP) et l'esquive sont gérées dans la sim.
 */
export function attackIntent(input: number, pressed: number, stance: Stance, running = false): MoveId | null {
  const lp = (pressed & Btn.LP) !== 0;
  const rp = (pressed & Btn.RP) !== 0;
  const lk = (pressed & Btn.LK) !== 0;
  const rk = (pressed & Btn.RK) !== 0;
  const fwd = has(input, Btn.Fwd);
  const back = has(input, Btn.Back);

  if (stance === 'air') {
    if (lp) return 'airPunch';
    if (rp) return 'airElbow';
    if (lk) return 'jumpKick';
    if (rk) return 'airRound';
    return null;
  }
  if (running) {
    if (lp || rp) return 'tackle';
    if (lk || rk) return 'flyingKick';
  }
  if (stance === 'crouch' && fwd) {
    if (lp) return 'hookPunch';
    if (rp) return 'risingHook';
    if (lk) return 'slideKick';
    if (rk) return 'dragonKick';
    return null;
  }
  if (stance === 'crouch') {
    if (lp) return 'lowJab';
    if (rp) return 'uppercut';
    if (lk) return 'lowKick';
    if (rk) return 'sweep';
    return null;
  }
  if (fwd) {
    if (lp) return 'lunge';
    if (rp) return 'elbow';
    if (lk) return 'kneeLift';
    if (rk) return 'axeKick';
    return null;
  }
  if (back) {
    if (rp) return 'backFist';
    if (lk) return 'sideKick';
    if (rk) return 'spinKick';
    if (lp) return 'jab'; // hors parade (en enchaînement)
    return null;
  }
  if (lp) return 'jab';
  if (rp) return 'cross';
  if (lk) return 'frontKick';
  if (rk) return 'roundhouse';
  return null;
}

/** Paires de boutons pressés (quasi) ensemble → projection. */
export const THROW_PAIRS: readonly [number, number, MoveId][] = [
  [Btn.LP, Btn.RP, 'throw'],
  [Btn.LP, Btn.LK, 'hipToss'],
  [Btn.RP, Btn.RK, 'suplex'],
  [Btn.LK, Btn.RK, 'legThrow'],
];
