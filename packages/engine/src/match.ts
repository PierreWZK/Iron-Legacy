import { KO_TICKS, ROUNDS_TO_WIN } from './constants';
import { beginRound, endMove, type Fighter, type World } from './state';

/** Avance la machine à états du match : intro → combat → KO → manche suivante ou fin. */
export function updateMatch(w: World): void {
  if (w.match.mode === 'ffa') {
    updateFfa(w);
    return;
  }
  const m = w.match;
  if (m.phase === 'intro') {
    m.timer--;
    if (m.timer <= 0) m.phase = 'fight';
    return;
  }
  if (m.phase === 'fight') {
    m.clock--;
    endRoundIfDone(w);
    return;
  }
  if (m.phase === 'ko') {
    m.timer--;
    if (m.timer > 0) return;
    const rw = m.roundWinner;
    if (rw === 0) m.wins[0] += 1;
    else if (rw === 1) m.wins[1] += 1;
    if (m.wins[0] >= ROUNDS_TO_WIN || m.wins[1] >= ROUNDS_TO_WIN) {
      m.phase = 'over';
      m.matchWinner = m.wins[0] >= ROUNDS_TO_WIN ? 0 : 1;
      return;
    }
    m.round++;
    beginRound(w, true);
  }
}

function endRoundIfDone(w: World): void {
  const a = w.fighters[0]!;
  const b = w.fighters[1]!;
  const m = w.match;
  if (a.health > 0 && b.health > 0 && m.clock > 0) return;

  let winner: number | null;
  if (a.health <= 0 && b.health <= 0) winner = null;
  else if (a.health <= 0) winner = b.id;
  else if (b.health <= 0) winner = a.id;
  else if (a.health === b.health) winner = null;
  else winner = a.health > b.health ? a.id : b.id;

  m.roundWinner = winner;
  m.phase = 'ko';
  m.timer = KO_TICKS;
  for (const f of w.fighters) settleFighter(f, winner);
  w.events.push({ kind: 'ko', fighter: winner ?? -1, x: 0, y: 0, z: 0 });
}

/** Fige le combattant selon le résultat de la manche : vainqueur debout, perdant à terre. */
function settleFighter(f: Fighter, winner: number | null): void {
  endMove(f);
  f.stun = 0;
  f.airStun = false;
  if (f.id === winner) {
    f.action = 'victory';
  } else if (winner === null) {
    f.action = f.health <= 0 ? 'knockdown' : 'idle';
  } else {
    f.action = 'knockdown';
  }
  if (f.action === 'knockdown') f.stun = 999999;
}

/**
 * Mode dernier debout : chaque combattant tombé à 0 PV est éliminé (ordre enregistré).
 * La partie s'arrête quand il reste un seul combattant, ou quand le temps est écoulé
 * (le plus de vie gagne ; à égalité, l'id le plus bas).
 */
function updateFfa(w: World): void {
  const m = w.match;
  if (m.phase === 'intro') {
    m.timer--;
    if (m.timer <= 0) m.phase = 'fight';
    return;
  }
  if (m.phase !== 'fight') return;
  m.clock--;
  for (const f of w.fighters) {
    if (f.health <= 0 && !m.placements.includes(f.id)) {
      m.placements.push(f.id);
      endMove(f);
      f.stun = 999999;
      f.airStun = false;
      f.action = 'knockdown';
      w.events.push({ kind: 'ko', fighter: f.id, x: f.pos.x, y: 0, z: f.pos.z });
    }
  }
  const alive = w.fighters.filter((f) => !m.placements.includes(f.id));
  if (alive.length > 1 && m.clock > 0) return;

  let winner: Fighter | undefined;
  if (alive.length === 1) {
    winner = alive[0];
  } else if (alive.length > 1) {
    // Temps écoulé : le plus de vie gagne, puis le plus bas id.
    winner = [...alive].sort((a, b) => b.health - a.health || a.id - b.id)[0];
    for (const f of alive) if (f !== winner) m.placements.push(f.id);
  }
  // Aucun survivant (double KO au même tick) : le dernier éliminé gagne.
  if (!winner) winner = w.fighters.find((f) => f.id === m.placements[m.placements.length - 1]);
  if (!winner) return;
  m.placements = m.placements.filter((id) => id !== winner!.id).concat(winner.id);
  m.matchWinner = winner.id;
  m.phase = 'over';
  winner.action = 'victory';
  winner.stun = 0;
  endMove(winner);
}

