import { Client, type Room } from 'colyseus.js';
import { FOUR_ROOM_NAME, ROOM_NAME, type ClientMessage, type ServerMessage } from '@iron/engine';

/** Adresse du serveur de duel (variable d'environnement VITE_SERVER_URL, sinon localhost). */
export const SERVER_URL: string = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'ws://localhost:2567';

const MESSAGE_TYPES = ['welcome', 'lobby', 'start', 'tick', 'hash', 'snapshot', 'result', 'pong', 'error'] as const;

let client: Client | null = null;
let room: Room | null = null;

/** Ouvre (ou crée) un salon et branche les messages du serveur sur `onMessage`. */
export async function openRoom(
  mode: 'create' | 'join',
  code: string,
  name: string,
  size: 2 | 4 | 'auto',
  onMessage: (m: ServerMessage) => void,
  onClose: (reason: string) => void,
): Promise<Room> {
  client ??= new Client(SERVER_URL);
  if (mode === 'create') {
    room = await client.create(size === 4 ? FOUR_ROOM_NAME : ROOM_NAME, { code, name });
  } else if (size === 'auto') {
    // Taille inconnue : on essaie le duel, puis le salon à quatre.
    try {
      room = await client.join(ROOM_NAME, { code, name });
    } catch {
      room = await client.join(FOUR_ROOM_NAME, { code, name });
    }
  } else {
    room = await client.join(size === 4 ? FOUR_ROOM_NAME : ROOM_NAME, { code, name });
  }
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
