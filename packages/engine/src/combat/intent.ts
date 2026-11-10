import { Btn, has } from '../input';
import type { MoveId } from '../characters';

export type Stance = 'stand' | 'crouch' | 'air';

/**
 * Choisit le coup à partir des boutons PRESSÉS ce tick (edge) et de la posture.
 * Les projections (LP+RP), la parade (arrière+LP) et l'esquive sont gérées dans la sim.
 */
export function attackIntent(input: number, pressed: number, stance: Stance): MoveId | null {
  if (stance === 'air') {
    if (pressed & Btn.LK) return 'jumpKick';
    if (pressed & Btn.RK) return 'airRound';
    return null;
  }
  const crouch = stance === 'crouch';
  const fwd = has(input, Btn.Fwd);
  if (pressed & Btn.LP) return fwd && !crouch ? 'lunge' : 'jab';
  if (pressed & Btn.RP) return fwd && !crouch ? 'elbow' : crouch ? 'uppercut' : 'cross';
  if (pressed & Btn.LK) return crouch ? 'lowKick' : 'frontKick';
  if (pressed & Btn.RK) return crouch ? 'sweep' : 'roundhouse';
  return null;
}
