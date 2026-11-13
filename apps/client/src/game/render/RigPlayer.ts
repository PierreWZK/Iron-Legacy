import { createDuelWorld, getMove, type Fighter, type MoveId, type World } from '@iron/engine';
import { poseFor } from './pose';
import { BONE_NAMES, buildRig, type Rig } from './rig';
import { visualFor, type VisualSpec } from './visuals';

/**
 * Personnage animé hors combat (sélection, menu, portraits) : même rig et mêmes poses que le combat,
 * piloté par un combattant factice de la sim. Rejoue les vrais coups du personnage.
 */
export class RigPlayer {
  readonly spec: VisualSpec;
  readonly rig: Rig;
  private readonly world: World;
  private readonly f: Fighter;
  private t = Math.random() * 10;
  private frameAcc = 0;
  private move: MoveId | null = null;
  private moveLen = 0;
  private hipsY = 0;
  private bodyYaw = 0;

  constructor(readonly id: string, outline = 0.014) {
    this.spec = visualFor(id);
    this.rig = buildRig(this.spec, { outline });
    this.world = createDuelWorld({ p1: id, p2: id === 'kairo' ? 'vera' : 'kairo' });
    this.f = this.world.fighters[0]!;
    this.rig.root.position.y = this.rig.pivotH;
    this.update(1, true);
  }

  /** Lance un coup du personnage (rien si un coup est déjà en cours). */
  play(move: MoveId): boolean {
    if (this.move) return false;
    const def = getMove(this.id, move);
    this.move = move;
    this.moveLen = def.startup + def.active + def.recovery;
    this.f.action = 'attack';
    this.f.move = move;
    this.f.moveFrame = 1;
    this.frameAcc = 0;
    return true;
  }

  get busy(): boolean {
    return this.move !== null;
  }

  /** Pose de victoire (maintenue tant qu'on ne relance pas un coup). */
  victory(on: boolean): void {
    if (this.move) return;
    this.f.action = on ? 'victory' : 'idle';
  }

  update(delta: number, snap = false): void {
    this.t += delta;
    if (this.move) {
      this.frameAcc += delta * 60;
      const frame = 1 + Math.floor(this.frameAcc);
      if (frame > this.moveLen) {
        this.move = null;
        this.f.action = 'idle';
        this.f.move = null;
      } else {
        this.f.moveFrame = frame;
      }
    }
    const pose = poseFor(this.f, this.t, this.world);
    const k = snap ? 1 : 1 - Math.exp(-delta * 22);
    this.hipsY += (pose.hipsY - this.hipsY) * k;
    this.bodyYaw += (pose.bodyYaw - this.bodyYaw) * k;
    const { rig } = this;
    rig.bones.hips.position.y = rig.hipsBase + this.hipsY;
    rig.root.position.y = rig.pivotH;
    for (const name of BONE_NAMES) {
      if (name === 'tail') continue;
      const bone = rig.bones[name];
      const [x, y, z] = pose.rot[name] ?? [0, 0, 0];
      bone.rotation.x += (x - bone.rotation.x) * k;
      bone.rotation.y += (y - bone.rotation.y) * k;
      bone.rotation.z += (z - bone.rotation.z) * k;
    }
    for (const sw of rig.sway) sw.obj.rotation.x = 0.35 + Math.sin(this.t * sw.freq + sw.phase) * sw.amp;
    rig.bones.tail.rotation.set(0.1 + Math.sin(this.t * 3) * 0.08, Math.sin(this.t * 2.2) * 0.3, 0);
  }
}

/** Coups montrés dans l'aperçu (tous existent chez chaque personnage). */
export const SHOWCASE_MOVES: readonly MoveId[] = ['jab', 'cross', 'roundhouse', 'axeKick', 'uppercut', 'spinKick', 'dragonKick', 'lunge'];
