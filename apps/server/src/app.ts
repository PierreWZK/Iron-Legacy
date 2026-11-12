import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { FOUR_ROOM_NAME, ROOM_NAME, TEAM_ROOM_NAME } from '@iron/engine';
import { AccountStore, setAccountStore } from './accounts';
import { handleApi } from './api';
import { DuelRoom, FourRoom, TeamRoom } from './room';

export interface GameServerOptions {
  /** Fichier SQLite des comptes. `:memory:` pour les tests. Défaut : variable IRON_DB ou data/iron.sqlite. */
  dbPath?: string;
}

/** Crée le serveur de jeu (HTTP + WebSocket + salons + API des comptes). Ne démarre rien : voir index.ts. */
export function createGameServer(opts: GameServerOptions = {}): {
  gameServer: Server;
  httpServer: HttpServer;
  accounts: AccountStore;
} {
  const dbPath = opts.dbPath ?? process.env['IRON_DB'] ?? 'data/iron.sqlite';
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const accounts = new AccountStore(dbPath);
  setAccountStore(accounts);

  // Le listener API est ajouté avant Colyseus : celui-ci le conserve pour les URL qui ne sont pas du matchmaking.
  const httpServer = createServer((req, res) => {
    handleApi(req, res);
  });
  const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
  gameServer.define(ROOM_NAME, DuelRoom).filterBy(['code']);
  gameServer.define(FOUR_ROOM_NAME, FourRoom).filterBy(['code']);
  gameServer.define(TEAM_ROOM_NAME, TeamRoom).filterBy(['code']);
  return { gameServer, httpServer, accounts };
}
