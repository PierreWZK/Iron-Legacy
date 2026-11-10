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
| 1 | Architecture + prototype 3D | **faite, validée** |
| 2 | Premier personnage (KAIRO), déplacements, animations par coup | **faite, à tester** |
| 3 | Système de combat : frames, hitbox/hurtbox, blocage, parade, projection, esquive, combos, contre-attaque, juggle simple | **faite, à tester** |
| 4 | 2e personnage (VERA) + IA (5 niveaux) | **faite, à tester** |
| 5 | Premier mode jouable | **partiel** : combat contre IA et entraînement jouables ; arcade (8 combats, boss, classement) à faire |
| 6 | Mode histoire | à faire |
| 7 | Mode robots | à faire |
| 8 | Multijoueur en ligne à deux | à faire |
| 9 | Multijoueur à quatre | à faire |
| 10 | 2v2 et chacun pour soi | à faire |
| 11 | Menus, progression, sauvegardes, comptes | à faire |
| 12 | Optimisation, tests, déploiement (Coolify) | à faire |


## Mise à jour : phases 2 à 4

### Données de combat (`@iron/engine`)

- `characters/types.ts` : `MoveDef` (frames startup/active/recovery, dégâts, hitstun, blockstun, knockback, launch, knockdown, reach, radius, lunge, cancel, throw) et `CharacterDef` (vitesses, vie, apparence, table de coups).
- `characters/baseMoves.ts` : table de référence. `kairo.ts` la reprend telle quelle ; `vera.ts` la surcharge partiellement (coups de pied plus rapides, jab plus léger). Un personnage = des données, pas du code.
- `combat/intent.ts` : bouton(s) pressé(s) + posture → coup.
- `combat/hit.ts` : hurtbox par posture (debout / accroupi / en l'air), chevauchement hitbox/hurtbox, règle de blocage, mise à l'échelle des dégâts de combo.
- `combat/resolve.ts` : collecte tous les impacts du tick sur l'état d'entrée, puis les applique (trade possible). Gère blocage, parade (fenêtre de 8 frames), contre-attaque (dégâts et stun majorés), projection et tech.
- `sim.ts` : machine à états par combattant (`idle`, `attack`, `dodge`, `parry`, `hitstun`, `knockdown`, `getup`, `thrown`…), hit-stop (la sim est figée 4 à 9 frames après un impact), annulations de coups.
- `match.ts` : intro → combat → KO → manche suivante, match au meilleur des 3 (2 manches). Temps écoulé : le plus de vie gagne ; égalité = manche rejouée.
- `ai.ts` : IA déterministe qui ne lit que l'état public. Réagit par le blocage, approche, attaque ; 5 niveaux.
- `state.ts` : RNG déterministe (xorshift32) dans le monde, pour que l'IA reste reproductible.

### Client

- `game/runtime.ts` : boucle à pas fixe (60 Hz), modes `ai` et `training`, mannequin (immobile, bloque, attaque, patrouille), vie infinie.
- `game/render/pose.ts` : pose procédurale par état et par coup (remplaçable par des AnimationClip sans toucher à la sim).
- `game/render/Effects.tsx` : étincelles instanciées, alimentées par les événements de la sim (lecture seule).
- `game/ui/Hud.tsx` : barres de vie, horloge, manches, combo, dégâts flottants, overlays (round, K.O., victoire/défaite), panneau de débogage (frames).
- `game/ui/Menu.tsx` : mode, personnages, adversaire et niveau d'IA, mannequin.

### Règles de la sim à connaître

- Déterminisme : pas de `Math.random` dans la sim ; le RNG est dans `World.rng`.
- Un coup de projection ne s'applique que si l'attaquant projette encore. Deux coups simultanés s'appliquent tous les deux.
- Le knockdown est immunisé aux coups pendant `KNOCKDOWN_TICKS` ; le relevé dure `GETUP_TICKS`.
- Contrôles : D/Q = avancer/reculer (le joueur est à gauche de l'écran), Z/S = pas de côté, Maj + côté/arrière = esquive, Maj + avant = course.

### Limites connues

- Rendu testé uniquement avec le pilote logiciel de l'environnement de test : FPS non représentatifs d'un GPU réel.
- Une seule scène et une seule arène (dojo) ; les 7 autres arènes ne sont pas faites.
- 2 personnages sur 12 ; juggle avancé non fait.
- Pas de manettes, pas de remappage des touches, pas de son.
- Pas de réseau (phases 8 à 10), pas de comptes ni de sauvegarde (phase 11).
