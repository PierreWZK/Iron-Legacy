import { describe, expect, it } from 'vitest';
import { Btn, createDuelWorld, Rollback, stepWorld, worldHash, type World } from './index';

/** Entrées scriptées, identiques pour le client et la référence. */
const scriptA = (t: number): number => [0, Btn.Fwd, Btn.LP, Btn.Back | Btn.Shift, 0, Btn.RK, Btn.Crouch | Btn.LK][t % 7]!;
const scriptB = (t: number): number => [Btn.Back, 0, Btn.Fwd, Btn.LP, Btn.RP, 0, Btn.SideL][(t * 3) % 7]!;

/** Délai de confirmation pseudo-aléatoire (déterministe), entre 0 et `max` ticks. */
function delay(t: number, max: number): number {
  return ((t * 2654435761) >>> 0) % (max + 1);
}

function makeWorld(): World {
  return createDuelWorld({ p1: 'kairo', p2: 'vera', distance: 2.5 });
}

describe('netcode — rollback', () => {
  it('avec confirmations en retard, l\'état final égale la simulation directe', () => {
    const reference = makeWorld();
    const client = new Rollback(0, makeWorld());
    const total = 600;
    // Le serveur confirme les entrées réelles du tick t après `delay(t)` ticks.
    const pendingConfirm = new Map<number, number>(); // tick -> tick où la confirmation arrive
    for (let t = 0; t < total; t++) pendingConfirm.set(t, t + delay(t, 8));
    const bitsOf = (t: number): [number, number] => [scriptA(t), scriptB(t)];

    for (let frame = 0; frame < total + 10; frame++) {
      // Confirmations arrivées à cet instant (ticks déjà simulés ou non).
      for (const [t, arrival] of pendingConfirm) {
        if (arrival === frame && t <= client.tick + 1) {
          client.confirm(t, bitsOf(t));
          pendingConfirm.delete(t);
        }
      }
      if (client.tick < total) {
        const t = client.tick;
        client.step(scriptA(t));
      }
    }
    // Les confirmations restantes arrivent après la fin du match.
    for (const [t] of pendingConfirm) client.confirm(t, bitsOf(t));

    for (let t = 0; t < total; t++) stepWorld(reference, bitsOf(t));
    expect(client.world.tick).toBe(reference.tick);
    expect(worldHash(client.world)).toBe(worldHash(reference));
    expect(client.rollbacks).toBeGreaterThan(0);
  });

  it('client en avance : l\'adversaire est prédit avec sa dernière entrée confirmée, pas figé', () => {
    const lead = 8;
    const reference = makeWorld();
    const client = new Rollback(0, makeWorld());
    // L'adversaire avance en continu ; le serveur confirme chaque tick `lead` ticks après que le client l'a joué.
    for (let t = 0; t < 120; t++) {
      client.step(0);
      if (t >= lead) client.confirm(t - lead, [0, Btn.Fwd]);
    }
    for (let t = 0; t < 120; t++) stepWorld(reference, [0, Btn.Fwd]);
    // Prédiction juste : l'état courant égale déjà la simulation réelle, sans attendre les confirmations.
    expect(worldHash(client.world)).toBe(worldHash(reference));
  });

  it('sans latence, aucune correction n\'est nécessaire si les prédictions tiennent', () => {
    const client = new Rollback(0, makeWorld());
    for (let t = 0; t < 120; t++) {
      client.step(0);
      client.confirm(t, [0, 0]);
    }
    expect(client.rollbacks).toBe(0);
  });

  it('une resynchronisation serveur remplace l\'état courant', () => {
    const reference = makeWorld();
    for (let t = 0; t < 50; t++) stepWorld(reference, [scriptA(t), scriptB(t)]);
    const client = new Rollback(1, makeWorld());
    for (let t = 0; t < 50; t++) client.step(scriptB(t));
    client.resync(reference);
    expect(worldHash(client.world)).toBe(worldHash(reference));
    expect(client.tick).toBe(50);
  });

  it('empreinte stable et sensible à un changement d\'état', () => {
    const a = makeWorld();
    const b = makeWorld();
    expect(worldHash(a)).toBe(worldHash(b));
    b.fighters[0]!.health -= 1;
    expect(worldHash(a)).not.toBe(worldHash(b));
  });
});

describe('netcode — resynchronisation', () => {
  it('après resync, les ticks locaux restants sont rejoués depuis l\'état serveur', () => {
    const reference = makeWorld();
    const client = new Rollback(0, makeWorld());
    for (let t = 0; t < 40; t++) {
      client.step(scriptA(t));
      client.confirm(t, [scriptA(t), scriptB(t)]);
    }
    // Le serveur est à 20 ticks ; le client a déjà joué 40 ticks.
    for (let t = 0; t < 20; t++) stepWorld(reference, [scriptA(t), scriptB(t)]);
    client.resync(reference);
    expect(client.tick).toBe(40);
    for (let t = 20; t < 40; t++) stepWorld(reference, [scriptA(t), scriptB(t)]);
    expect(worldHash(client.world)).toBe(worldHash(reference));
  });
});
