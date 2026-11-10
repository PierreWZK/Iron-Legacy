# CLAUDE_CONTEXTE — Iron Legacy (jour 28)

Journal de session : ce que tu as demandé, ce qui est fait, ce qui a échoué, ce qui est testé. Mis à jour à la fin de chaque phase.

## 1. Tes demandes (simplifié)

**Projet** : jeu de combat 3D complet dans le navigateur, inspiré de la sensation de Tekken 3 mais avec sa propre identité (aucun élément protégé). Nom provisoire : PROJECT IRON LEGACY. Priorité absolue : qualité du gameplay et jouabilité réelle avant la quantité de fonctionnalités. Jamais de fonctionnalité annoncée sans être implémentée et testée, jamais de bouton factice.

**Stack imposée** : React, TypeScript strict, Vite, Three.js (+ R3F), Zustand, Tailwind ; Rapier, GLTF/GLB, hitboxes/hurtboxes maison ; Node/TS, Colyseus, WebSocket, PostgreSQL, Redis si utile ; front déployable en statique, serveur de jeu séparé.

**Contenu visé** :
- Combat : marche, course, accroupi, saut, pas de côté, blocage, esquive, poings/pieds, attaques hautes/basses, spéciales, projections, combos, contre-attaques, relevé ; frames de démarrage/actives/récupération, priorités, hitstun, blockstun, knockback, juggle ; pas de traversée entre combattants.
- Commandes : Z/Q/S/D ou flèches, A/E poings, R/F pieds, Espace saut, Maj esquive/course ; manettes Xbox/PlayStation, touches configurables, 4 manettes en local.
- Modes : histoire (8 chapitres min, TITAN-01 en boss final), arcade (8 combats, boss, scores), robots (6 types + survie + défis), multijoueur en ligne autoritaire (rollback si possible), FOUR FIGHTERS (2v2 et chacun pour soi, local/en ligne/hybride), entraînement.
- 12 combattants originaux différents en gameplay, 8 arènes, UI arcade années 90 modernisée (PC + tablette), audio complet, comptes + progression + classement + mode invité.
- Méthode : 12 phases, une à la fois, chacune jouable et vérifiable avant la suivante.

**Consignes de travail** :
- Écrire ce fichier ; y noter demandes, réalisations, échecs, tests faits.
- À chaque fin de phase : te demander de faire tous les tests possibles et de me renvoyer les modifications à faire.
- GitHub : branche principale **`master`** (même si tu écris `main`, c'est une erreur de ta part).
- Dossier `day-28-iron-legacy`, repo public. Je commit et prépare les PR sur des branches `feat/*` ou `dev` ; **c'est toi qui pousses**.
- Questions posées avant de commencer (réponses ci-dessous).

## 2. Décisions prises (réponses à mes questions)

| Sujet | Décision |
|---|---|
| Modèles 3D | Humanoïdes procéduraux en code (squelette de joints, armures, couleurs par personnage), stylisés, remplaçables plus tard par des GLB |
| Portée | Phase 1, puis validation par toi ; ensuite avancer le plus loin possible |
| Mouvement | 3D type Tekken : pas de côté qui orbite autour de l'adversaire, caméra sur l'axe des deux combattants |
| Dépôt | Dossier `day-28-iron-legacy`, git en `master`, repo public, tu pousses |
| Base de données | Docker Compose (Postgres + Redis) prévu en phase 8 |
| Langue | Français, textes dans `i18n/fr.ts` pour ajouter d'autres langues |
| Déploiement | Coolify pour le serveur de jeu, front Vite statique (phase 12) |

Choix que j'ai faits seul et que tu dois valider : voir section 6.

## 3. Ce qui est fait (phase 1)

- Repo git initialisé en `master` ; travail sur la branche `feat/phase-1-prototype`.
- Monorepo npm workspaces : `packages/engine` (moteur pur) et `apps/client`.
- **Moteur** (`@iron/engine`) : entrées en masque de bits, état du monde N-combattants, simulation déterministe à 60 Hz : marche avant/arrière, course (Maj), pas de côté en orbite à distance constante, pas de côté rapide (Maj), accroupi, saut balistique avec élan, pushbox (pas de traversée, saut par-dessus possible), limite d'arène, orientation vers la cible la plus proche d'une autre équipe.
- **Client** : scène R3F, arène « dojo » (tatami, anneau lumineux, piliers, lanternes, ombres, brouillard), deux humanoïdes procéduraux articulés (13 os nommés) avec poses par état (garde, marche, recul, côté, course, accroupi, saut), caméra de combat qui cadre les deux combattants, boucle à pas fixe avec interpolation, clavier AZERTY par étiquette de touche, HUD (barres de vie, aide, debug FPS/tick/état/distance), adversaire factice immobile ou en patrouille (touche T).
- Documentation : `docs/ARCHITECTURE.md` (architecture, arborescence, dépendances, moteur 3D, combat, réseau, planning).

## 4. Ce que je n'ai pas réussi / pas encore fait

- **Docker n'est pas installé** sur ta machine (`docker: command not found`) : le `docker-compose.yml` sera écrit en phase 8 mais je ne pourrai pas le lancer ici ; il faudra installer Docker Desktop ou un Postgres local.
- **Rapier non installé** : décision de l'écarter pour la sim de combat (non déterministe), à valider (section 6).
- **Repo GitHub non créé** : tu as dit que tu pousseras toi-même ; aucun remote configuré.
- **Rendu mesuré dans un seul environnement** : 60 FPS dans le panneau navigateur de l'app Claude (GPU de ta machine ?), pas testé sur Firefox, Safari, tablette, ni machine moyenne de gamme.
- **Visuel provisoire** : les personnages sont des assets temporaires (identifiés comme tels dans `rig.ts`), pas encore de visages, cheveux, tenues par personnage ; les poses sont des cycles sinusoïdaux simples, pas d'animations d'attaque.
- Pas encore : coups, hitboxes, blocage, vie qui baisse, IA, manettes, remappage des touches, son, menus, réseau, comptes (phases suivantes).
- Avertissement console `THREE.Clock deprecated` venant de R3F (inoffensif).
- Le lissage des rotations d'os dépend du framerate (constante par frame) : à rendre indépendant du temps en phase 2.

## 5. Ce qui a été testé

| Test | Résultat |
|---|---|
| 10 tests Vitest du moteur : avancer/reculer, orbite à distance constante + face à la cible, G/D opposés, course > marche, pas de traversée à 2 combattants qui foncent, reste dans l'arène, superposition exacte sans NaN, saut + retombée + pas de rebond en maintenant la touche, saut par-dessus l'adversaire, déterminisme (500 ticks) + clone sans références partagées | Passent |
| `tsc` strict sur moteur et client | OK |
| `vite build` | OK (chunk JS 1,15 Mo, warning de taille attendu à ce stade ; découpage prévu en phase 12) |
| Navigateur (panneau Claude, vrais événements clavier) : sim à ~60 ticks/s, Z = pas de côté (action `sideL`, distance restée à 3,00 m), D = avance jusqu'à 0,90 m (contact pushbox), saut (pic 1,34 m puis retour à 0), Maj+D = `runFwd`, T = patrouille (P2 bouge), C = accroupi | OK |
| Capture d'écran : deux humanoïdes visibles, ombres, HUD | OK |
| Bug trouvé et corrigé pendant les tests : épaules étirées sur 1,4 m (échelle Y absolue au lieu de relative) | Corrigé |

## 6. Choix à valider par toi (risque de désaccord)

1. **Mapping des touches** : j'ai mis les directions **relatives à l'écran** comme Tekken (Q = gauche écran, D = droite écran = avancer pour P1, Z = vers le fond, S = vers la caméra, pas de côté). Alternative : Z avancer / S reculer / Q-D pas de côté. Les flèches font pareil.
2. **Accroupi sur `C`** : ta liste n'attribuait pas de touche à l'accroupi.
3. **Rapier** : écarté de la sim de combat (non déterministe), réservé aux effets visuels.
4. **Maj** : avec direction = course (avant) ou pas de côté rapide ; l'esquive avec invulnérabilité viendra avec le système de coups (phase 3).

## 7. Tests à faire par toi (fin de phase 1)

Lance : `npm install` puis `npm run dev`, ouvre http://localhost:5328 dans Chrome.

1. Les deux combattants s'affichent-ils, avec ombres, arène et HUD ? Le jeu tient-il 60 FPS (affiché en haut à droite) ?
2. Q/D : P1 avance et recule-t-il vers l'adversaire ? Les flèches font-elles pareil ?
3. Z/S : P1 tourne-t-il autour de l'adversaire en le gardant face à lui, sans changer de distance ?
4. Maj + D, Maj + Z : course et pas de côté rapide.
5. Espace : saut ; essaie de sauter par-dessus l'adversaire.
6. C : accroupi.
7. Fonce sur l'adversaire immobile : peux-tu le traverser ? (ne doit pas arriver) Essaie de pousser contre le bord de l'arène.
8. T : l'adversaire patrouille ; la caméra suit-elle bien, sans à-coups ?
9. Entrée : remet les positions.
10. Ressenti : vitesses (trop lent/rapide), caméra (trop proche/loin), lisibilité des poses.
11. Teste aussi dans Firefox et Edge, et note les FPS. Si possible sur une machine moyenne gamme ou une tablette.
12. Disposition du clavier : tu es en AZERTY ? Les touches Z/Q/S/D répondent-elles comme prévu ?

Renvoie-moi : ce qui marche, ce qui ne marche pas, les valeurs à changer (vitesses, caméra), et tes réponses aux choix de la section 6. Je corrige puis j'enchaîne les phases suivantes.

## 8. Historique des phases

- **Phase 1** : terminée côté développement, en attente de ta validation.
