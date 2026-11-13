import { Btn, type Fighter, type InputFrame } from '@iron/engine';

import { useBindings, type Action } from './bindings';
import { touchHeld, touchTapped } from './touch';

/** Droite de l'écran dans le monde (vecteur unitaire x,z), voir `runtime.view`. */
export interface Axis {
  x: number;
  z: number;
}

const THRESHOLD = 0.5;
/** Double appui : second appui au plus tard ce nombre de ticks après le premier (≈ 0,28 s). */
const DOUBLE_TAP = 17;
/** Délai du saut (≈ 0,13 s) : le temps de voir si un second appui haut arrive. */
const JUMP_DELAY = 8;

export class KeyboardInput {
  private down = new Set<string>();
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
    return touchHeld.has(a) || touchTapped.has(a)
      || useBindings.getState().bindings[a].some((k) => this.down.has(k) || this.pressedSinceSample.has(k));
  }

  /** Oublie les appuis en attente (pendant la pause, pour qu'ils ne partent pas à la reprise). */
  discard(): void {
    this.pressedSinceSample.clear();
    touchTapped.clear();
  }

  /** Consomme un touche « pressée » (pour les raccourcis hors combat : T, Entrée). */
  consume(key: string): boolean {
    const had = this.pressedSinceSample.delete(key);
    return had;
  }

  // État des gestes (en ticks de sample, 60 par seconde).
  private t = 0;
  private upPrev = false;
  private downPrev = false;
  private fwdPrev = false;
  private lastUp = -999;
  private lastDown = -999;
  private lastFwd = -999;
  /** Pas de côté en cours après un double appui haut ('up', vers le fond) ou bas ('down', vers l'écran). */
  private side: 'up' | 'down' | null = null;
  /** Tick d'un appui haut en attente : saut si aucun second appui n'arrive à temps. */
  private jumpAt: number | null = null;
  private jumping = false;
  /** Sprint après un double appui avant, tant que l'avant reste tenu. */
  private boost = false;

  /**
   * Convertit les touches (relatives à l'écran) en intentions relatives au combattant.
   * - gauche / droite : vers la gauche / la droite de l'écran (projeté sur l'avant du combattant) ;
   * - haut : saut ; double appui haut (tenu) : pas de côté vers le fond ;
   * - bas : accroupi ; double appui bas (tenu) : pas de côté vers l'écran ;
   * - double appui vers l'avant (tenu) : pas lancé puis sprint.
   * Le saut part après un court délai (pour laisser le temps au second appui), sauf pendant un coup : là, haut
   * compte tout de suite (entrées de combo `u+…`).
   */
  sample(f: Fighter, axis: Axis): InputFrame {
    this.t++;
    const up = this.held('jump');
    const down = this.held('crouch');
    if (up && !this.upPrev) {
      if (this.t - this.lastUp <= DOUBLE_TAP) {
        this.side = 'up';
        this.jumpAt = null;
      } else {
        this.jumpAt = this.t;
      }
      this.lastUp = this.t;
    }
    if (!up) {
      if (this.side === 'up') this.side = null;
      this.jumping = false;
    }
    if (down && !this.downPrev) {
      if (this.t - this.lastDown <= DOUBLE_TAP) this.side = 'down';
      this.lastDown = this.t;
    }
    if (!down && this.side === 'down') this.side = null;
    this.upPrev = up;
    this.downPrev = down;

    let jump = false;
    if (f.action === 'attack') {
      jump = up && this.side !== 'up';
      this.jumpAt = null;
    } else if (this.jumpAt !== null && this.t - this.jumpAt >= JUMP_DELAY) {
      jump = true;
      this.jumping = up;
      this.jumpAt = null;
    } else if (this.jumping && up) {
      jump = true;
    }

    const sx = (this.held('screenRight') ? 1 : 0) - (this.held('screenLeft') ? 1 : 0);
    const sz = this.side === 'up' ? 1 : this.side === 'down' ? -1 : 0;
    // Droite écran = axis ; « vers le fond » = (axis.z, -axis.x).
    const wx = axis.x * sx + axis.z * sz;
    const wz = axis.z * sx - axis.x * sz;
    const fwd = wx * f.facing.x + wz * f.facing.z;
    // Droite du combattant = (-fz, fx).
    const side = wx * -f.facing.z + wz * f.facing.x;

    const isFwd = fwd > THRESHOLD;
    if (isFwd && !this.fwdPrev) {
      if (this.t - this.lastFwd <= DOUBLE_TAP) this.boost = true;
      this.lastFwd = this.t;
    }
    if (!isFwd) this.boost = false;
    this.fwdPrev = isFwd;

    let i = 0;
    if (isFwd) i |= Btn.Fwd;
    if (fwd < -THRESHOLD) i |= Btn.Back;
    if (side > THRESHOLD) i |= Btn.SideR;
    if (side < -THRESHOLD) i |= Btn.SideL;
    if (down && this.side !== 'down') i |= Btn.Crouch;
    if (jump) i |= Btn.Jump;
    if (this.held('shift') || this.boost) i |= Btn.Shift;
    if (this.held('lp')) i |= Btn.LP;
    if (this.held('rp')) i |= Btn.RP;
    if (this.held('lk')) i |= Btn.LK;
    if (this.held('rk')) i |= Btn.RK;
    this.pressedSinceSample.clear();
    touchTapped.clear();
    return i;
  }
}
