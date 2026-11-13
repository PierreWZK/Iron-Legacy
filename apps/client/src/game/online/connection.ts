import { Client, type Room } from 'colyseus.js';
import { FIGHT_ROOM_NAME, type ClientMessage, type RoomMode, type ServerMessage } from '@iron/engine';
import { savedToken } from '../account/token';

/** Adresse du serveur de combat (variable d'environnement VITE_SERVER_URL, sinon localhost). */
export const SERVER_URL: string = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'ws://localhost:2567';

/** Test : `?lag=200` ajoute 200 ms d'aller-retour (moitié à l'envoi, moitié à la réception). */
const LAG = Math.max(0, Number(new URLSearchParams(window.location.search).get('lag')) || 0);

const MESSAGE_TYPES = ['welcome', 'lobby', 'start', 'tick', 'hash', 'snapshot', 'result', 'pong', 'error'] as const;

let client: Client | null = null;
let room: Room | null = null;

/** Ouvre (ou crée) un salon et branche les messages du serveur sur `onMessage`. Le mode ne sert qu'à la création. */
export async function openRoom(
  mode: 'create' | 'join',
  code: string,
  name: string,
  gameMode: RoomMode,
  onMessage: (m: ServerMessage) => void,
  onClose: (reason: string) => void,
): Promise<Room> {
  client ??= new Client(SERVER_URL);
  room = mode === 'create'
    ? await client.create(FIGHT_ROOM_NAME, { code, name, mode: gameMode, token: savedToken() })
    : await client.join(FIGHT_ROOM_NAME, { code, name, token: savedToken() });
  for (const type of MESSAGE_TYPES) {
    room.onMessage(type, (m: ServerMessage) => (LAG ? setTimeout(() => onMessage(m), LAG / 2) : onMessage(m)));
  }
  room.onLeave((reason: number | string) => onClose(String(reason)));
  return room;
}

export function sendMessage(m: ClientMessage): void {
  const r = room;
  if (LAG) setTimeout(() => r?.send(m.type, m), LAG / 2);
  else r?.send(m.type, m);
}

export function closeRoom(): void {
  const r = room;
  room = null;
  void r?.leave();
}

export function hasRoom(): boolean {
  return room !== null;
}
