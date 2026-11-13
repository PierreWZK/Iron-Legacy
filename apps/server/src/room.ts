import { Room, type Client } from 'colyseus';
import { accountStore } from './accounts';
import {
  ARENA_IDS, botInput, CHARACTER_IDS, cleanName, createWorld, HASH_EVERY, makeRng, MODE_PLAYERS, ROOM_MODES, stepWorld, worldHash,
  type LobbyPlayer, type LobbyState, type RoomMode, type ServerMessage, type World,
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
  /** Compte lié à la place (connexion au moment de la jointure), sinon null. */
  userId: number | null;
}

/**
 * Salon de combat autoritaire : le serveur possède la simulation. Les clients envoient leurs entrées
 * (avec le numéro de tick) ; le serveur simule à 60 Hz avec les entrées reçues (ou la dernière connue),
 * calcule lui-même les bots, puis diffuse les entrées utilisées et, périodiquement, une empreinte d'état.
 *
 * Quatre places ; l'hôte choisit le mode : duel (2 combattants, manches), dernier debout (3 ou 4) ou 2v2 (4).
 * Au lancement, les places occupées sont tassées au début (le client reçoit sa place de combat dans « start »).
 */
export class FightRoom extends Room {
  readonly size = 4;
  /** Mode au moment de la création (les salles historiques duel / four / team). */
  protected initialMode: RoomMode = 'duel';
  private mode: RoomMode = 'duel';

  private get ffa(): boolean {
    return this.mode === 'ffa';
  }

  private get team(): boolean {
    return this.mode === 'team';
  }

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
  /** Tick de la dernière entrée en retard prise en compte (une entrée plus ancienne encore est ignorée). */
  private lateT: number[] = [];
  /** Tirages des bots : séparés du RNG du monde, pour que les clients restent synchronisés. */
  private botRng = makeRng(1);

  override onCreate(options: { code?: string; mode?: unknown }): void {
    this.code = typeof options.code === 'string' ? options.code : '';
    this.mode = ROOM_MODES.includes(options.mode as RoomMode) ? (options.mode as RoomMode) : this.initialMode;
    this.seats = Array.from({ length: this.size }, () => null);
    this.rematch = Array.from({ length: this.size }, () => false);
    this.pending = Array.from({ length: this.size }, () => new Map<number, number>());
    this.last = Array.from({ length: this.size }, () => 0);
    this.lateT = Array.from({ length: this.size }, () => -1);
    this.maxClients = this.size;
    this.setMetadata({ code: this.code });
    this.onMessage('hero', (client, msg: { hero?: unknown }) => this.onHero(client, msg));
    this.onMessage('ready', (client, msg: { ready?: unknown }) => this.onReady(client, msg));
    this.onMessage('arena', (client, msg: { arena?: unknown }) => this.onArena(client, msg));
    this.onMessage('bot', (client, msg: { add?: unknown }) => this.onBot(client, msg));
    this.onMessage('mode', (client, msg: { mode?: unknown }) => this.onMode(client, msg));
    this.onMessage('lobby', (client) => this.onBackToLobby(client));
    this.onMessage('start', (client) => this.onStart(client));
    this.onMessage('input', (client, msg: { t?: unknown; i?: unknown }) => this.onInput(client, msg));
    this.onMessage('ping', (client, msg: { ts?: unknown }) =>
      client.send('pong', { type: 'pong', ts: Number(msg.ts) || 0 } satisfies ServerMessage));
    this.onMessage('rematch', (client) => this.onRematch(client));
    this.onMessage('resync', (client) => this.onResync(client));
    this.setSimulationInterval(() => this.update(), TICK_MS);
  }

  override onJoin(client: Client, options: { name?: unknown; token?: unknown }): void {
    // Refus : la promesse join() du client échoue avec ce message.
    if (this.phase !== 'lobby') throw new Error('Combat en cours : attends la fin pour rejoindre.');
    const slot = this.seats.findIndex((s) => s === null);
    if (slot < 0) {
      client.send('error', { type: 'error', message: 'Salon plein.' } satisfies ServerMessage);
      return;
    }
    this.seats[slot] = {
      sid: client.sessionId, name: cleanName(options.name), hero: CHARACTER_IDS[slot % CHARACTER_IDS.length]!,
      ready: false, connected: true, bot: false,
      userId: accountStore()?.account(typeof options['token'] === 'string' ? options['token'] : '')?.id ?? null,
    };
    this.sendTo(client, { type: 'welcome', slot });
    this.broadcastLobby();
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0) return;
    const seat = this.seats[slot]!;
    if (this.phase === 'lobby' || this.phase === 'pick' || consented) {
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
    if (slot === 0) this.promoteHost();
    // Quelqu'un part pendant la sélection : tout le monde revient au salon.
    if (this.phase === 'pick') this.toLobby();
    else this.broadcastLobby();
  }

  /** L'hôte est parti : le premier humain restant prend la place 0 (et devient hôte). */
  private promoteHost(): void {
    const i = this.seats.findIndex((s) => s !== null && !s.bot);
    if (i <= 0) return;
    this.seats[0] = this.seats[i]!;
    this.seats[i] = null;
    const c = this.clients.find((x) => x.sessionId === this.seats[0]!.sid);
    if (c) this.sendTo(c, { type: 'welcome', slot: 0 });
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
    if (slot < 0 || (this.phase !== 'lobby' && this.phase !== 'pick')) return;
    if (typeof msg.hero !== 'string' || !CHARACTER_IDS.includes(msg.hero)) return;
    const seat = this.seats[slot]!;
    seat.hero = msg.hero;
    seat.ready = false;
    this.broadcastLobby();
  }

  private onReady(client: Client, msg: { ready?: unknown }): void {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0 || (this.phase !== 'lobby' && this.phase !== 'pick')) return;
    this.seats[slot]!.ready = msg.ready === true;
    // Sélection : le combat part dès que tout le monde a validé son combattant.
    if (this.phase === 'pick' && this.seats.every((s) => s !== null && s.ready)) {
      this.startMatch();
      return;
    }
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
      this.seats[slot] = { sid: '', name: `Bot ${slot + 1}`, hero, ready: true, connected: true, bot: true, userId: null };
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

  /** Hôte : change le mode. Passer en duel retire les bots ; refusé s'il reste plus de deux humains. */
  private onMode(client: Client, msg: { mode?: unknown }): void {
    if (this.slotOf(client.sessionId) !== 0 || this.phase !== 'lobby') return;
    if (!ROOM_MODES.includes(msg.mode as RoomMode)) return;
    const mode = msg.mode as RoomMode;
    const max = Math.max(...MODE_PLAYERS[mode]);
    if (this.seats.filter((s) => s !== null && !s.bot).length > max) {
      client.send('error', { type: 'error', message: `Trop de joueurs pour ce mode (${max} au maximum).` } satisfies ServerMessage);
      return;
    }
    for (let i = this.seats.length - 1; i > 0 && this.seats.filter((s) => s !== null).length > max; i--) {
      if (this.seats[i]?.bot) this.seats[i] = null;
    }
    this.mode = mode;
    this.broadcastLobby();
  }

  /** Hôte, après un combat ou pendant la sélection : retour au salon. */
  private onBackToLobby(client: Client): void {
    if (this.slotOf(client.sessionId) !== 0 || (this.phase !== 'result' && this.phase !== 'pick')) return;
    this.toLobby();
  }

  /** Retour au salon : les places redeviennent quatre, chacun doit revalider. */
  private toLobby(): void {
    this.phase = 'lobby';
    this.world = null;
    while (this.seats.length < this.size) this.seats.push(null);
    for (const s of this.seats) if (s && !s.bot) s.ready = false;
    this.rematch = this.seats.map(() => false);
    this.broadcastLobby();
  }

  /**
   * Seul l'hôte (slot 0) lance la partie, avec un nombre de combattants valable pour le mode. Tout le monde passe
   * alors à la sélection des combattants ; si tous étaient déjà prêts, le combat part directement.
   */
  private onStart(client: Client): void {
    if (this.slotOf(client.sessionId) !== 0 || this.phase !== 'lobby') return;
    const taken = this.seats.filter((s): s is Seat => s !== null);
    const counts = MODE_PLAYERS[this.mode];
    if (!counts.includes(taken.length)) {
      client.send('error', { type: 'error', message: `Ce mode se joue à ${counts.join(' ou ')} combattants (bots compris).` } satisfies ServerMessage);
      return;
    }
    // Places tassées : les combattants occupent les emplacements 0..n-1 du monde.
    this.seats = taken;
    if (taken.every((s) => s.ready)) {
      this.startMatch();
      return;
    }
    this.phase = 'pick';
    this.broadcastLobby();
  }

  private onInput(client: Client, msg: { t?: unknown; i?: unknown }): void {
    const slot = this.slotOf(client.sessionId);
    if (slot < 0 || !this.running || !this.world) return;
    const t = Number(msg.t);
    const i = Number(msg.i);
    if (!Number.isInteger(t) || !Number.isInteger(i)) return;
    // Les bits invalides sont tronqués aux 11 boutons connus.
    const bits = i & 0x7ff;
    if (t < this.world.tick) {
      // En retard (réseau) : appliquée au prochain tick plutôt que perdue. Sinon un relâchement de touche
      // perdu laisserait le combattant marcher tout seul chez les autres joueurs.
      if (t >= this.lateT[slot]!) {
        this.lateT[slot] = t;
        if (!this.pending[slot]!.has(this.world.tick)) this.last[slot] = bits;
      }
      return;
    }
    this.pending[slot]!.set(t, bits);
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
    this.lateT = seats.map(() => -1);
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
    this.recordStats(winner, winnerTeam);
    this.running = false;
    this.phase = 'result';
    this.winner = winner;
    this.winnerTeam = winnerTeam;
    this.placements = this.world?.match.placements ?? [];
    this.broadcast('result', { type: 'result', winner, winnerTeam } satisfies ServerMessage);
    this.broadcastLobby();
  }

  /** Victoire / défaite pour chaque compte humain de la salle. */
  private recordStats(winner: number | null, winnerTeam: number | null): void {
    const store = accountStore();
    if (!store) return;
    this.seats.forEach((seat, slot) => {
      if (!seat || seat.bot || seat.userId === null) return;
      const won = this.team ? winnerTeam === slot % 2 : winner === slot;
      store.recordResult(seat.userId, won);
    });
  }

  private slotOf(sid: string): number {
    return this.seats.findIndex((s) => s !== null && !s.bot && s.sid === sid);
  }

  private lobbyState(): LobbyState {
    const players = this.seats.map((s): LobbyPlayer | null =>
      s ? { name: s.name, hero: s.hero, ready: s.ready, connected: s.connected, bot: s.bot } : null,
    );
    return {
      code: this.code, phase: this.phase, arena: this.arena, size: this.seats.length, mode: this.mode, players,
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

/** Salles historiques : même salle, mode de départ différent. */
export class DuelRoom extends FightRoom {
  protected override initialMode: RoomMode = 'duel';
}

export class FourRoom extends FightRoom {
  protected override initialMode: RoomMode = 'ffa';
}

export class TeamRoom extends FightRoom {
  protected override initialMode: RoomMode = 'team';
}
