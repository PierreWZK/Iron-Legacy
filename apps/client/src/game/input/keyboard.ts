import { Btn, type Fighter, type InputFrame } from '@iron/engine';

/** Touches par action, en `KeyboardEvent.key` minuscule (étiquette de la touche → marche en AZERTY et QWERTY). */
export const DEFAULT_BINDINGS = {
  screenLeft: ['q', 'arrowleft'],
  screenRight: ['d', 'arrowright'],
  intoScreen: ['z', 'arrowup'],
  towardScreen: ['s', 'arrowdown'],
  crouch: ['c'],
  jump: [' '],
  shift: ['shift'],
  lp: ['a'],
  rp: ['e'],
  lk: ['r'],
  rk: ['f'],
} as const;

type Action = keyof typeof DEFAULT_BINDINGS;

/** Axe de combat : vecteur unitaire (x,z) de P1 vers P2. Droite de l'écran = cet axe. */
export interface Axis {
  x: number;
  z: number;
}

const THRESHOLD = 0.5;

export class KeyboardInput {
  private down = new Set<string>();
  private bindings: Record<Action, readonly string[]> = DEFAULT_BINDINGS;
  /** Appuis depuis le dernier `sample` (un appui bref entre deux ticks ne doit pas être perdu). */
  private pressedSinceSample = new Set<string>();

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!e.repeat) this.pressedSinceSample.add(k);
    this.down.add(k);
    if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => this.down.delete(e.key.toLowerCase());
  private onBlur = () => this.down.clear();

  attach(): () => void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    return () => {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('blur', this.onBlur);
    };
  }

  private held(a: Action): boolean {
    return this.bindings[a].some((k) => this.down.has(k) || this.pressedSinceSample.has(k));
  }

  /** Consomme un touche « pressée » (pour les raccourcis hors combat : T, Entrée). */
  consume(key: string): boolean {
    const had = this.pressedSinceSample.delete(key);
    return had;
  }

  /**
   * Convertit les touches (relatives à l'écran) en intentions relatives au combattant :
   * on projette le vecteur « stick » monde sur l'axe avant/droite du combattant.
   */
  sample(f: Fighter, axis: Axis): InputFrame {
    const sx = (this.held('screenRight') ? 1 : 0) - (this.held('screenLeft') ? 1 : 0);
    const sz = (this.held('intoScreen') ? 1 : 0) - (this.held('towardScreen') ? 1 : 0);
    // Droite écran = axis ; « vers le fond » = (axis.z, -axis.x).
    const wx = axis.x * sx + axis.z * sz;
    const wz = axis.z * sx - axis.x * sz;
    const fwd = wx * f.facing.x + wz * f.facing.z;
    // Droite du combattant = (-fz, fx).
    const side = wx * -f.facing.z + wz * f.facing.x;

    let i = 0;
    if (fwd > THRESHOLD) i |= Btn.Fwd;
    if (fwd < -THRESHOLD) i |= Btn.Back;
    if (side > THRESHOLD) i |= Btn.SideR;
    if (side < -THRESHOLD) i |= Btn.SideL;
    if (this.held('crouch')) i |= Btn.Crouch;
    if (this.held('jump')) i |= Btn.Jump;
    if (this.held('shift')) i |= Btn.Shift;
    if (this.held('lp')) i |= Btn.LP;
    if (this.held('rp')) i |= Btn.RP;
    if (this.held('lk')) i |= Btn.LK;
    if (this.held('rk')) i |= Btn.RK;
    this.pressedSinceSample.clear();
    return i;
  }
}
