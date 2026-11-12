import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { FOUR_ROOM_NAME, ROOM_NAME } from '@iron/engine';
import { DuelRoom, FourRoom } from './room';

/** Crée le serveur de jeu (HTTP + WebSocket + salon de duel). Ne démarre rien : voir index.ts. */
export function createGameServer(): { gameServer: Server; httpServer: HttpServer } {
  const httpServer = createServer();
  const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
  gameServer.define(ROOM_NAME, DuelRoom).filterBy(['code']);
  gameServer.define(FOUR_ROOM_NAME, FourRoom).filterBy(['code']);
  return { gameServer, httpServer };
}
