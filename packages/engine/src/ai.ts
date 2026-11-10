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
  /** Probabilité par tick de poursuivre un enchaînement quand c'est possible. */
  chain: number;
}

const PROFILES: Record<number, Profile> = {
  1: { react: 0.15, attack: 0.03, block: 0.1, chain: 0.02 },
  2: { react: 0.35, attack: 0.05, block: 0.25, chain: 0.05 },
  3: { react: 0.55, attack: 0.08, block: 0.45, chain: 0.08 },
  4: { react: 0.75, attack: 0.11, block: 0.7, chain: 0.12 },
  5: { react: 0.9, attack: 0.15, block: 0.9, chain: 0.16 },
  6: { react: 0.95, attack: 0.19, block: 0.97, chain: 0.2 },
  7: { react: 0.99, attack: 0.23, block: 1, chain: 0.24 },
};

const BUTTONS = [Btn.LP, Btn.RP, Btn.LK, Btn.RK] as const;

/** Un coup que l'IA sait lancer : direction + bouton(s), plage de distance, niveau minimum. */
interface Option {
  input: number;
  min: number;
  max: number;
  level: number;
}

const D = Btn.Crouch;
const F = Btn.Fwd;
const B = Btn.Back;

const OPTIONS: readonly Option[] = [
  // Courte portée
  { input: Btn.LP, min: 0, max: 1.5, level: 1 },
  { input: Btn.RP, min: 0, max: 1.6, level: 1 },
  { input: D | Btn.LP, min: 0, max: 1.5, level: 2 },
  { input: D | Btn.RP, min: 0, max: 1.4, level: 2 },
  { input: D | Btn.LK, min: 0, max: 1.5, level: 2 },
  { input: D | Btn.RK, min: 0, max: 1.7, level: 3 },
  { input: F | Btn.LK, min: 0, max: 1.3, level: 2 },
  { input: F | Btn.RP, min: 0, max: 1.3, level: 2 },
  { input: B | Btn.RP, min: 0, max: 1.5, level: 3 },
  // Projections (à très courte portée)
  { input: Btn.LP | Btn.RP, min: 0, max: 1.0, level: 2 },
  { input: Btn.LP | Btn.LK, min: 0, max: 1.0, level: 3 },
  { input: Btn.RP | Btn.RK, min: 0, max: 1.0, level: 4 },
  { input: Btn.LK | Btn.RK, min: 0, max: 1.0, level: 4 },
  // Moyenne portée
  { input: Btn.LK, min: 0.9, max: 2.0, level: 1 },
  { input: Btn.RK, min: 1.0, max: 2.1, level: 1 },
  { input: F | Btn.LP, min: 1.0, max: 2.0, level: 2 },
  { input: F | Btn.RK, min: 0.8, max: 1.7, level: 3 },
  { input: B | Btn.LK, min: 1.0, max: 2.1, level: 3 },
  { input: B | Btn.RK, min: 1.0, max: 1.9, level: 3 },
  { input: D | F | Btn.LP, min: 0.8, max: 1.6, level: 3 },
  { input: D | F | Btn.RP, min: 0.8, max: 1.6, level: 4 },
  { input: D | F | Btn.LK, min: 1.0, max: 2.0, level: 4 },
  { input: D | F | Btn.RK, min: 1.0, max: 1.9, level: 5 },
];

/**
 * IA : approche, réagit aux attaques par le blocage, attaque à portée avec une grande variété de coups
 * (directions, projections), et enchaîne les « strings ».
 * Ne triche pas : elle ne lit que l'état public des combattants. Déterministe (RNG du monde).
 * Retourne les BOUTONS À TENIR ce tick ; un bouton déjà tenu au tick précédent est relâché (edge).
 */
export function aiInput(w: World, self: Fighter, opp: Fighter, level: number): InputFrame {
  if (w.match.phase !== 'fight' || self.stun > 0) return 0;
  const p = PROFILES[Math.min(7, Math.max(1, Math.round(level)))]!;

  if (self.action === 'attack' && self.move) {
    const m = getMove(self.characterId, self.move);
    const recovering = self.moveFrame > m.startup + m.active;
    const canChain = !m.throw && ((m.cancel && self.moveHit) || (m.string === true && recovering));
    if (canChain && nextRandom(w) < p.chain) {
      const btn = BUTTONS[Math.floor(nextRandom(w) * BUTTONS.length)]!;
      return (self.prevInput & btn) !== 0 ? 0 : btn;
    }
    return 0;
  }
  if (self.action === 'dodge' || self.action === 'parry') return 0;

  const dist = Math.hypot(opp.pos.x - self.pos.x, opp.pos.z - self.pos.z);

  const threat = opp.action === 'attack' && !opp.moveHit && opp.move !== null;
  if (threat && dist < 2.4 && nextRandom(w) < p.react) {
    const low = opp.move !== null && getMove(opp.characterId, opp.move).height === 'low';
    if (low && nextRandom(w) < p.block) return Btn.Back | Btn.Crouch;
    return Btn.Back;
  }
  if (dist > 3.0) return Btn.Fwd | Btn.Shift;
  if (dist > 1.7) return Btn.Fwd;
  if (dist < 0.95) return nextRandom(w) < 0.5 ? Btn.Back : 0;
  if (nextRandom(w) < p.attack) {
    const usable = OPTIONS.filter((o) => o.level <= level && dist >= o.min && dist <= o.max);
    if (usable.length === 0) return 0;
    const pick = usable[Math.floor(nextRandom(w) * usable.length)]!;
    const buttons = pick.input & (Btn.LP | Btn.RP | Btn.LK | Btn.RK);
    // Une touche déjà tenue au tick précédent ne génère pas de nouvel appui : on relâche d'abord.
    return (self.prevInput & buttons) !== 0 ? 0 : pick.input;
  }
  return 0;
}
