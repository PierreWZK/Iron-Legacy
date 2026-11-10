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

---

## 9. Session 2 : phases 2, 3 et 4 (et début de la 5)

Demande : « Je valide, je te laisse continuer ! » (tu avais demandé d'avancer le plus loin possible tant que chaque phase est jouable et testée).

### Ce qui est fait

- **Phase 2** : premier personnage **KAIRO** (karaté) avec sa table de coups complète : jab, direct, uppercut (accroupi), coup de pied frontal, circulaire, balayette basse, balayage, fente, coude, coup de pied sauté, circulaire sauté, projection. Animation procédurale par coup (le bras ou la jambe s'étend pendant les frames actives). Poses : garde, marche, course, accroupi, saut, esquive, parade, réaction au coup, à terre, relevé, victoire.
- **Phase 3** : système de combat complet côté moteur :
  - frames de démarrage / actives / récupération pour chaque coup ;
  - hitbox/hurtbox (debout, accroupi, en l'air), hauteur haute / moyenne / basse ;
  - blocage (arrière, arrière + accroupi contre les bas), dégâts de chip ;
  - parade (arrière + A, fenêtre de 8 frames) avec étourdissement de l'attaquant ;
  - contre-attaque (frapper pendant le démarrage adverse : dégâts et stun majorés) ;
  - projection (A + E ensemble à 1 m), tech si les deux joueurs projettent ;
  - esquive (Maj + arrière ou côté, invulnérable 12 frames) ;
  - hitstun, blockstun, knockdown, relevé ; knockback ; juggle simplifié (coups qui soulèvent) ;
  - annulation d'un coup touché vers un autre (jab → direct → circulaire, combo testé) ;
  - mise à l'échelle des dégâts de combo ; compteur de combo ; hit-stop.
- **Phase 4** : deuxième personnage **VERA** (kickboxeuse, pieds plus rapides, jab plus léger) et **IA** à 5 niveaux (approche, blocage des attaques adverses, attaques à portée). L'IA est déterministe.
- **Début de phase 5** : menu (mode, personnages, adversaire et niveau), combat contre IA jouable, entraînement avec mannequin (immobile, bloque, attaque, patrouille), vie infinie (touche I), recommencer (Entrée), retour au menu (Échap).
- **Interface** : barres de vie, horloge, manches gagnées, combo, dégâts flottants, K.O., victoire/défaite avec « Rejouer » et « Menu », panneau de débogage (FPS, tick, état et frame du coup de chaque combattant), étincelles et secousse caméra sur impact.
- Documentation : `docs/ARCHITECTURE.md` (section « Mise à jour : phases 2 à 4 »).

### Ce qui n'est pas fait (honnêtement)

- **Arcade** de la phase 5 : pas de 8 combats enchaînés, pas de boss final, pas de classement, pas d'écran de fin. Seul le mode « combat contre IA » est jouable.
- 10 personnages sur 12 restent à faire, 7 arènes sur 8, modes histoire, robots, survie, défis, 2v2 et 4 joueurs.
- Juggle avancé : seulement le lancer simple (uppercut, coup sauté circulaire). Pas de juggle sur plusieurs coups.
- Manettes, remappage des touches, son, musiques, voix : non faits.
- Pas de rendu validé sur GPU réel. L'environnement de test n'a qu'un pilote logiciel (`Microsoft Basic Render Driver`) : les FPS mesurés (26 à 60 selon l'état de l'onglet) ne reflètent pas une vraie machine.
- Ombres et lumières ponctuelles coûteuses en rendu logiciel. Pas d'optimisation faite.
- La sim rattrape au maximum 5 ticks par image : sur une machine très lente, le combat ralentit au lieu de se désynchroniser (voulu, à surveiller).
- Docker toujours non installé (phase 8).

### Ce qui a été testé

| Test | Résultat |
|---|---|
| `npm test` : 36 tests Vitest (déplacements, collisions, saut, déterminisme, frame data du jab, blocage, balayette haute/basse, parade, contre-attaque, combo jab→direct→circulaire (77 PV restants), projection, tech, esquive, knockback, KO, manches, temps écoulé, égalité, intro, IA, deux IA qui se battent sans valeur non finie, reproductibilité de l'IA, roster complet) | **36/36 passent** |
| `npm run typecheck` (strict, moteur et client) | OK |
| `npm run build` | OK |
| Navigateur, menu : affichage, sélection de personnage et de mode | OK (capture) |
| Navigateur, entraînement, vrais événements clavier : D avance, A jab (-4 PV), E direct (-7), F circulaire (-12, échelle de combo) | OK |
| Navigateur : projection A+E à 0,9 m (VERA à 86 PV, relevé ensuite) ; esquive Maj+Q (état `dodge`) ; parade Q+A (état `parry`) | OK |
| Navigateur, mode IA : l'IA attaque et touche (P1 à 49 PV après 6 s sans rien faire) | OK |
| Console : aucune erreur pendant les tests | OK |
| Capture : projection vue à l'écran (combattant au sol) | OK |

Bugs trouvés et corrigés pendant les tests :
- Projection : la seconde projection s'appliquait après la tech (la réinitialisation de l'état de la première effaçait le drapeau « coup touché »). Corrigé par un garde dans `applyThrow`.
- Tests : plusieurs erreurs étaient dans les tests (timing de l'impact, hit-stop non pris en compte, combo lu après remise à zéro, KO sans attendre le coup). Corrigées.
- Aide à l'écran : Q et D étaient mal décrits (D avance, Q recule). Corrigé.

### Tests à faire par toi

Dans `day-28-iron-legacy` : `npm install` puis `npm run dev`, puis ouvre http://localhost:5328.

1. **Menu** : choisis mode, personnage, adversaire et niveau (IA) ou mannequin (entraînement), puis COMBATTRE.
2. **Déplacements** : D avance, Q recule, Z/S tournent autour de l'adversaire sans changer la distance. Naturel ? Vitesses trop lentes ou rapides ?
3. **Coups** : A jab, E direct, R pied frontal, F circulaire, C puis R (balayette basse), C puis F (balayage), avant + A (fente), avant + E (coude), C + E (uppercut), Espace + R ou F (coups sautés). Les coups touchent-ils quand ça semble toucher ? Les dégâts s'affichent-ils ?
4. **Combos** : enchaîne A, E, F vite. Le compteur de combo apparaît-il ? Le troisième coup touche-t-il ?
5. **Blocage** : maintiens Q (arrière) pendant qu'on te frappe, puis Q + C contre une balayette. Les dégâts tombent-ils à 1 ?
6. **Parade** : Q + A juste avant qu'un coup t'atteigne. L'adversaire doit s'arrêter, tu ne prends rien.
7. **Projection** : A + E ensemble, à courte distance.
8. **Esquive** : Maj + Q ou Maj + Z/S pendant une attaque.
9. **Saut** : Espace, puis saut au-dessus de l'adversaire.
10. **Mannequin** : T pour changer de mode (immobile, bloque, attaque, patrouille). I pour la vie infinie.
11. **Mode IA** : joue contre les niveaux 1 et 5. Le niveau 1 doit être battable, le 5 nettement plus dur. Le match se termine-t-il bien (2 manches, victoire/défaite, Rejouer, Menu) ?
12. **Échap** : retour au menu. **Entrée** : recommencer la manche.
13. **Performance** : note les FPS (panneau de débogage) sur ta machine. Ça saccade ?
14. **Navigateurs** : Chrome et Firefox au minimum.

### Modifications à me renvoyer

Pour chaque point : ce qui ne marche pas, ce qui te semble mauvais (valeurs, ressenti), et ce que tu veux à la place. En particulier :
- vitesses, portée des coups, durée des stuns (ressenti) ;
- tes choix de touches si tu veux les changer ;
- niveaux de l'IA trop faciles ou trop durs ;
- si tu veux que je finisse l'**arcade** (phase 5) avant la suite, ou si on enchaîne sur les personnages.

Branche : `feat/phases-2-4-combat`, créée à partir de `feat/phase-1-prototype`. Rien n'est poussé.

---

## 10. Session 3 : phase 5 (arcade)

Demande : « Je te laisse continuer ! » (suite du plan : arcade après la phase 4).

### Ce qui est fait

- **Arcade** : 9 combats (8 adversaires + boss TITAN-01), dans l'ordre : VERA niv.1, KAIRO niv.2, VERA niv.2, KAIRO niv.3, VERA niv.3, KAIRO niv.4, VERA niv.4, KAIRO niv.5, TITAN-01 niv.5 (boss).
- **Difficulté** : Facile, Normal, Difficile, Expert. Décale le niveau d'IA (-1 à +2, borné 1 à 7) et multiplie le score (0,8 / 1 / 1,25 / 1,5).
- **Boss TITAN-01** : données seules (vie 180, lent, coups lourds, échelle 1,45). Non sélectionnable dans le menu.
- **IA** : niveaux 6 et 7 ajoutés pour l'Expert.
- **Score** (fonction pure, `scoreFight`) : 1000 × numéro d'étape, + vie restante (jusqu'à 500), + 10 × secondes restantes, + 1000 si combat parfait (aucun PV perdu), le tout × multiplicateur de difficulté.
- **Parcours** : victoire → écran « ÉTAPE n RÉUSSIE » (score, total, prochain adversaire) → étape suivante. Défaite → écran « DÉFAITE » (score, détail, Réessayer, Menu). Boss vaincu → fin par personnage (texte) + texte de fin du boss + score final.
- **Classement local** : top 10 dans le localStorage du navigateur. Propre à ce navigateur ; le classement en ligne viendra avec les comptes (phase 11).
- **Navigation** : bouton ARCADE dans le menu ; Échap quitte l'arcade (retour menu).

### Ce qui n'est pas fait (honnêtement)

- Cinématiques de fin : **texte seul**, pas de vidéo ni de mise en scène.
- Un seul décor (dojo) pour tout l'arcade : les « noms de lieux » de l'échelle ne sont pas affichés et les arènes ne changent pas.
- Seulement 2 personnages jouables + 1 boss : l'arcade réutilise KAIRO et VERA comme adversaires. Les 10 personnages restants viendront avec la suite du roster.
- Les écrans arcade ne sont pas traduits via `i18n/fr.ts` (textes en dur en français).
- Le passage à l'écran de fin du boss (victoire finale) n'a pas été testé dans le navigateur ; le chemin est couvert par la logique (`arcadeFightOver`) mais pas par un test automatique.
- Classement non partagé entre joueurs ni entre navigateurs.

### Ce qui a été testé

| Test | Résultat |
|---|---|
| `npm test` : 46 tests Vitest (dont 10 nouveaux pour l'arcade : échelle, boss, niveaux bornés, score monotone, difficulté, bornes) | **46/46 passent** |
| `npm run typecheck` | OK |
| `npm run build` | OK |
| Navigateur : menu → ARCADE → sélection → COMMENCER → étape 1 (libellé « ARCADE · ÉTAPE 1 / 9 · VERA ») → victoire → écran « ÉTAPE 1 RÉUSSIE » (score 2 000) → ÉTAPE SUIVANTE → étape 2 (adversaire KAIRO) → défaite → écran « DÉFAITE » avec score et classement | OK |

Bugs trouvés pendant les tests : aucun dans la logique. Une erreur 500 transitoire de Vite est apparue pendant le rechargement à chaud : elle a disparu au rechargement, sans changement de code.

### Tests à faire par toi

1. Menu → ARCADE. Choisis un combattant et une difficulté, puis COMMENCER.
2. Joue l'étape 1 contre VERA. Gagne : l'écran « ÉTAPE 1 RÉUSSIE » doit afficher un score cohérent (plus de vie et de temps = plus de points).
3. Continue jusqu'à la défaite : l'écran DÉFAITE doit apparaître, avec le score et le classement.
4. Essaie les 4 difficultés. Facile doit être battable, Expert nettement plus dur.
5. Échap pendant un combat d'arcade : retour au menu.
6. Si tu peux, gagne tout l'arcade jusqu'au boss TITAN-01 : vérifie l'écran de fin (texte, score final, classement). **Ce test n'a pas été fait par moi.**
7. Ferme et rouvre le navigateur : le classement doit être encore là.

### Modifications à me renvoyer

- Équilibrage : niveaux de chaque étape, boss trop dur ou trop facile.
- Score : les poids te semblent-ils justes ?
- Textes de fin : à réécrire ou à raccourcir ?
- Quand tu veux, je passe aux personnages suivants (roster) ou à l'histoire (phase 6).
