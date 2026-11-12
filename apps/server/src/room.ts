import { Room, type Client } from 'colyseus';
import {
  ARENA_IDS, botInput, CHARACTER_IDS, cleanName, createWorld, HASH_EVERY, makeRng, stepWorld, worldHash,
  type LobbyPlayer, type LobbyState, type ServerMessage, type World,
} from '@iron/engine';

const RECONNECT_SECONDS = 30;
const TICK_MS = 1000 / 60;
/** Niveau d'IA des bots ajoutés par l'hôte. */
const BOT_LEVEL = 4;

interface Seat {
  /** Identifiant de session ; vide pour un bot. */
  sid: string;
  name: string;
  hero: string;
  ready: boolean;
  connected: boolean;
  bot: boolean;
}

/**
 * Salon de combat autoritaire : le serveur possède la simulation. Les clients envoient leurs entrées
 * (avec le numéro de tick) ; le serveur simule à 60 Hz avec les entrées reçues (ou la dernière connue),
 * calcule lui-même les bots, puis diffuse les entrées utilisées et, périodiquement, une empreinte d'état.
 *
 * Salle à 2 places : duel (manches). Salle à 4 places : dernier debout, humains et bots mélangés.
 */
export abstract class FightRoom extends Room {
  abstract readonly size: number;
  abstract readonly ffa: boolean;
  /** Mode équipes 2v2 (places 0 et 2 contre 1 et 3). */
  abstract readonly team: boolean;

  private code = '';
  private seats: (Seat | null)[] = [];
  private phase: LobbyState['phase'] = 'lobby';
  private arena = 'dojo';
  private world: World | null = null;
  private running = false;
  private seq = 0;
  private rematch: boolean[] = [];
  private winner: number | null = null;
  private winnerTeam: number | null = null;
  private placements: number[] = [];
  private pending: Map<number, number>[] = [];
  private last: number[] = [];
  /** Tirages des bots : séparés du RNG du monde, pour que les clients restent synchronisés. */
  private botRng = makeRng(1);

  override onCreate(options: { code?: string }): void {
    this.code = typeof options.code === 'string' ? options.code : '';
    this.seats = Array.from({ length: this.size }, () => null);
    this.rematch = Array.from({ length: this.size }, () => false);
    this.pending = Array.from({ length: this.size }, () => new Map<number, number>());
    this.last = Array.from({ length: this.size }, () => 0);
    this.maxClients = this.size;
    this.setMetadata({ code: this.code });
    this.onMessage('hero', (client, msg: { hero?: unknown }) => this.onHero(client, msg));
    this.onMessage('ready', (client, msg: { ready?: unknown }) => this.onReady(client, msg));
    this.onMessage('arena', (client, msg: { arena?: unknown }) => this.onArena(client, msg));
    this.onMessage('bot', (client, msg: { add?: unknown }) => this.onBot(client, msg));
    this.onMessage('start', (client) => this.onStart(client));
    this.onMessage('input', (client, msg: { t?: unknown; i?: unknown }) => this.onInput(client, msg));
    this.onMessage('ping', (client, msg: { ts?: unknown }) =>
      client.send('pong', { type: 'pong', ts: Number(msg.ts) || 0 } satisfies ServerMessage));
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
    this.seats[slot] = {
      sid: client.sessionId, name: cleanName(options.name), hero: CHARACTER_IDS[slot % CHARACTER_IDS.length]!,
      ready: false, connected: true, bot: false,
    };
    this.sendTo(client, { type: 'welcome', slot });
    this.broadcastLobby();
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0) return;
    const seat = this.seats[slot]!;
    if (this.phase === 'lobby' || consented) {
      this.dropSeat(slot);
      return;
    }
    // Pendant un combat : fenêtre de reconnexion, puis abandon.
    seat.connected = false;
    this.broadcastLobby();
    try {
      const again = await this.allowReconnection(client, RECONNECT_SECONDS);
      seat.sid = again.sessionId;
      seat.connected = true;
      this.broadcastLobby();
      if (this.world) this.sendTo(again, { type: 'snapshot', world: this.world });
    } catch {
      this.forfeit(slot);
    }
  }

  /** Libère une place. En combat duel, l'autre joueur gagne ; en dernier debout, la place devient un bot. */
  private dropSeat(slot: number): void {
    if (this.running) {
      this.forfeit(slot);
      return;
    }
    this.seats[slot] = null;
    this.broadcastLobby();
  }

  private forfeit(slot: number): void {
    if (!this.running || !this.world) {
      this.seats[slot] = null;
      this.broadcastLobby();
      return;
    }
    if (this.ffa || this.team) {
      // Le combattant abandonné est éliminé ; sa place reste en combat sans contrôle humain.
      const seat = this.seats[slot];
      if (seat) {
        seat.bot = true;
        seat.connected = true;
        seat.sid = '';
      }
      this.world.fighters[slot]!.health = 0;
      this.broadcastLobby();
      return;
    }
    this.endMatch(1 - slot);
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

  /** Hôte : ajoute un bot dans la première place libre, ou retire le dernier bot. */
  private onBot(client: Client, msg: { add?: unknown }): void {
    if (this.slotOf(client.sessionId) !== 0 || this.phase !== 'lobby') return;
    if (msg.add === true) {
      const slot = this.seats.findIndex((s) => s === null);
      if (slot < 0) return;
      const used = new Set(this.seats.filter((s): s is Seat => s !== null).map((s) => s.hero));
      const hero = CHARACTER_IDS.find((c) => !used.has(c)) ?? CHARACTER_IDS[0]!;
      this.seats[slot] = { sid: '', name: `Bot ${slot + 1}`, hero, ready: true, connected: true, bot: true };
    } else {
      for (let i = this.seats.length - 1; i > 0; i--) {
        if (this.seats[i]?.bot) {
          this.seats[i] = null;
          break;
        }
      }
    }
    this.broadcastLobby();
  }

  /** Seul l'hôte (slot 0) lance le combat, quand toutes les places sont occupées et prêtes. */
  private onStart(client: Client): void {
    if (this.slotOf(client.sessionId) !== 0 || this.phase !== 'lobby') return;
    if (this.seats.some((s) => s === null || !s.ready)) {
      client.send('error', { type: 'error', message: 'Toutes les places doivent être occupées et prêtes.' } satisfies ServerMessage);
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
    this.pending[slot]!.set(t, i & 0x7ff);
  }

  private onRematch(client: Client): void {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0 || this.phase !== 'result') return;
    this.rematch[slot] = true;
    this.broadcastLobby();
    const humans = this.seats.map((s, i) => (s && !s.bot ? i : -1)).filter((i) => i >= 0);
    if (humans.every((i) => this.rematch[i])) this.startMatch();
  }

  private onResync(client: Client): void {
    if (this.world) this.sendTo(client, { type: 'snapshot', world: this.world });
  }

  private startMatch(): void {
    const seats = this.seats as Seat[];
    this.seq += 1;
    this.world = createWorld({ heroes: seats.map((s) => s.hero), intro: true, ffa: this.ffa, team: this.team });
    this.phase = 'fight';
    this.running = true;
    this.winner = null;
    this.placements = [];
    this.rematch = seats.map(() => false);
    this.pending = seats.map(() => new Map<number, number>());
    this.last = seats.map(() => 0);
    this.botRng = makeRng(this.seq * 7919 + 17);
    for (const client of this.clients) {
      const slot = this.slotOf(client.sessionId);
      if (slot < 0) continue;
      this.sendTo(client, {
        type: 'start', seq: this.seq, slot, heroes: seats.map((s) => s.hero), arena: this.arena, ffa: this.ffa, team: this.team,
      });
    }
    this.broadcastLobby();
  }

  /** Une frame serveur : entrées humaines (ou dernière connue) et bots, puis un pas, puis diffusion. */
  private update(): void {
    if (!this.running || !this.world) return;
    const world = this.world;
    const t = world.tick;
    const inputs: number[] = [];
    for (let slot = 0; slot < this.seats.length; slot++) {
      const seat = this.seats[slot]!;
      if (seat.bot) {
        inputs.push(botInput(world, world.fighters[slot]!, BOT_LEVEL, this.botRng));
        continue;
      }
      const v = this.pending[slot]!.get(t);
      if (v !== undefined) this.last[slot] = v;
      this.pending[slot]!.delete(t);
      for (const k of [...this.pending[slot]!.keys()]) if (k < t) this.pending[slot]!.delete(k);
      inputs.push(this.last[slot]!);
    }
    stepWorld(world, inputs);
    this.broadcast('tick', { type: 'tick', t, inputs } satisfies ServerMessage);
    if (world.tick % HASH_EVERY === 0) {
      this.broadcast('hash', { type: 'hash', t: world.tick, h: worldHash(world) } satisfies ServerMessage);
    }
    // Fin de partie : phase 'over' (le gagnant peut être null en cas d'égalité au temps).
    if (world.match.phase === 'over') this.endMatch(world.match.matchWinner, world.match.winnerTeam);
  }

  private endMatch(winner: number | null, winnerTeam: number | null = null): void {
    this.running = false;
    this.phase = 'result';
    this.winner = winner;
    this.winnerTeam = winnerTeam;
    this.placements = this.world?.match.placements ?? [];
    this.broadcast('result', { type: 'result', winner, winnerTeam } satisfies ServerMessage);
    this.broadcastLobby();
  }

  private slotOf(sid: string): number {
    return this.seats.findIndex((s) => s !== null && !s.bot && s.sid === sid);
  }

  private lobbyState(): LobbyState {
    const players = this.seats.map((s): LobbyPlayer | null =>
      s ? { name: s.name, hero: s.hero, ready: s.ready, connected: s.connected, bot: s.bot } : null,
    );
    return {
      code: this.code, phase: this.phase, arena: this.arena, size: this.size, players,
      rematch: this.rematch, ffa: this.ffa, team: this.team, winner: this.winner, winnerTeam: this.winnerTeam,
      placements: this.placements,
    };
  }

  private broadcastLobby(): void {
    this.broadcast('lobby', { type: 'lobby', state: this.lobbyState() } satisfies ServerMessage);
  }

  private sendTo(client: Client, msg: ServerMessage): void {
    client.send(msg.type, msg);
  }
}

/** Duel à deux joueurs (manches au meilleur des 3). */
export class DuelRoom extends FightRoom {
  readonly size = 2;
  readonly ffa = false;
  readonly team = false;
}

/** Quatre combattants, dernier debout. Places libres comblées par des bots. */
export class FourRoom extends FightRoom {
  readonly size = 4;
  readonly ffa = true;
  readonly team = false;
}

/** Quatre combattants en deux équipes de deux (2v2). */
export class TeamRoom extends FightRoom {
  readonly size = 4;
  readonly ffa = false;
  readonly team = true;
}
