import { Client, type Room } from 'colyseus.js';
import { FOUR_ROOM_NAME, ROOM_NAME, TEAM_ROOM_NAME, type ClientMessage, type ServerMessage } from '@iron/engine';
import { savedToken } from '../account/token';

/** Adresse du serveur de combat (variable d'environnement VITE_SERVER_URL, sinon localhost). */
export const SERVER_URL: string = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'ws://localhost:2567';

/** Type de salon : duel à deux, dernier debout à quatre, ou équipes 2v2. */
export type RoomKind = 'duel' | 'four' | 'team';

const ROOM_BY_KIND: Record<RoomKind, string> = { duel: ROOM_NAME, four: FOUR_ROOM_NAME, team: TEAM_ROOM_NAME };

const MESSAGE_TYPES = ['welcome', 'lobby', 'start', 'tick', 'hash', 'snapshot', 'result', 'pong', 'error'] as const;

let client: Client | null = null;
let room: Room | null = null;

/** Ouvre (ou crée) un salon et branche les messages du serveur sur `onMessage`. */
export async function openRoom(
  mode: 'create' | 'join',
  code: string,
  name: string,
  kind: RoomKind,
  onMessage: (m: ServerMessage) => void,
  onClose: (reason: string) => void,
): Promise<Room> {
  client ??= new Client(SERVER_URL);
  const roomName = ROOM_BY_KIND[kind];
  room = mode === 'create'
    ? await client.create(roomName, { code, name, token: savedToken() })
    : await client.join(roomName, { code, name, token: savedToken() });
  for (const type of MESSAGE_TYPES) {
    room.onMessage(type, (m: ServerMessage) => onMessage(m));
  }
  room.onLeave((reason: number | string) => onClose(String(reason)));
  return room;
}

export function sendMessage(m: ClientMessage): void {
  room?.send(m.type, m);
}

export function closeRoom(): void {
  const r = room;
  room = null;
  void r?.leave();
}

export function hasRoom(): boolean {
  return room !== null;
}
