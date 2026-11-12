import { create } from 'zustand';
import { isRoomCode, ROOM_CODE_CHARS, type LobbyState, type ServerMessage } from '@iron/engine';
import { runtime } from '../runtime';
import { backToMenu, useApp } from '../store';
import { closeRoom, openRoom, sendMessage } from './connection';

export type OnlineScreen = 'home' | 'lobby' | 'match' | 'result';

export interface OnlineState {
  screen: OnlineScreen;
  name: string;
  code: string;
  /** Place occupée dans le salon (0 = hôte). Connue dès le message « welcome ». */
  slot: number;
  /** Nombre de places du salon (2 ou 4). */
  size: number;
  lobby: LobbyState | null;
  error: string | null;
  connected: boolean;
  /** Latence aller-retour mesurée (ms), null tant qu'aucune mesure. */
  ping: number | null;
  /** Divergences détectées et corrigées depuis le début du combat. */
  desyncs: number;
}

export const useOnline = create<OnlineState>(() => ({
  screen: 'home',
  name: 'Joueur',
  code: '',
  slot: 0,
  size: 2,
  lobby: null,
  error: null,
  connected: false,
  ping: null,
  desyncs: 0,
}));

let pingTimer: ReturnType<typeof setInterval> | null = null;

function randomCode(): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  return s;
}

/** Ouvre l'écran en ligne (choix : créer ou rejoindre un salon). */
export function onlineOpen(): void {
  useOnline.setState({ screen: 'home', error: null });
  useApp.setState({ screen: 'online' });
}

export function onlineSetName(name: string): void {
  useOnline.setState({ name: name.slice(0, 16) });
}

/** Crée un salon : 2 places (duel) ou 4 places (dernier debout). */
export async function onlineHost(size: 2 | 4 = 2): Promise<void> {
  await connect('create', randomCode(), 0, size);
}

export async function onlineJoin(code: string): Promise<void> {
  const c = code.trim().toUpperCase();
  if (!isRoomCode(c)) {
    useOnline.setState({ error: 'Code invalide : 5 caractères (lettres et chiffres 2 à 9).' });
    return;
  }
  await connect('join', c, 1, 'auto');
}

async function connect(mode: 'create' | 'join', code: string, slot: number, size: 2 | 4 | 'auto'): Promise<void> {
  const shown = size === 'auto' ? 2 : size;
  useOnline.setState({ error: null, code, slot, size: shown, connected: false, lobby: null, screen: 'lobby', ping: null, desyncs: 0 });
  try {
    await openRoom(mode, code, useOnline.getState().name, size, handle, onClose);
    useOnline.setState({ connected: true });
    startPing();
  } catch (e) {
    useOnline.setState({ screen: 'home', error: e instanceof Error ? e.message : 'Connexion impossible.' });
  }
}

function startPing(): void {
  stopPing();
  pingTimer = setInterval(() => sendMessage({ type: 'ping', ts: Date.now() }), 1000);
}

function stopPing(): void {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}

function onClose(reason: string): void {
  stopPing();
  const st = useOnline.getState();
  useOnline.setState({ connected: false });
  if (st.screen === 'match') {
    useOnline.setState({ screen: 'home', error: `Connexion perdue (${reason}).` });
    runtime.online = null;
    useApp.setState({ screen: 'online' });
  }
}

/** Traite les messages du serveur. */
function handle(m: ServerMessage): void {
  switch (m.type) {
    case 'welcome':
      useOnline.setState({ slot: m.slot });
      return;
    case 'lobby': {
      const st = useOnline.getState();
      useOnline.setState({ lobby: m.state, size: m.state.size });
      if (st.screen !== 'match' && st.screen !== 'result') useOnline.setState({ screen: 'lobby' });
      return;
    }
    case 'start': {
      useOnline.setState({ slot: m.slot, screen: 'match', desyncs: 0 });
      runtime.startOnline({
        slot: m.slot,
        heroes: m.heroes,
        arena: m.arena,
        ffa: m.ffa,
        sendInput: (t, bits) => sendMessage({ type: 'input', t, i: bits }),
      });
      useApp.setState((s) => ({ screen: 'fight', runId: s.runId + 1 }));
      return;
    }
    case 'tick':
      runtime.onlineTick(m.t, m.inputs);
      return;
    case 'hash': {
      runtime.onlineVerify(m.t, m.h);
      const bad = runtime.takeDivergences();
      if (bad > 0) {
        useOnline.setState((s) => ({ desyncs: s.desyncs + bad }));
        sendMessage({ type: 'resync' });
      }
      return;
    }
    case 'snapshot':
      runtime.onlineSnapshot(m.world);
      return;
    case 'result': {
      const lobby = useOnline.getState().lobby;
      if (lobby) useOnline.setState({ lobby: { ...lobby, winner: m.winner } });
      return;
    }
    case 'pong':
      useOnline.setState({ ping: Math.max(0, Date.now() - m.ts) });
      return;
    case 'error':
      useOnline.setState({ error: m.message });
      return;
  }
}

export function onlineSetHero(hero: string): void {
  sendMessage({ type: 'hero', hero });
}

export function onlineSetReady(ready: boolean): void {
  sendMessage({ type: 'ready', ready });
}

export function onlineSetArena(arena: string): void {
  sendMessage({ type: 'arena', arena });
}

/** Hôte : ajoute ou retire un bot. */
export function onlineBot(add: boolean): void {
  sendMessage({ type: 'bot', add });
}

export function onlineStart(): void {
  sendMessage({ type: 'start' });
}

export function onlineRematch(): void {
  sendMessage({ type: 'rematch' });
}

/** Quitte le salon et revient au menu principal. */
export function onlineLeave(): void {
  stopPing();
  closeRoom();
  runtime.online = null;
  useOnline.setState({ screen: 'home', lobby: null, connected: false, error: null });
  backToMenu();
}

/** Appelée après la fin d'un combat en ligne : affiche le résultat. */
export function onlineFightOver(): void {
  if (!runtime.online || useApp.getState().screen !== 'fight') return;
  useOnline.setState({ screen: 'result' });
  useApp.setState({ screen: 'online' });
}
