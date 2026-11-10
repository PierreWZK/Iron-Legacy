import { getMove } from './characters';
import { Btn, type InputFrame } from './input';
import { nextRandom, type Fighter, type World } from './state';

interface Profile {
  /** Probabilité de réagir (blocage) à une attaque adverse proche. */
  react: number;
  /** Probabilité par tick d'attaquer quand à portée. */
  attack: number;
  /** Probabilité de se baisser contre une attaque basse. */
  block: number;
}

const PROFILES: Record<number, Profile> = {
  1: { react: 0.15, attack: 0.03, block: 0.1 },
  2: { react: 0.35, attack: 0.05, block: 0.25 },
  3: { react: 0.55, attack: 0.08, block: 0.45 },
  4: { react: 0.75, attack: 0.11, block: 0.7 },
  5: { react: 0.9, attack: 0.15, block: 0.9 },
  6: { react: 0.95, attack: 0.19, block: 0.97 },
  7: { react: 0.99, attack: 0.23, block: 1 },
};

const ATTACK_BUTTONS = [Btn.LP, Btn.RP, Btn.LK, Btn.RK] as const;

/**
 * IA simple : approche, réagit aux attaques par le blocage, attaque à portée.
 * Ne triche pas : elle ne lit que l'état public des combattants. Déterministe (RNG du monde).
 * Retourne les BOUTONS À TENIR ce tick ; un bouton déjà tenu au tick précédent est relâché (edge).
 */
export function aiInput(w: World, self: Fighter, opp: Fighter, level: number): InputFrame {
  if (w.match.phase !== 'fight' || self.stun > 0) return 0;
  if (self.action === 'attack' || self.action === 'dodge' || self.action === 'parry' || self.action === 'throw') {
    return 0;
  }
  const p = PROFILES[Math.min(7, Math.max(1, Math.round(level)))]!;
  const dist = Math.hypot(opp.pos.x - self.pos.x, opp.pos.z - self.pos.z);

  const threat = opp.action === 'attack' && !opp.moveHit && opp.move !== null;
  if (threat && dist < 2.4 && nextRandom(w) < p.react) {
    const low = opp.move !== null && getMove(opp.characterId, opp.move).height === 'low';
    if (low && nextRandom(w) < p.block) return Btn.Back | Btn.Crouch;
    return Btn.Back;
  }
  if (dist > 3.0) return Btn.Fwd | Btn.Shift;
  if (dist > 1.7) return Btn.Fwd;
  if (dist < 1.0) return Btn.Back;
  if (nextRandom(w) < p.attack) {
    const btn = ATTACK_BUTTONS[Math.floor(nextRandom(w) * ATTACK_BUTTONS.length)]!;
    return (self.prevInput & btn) !== 0 ? 0 : btn;
  }
  return 0;
}
