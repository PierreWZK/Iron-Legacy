/**
 * Une frame d'entrée = un entier (masque de bits). Compact, sérialisable, idéal pour
 * le réseau et le rollback. Les directions sont RELATIVES AU COMBATTANT (face à sa cible) :
 * c'est à la couche d'entrée du client de convertir les touches écran en intentions.
 */
export const Btn = {
  Fwd: 1 << 0,
  Back: 1 << 1,
  /** Pas de côté vers la gauche du combattant. */
  SideL: 1 << 2,
  /** Pas de côté vers la droite du combattant. */
  SideR: 1 << 3,
  Crouch: 1 << 4,
  Jump: 1 << 5,
  Shift: 1 << 6,
  LP: 1 << 7,
  RP: 1 << 8,
  LK: 1 << 9,
  RK: 1 << 10,
} as const;

export type InputFrame = number;

export const has = (input: InputFrame, btn: number): boolean => (input & btn) !== 0;
