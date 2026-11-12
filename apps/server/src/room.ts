import { Room, type Client } from 'colyseus';
import {
  ARENA_IDS, CHARACTER_IDS, cleanName, createDuelWorld, HASH_EVERY, stepWorld, worldHash,
  type ClientMessage, type LobbyPlayer, type LobbyState, type ServerMessage, type Slot, type World,
} from '@iron/engine';

const RECONNECT_SECONDS = 30;
const TICK_MS = 1000 / 60;

interface Seat {
  sid: string;
  name: string;
  hero: string;
  ready: boolean;
  connected: boolean;
}

/**
 * Salon de duel autoritaire : le serveur possède la simulation. Les clients envoient leurs entrées
 * (avec le numéro de tick), le serveur simule à 60 Hz avec les entrées reçues (ou la dernière connue),
 * puis diffuse les entrées utilisées et, périodiquement, une empreinte d'état pour détecter les divergences.
 */
export class DuelRoom extends Room {
  override maxClients = 2;

  private code = '';
  private seats: [Seat | null, Seat | null] = [null, null];
  private phase: LobbyState['phase'] = 'lobby';
  private arena = 'dojo';
  private world: World | null = null;
  private running = false;
  private seq = 0;
  private rematch: [boolean, boolean] = [false, false];
  private winner: number | null = null;
  private pending: [Map<number, number>, Map<number, number>] = [new Map(), new Map()];
  private last: [number, number] = [0, 0];

  override onCreate(options: { code?: string }): void {
    this.code = typeof options.code === 'string' ? options.code : '';
    this.setMetadata({ code: this.code });
    this.onMessage('hero', (client, msg: { hero?: unknown }) => this.onHero(client, msg));
    this.onMessage('ready', (client, msg: { ready?: unknown }) => this.onReady(client, msg));
    this.onMessage('arena', (client, msg: { arena?: unknown }) => this.onArena(client, msg));
    this.onMessage('start', (client) => this.onStart(client));
    this.onMessage('input', (client, msg: { t?: unknown; i?: unknown }) => this.onInput(client, msg));
    this.onMessage('ping', (client, msg: { ts?: unknown }) => client.send('pong', { type: 'pong', ts: Number(msg.ts) || 0 } satisfies ServerMessage));
    this.onMessage('rematch', (client) => this.onRematch(client));
    this.onMessage('resync', (client) => this.onResync(client));
    this.setSimulationInterval(() => this.update(), TICK_MS);
  }

  override onJoin(client: Client, options: { name?: unknown }): void {
    const slot = this.seats.findIndex((s) => s === null);
    if (slot < 0) {
      client.send('error', { type: 'error', message: 'Salon plein.' } satisfies ServerMessage);
      return;
    }
    this.seats[slot] = { sid: client.sessionId, name: cleanName(options.name), hero: CHARACTER_IDS[0]!, ready: false, connected: true };
    this.sendTo(client, { type: 'lobby', state: this.lobbyState() });
    this.broadcastLobby();
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0) return;
    const seat = this.seats[slot]!;
    if (this.phase === 'lobby' || consented) {
      this.seats[slot] = null;
      this.broadcastLobby();
      if (this.running) this.endMatch(1 - slot);
      return;
    }
    // Pendant un combat : fenêtre de reconnexion, sinon forfait.
    seat.connected = false;
    this.broadcastLobby();
    try {
      const again = await this.allowReconnection(client, RECONNECT_SECONDS);
      seat.sid = again.sessionId;
      seat.connected = true;
      this.broadcastLobby();
      if (this.world) this.sendTo(again, { type: 'snapshot', world: this.world });
    } catch {
      this.seats[slot] = null;
      if (this.running) this.endMatch(1 - slot);
      this.broadcastLobby();
    }
  }

  private onHero(client: Client, msg: { hero?: unknown }): void {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0 || this.phase !== 'lobby') return;
    if (typeof msg.hero !== 'string' || !CHARACTER_IDS.includes(msg.hero)) return;
    const seat = this.seats[slot]!;
    seat.hero = msg.hero;
    seat.ready = false;
    this.broadcastLobby();
  }

  private onReady(client: Client, msg: { ready?: unknown }): void {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0 || this.phase !== 'lobby') return;
    this.seats[slot]!.ready = msg.ready === true;
    this.broadcastLobby();
  }

  private onArena(client: Client, msg: { arena?: unknown }): void {
    if (this.slotOf(client.sessionId) !== 0 || this.phase !== 'lobby') return;
    if (typeof msg.arena !== 'string' || !(ARENA_IDS as readonly string[]).includes(msg.arena)) return;
    this.arena = msg.arena;
    this.broadcastLobby();
  }

  /** Seul l'hôte (slot 0) lance le combat, quand les deux joueurs sont prêts. */
  private onStart(client: Client): void {
    if (this.slotOf(client.sessionId) !== 0 || this.phase !== 'lobby') return;
    const [a, b] = this.seats;
    if (!a || !b || !a.ready || !b.ready) {
      this.sendTo(client, { type: 'error', message: 'Les deux joueurs doivent être prêts.' });
      return;
    }
    this.startMatch();
  }

  private onInput(client: Client, msg: { t?: unknown; i?: unknown }): void {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0 || !this.running || !this.world) return;
    const t = Number(msg.t);
    const i = Number(msg.i);
    if (!Number.isInteger(t) || !Number.isInteger(i) || t < this.world.tick) return; // trop ancien : ignoré
    // Les bits invalides sont tronqués aux 11 boutons connus.
    this.pending[slot as Slot].set(t, i & 0x7ff);
  }

  private onRematch(client: Client): void {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0 || this.phase !== 'result') return;
    this.rematch[slot as Slot] = true;
    this.broadcastLobby();
    if (this.rematch[0] && this.rematch[1]) this.startMatch();
  }

  private onResync(client: Client): void {
    if (this.world) this.sendTo(client, { type: 'snapshot', world: this.world });
  }

  private startMatch(): void {
    const [a, b] = this.seats;
    this.seq += 1;
    this.world = createDuelWorld({ p1: a!.hero, p2: b!.hero, intro: true });
    this.phase = 'fight';
    this.running = true;
    this.winner = null;
    this.rematch = [false, false];
    this.pending = [new Map(), new Map()];
    this.last = [0, 0];
    for (const client of this.clients) {
      const slot = this.slotOf(client.sessionId);
      if (slot < 0) continue;
      this.sendTo(client, { type: 'start', seq: this.seq, slot: slot as Slot, heroes: [a!.hero, b!.hero], arena: this.arena });
    }
    this.broadcastLobby();
  }

  /** Une frame serveur : applique les entrées du tick courant, diffuse le résultat. */
  private update(): void {
    if (!this.running || !this.world) return;
    const t = this.world.tick;
    const inputs: [number, number] = [0, 0];
    for (const slot of [0, 1] as const) {
      const v = this.pending[slot].get(t);
      if (v !== undefined) this.last[slot] = v;
      this.pending[slot].delete(t);
      for (const k of [...this.pending[slot].keys()]) if (k < t) this.pending[slot].delete(k);
      inputs[slot] = this.last[slot];
    }
    stepWorld(this.world, inputs);
    this.broadcast('tick', { type: 'tick', t, inputs } satisfies ServerMessage);
    if (this.world.tick % HASH_EVERY === 0) {
      this.broadcast('hash', { type: 'hash', t: this.world.tick, h: worldHash(this.world) } satisfies ServerMessage);
    }
    if (this.world.match.matchWinner !== null) this.endMatch(this.world.match.matchWinner as number);
  }

  private endMatch(winner: number): void {
    this.running = false;
    this.phase = 'result';
    this.winner = winner;
    this.broadcast('result', { type: 'result', winner } satisfies ServerMessage);
    this.broadcastLobby();
  }

  private slotOf(sid: string): number {
    return this.seats.findIndex((s) => s !== null && s.sid === sid);
  }

  private lobbyState(): LobbyState {
    const players = this.seats.map((s): LobbyPlayer | null =>
      s ? { name: s.name, hero: s.hero, ready: s.ready, connected: s.connected } : null,
    ) as LobbyState['players'];
    return { code: this.code, phase: this.phase, arena: this.arena, players, rematch: this.rematch, winner: this.winner };
  }

  private broadcastLobby(): void {
    this.broadcast('lobby', { type: 'lobby', state: this.lobbyState() } satisfies ServerMessage);
  }

  private sendTo(client: Client, msg: ServerMessage): void {
    client.send(msg.type, msg);
  }

  /** Typage explicite des messages entrants (utilisé par les tests). */
  static readonly messageTypes: ClientMessage['type'][] = ['hero', 'ready', 'arena', 'start', 'input', 'ping', 'rematch', 'resync'];
}
