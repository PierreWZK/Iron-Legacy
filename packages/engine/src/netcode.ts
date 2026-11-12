import type { InputFrame } from './input';
import { stepWorld } from './sim';
import { cloneWorld, type World } from './state';

/**
 * Rollback netcode pour un duel à deux joueurs.
 *
 * Le joueur local voit son action immédiatement : il simule avec son entrée et une prédiction de
 * l'entrée distante (la dernière confirmée). Quand le serveur confirme les entrées réelles d'un tick
 * passé et qu'elles diffèrent de la prédiction, on revient à l'état de ce tick et on rejoue jusqu'au présent.
 *
 * Invariant : après confirmation de tous les ticks, l'état est identique à une simulation directe
 * avec les entrées réelles (la simulation est déterministe, voir sim.ts).
 */
export class Rollback {
  readonly localIndex: number;
  /** Nombre de corrections (retours arrière) effectuées. */
  rollbacks = 0;
  /** Nombre de ticks rejoués au total à cause des corrections. */
  resimulated = 0;
  /** Empreintes serveur vérifiées avec succès. */
  verified = 0;
  /** Ticks dont l'empreinte locale diffère de celle du serveur (à resynchroniser). */
  divergences: number[] = [];
  /** Empreintes reçues pour des ticks pas encore atteints localement. */
  private hashes = new Map<number, string>();

  private current: World;
  /** État AVANT le tick t, pour chaque tick récent (fenêtre de `horizon` ticks). */
  private states = new Map<number, World>();
  /** Entrées de chaque tick (réelles si confirmées, sinon prédites). */
  private inputs = new Map<number, [InputFrame, InputFrame]>();
  private confirmed = new Set<number>();
  private lastRemote: InputFrame = 0;
  private readonly horizon: number;

  constructor(localIndex: number, initial: World, horizon = 600) {
    this.localIndex = localIndex;
    this.horizon = horizon;
    this.current = cloneWorld(initial);
    this.states.set(this.current.tick, cloneWorld(this.current));
  }

  /** Tick courant (prochain tick à simuler). */
  get tick(): number {
    return this.current.tick;
  }

  /** État courant (après le dernier pas). Ne pas modifier. */
  get world(): World {
    return this.current;
  }

  /**
   * Avance d'un tick avec l'entrée locale. L'entrée distante est la dernière confirmée, sauf si le tick
   * est déjà confirmé (cas d'une correction en attente). Renvoie le monde après le pas.
   */
  step(localBits: InputFrame): World {
    const t = this.current.tick;
    let inp: [InputFrame, InputFrame];
    if (this.confirmed.has(t)) {
      inp = this.inputs.get(t)!;
    } else {
      inp = this.localIndex === 0 ? [localBits, this.lastRemote] : [this.lastRemote, localBits];
      this.inputs.set(t, inp);
    }
    this.states.set(t, cloneWorld(this.current));
    stepWorld(this.current, inp);
    this.prune(t);
    this.flushHashes();
    return this.current;
  }

  /** Entrées réelles d'un tick, reçues du serveur. Corrige l'état si la prédiction était fausse. */
  confirm(t: number, bits: [InputFrame, InputFrame]): void {
    const old = this.inputs.get(t);
    this.confirmed.add(t);
    this.inputs.set(t, bits);
    if (t >= this.current.tick) {
      this.lastRemote = bits[1 - this.localIndex] as InputFrame;
      return;
    }
    if (old && old[0] === bits[0] && old[1] === bits[1]) return;
    const start = this.states.get(t);
    if (!start) return; // trop ancien : la resynchronisation serveur prendra le relais
    this.rollbacks++;
    const end = this.current.tick;
    this.current = cloneWorld(start);
    for (let k = t; k < end; k++) {
      this.states.set(k, cloneWorld(this.current));
      stepWorld(this.current, this.inputs.get(k)!);
      this.resimulated++;
    }
  }

  /**
   * Vérifie l'empreinte serveur de l'état avant le tick `t`. Si ce tick n'est pas encore atteint,
   * la vérification est reportée jusqu'au pas correspondant.
   */
  verify(t: number, h: string): void {
    if (t > this.current.tick) {
      this.hashes.set(t, h);
      return;
    }
    const st = this.stateAt(t);
    if (!st) return;
    if (worldHash(st) === h) this.verified++;
    else this.divergences.push(t);
  }

  private flushHashes(): void {
    for (const [t, h] of [...this.hashes]) {
      if (t <= this.current.tick) {
        this.hashes.delete(t);
        this.verify(t, h);
      }
    }
  }

  /** État avant le tick `t`, si encore disponible (pour vérifier une empreinte envoyée par le serveur). */
  stateAt(t: number): World | undefined {
    return t === this.current.tick ? this.current : this.states.get(t);
  }

  /** Remplace l'état par un état de référence (serveur) : sert à corriger une divergence. */
  resync(world: World): void {
    const end = this.current.tick;
    this.current = cloneWorld(world);
    this.states.clear();
    this.states.set(world.tick, cloneWorld(world));
    for (const k of [...this.inputs.keys()]) if (k < world.tick) this.inputs.delete(k);
    // Rejoue les ticks locaux déjà joués, à partir de l'état de référence.
    for (let k = world.tick; k < end; k++) {
      this.states.set(k, cloneWorld(this.current));
      stepWorld(this.current, this.inputs.get(k) ?? [0, 0]);
      this.resimulated++;
    }
  }

  private prune(t: number): void {
    const min = t - this.horizon;
    for (const k of [...this.states.keys()]) if (k < min) this.states.delete(k);
    for (const k of [...this.inputs.keys()]) if (k < min) this.inputs.delete(k);
    for (const k of [...this.confirmed]) if (k < min) this.confirmed.delete(k);
  }
}

/** Empreinte d'un état (sans les événements, qui dépendent du chemin de simulation). */
export function worldHash(w: World): string {
  const json = JSON.stringify({ ...w, events: [] });
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
