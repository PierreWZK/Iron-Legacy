# Architecture technique — Iron Legacy

## Principe directeur

La **simulation de combat est un module pur** (`@iron/engine`) : TypeScript sans DOM, sans Three.js, sans horloge. Elle avance par ticks fixes à 60 Hz à partir d'entrées (masques de bits) et produit un état. Le client la rend, le serveur la rejoue pour valider : une seule source de vérité, testable en isolation, déterministe (condition du rollback).

```
 entrées clavier/manette ──► intentions (relatives au combattant) ──► stepWorld(world, inputs) ──► World
                                                                                  │
                                         rendu (interpolation prev→cur) ◄─────────┘
```

## Arborescence

```
day-28-iron-legacy/
├─ packages/
│  └─ engine/            Moteur de combat pur (sim, entrées, état, constantes) + tests Vitest
│     └─ src/            constants.ts, input.ts, state.ts, sim.ts, sim.test.ts, index.ts
├─ apps/
│  ├─ client/            Vite + React + R3F + Zustand + Tailwind
│  │  └─ src/
│  │     ├─ game/
│  │     │  ├─ runtime.ts          boucle à pas fixe (accumulateur) + adversaire factice
│  │     │  ├─ input/keyboard.ts   touches écran → intentions relatives au combattant
│  │     │  ├─ camera/FightCamera  caméra qui cadre les combattants
│  │     │  ├─ render/             rig.ts (squelette), pose.ts (poses), FighterView, Arena
│  │     │  ├─ ui/Hud.tsx          barres de vie, aide, debug
│  │     │  ├─ store.ts            Zustand : état d'UI uniquement
│  │     │  └─ Scene.tsx           Canvas R3F + pilotage de la sim
│  │     └─ i18n/fr.ts             textes (FR), prêts pour d'autres langues
│  └─ server/            (phase 8) Colyseus, salons, validation autoritaire
├─ docs/ARCHITECTURE.md
├─ CLAUDE_CONTEXTE.md    journal de session : demandes, faits, échecs, tests
└─ docker-compose.yml    (phase 8) Postgres + Redis
```

Modules prévus dans `packages/engine/src` : `moves/` (données d'attaques par personnage), `combat/` (hitboxes, hitstun, blockstun, juggle), `ai/`, `modes/` (arcade, histoire, survie, 2v2, FFA). Séparation arènes / personnages / sons côté client sous `apps/client/src/{arenas,characters,audio}`.

## Dépendances

| Zone | Paquets |
|---|---|
| Client | react, react-dom, three, @react-three/fiber, zustand, tailwindcss (+ @tailwindcss/vite), vite, typescript |
| Moteur | typescript, vitest |
| Prévu | `@dimforge/rapier3d-compat` (effets/décor, voir décision ci-dessous), colyseus + @colyseus/schema (serveur), pg, redis, argon2/jose (comptes) |

## Moteur 3D (client)

- R3F gère le `Canvas` ; la sim n'est **pas** dans le cycle de rendu React. `Simulation` appelle `runtime.advance(delta)` dans `useFrame` (priorité -1 : avant les vues).
- Boucle à pas fixe : accumulateur, 60 ticks/s, au plus 5 ticks de rattrapage par frame (pas de spirale de la mort). Le rendu interpole entre `prev` et `world` avec `alpha`.
- Personnage = hiérarchie d'os nommés (`BONE_NAMES`). `pose.ts` calcule une pose par état d'action ; `FighterView` lisse les rotations. Quand les GLB arriveront, un `AnimationMixer` remplacera `pose.ts` sans toucher à la sim.
- Caméra : milieu des combattants, perpendiculaire à l'axe P1→P2 (P1 à gauche), distance dépendante de l'écart. La même logique s'étendra à 4 combattants (boîte englobante).

### Décision : Rapier

Rapier n'est **pas** utilisé pour la sim de combat. Un moteur physique flottant n'est pas déterministe d'une machine à l'autre, ce qui casserait la validation serveur et le rollback. Les collisions de combat (pushboxes, hitboxes, hurtboxes) sont donc des formes simples gérées par `@iron/engine`. Rapier servira aux effets purement visuels côté client (débris, décor, cheveux/tissu). **À valider avec toi.**

## Système de combat (cible, phases 2-3)

- État par combattant : action courante + compteur de frames (`actionTicks`). Chaque coup est une donnée : frames de démarrage / actives / de récupération, dégâts, hitstun, blockstun, knockback, hauteur (haut/moyen/bas), fenêtre de combo, annulations permises.
- Hitboxes (sphères/capsules attachées aux os) actives pendant les frames actives ; hurtboxes par état (accroupi, en l'air…). Un coup touche au plus une fois par cible et par activation.
- Priorité : trade si deux coups touchent la même frame, le plus rapide/prioritaire l'emporte. Juggle : compteur de touches en l'air avec dégâts dégressifs.
- Pushbox cylindrique : empêche de se traverser (déjà en place) ; saut par-dessus autorisé au-dessus de `PUSH_MAX_HEIGHT`.
- Déterminisme : pas de `Math.random` dans la sim (PRNG à graine dans l'état), pas de dépendance à l'ordre des combattants (les cibles sont lues sur un instantané de début de tick).

Limite connue : `Math.sqrt/hypot` sont déterministes en IEEE, mais pas `Math.sin/cos` entre moteurs JS. La sim évite la trigonométrie pour cette raison ; garder cette règle.

## Stratégie réseau (phases 8-10)

1. **Serveur autoritaire Colyseus** : le serveur exécute le même `stepWorld`. Les clients envoient `{tick, input}` ; le serveur ne fait jamais confiance à un état client.
2. **Entrées + délai/rollback** : chaque client simule localement avec prédiction ; à l'arrivée de l'entrée distante réelle, rollback au tick concerné (`cloneWorld` sert de snapshot) et re-simulation jusqu'au présent. Fenêtre de rollback bornée (~8 ticks), au-delà : délai d'entrée adaptatif.
3. **Correction** : le serveur envoie périodiquement un snapshot + checksum ; en cas de divergence, le client se recale.
4. **Perte de connexion** : reconnexion dans un délai (Colyseus `allowReconnection`), abandon au-delà ; ping affiché depuis les ping/pong du salon.
5. **4 joueurs (local/en ligne/hybride)** : la sim est déjà N-combattants (`team`, cible = adversaire vivant le plus proche) ; seul le nombre d'entrées change. 2v2 et FFA ne diffèrent que par l'attribution des équipes.

## Planning des phases

| Phase | Contenu | État |
|---|---|---|
| 1 | Architecture + prototype 3D | **faite, en attente de validation** |
| 2 | Premier personnage + déplacements (animations plus riches) | à faire |
| 3 | Système de combat (frames, hitboxes, blocage, juggle) | à faire |
| 4 | 2e personnage + IA | à faire |
| 5 | Premier mode jouable (arcade) | à faire |
| 6 | Mode histoire | à faire |
| 7 | Mode robots | à faire |
| 8 | Multijoueur en ligne à deux | à faire |
| 9 | Multijoueur à quatre | à faire |
| 10 | 2v2 et chacun pour soi | à faire |
| 11 | Menus, progression, sauvegardes, comptes | à faire |
| 12 | Optimisation, tests, déploiement (Coolify) | à faire |
