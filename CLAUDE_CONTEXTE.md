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

---

## 11. Session 4 : recherche des personnages et des maps (avant la phase 6)

Demande : « Trouve 10 personnages 3D dans le même thème, et 10 maps dans le même thème que chacun (un ours = forêt, un robot = labo scientifique…). Ensuite phase 6 avec une fin pour chaque personnage. On débloque les personnages un à un : on commence avec 2 personnages, chaque fin débloque un personnage. »

### Décisions prises

| Sujet | Décision |
|---|---|
| Style | Quaternius low-poly, mélange : animaux + robot + humanoïdes (même auteur, CC0, style cohérent) |
| Maps | Packs 3D Quaternius (forêt, labo) + décors composés en code pour les autres thèmes |
| Récupération des fichiers | Tu télécharges les packs toi-même (Google Drive) et tu les déposes dans `assets/incoming/` ; je m'occupe de l'intégration |
| Déblocage (phase 6) | Départ : KAIRO et VERA. Chaque fin d'histoire débloque un personnage. Détails ci-dessous |

### Ce que j'ai vérifié (sources lues)

- **Ultimate Animated Animal Pack** (Quaternius, CC0, glTF/FBX/OBJ/Blend) : 12 animaux, plus de 12 animations chacun (Attack, Death, Kicks, Gallops, Walk, Jump…). Contenu du dossier glTF : Alpaca, Bull, Cow, Deer, Donkey, Fox, Horse_White, Horse, Husky, ShibaInu, Stag, Wolf. **Pas d'ours.**
- **Animated Robot Pack** (Quaternius, CC0) : un robot, **FBX/OBJ/Blend seulement** (pas de glTF : conversion nécessaire).
- **Universal Base Characters** (Quaternius, CC0, glTF/FBX) : 6 modèles humanoïdes (superhéros, normaux, ados, homme et femme), 20 coiffures, armature humanoïde, compatible avec la Universal Animation Library.
- **Universal Animation Library 1 et 2** (Quaternius, CC0) : plus de 130 animations sur armature humanoïde, formats glTF/GLB annoncés. Noms exacts des clips de combat (coup de poing, coup de pied, réaction au coup) **non vérifiés**.
- **Stylized Nature MegaKit** (Quaternius, CC0, glTF) : forêt (110+ modèles : arbres, plantes, rochers).
- **Modular Sci-Fi MegaKit** (Quaternius, CC0, glTF/FBX/OBJ) : 277 modules (couloirs, salles, labo). Environ 60 à 70 % du pack est gratuit.
- **KayKit Character Animations** (CC0) : Attack, Heavy Attack, Block, Spinning, Combo, Roll, Dash, Defeat… Pas de coup de poing/pied ni réaction au coup listés. Non retenu.

### Ce que je n'ai pas pu vérifier

- Les noms de clips animés des animaux, du robot et de la Universal Animation Library : à lire dans les fichiers une fois reçus.
- Les tailles des packs (non indiquées sur les pages).
- itch.io (KayKit) bloque les robots par une vérification anti-bot : je ne la contourne pas.
- L'outil de récupération de pages `ctx_fetch_and_index` du plugin context-mode est en panne (`Cannot find module 'turndown'`) ; j'ai lu les pages avec le navigateur intégré.

### Roster proposé (10 nouveaux, 12 au total)

| # | Personnage | Source | Carte proposée |
|---|---|---|---|
| 1 | Loup | Animal Pack | Forêt de nuit (Stylized Nature MegaKit) |
| 2 | Renard | Animal Pack | Clairière d'automne (même pack, teinte et brouillard différents) |
| 3 | Taureau | Animal Pack | Arène de corrida (sable, rochers, composée en code) |
| 4 | Cerf (stag) | Animal Pack | Montagne enneigée (nature kit teinté neige) |
| 5 | Husky | Animal Pack | Toundra glacée (composée en code) |
| 6 | Robot | Animated Robot Pack | Laboratoire HELIX (Modular Sci-Fi MegaKit) |
| 7 à 10 | Quatre humanoïdes (variantes de Universal Base Characters) | Universal Base Characters | Toit sous la pluie, usine robotique (Sci-Fi MegaKit), temple abandonné, désert industriel (en code) |

KAIRO et VERA gardent le dojo actuel et une rue nocturne.

Limite à connaître : les animaux restent à quatre pattes et n'ont pas de coup de poing ni de pied. Leurs coups seront des attaques propres (coup de tête, morsure, charge, ruade) basées sur les animations Attack et Kicks du pack. Le moteur de combat ne change pas, seules les données de coups et les clips associés sont à écrire.

### Déblocage proposé pour la phase 6

- Départ : KAIRO et VERA.
- Chaque personnage a son histoire (dialogues avant les combats) et une fin propre.
- Terminer l'histoire d'un personnage pour la première fois débloque le **prochain personnage verrouillé**, dans un ordre fixe.
- Il faut donc 10 fins pour tout débloquer. Les fins des personnages débloqués restent rejouables.

### Ce que je te demande de télécharger

Dépose les dossiers dans `day-28-iron-legacy/assets/incoming/` (non versionné) :
1. Ultimate Animated Animal Pack : dossier **glTF** (Wolf, Fox, Bull, Stag, Husky), plus le fichier `License.txt`.
2. Animated Robot Pack : tout le dossier.
3. Universal Base Characters : dossier glTF.
4. Universal Animation Library 1 et/ou 2 : dossiers glTF/GLB.
5. Stylized Nature MegaKit : dossier glTF.
6. Modular Sci-Fi MegaKit : dossier glTF.

Pages Quaternius (bouton « Download », dossier Google Drive) :
- https://quaternius.com/packs/ultimateanimatedanimals.html
- https://quaternius.com/packs/animatedrobot.html
- https://quaternius.com/packs/universalbasecharacters.html
- https://quaternius.com/packs/universalanimationlibrary.html
- https://quaternius.com/packs/universalanimationlibrary2.html
- https://quaternius.com/packs/stylizednaturemegakit.html
- https://quaternius.com/packs/modularscifimegakit.html

Quand c'est fait, dis-moi « fichiers déposés » : je lis les modèles et leurs clips, je confirme les 10 personnages et leurs coups, puis j'intègre.

---

## 12. Session 5 : personnages 3D animés et maps (avant la phase 6)

Demande : « Packs complets. Et oui ça me convient » (roster mixte, déblocage un par un, maps liées aux personnages).

### Ce qui est fait

- **6 nouveaux combattants jouables**, avec modèles 3D animés (Quaternius, CC0) :
  - **LOUP** (forêt) : rapide et fragile (95 PV), bond long, coups très vifs.
  - **RENARD** (clairière d'automne) : le plus agile (90 PV), esquive très longue, coups bas rapides.
  - **TAUREAU** (arène de corrida) : lent et très résistant (135 PV), coups dévastateurs, charge qui renverse.
  - **CERF** (montagne enneigée) : allonge supérieure (portée 1,25 à 1,6 m), coups de bois qui renversent.
  - **HUSKY** (toundra glacée) : endurant (115 PV), enchaînements faciles.
  - **ROBOT** (laboratoire HELIX) : puissant (120 PV), poings lourds, uppercut qui soulève.
  - Chacun a ses propres vitesses, vie et table de coups (libellés propres : « Morsure vive », « Charge », « Coup de bois »…). Test : les 8 personnages ont des statistiques toutes différentes.
- **Système de modèles animés** : `render/ModelFighter.tsx` charge glTF/FBX, met le modèle à l'échelle, choisit le clip selon l'état de la sim (attente, marche, galop, saut, attaque, réaction au coup, mort, relevé, victoire), accélère ou ralentit le clip d'attaque pour qu'il dure exactement la durée du coup, et fige l'animation pendant le hit-stop. Configuration par personnage dans `render/models.ts`.
- **6 maps** : forêt de nuit, clairière d'automne, canyon, montagne enneigée, toundra glacée (toutes avec les pièces du Stylized Nature MegaKit, teintées et éclairées différemment) et laboratoire HELIX (Modular Sci-Fi MegaKit : dalles, murs, colonnes, matériel). On combat dans le décor de l'adversaire. Dojo conservé pour KAIRO et VERA.
- **Arcade** : l'échelle utilise maintenant les nouveaux adversaires (loup, renard, taureau, cerf, husky, robot, VERA, KAIRO, puis TITAN-01).
- **Déblocage** (base de la phase 6) : départ avec KAIRO et VERA ; les autres sont verrouillés (« ??? » dans les menus). `unlockCharacter(id)` débloque et sauvegarde (localStorage). **Aucune histoire ne débloque encore** : c'est la phase 6. Pour tester tous les combattants : ajouter `?unlockAll` à l'URL (outil de test, ne modifie pas la sauvegarde).
- Assets copiés dans `apps/client/public/models/` (85 Mo) avec leurs licences CC0. Inventaire dans `docs/ASSETS.md`.

### Ce qui n'est pas fait (honnêtement)

- **4 humanoïdes** (sur 10 nouveaux) et **leurs 4 maps** : il manque la **Universal Animation Library 1** (la 2 que tu as fournie ne contient ni marche, ni course, ni saut, ni mort génériques ; elle a `Melee_Hook`, `Hit_Knockback`, des clips d'épée et de zombie). Sans elle, les humanoïdes Universal Base Characters n'ont aucune animation.
- **Phase 6 (histoire)** : dialogues, chapitres, 12 fins, déblocages par les fins : pas commencée.
- **Coups des animaux** : un seul clip d'attaque (loup, renard, husky : `Attack`) ou deux (cerf, taureau : `Attack_Headbutt` et `Attack_Kick`) : les 12 coups d'un même animal partagent donc ces clips, sans pose spécifique par coup.
- **Robot** : un seul clip d'attaque (`Robot_Punch`) et aucune réaction au coup propre (clip `Robot_Standing` + inclinaison).
- **Orientation** : tous les modèles regardent bien vers l'avant sans correction (`yaw` à 0) ; non vérifié visuellement pour tous les clips.
- **Performances** : les textures du pack nature sont lourdes (40 Mo pour la sélection). Dans l'environnement de test (rendu logiciel) le premier chargement d'une map prend 10 à 15 secondes ; à vérifier sur ta machine.
- Une partie des pièces (arbres) est clonée, pas instanciée : potentiel de gain de FPS si besoin.
- KAIRO et VERA gardent leur corps procédural (pas de modèle trouvé pour eux).
- TITAN-01 (boss) n'a pas encore de modèle 3D propre : il utilise le corps procédural sur la map labo.

### Ce qui a été testé

| Test | Résultat |
|---|---|
| `npm test` : 56 tests (10 nouveaux : chaque personnage jouable se bat 40 s contre KAIRO sans valeur non finie et inflige des dégâts, statistiques toutes différentes, nom/style/biographie présents) | **56/56 passent** |
| `npm run typecheck` | OK |
| `npm run build` | OK |
| Navigateur : menu avec personnages verrouillés (`?unlockAll` pour les débloquer) | OK |
| Navigateur : loup contre loup en forêt (modèles animés, arbres, rochers, étincelles, combo) | OK (capture) |
| Navigateur : robot dans le labo (sol métallique, colonnes, éclairage, étincelles, dégâts « CONTRE ! ») | OK (capture) |
| Navigateur : cerf dans la neige, taureau dans le canyon | OK (captures) |

Bugs trouvés et corrigés :
- Labo noir : les matériaux métalliques du pack n'ont aucun reflet sans carte d'environnement. Corrigé (environnement de studio dans `LabArena`).
- Canyon : de gros rochers placés sur le trajet de la caméra la mettaient à l'intérieur (écran orange flou, rendu très lent). Corrigé : tous les grands éléments sont au-delà de 23 m, la caméra reste à moins de 21 m.
- Les textures du labo étaient cherchées à côté des modèles alors qu'elles sont dans un dossier commun : redirection au chargement.
- Pas de FPS fiable dans l'environnement de test (rendu logiciel, premier affichage lent).

### Tests à faire par toi

Ouvre http://localhost:5328/?unlockAll (tout est débloqué pour tester).

1. **Menu** : tu vois 8 combattants ; sans `?unlockAll`, seuls KAIRO et VERA sont jouables, les autres affichent « ??? ».
2. Joue chaque combattant en mode « Combat contre IA » (tu choisis l'adversaire : sa map change avec lui). Les modèles regardent-ils vers l'adversaire ? Les animations suivent-elles les coups (attaque, recul, chute) ?
3. **Maps** : forêt (loup), clairière (renard), canyon (taureau), neige (cerf), toundra (husky), labo (robot). Les décors te plaisent-ils ? Visibilité des combattants ? La caméra reste-t-elle dégagée ?
4. **Équilibrage** : le loup est-il trop fragile ? Le taureau trop lent ? Le cerf trop avantagé par sa portée ?
5. **Performance** : note les FPS (panneau en haut à droite) par map et dis-moi lesquelles saccadent.
6. **Arcade** : l'échelle (loup, renard, taureau, cerf, husky, robot, VERA, KAIRO, TITAN-01) fonctionne-t-elle ? TITAN-01 n'a pas de vrai modèle.
7. Ajoute-moi tes retours sur les noms des coups d'animaux et sur la taille des modèles (trop grands ou petits ?).

### Ce que j'attends de toi pour continuer

- Télécharge la **Universal Animation Library 1** (Standard) sur https://quaternius.com/packs/universalanimationlibrary.html (dossier Google Drive) et dépose-la dans `assets/incoming/`, puis dis-moi « UAL1 déposée ». Je fais alors les 4 humanoïdes et leurs 4 maps (toit sous la pluie, usine robotique, temple abandonné, désert industriel).
- Ensuite : phase 6 (histoire, 12 fins, déblocage un par un).

---

## 13. Session 6 : personnages dessinés en code, moteur de coups à la Tekken

Demande : « Dessine-moi les personnages directement en 3D, humanoïdes. N'utilise plus les modèles que j'ai téléchargés. Je veux un jeu qui ressemble à Tekken, même dans l'animation : attraper quelqu'un fait une prise spéciale, des attaques différentes selon les mouvements (se baisser + pied gauche ≠ se baisser + pied droit). »

### Ce qui est fait

- **Plus aucun modèle téléchargé** : `ModelFighter`, `models.ts`, les décors nature et labo à base de glTF et le dossier `public/models` (85 Mo) sont supprimés. Le build fait 1,3 Mo. Les packs restent dans `assets/` (non versionné) mais ne sont plus utilisés.
- **12 combattants humanoïdes dessinés en code** (même squelette, donc toutes les animations marchent sur tous) :
  - KAIRO (kimono blanc, ceinture noire, bandeau), VERA (tenue de sport, gants rouges, queue de cheval), SHIN (ninja : cagoule, bandeau et écharpe qui flottent), AKIRA (judoka), NYX (combinaison à lignes lumineuses, longue chevelure), BRUTUS (lutteur, torse nu, ceinture dorée) ;
  - LOUP, RENARD, HUSKY (museau, oreilles, queue qui se balance), TAUREAU (cornes, anneau), CERF (bois ramifiés) ;
  - ROBOT (corps en blocs, noyau lumineux), plus le boss TITAN-01 (plus grand, cornes, visière rouge).
  - Proportions propres (taille, épaules, torse, jambes).
- **Moteur de coups par direction + bouton** : 27 coups accessibles (debout, avant, arrière, accroupi, accroupi + avant, en courant, en l'air). Chaque bouton donne un coup différent selon la direction : **bas + pied gauche = balayette basse, bas + pied droit = balayage**. Liste complète dans `docs/MOVELIST.md`.
- **Enchaînements (strings)** : certains coups peuvent être suivis d'un autre pendant leur récupération, même à vide ; la direction du second bouton compte.
- **4 projections** (deux boutons ensemble) avec chorégraphie à deux corps : projection (prise, élévation, plaquage), projection de hanche, **suplex** (salto par-dessus l'attaquant, atterrissage derrière), projection de jambe. Le projeteur est intouchable pendant la séquence ; tech si l'adversaire projette en même temps.
- **Poses de tous les coups** (crochet, genou, coup de hache, revers, coup de pied latéral, coup tournant où le corps se retourne, glissade, coup du dragon, charge d'épaule, coup de pied volant, coups en l'air…).
- **4 nouveaux combattants jouables** : SHIN (ninja rapide), BRUTUS (lutteur : 140 PV, projections jusqu'à 30 dégâts), AKIRA (judoka : projections très rapides et variées), NYX (contres et coups bas vifs). **12 jouables au total** + TITAN-01 (boss).
- **13 décors dessinés en code** : dojo (KAIRO), rue nocturne (VERA), forêt (loup), clairière d'automne (renard), canyon (taureau), montagne enneigée (cerf), toundra (husky), laboratoire (robot), toit sous la pluie (SHIN), usine (BRUTUS), temple abandonné (AKIRA), désert industriel (NYX), forteresse (TITAN-01). Chaque décor a son éclairage, son brouillard et ses éléments.
- **IA** : utilise toute la variété (directions, projections, enchaînements) selon son niveau.
- **Arcade** : nouvelle échelle (loup, renard, shin, taureau, akira, cerf, brutus, robot, TITAN-01).

### Ce qui n'est pas fait (honnêteté)

- **Phase 6 (histoire, 12 fins, déblocage un par un)** : pas commencée. Le déblocage existe (départ KAIRO et VERA, les 10 autres « ??? »), mais aucune histoire ne débloque encore. `?unlockAll` dans l'URL débloque tout pour tester.
- **Animation** : toujours procédurale (poses calculées), pas de capture de mouvement. Les transitions entre coups sont lissées mais restent plus raides qu'un jeu commercial. Les sauts, la marche et la course ont un seul cycle pour tous.
- **Chorégraphies de projection** : approximatives (signes de rotation et arcs réglés à l'œil sur le suplex ; projection de hanche, projection de jambe et projection simple **non vérifiées visuellement**).
- **Coups non vérifiés visuellement** : crochet ascendant, revers, coup de pied latéral, genou, coup de hache, coups en l'air, coup de pied volant (poses écrites, aucune capture).
- **Décors** : formes simples (cônes, sphères, boîtes) : lisibles mais basiques. Rue et rooftop n'ont pas d'ambiance sonore ; seul le toit a de la pluie. Décors non vérifiés visuellement : rue, toit, usine, temple, forteresse, tundra, forêt, canyon (seuls automne, neige et désert ont été vus).
- **Performances** : testées seulement en rendu logiciel (1 à 26 FPS selon la scène) ; aucune mesure sur un vrai GPU.
- **Pas de son**, pas de manettes, pas de remappage.
- Pas d'affichage des frames par coup en dehors du panneau de débogage.
- Les textes des écrans arcade ne passent pas par `i18n/fr.ts`.

### Ce qui a été testé

| Test | Résultat |
|---|---|
| `npm test` : 75 tests (nouveaux : 15 dans `moves.test.ts` : chaque direction + bouton, tous les coups accessibles, même direction = coups distincts, bas + LK ≠ bas + RK en simulation, attaque en courant, enchaînements à vide et selon la direction, 4 projections et leurs dégâts, atterrissage devant ou derrière, projeteur intouchable, tech ; 3 tests de plus par personnage pour les 12 jouables) | **75/75 passent** |
| `npm run typecheck` | OK |
| `npm run build` | OK (1,3 Mo) |
| Navigateur : loup/renard (automne), taureau/cerf (neige), husky/robot (labo), shin/brutus (usine), akira/nyx (désert) | OK (captures) |
| Navigateur : suplex d'AKIRA sur NYX (prise, élévation, salto, atterrissage derrière, 20 dégâts) | OK (captures à 5 instants) |
| Navigateur : coup du dragon, coup tournant, charge d'épaule | OK (captures) |
| Menu : 12 combattants affichés | OK |

Bugs trouvés et corrigés : robot et machines noirs (métal sans reflets : métallicité plafonnée), erreur de forme du torse et du cou (échelles absolues), test d'atterrissage de projection mesuré après que le projeteur se retourne.

### Tests à faire par toi

Ouvre http://localhost:5328/?unlockAll .

1. **Personnages** : lance un combat contre chacun des 12 et regarde leur silhouette. Lesquels te plaisent ? Lesquels sont ratés (proportions, tête, couleurs) ?
2. **Directions** : essaie dans l'ordre pour un même personnage : A, E, R, F ; puis D (avant) + chaque bouton ; Q (arrière) + chaque bouton ; C (accroupi) + chaque bouton ; C + D + chaque bouton. Chaque combinaison doit lancer un coup différent (affiché dans le panneau de débogage).
3. **Bas + pied** : C + R (balayette basse, rapide) puis C + F (balayage, plus lent, renverse).
4. **Projections** : A+E, A+R, E+F, R+F à bout portant. Le suplex (E+F) envoie l'adversaire derrière. Les prises te paraissent-elles « spéciales » comme dans Tekken ?
5. **Course** : Maj + D, puis un poing (charge) ou un pied (coup volant).
6. **Enchaînements** : A puis E à la suite ; A puis C + F pendant la récupération.
7. **Décors** : les 13. Visibilité, ambiance, caméra.
8. **Équilibrage** : BRUTUS trop lent ? SHIN trop fragile ? AKIRA trop fort sur les projections ?
9. **FPS** par décor.

### Modifications à me renvoyer

Pour chaque point : ce qui ne va pas et ce que tu veux à la place, avec le nom du personnage ou du décor. Dis-moi aussi si tu veux que je passe à la phase 6 (histoire, 12 fins, déblocage) ou que j'améliore d'abord les animations (marche, course, saut propres à chaque style) et le feeling des coups.

---

## 14. Session 7 : phase 6 (mode histoire)

Demande : « On peut continuer » (suite du plan : phase 6, histoire, une fin par personnage, déblocage un par un).

### Ce qui est fait

- **Histoire par personnage** : 8 chapitres. Chapitre 4 = ROBOT (ou SHIN si le héros est ROBOT), chapitre 8 = TITAN-01. Les 6 autres rivaux sont tirés du roster avec un ordre propre à chaque héros (`storyOpponents` dans le moteur, déterministe). Niveaux d'IA croissants : 1, 2, 3, 4, 4, 5, 6, 7.
- **Dialogues** avant chaque combat : présentation du héros (chapitre 1), puis une accroche par chapitre avec le nom de l'adversaire. Cliquer SUIVANT, puis COMBATTRE.
- **Progression sauvegardée** (localStorage, par navigateur) : chapitre en cours et histoire terminée, par personnage. Une défaite ramène au chapitre perdu (RÉESSAYER LE CHAPITRE).
- **Fin par personnage** (12 textes de fin) : écran de fin avec titre, texte, boss vaincu et nouveau personnage débloqué. Terminer l'histoire d'un personnage débloque **le suivant verrouillé dans l'ordre du roster** (WOLF, FOX, BULL, STAG, HUSKY, ROBOT, SHIN, BRUTUS, AKIRA, NYX). Il faut 10 fins pour tout débloquer.
- **Menu** : bouton HISTOIRE → sélection du héros (débloqué, avancement, verrouillé), dialogues, combats.
- **Interactions** : Échap quitte l'histoire en cours (la progression reste), HUD « HISTOIRE · CHAPITRE n / 8 · adversaire ». Une histoire terminée recommence au chapitre 1 si on la choisit à nouveau.
- Tests moteur : `story.test.ts` (8 chapitres, jamais soi-même, boss final, histoires différentes pour chaque héros, pas de rival répété de suite, niveaux croissants).

### Ce qui n'est pas fait (honnêteté)

- **Dialogues et fins écrits en placeholders** : 2 lignes de présentation par héros, 8 accroches génériques, 12 fins courtes. Pas de vraie intrigue par personnage, pas de dialogues propres à chaque adversaire.
- **Pas de cinématiques** : texte seul. Pas de portrait ni de mise en scène.
- **Déblocages de costumes et d'arènes** : non faits (les arènes sont déjà liées aux personnages, pas de choix débloqué).
- **Histoire en mode un joueur seulement**, contre l'IA. Pas de coopération ni d'histoire à deux.
- **Pas de sauvegarde de compte** : la progression vit dans le navigateur (phase 11).
- **Non testé visuellement** : les écrans histoire ont été vérifiés par leur texte (DOM) et l'état de la sim, pas par capture. Les combats d'histoire utilisent le même moteur que l'arcade (testé).
- Dans l'environnement de test, la sim tourne lentement en arrière-plan : certains tests ont été faits en forçant l'état (`window.__story`, mode dev uniquement).

### Ce qui a été testé

| Test | Résultat |
|---|---|
| `npm test` : 90 tests (dont 15 nouveaux pour l'histoire) | **90/90 passent** |
| `npm run typecheck` | OK |
| `npm run build` | OK |
| Navigateur, sélection : KAIRO (chapitre 1), VERA (chapitre 1), LOUP débloqué après fin de KAIRO | OK (texte DOM) |
| Navigateur : dialogue KAIRO (présentation, accroche, adversaire VERA), COMBATTRE lance le combat | OK |
| Navigateur : victoire chapitre 1 → chapitre 2 et progression sauvegardée | OK |
| Navigateur : chapitre 8 contre TITAN-01, victoire → écran de fin, déblocage WOLF, sauvegarde | OK |
| Navigateur : défaite chapitre 1 de VERA → écran DÉFAITE avec RÉESSAYER LE CHAPITRE et MENU | OK |

Bugs trouvés et corrigés : deux héros avaient la même histoire (rotation des rivaux, corrigée) ; accroches écrites avec « il » pour un adversaire féminin (réécrites sans pronoms de personne).

### Tests à faire par toi

Ouvre http://localhost:5328/ (pas `?unlockAll` : il faut voir le déblocage).

1. **Histoire KAIRO** : HISTOIRE → KAIRO → lis les dialogues → COMBATTRE. Gagne le premier chapitre : le chapitre 2 doit s'afficher.
2. **Défaite** : perds un chapitre, puis RÉESSAYER LE CHAPITRE.
3. **Échap** pendant un combat d'histoire : retour au menu, puis reprendre le même chapitre.
4. **Fin** : termine une histoire (8 chapitres). Vérifie le texte de fin et le personnage débloqué. Le déblocage doit persister après rechargement.
5. **Textes** : les présentations, accroches et fins te semblent-elles justes pour chaque personnage ? Dis-moi lesquelles réécrire.
6. **Équilibrage** : les niveaux 1 à 7 par chapitre sont-ils progressifs ?

### Modifications à me renvoyer

Pour chaque point : le personnage ou le chapitre concerné, et le texte ou le comportement à changer.

---

## 15. Session 8 : phase 7 (mode robots)

Demande : « Continuer » (suite du plan : phase 7, robots, vagues et défis).

### Ce qui est fait

- **5 robots** avec statistiques et **styles d'IA distincts** (`characters/robots.ts`, `ai.ts`) :
  - **SCOUT** (80 PV) : rapide, frappes courtes, recule après chaque attaque.
  - **GUARDIAN** (170 PV) : pousse sans cesse, bloque beaucoup.
  - **ASSASSIN** (110 PV) : enchaînements longs (strings), coups en série.
  - **HEAVY** (220 PV) : très lent, projections à bout portant, coups de charge à distance.
  - **ELITE** (150 PV) : adaptatif, parades quand l'attaque arrive de près, tous les coups.
  - **TITAN-01** : style lourd (boss de la vague 10).
  - Non jouables dans le menu principal, en `ROBOT_IDS`.
- **Mode vagues** (`survival.ts`) : un robot par vague, dans l'ordre SCOUT, GUARDIAN, ASSASSIN, HEAVY, ELITE. Niveau d'IA monte d'une unité toutes les deux vagues (max 7). Vie du robot ×(1 + 0,08 × vague), plafonnée à ×2,2. **TITAN-01 toutes les 10 vagues.** Ta vie se reporte d'une vague à l'autre, avec +25 % de vie max de récupération entre deux vagues (`healBetweenWaves`).
- **Défis** (`challenges.ts`), 6 objectifs : sans une égratignure (GUARDIAN), éclair (SCOUT, >30 s restantes), prise de contrôle (HEAVY, 2 projections), enchaînement (ASSASSIN, 5 coups), mur (HEAVY, 5 blocs), contre l'élite (ELITE). Réussite enregistrée localement.
- **Arènes industrielles** par robot : SCOUT et HEAVY en usine, GUARDIAN et ELITE au labo, ASSASSIN et TITAN-01 en forteresse.
- **Visuels** : 5 robots dessinés en code, de tailles et couleurs distinctes.
- **Interface** : bouton ROBOTS au menu, choix du héros (débloqués), VAGUES, défis, écran entre vagues (vie restaurée), fin des vagues (meilleure vague), résultat de défi. HUD : « VAGUE n · nom » ou « DÉFI · nom ». Échap quitte.
- **Moteur** : `DuelOptions.maxHealth` et `health` (vie max et vie de départ personnalisées).
- **Statistiques de combat** (`runtime.stats`) : dégâts subis, secondes restantes, projections réussies, blocs, plus long enchaînement. Alimentent les défis.
- Tests : `robots.test.ts` (5 robots, styles distincts, combats sans valeur non finie, vagues, récupération, défis). **106 tests moteur.**

### Ce qui n'est pas fait (honnêteté)

- **Pas de « défi » comme mode à part avec scoring** : un défi est validé ou non, sans classement.
- **Pas de mode « combat unique contre un robot »** : seulement vagues et défis.
- **Les robots n'ont pas d'animations propres** : ce sont des humanoïdes robotiques avec les mêmes poses que les autres. « Effets visuels technologiques » et « réactions aux coups » propres aux robots : non faits.
- **Pas de mode survie chronométré** ni de classement de survie.
- **Vagues et défis non vérifiés visuellement pour chaque robot** : contrôlés par le DOM et l'état de la sim (une vague, une victoire, une défaite, un défi lancé et échoué).
- **Pas de sauvegarde de compte** : records et défis réussis dans le navigateur.
- **Équilibrage non joué** : les vagues et les défis n'ont été ni joués ni mesurés par un vrai joueur.

### Ce qui a été testé

| Test | Résultat |
|---|---|
| `npm test` : 106 tests (dont 16 nouveaux pour les robots, les vagues et les défis) | **106/106 passent** |
| `npm run typecheck` | OK |
| `npm run build` | OK |
| Navigateur : menu ROBOTS → COMMENCER LES VAGUES → vague 1 contre ROBOT SCOUT (80 PV), HUD « VAGUE 1 · ROBOT SCOUT » | OK |
| Navigateur : victoire vague 1 → écran « VAGUE 1 RÉUSSIE », vie reportée (40 → 65 PV), vague 2 contre ROBOT GARDIEN | OK |
| Navigateur : défi « Enchaînement » lancé contre ROBOT ASSASSIN, HUD « DÉFI · Enchaînement », défi non réussi sans enchaînement | OK |
| Navigateur : défaite → écran « FIN DES VAGUES », meilleure vague sauvegardée | OK |

Bugs trouvés et corrigés : export en double dans `index.ts`, fichier d'export créé au mauvais endroit (supprimé), résultat de vague qui gardait `active` vrai.

### Tests à faire par toi

Ouvre http://localhost:5328/?unlockAll (le mode robots est jouable même sans déblocage du héros, mais `?unlockAll` débloque aussi le choix de héros).

1. **Vagues** : enchaîne les vagues 1 à 5. Chaque robot a-t-il un comportement reconnaissable ? (SCOUT recule, GUARDIAN pousse, ASSASSIN enchaîne, HEAVY projette, ELITE pare.)
2. **Vie reportée** : perds peu de vie puis vérifie la vie au début de la vague suivante.
3. **Vague 10** : TITAN-01 doit apparaître. Dis-moi si c'est trop difficile.
4. **Défis** : tente chaque défi. Lesquels sont trop durs, lesquels impossibles ?
5. **Arènes** : les usines, labos et forteresse te paraissent-elles distinctes ?
6. **Visuels des robots** : tailles et couleurs. Lequel est raté ?

### Modifications à me renvoyer

Pour chaque point : le robot, la vague ou le défi concerné, et le comportement ou la valeur à changer.

---

## 16. Session 9 : phase 8 (multijoueur en ligne à deux)

Demande : « Continue » (suite du plan : phase 8, duel en ligne). Décision : serveur Colyseus lancé en local (pas de base de données, pas de Docker pour cette phase ; déploiement Coolify prévu en phase 12).

### Ce qui est fait

- **Netcode rollback** (`packages/engine/src/netcode.ts`) : le joueur local voit son action tout de suite, l'entrée distante est prédite (dernière confirmée), et une confirmation du serveur qui diffère de la prédiction déclenche un retour arrière et un rejeu. Fenêtre d'historique de 600 ticks. Empreintes d'état (`worldHash`) vérifiées périodiquement (toutes les 30 frames) ; une divergence déclenche une demande de resynchronisation au serveur.
- **Serveur autoritaire** (`apps/server`, Colyseus 0.16) : salon par code à 5 caractères, lobby (pseudo, personnage, décor choisi par l'hôte, prêt/pas prêt), lancement par l'hôte quand les deux sont prêts, simulation serveur à 60 Hz, diffusion des entrées utilisées et des empreintes, revanche à deux, forfait et reconnexion (fenêtre de 30 s pendant le combat).
- **Protocole partagé** (`packages/engine/src/protocol.ts`) : messages client/serveur typés, validation côté serveur (personnage, décor, entrées invalides ignorées, salon plein refusé).
- **Client** : écrans EN LIGNE (créer, rejoindre par code, salon, résultat, revanche), ping affiché en HUD (mesuré chaque seconde), compteur de divergences. Le combat réutilise la scène 3D ; le décor est celui choisi dans le lobby.
- **Limite d'avance** : le client n'avance pas de plus de 30 ticks au-delà du serveur confirmé (évite les corrections massives).
- **Tests** : `netcode.test.ts` (5 tests : confirmations en retard donnent un état final identique à la simulation directe, avec corrections réelles ; resynchronisation ; empreinte stable) ; `apps/server/src/duel.test.ts` (deux vrais clients Colyseus : lobby, prêts, combat de 240 frames, empreintes vérifiées des deux côtés, zéro divergence, zéro erreur).

### Ce qui n'est pas fait (honnêteté)

- **Pas de base de données ni de comptes** : pseudo libre, aucune authentification. Triche possible sur le client (le serveur valide les entrées mais ne garde pas de compte).
- **Classement en ligne** : non fait (phase 11).
- **Reconnexion** : codée (fenêtre de 30 s) mais **non testée** en conditions réelles.
- **Revanche et fin de combat côté serveur** : le message `result` est émis, mais le test d'intégration ne joue pas un combat jusqu'à la fin (un combat dure 99 s). Testé seulement par la logique et la lecture du code.
- **Dans le navigateur de test**, le client tourne bien plus lentement que le serveur (rendu logiciel, onglet non focalisé). Les entrées des joueurs arrivent donc trop tard et le serveur les remplace par la dernière connue (comportement autoritaire voulu) : **le test navigateur à deux onglets a validé le lobby, le lancement, la diffusion des ticks et des empreintes (zéro désync), mais pas le ressenti d'une partie réelle.**
- **Latence** : aucun test avec latence artificielle. La limite d'avance (30 ticks) est un réglage à vérifier avec deux machines réelles.
- **Pas de synchronisation d'horloge** : le client suppose que son tick 0 correspond au début serveur ; une dérive lente est absorbée par la limite d'avance, pas corrigée.
- **Pas de 4 joueurs** (phase 9), pas de 2v2 ni de chacun pour soi (phase 10).
- Le serveur écoute en `ws://localhost:2567` ; le client lit `VITE_SERVER_URL` (non défini = localhost).

### Ce qui a été testé

| Test | Résultat |
|---|---|
| `npm test` (racine) : moteur 111 tests dont 5 netcode, serveur 1 test d'intégration à deux clients | **Tout passe** |
| `npm run typecheck` (engine, client, server) | OK |
| `npm run build` | OK |
| Navigateur, deux onglets : création d'un salon (code GMN6F), invité qui rejoint, choix de personnage, prêts, lancement, combat en cours des deux côtés, ping 1 ms, désync 0 | OK |

Bugs trouvés et corrigés pendant les tests :
- Un client en avance sur le serveur ratait les empreintes trop anciennes → historique porté à 600 ticks et vérification reportée jusqu'au tick atteint.
- La vérification ne voyait pas l'état du tick courant (pas encore enregistré) → utilise maintenant `stateAt`.
- Une resynchronisation perdait les ticks déjà joués → rejoue depuis l'état serveur.
- Le ping s'affichait selon le mode du menu et non celui du combat → corrigé.

### Tests à faire par toi

Deux machines, même réseau (ou une machine et un ami) :

1. Lance le serveur : `npm run server` à la racine du projet (port 2567). Ouvre le pare-feu si besoin.
2. Sur l'hôte : `npm run dev`, ouvre http://localhost:5328, EN LIGNE → CRÉER UN SALON, note le code.
3. Sur l'invité : même adresse côté client (mets l'adresse du serveur dans `VITE_SERVER_URL` au lancement du client, ex. `VITE_SERVER_URL=ws://IP:2567 npm run dev`), EN LIGNE → code → REJOINDRE.
4. Choisis chacun un personnage, PRÊT, l'hôte lance le combat.
5. **Ressenti** : les coups sont-ils réactifs pour le joueur local ? Y a-t-il des à-coups (téléportations, coups qui disparaissent) ?
6. **Divergence** : le compteur « désync » du HUD doit rester à 0.
7. **Fin de combat** : laisse un combat aller jusqu'au bout. L'écran RÉSULTAT doit apparaître pour les deux, avec le vote de revanche.
8. **Forfait** : ferme un onglet en plein combat, puis reviens (reconnexion dans les 30 s).

### Modifications à me renvoyer

Pour chaque point : ce qui saccade ou ne marche pas, le ping mesuré, et le scénario (qui a fait quoi, à quel moment).

---

## 17. Session 10 : phase 9 (quatre combattants en ligne, bots, dernier debout)

### Ce qui est fait

- **Moteur à N combattants** : `createWorld({ heroes, ffa })`. `createDuelWorld` est un cas particulier (inchangé). Positions de départ en cercle (rayon 2,4 m) pour quatre.
- **Mode dernier debout** (`match.ts`, `updateFfa`) : KO = élimination, classement dans `match.placements`. Fin : un seul survivant, ou temps écoulé (plus de vie, puis plus petit id).
- **Bots serveur** (`ai.ts`) : `botInput` vise l'ennemi vivant le plus proche. `aiInput` accepte un générateur fourni (`rand`). `makeRng` (mulberry32) fournit le hasard des bots, séparé du RNG du monde.
- **Netcode N entrées** (`netcode.ts`) : entrées par emplacement, prédiction par dernière entrée confirmée.
- **Serveur** (`apps/server/src/room.ts`) : `FightRoom` générique, `DuelRoom` (2 places, manches) et `FourRoom` (4 places, dernier debout). Bots ajoutés/retirés par l'hôte (`bot`). Joueur qui abandonne en dernier debout = éliminé, place reprise par un bot.
- **Client** : salon à 4 places, `welcome` (place connue), HUD à 4 barres de vie, écran résultat avec classement, `runtime.heroes` pour N personnages, direction de visée vers l'ennemi le plus proche.

### Bug trouvé et corrigé

- **Divergence à quatre** (tick 180) : les bots tiraient dans le RNG du monde (`nextRandom(w)`), donc l'état serveur et l'état client divergeaient dès qu'un bot combattait. Correction : hasard des bots séparé (`makeRng`), graine fixe par salon. Le hash du monde inclut le RNG, donc tout appel non partagé casse la synchronisation.

### Ce qui a été testé

| Test | Résultat |
|---|---|
| `npm test` : moteur 118 tests (dont 7 FFA) ; serveur 2 tests (duel à 2 clients, salon à 4 avec 2 humains + 2 bots) | **Tout passe** |
| `npm run typecheck` (engine, client, server) | OK |
| `npm run build` | OK |
| Navigateur : salon à 4 (code F7RPD), 3 bots + 1 humain, prêts, lancement, combat jusqu'à `over` (tick 2100), classement affiché (renard vainqueur, humain 2e), console sans erreur | OK |

### Ce qui n'est pas fait (honnêteté)

- **Pas de test à 4 humains réels** : seulement 2 humains + 2 bots (serveur) et 1 humain + 3 bots (navigateur).
- **HUD à 4 barres** : code écrit, pas vu à l'écran pendant le combat (le navigateur a été vérifié à l'état final).
- **Pas de test de forfait en salon à 4** (un humain qui quitte pendant le combat).
- **Revanche à 4** : le vote n'attend que les humains ; non testé.
- **Équilibrage** : bots niveau 4 fixe, non réglé.
- **Visée à 4** : le personnage vise l'ennemi le plus proche, pas de cible choisie ni verrouillage.
- **Pas de 2v2 ni d'équipes** (phase 10).

### Tests à faire par toi

1. `npm run server`, puis quatre onglets ou quatre machines : EN LIGNE → CRÉER À QUATRE, les autres REJOINDRE avec le code.
2. Hôte : compléter avec des bots ou attendre quatre humains, tous PRÊT, LANCER.
3. Vérifie que le HUD affiche les quatre barres de vie et que les KO grisent la barre.
4. Quitte un joueur en plein combat : il doit être éliminé et sa place reprise par un bot.
5. Laisse le combat finir : écran résultat avec classement, revanche (tous les humains doivent voter).

### Modifications à me renvoyer

Pour chaque point : ce qui ne marche pas ou saccade, le nombre d'humains, et la scène.

---

## 18. Session 11 : phase 10 (2v2 et chacun pour soi)

### Ce qui est fait

- **Chacun pour soi** : déjà fait en phase 9 (mode dernier debout, `ffa`).
- **2v2 par équipes** (`packages/engine`) :
  - `createWorld({ heroes, team: true })` : équipe 0 = combattants 0 et 2, équipe 1 = 1 et 3. Départs : équipe 0 à gauche, équipe 1 à droite, coéquipiers côte à côte.
  - `match.mode = 'team'`, `match.winnerTeam`. Un KO élimine le combattant ; l'équipe perd quand ses deux combattants sont éliminés.
  - Fin : une seule équipe debout, ou temps écoulé (vie totale d'équipe la plus haute ; égalité = pas de gagnant, `winnerTeam` null).
  - Coups, pousse-pieds et bots déjà ciblaient « l'autre équipe » : rien à changer côté combat.
- **Serveur** : salle `team` (4 places, équipe = parité de place), `TeamRoom`. Fin de partie désormais déclenchée par `phase === 'over'` (et non `matchWinner !== null`, qui restait null en cas d'égalité et bloquait la fin).
- **Protocole** : `team` dans `start` et `lobby`, `winnerTeam` dans `lobby` et `result`.
- **Client** : trois types de salon (DUEL, DERNIER DEBOUT, 2 CONTRE 2) à la création et au rejoindre. Étiquettes ÉQUIPE A/B au salon. Résultat VICTOIRE/DÉFAITE par équipe, classement en liste.

### Bug trouvé et corrigé

- Un membre de l'équipe gagnante déjà éliminé était reclassé en dernier. Seuls les vivants passent en dernier maintenant.
- Côté serveur, la fin de partie dépendait de `matchWinner !== null` : en égalité au temps elle n'arrivait jamais. Corrigé avec `phase === 'over'`.

### Ce qui a été testé

| Test | Résultat |
|---|---|
| Moteur : 126 tests dont 7 nouveaux `team.test.ts` (départs, victoire d'équipe, temps écoulé, égalité, classement, 4 bots jusqu'à la fin) | **Tout passe** |
| Serveur : 3 tests dont 1 nouveau `team.test.ts` (2 humains + 2 bots, deux clients, zéro divergence) | **Tout passe** |
| `npm run typecheck`, `npm run build` | OK |
| Navigateur : salon 2v2, 1 humain + 3 bots, équipes 0-2 / 1-3 correctes, HUD à 4 barres, désync 0 | OK |

### Ce qui n'est pas fait (honnêteté)

- **Match 2v2 complet non joué dans le navigateur** : le navigateur simule à environ 6 ticks/s quand l'onglet a le focus (un match fait 5940 ticks). La fin d'équipe est couverte par les tests moteur, pas par une partie jouée à l'écran.
- **Étiquette d'équipe dans le HUD en combat** : absente (seule la liste de vie, sans équipe).
- **Pas de coéquipiers contrôlés par l'IA choisie** : les bots prennent le niveau 4 fixe.
- **Pas d'alliance visuelle** (couleur d'équipe sur les personnages) : non faite.
- **Forfait et revanche en 2v2** : non testés à la main.
- **Caméra à quatre** : cadre tous les combattants, non vérifiée en plein combat.

### Tests à faire par toi

1. `npm run server`, puis quatre joueurs ou trois humains plus un bot : EN LIGNE → CRÉER 2 CONTRE 2 ; les autres REJOINDRE avec le type « 2 CONTRE 2 ».
2. Vérifie que chaque équipe est bien A (places 1 et 3) et B (places 2 et 4) au salon.
3. Laisse une équipe être éliminée : l'écran doit annoncer VICTOIRE ou DÉFAITE selon ton équipe.
4. Laisse le temps s'écouler à égalité : l'écran doit annoncer ÉGALITÉ.
5. Vérifie la caméra (les quatre combattants restent dans le cadre) et dis-moi si une couleur d'équipe manque.

### Modifications à me renvoyer

Pour chaque point : le scénario (qui était dans quelle équipe), ce qui ne s'affiche pas, et la caméra si elle décroche.

---

## 19. Session 12 : phase 11 (comptes, sauvegarde en ligne, classement)

### Écart avec le plan (à valider)

- Le plan prévoyait **Postgres via Docker Compose**. Docker n'est pas installé sur la machine : les comptes sont dans **SQLite** (`node:sqlite`, intégré à Node 22, marqué expérimental, avertissement à l'exécution). Fichier : `apps/server/data/iron.sqlite` (ignoré par git, variable `IRON_DB` pour le changer). Migration vers Postgres à faire avant la mise en ligne (phase 12).

### Ce qui est fait

- **Comptes** (`apps/server/src/accounts.ts`) : inscription (pseudo 3 à 16 caractères `A-Za-z0-9_-`, mot de passe 6 à 128), connexion, jeton de session, déconnexion. Mots de passe hachés avec scrypt + sel aléatoire, comparaison en temps constant. Message identique pour pseudo inconnu et mot de passe faux.
- **API HTTP** (`apps/server/src/api.ts`) : `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`, `GET|PUT /api/progress`, `GET /api/ranking`. Corps limité à 64 Ko. CORS ouvert (`*`) pour le développement.
- **Sauvegarde** : quatre clés du stockage local (personnages débloqués, robots, histoire, classement d'arcade). Le serveur ne garde que ces clés, valeurs texte bornées à 20 Ko.
- **Classement en ligne** : chaque partie terminée en salon (duel, dernier debout, 2v2) compte une victoire ou une défaite pour chaque compte humain lié à sa place. Tri : victoires décroissantes, puis moins de parties. Les bots ne comptent pas.
- **Client** : écran COMPTE (connexion, inscription, sauvegarde manuelle, déconnexion, classement). Sauvegarde automatique au retour au menu si connecté. À la connexion : la sauvegarde du serveur remplace la locale, puis la page est rechargée. Jeton envoyé à la création et à la jointure d'un salon.

### Bugs trouvés et corrigés

- Le bouton « CRÉER LE COMPTE » ne soumettait rien (`type="button"` sans action) : relié directement à l'action.
- Les trois anciens tests d'intégration ouvraient le même fichier SQLite en parallèle (« database is locked ») : ils passent en mémoire (`dbPath: ':memory:'`).
- Un test de classement avait une assertion illisible : réécrite (Yann 1/1 avant Xavier 1/2).

### Ce qui a été testé

| Test | Résultat |
|---|---|
| Moteur : 126 tests | **Tout passe** |
| Serveur : 10 tests, dont 4 nouveaux `accounts.test.ts` (inscription, connexion, validations, sauvegarde filtrée, classement, API HTTP et routes protégées, forfait en duel qui compte défaite et victoire) | **Tout passe** |
| `npm run typecheck`, `npm run build` | OK |
| Navigateur : inscription « Testeur1 » via l'écran COMPTE, jeton stocké ; sauvegarde (« Sauvegarde envoyée. ») ; déconnexion ; reconnexion via l'API (200) | OK |

### Ce qui n'est pas fait (honnêteté)

- **Pas de Postgres** (voir écart ci-dessus).
- **Pas de limitation des tentatives de connexion** : un attaquant peut essayer des mots de passe sans frein.
- **Pas de réinitialisation de mot de passe**, pas de changement de pseudo, pas de suppression de compte.
- **Jetons sans expiration** et stockés en clair dans la base (seul le mot de passe est haché).
- **Connexion : rechargement complet de la page** (pour que robots, histoire et arcade relisent la sauvegarde). Pas de mise à jour à chaud.
- **Sauvegarde automatique seulement au retour au menu** : une partie non quittée proprement n'est pas sauvegardée.
- **Classement : une seule liste**, pas de classement par personnage ni par mode.
- **Pseudo du salon** : celui saisi à l'écran en ligne, pas celui du compte (les deux peuvent différer).
- **Écran COMPTE non vérifié visuellement sur mobile.**
- **Test navigateur de la reconnexion complète** (rechargement après connexion) : non fait ; seule l'API a été appelée.
- **Classement après une vraie partie en ligne** : vérifié par test serveur (forfait), pas en partie complète à l'écran.

### Tests à faire par toi

1. `npm run server`, puis `npm run dev`, ouvre http://localhost:5328, COMPTE → INSCRIPTION.
2. Fais quelques vagues robots et débloque un personnage en histoire, puis clique SAUVEGARDER MAINTENANT.
3. DÉCONNEXION, puis CONNEXION : les personnages débloqués et les records doivent revenir.
4. Fais une partie en ligne (duel) jusqu'au bout ou quitte en plein combat : le classement doit bouger.
5. Vérifie l'affichage de l'écran COMPTE sur téléphone (largeur réduite).

### Modifications à me renvoyer

Pour chaque point : l'écran, ce qui ne se sauvegarde pas ou ne se recharge pas, et le message d'erreur exact s'il y en a un.

---

## 20. Session 13 : phase 12 (optimisation, durcissement, préparation du déploiement)

### Ce qui est fait

- **Bundle client** : découpage par dépendance (`react`, `three`, `network`, `vendor`) dans `apps/client/vite.config.ts`. Scène 3D chargée à la demande (`React.lazy` dans `App.tsx`) : three.js n'est plus téléchargé pour le menu.
  - Avant : un seul chunk de 1 405 ko (395 ko gzip).
  - Après : menu = index 100 ko + react 219 ko + network 124 ko + vendor (petits chunks). three.js (918 ko, 243 ko gzip) seulement au premier combat.
- **Limite de tentatives de connexion** (`apps/server/src/api.ts`) : 20 tentatives par adresse IP et par 10 minutes, puis HTTP 429. Mémoire du processus (perdue au redémarrage ; suffit pour un seul serveur, pas pour plusieurs instances).
- **Dockerfile serveur** (`apps/server/Dockerfile`) et `.dockerignore` racine : base Node 22 alpine, `IRON_DB=/data/iron.sqlite` (volume `/data`), port 2567. **Non testé** : Docker n'est pas installé sur la machine.

### Ce qui n'est pas fait (honnêteté)

- **Pas de déploiement** : ni dépôt GitHub créé, ni rien poussé, ni Coolify configuré. Ces actions sont visibles de l'extérieur et demandent ton accord (voir plus bas).
- **Pas de Postgres** : toujours SQLite (écart noté en phase 11). Migration à faire avant la mise en ligne.
- **Dockerfile non vérifié** : `npm ci --workspace ...` et le lancement `tsx` n'ont pas été exécutés dans une image.
- **Pas de HTTPS ni de TLS** : le client doit parler à un serveur `wss://` / `https://` en ligne ; à configurer au niveau Coolify.
- **CORS ouvert (`*`)** : à restreindre à l'origine du client en production.
- **Chunk `network` chargé au menu** (colyseus.js) : pourrait être différé, gain faible.
- **Pas de mesure de FPS sur vrai GPU** : le navigateur de test est logiciel.
- **Pas de tests de charge** (nombre de salons simultanés).
- **Tests de sécurité** : pas d'audit externe.

### Ce qui a été testé

| Test | Résultat |
|---|---|
| Moteur : 126 tests | **Tout passe** |
| Serveur : 11 tests, dont 1 nouveau (limite de tentatives par IP) | **Tout passe** |
| `npm run typecheck` | OK (0 erreur) |
| `npm run build` | OK |
| Navigateur : menu affiché, COMBATTRE lance la scène (canvas et HUD présents) après chargement différé | OK |

### Avant mise en ligne (à décider avec toi)

1. Dépôt GitHub : créer le repo public, pousser `master` (branche principale) et la branche de travail (tu pousses toi-même selon ta consigne initiale).
2. Coolify : serveur Node pour `apps/server` (volume `/data`, variables `PORT`, `IRON_DB`), statique pour `apps/client` (variable `VITE_SERVER_URL` à définir au build, en `wss://`).
3. Base : migrer `node:sqlite` vers Postgres (Docker Compose prévu au plan).
4. CORS : restreindre à l'URL du client.
5. Tester l'image Docker sur une machine avec Docker.

### Tests à faire par toi

1. Ouvre le client et lance un combat : chargement doit sembler plus rapide qu'avant (premier affichage du menu).
2. Si tu as Docker : `docker build -f apps/server/Dockerfile .` depuis la racine, puis `docker run -p 2567:2567 -v iron-data:/data <image>`. Dis-moi l'erreur exacte s'il y en a une.

### Modifications à me renvoyer

Le message d'erreur exact du build Docker, et ce que tu veux décider pour le déploiement (dépôt, Coolify, Postgres).

---

## 21. Session 14 : mise en ligne (Coolify)

### Ce qui est fait

- Dépôt GitHub public `PierreWZK/Iron-Legacy` (PR #1 fusionnée par toi, #2 et #3 par moi).
- `CORS_ORIGIN` : l'API des comptes n'accepte plus que `https://iron.projectp.fr` en production.
- Dockerfile client (build Vite puis nginx) ajouté. Premier build client échoué : `tsconfig.base.json` non copié dans l'image. Corrigé dans les deux Dockerfiles (PR #3).
- Coolify : projet « Iron Legacy », serveur (https://iron-api.projectp.fr, volume `/data`) et client (https://iron.projectp.fr). Détails dans `docs/DEPLOY.md`.

### Vérifié en ligne

- https://iron-api.projectp.fr/api/ranking répond `{"rows":[]}` avec `Access-Control-Allow-Origin: https://iron.projectp.fr`.
- https://iron.projectp.fr : menu, écran COMPTE (classement lu depuis l'API), création d'un salon de duel en `wss://` (connecté, ping 28 ms).

### Non vérifié ou non fait

- **Partie en ligne à deux machines sur le site réel** : non jouée.
- **Inscription et sauvegarde sur le serveur réel** : non testées (pour ne pas créer de compte dans la base de production).
- **Postgres** : toujours SQLite sur volume. **Sauvegardes du volume** : non configurées.
- **Rebuild du serveur avec le correctif Dockerfile** : non relancé (le serveur actuel tourne, il n'avait pas besoin du correctif).
- Pas de déploiement automatique à chaque fusion (à lancer à la main ou via webhook Coolify).

---

## 22. Session 15 : refonte visuelle (look jeu vidéo, personnages, sélection, histoire)

### Demande (simplifiée)

Refaire l'esthétique du site en entier : fun, comme un vrai jeu vidéo. Vrai menu de sélection des personnages avec aperçu, mode histoire avec dialogues où l'on voit les personnages, personnages beaucoup plus travaillés.

### Ce qui est fait

- **Rendu des personnages** (`render/rig.ts`, réécrit) : cel-shading (3 paliers) + contour par coque inversée, corps modelé (profils de révolution pour torse et membres, muscles), mains avec phalanges et pouce, gants, chaussures à semelle, visages (yeux, sourcils, nez, bouche, oreilles), coiffures, tenues détaillées (gi à col croisé et ceinture nouée, short de boxe, sangles de fourrure, justaucorps de catch avec ceinture de champion, ninja avec sabre dans le dos, manteau à circuits), robots en blocs biseautés avec plaques, ouïes, noyau, accessoires (`extras` dans `visuals.ts` : cape, sac, canons, lames, crête, casque, cornes). Noms et positions des joints inchangés : `pose.ts` et toutes les animations marchent sans modification.
- **`RigPlayer`** : joue les vrais coups d'un personnage hors combat (aperçu, menu, portraits).
- **Portraits** (`render/portraits.ts`) : bustes rendus une fois par le même modèle 3D, mis en cache, en deux tailles. Utilisés dans la grille de sélection, les dialogues, l'écran VS et le HUD.
- **Menu principal** : titre métallique, duel animé en fond (deux personnages tirés au hasard qui s'échangent des coups), entrées en grosses touches inclinées, navigation clavier.
- **Sélection de personnage** (`ui/FighterSelect.tsx`) : aperçu 3D qui tourne (glisser pour pivoter), caractéristiques normalisées sur le roster (puissance, vitesse, allonge, endurance, calculées depuis les données réelles), liste de coups cliquables qui les jouent dans l'aperçu, grille de portraits, flèches + Entrée. Utilisé pour Combat, Entraînement (choix du niveau ou du mannequin) et Histoire (avancement par chapitre).
- **Écran VS** avant chaque combat (combat rapide, histoire, arcade, robots), Entrée pour passer.
- **Mode histoire** : dialogues façon roman visuel (portraits face à face, celui qui parle est mis en avant, boîte à nom, texte lettre à lettre, clic ou Entrée). Répliques par personnage (`story/text.ts` : `OPP_LINES`, `HERO_LINES`, `chapterScript`). Écrans de défaite et de fin refaits avec portraits.
- **HUD de combat** : cartouches avec portrait, barres inclinées avec traînée de dégâts, horloge qui clignote sous 10 s, annonces « ROUND n » et « FIGHT ! », combo animé, aide masquable (H), débogage (F3, masqué par défaut).
- Polices Russo One et Chakra Petch (Google Fonts), thème arcade partagé (`index.css`, `ui/kit.tsx`).
- Écrans arcade, robots, compte et en ligne : gardent leur contenu, passent sur le nouveau fond.

### Ce qui a été testé

| Test | Résultat |
|---|---|
| `npm run typecheck` (3 paquets) | OK |
| `npm run build` client | OK (three.js toujours chargé à la demande) |
| Navigateur : menu avec duel animé, sélection 3D, grille de portraits, VS, combat avec nouveau HUD, dialogue d'histoire (héros et boss) | OK à l'écran |

### Non testé ou limites (honnêteté)

- Tests moteur et serveur non relancés : aucun code moteur ni serveur modifié.
- Pas de mesure de FPS sur vrai GPU : le contour double le nombre de maillages ; à vérifier sur ta machine, et à baisser (option `outline` de `buildRig`) si besoin.
- Les écrans arcade, robots, compte et en ligne n'ont pas été redessinés en détail, seulement posés sur le nouveau fond.
- Pas de sons ni de musique. Pas de manette.
- Histoire : les répliques sont une première version, à réécrire avec toi. Pas de réplique de victoire après le combat.
- Mise en page vérifiée dans une fenêtre réduite seulement ; pas de test sur mobile.
- Pas déployé : la branche est à relire avant fusion.

### Tests à faire par toi

1. Menu principal : flèches haut/bas, Entrée. Le duel en fond tourne-t-il fluidement ?
2. COMBAT : choisis les personnages, essaie les coups dans l'aperçu, lance un combat. Les modèles te plaisent-ils (lesquels sont les moins réussis) ?
3. HISTOIRE : lance un chapitre, lis le dialogue, perds un combat, gagne-en un.
4. Dis-moi les FPS pendant un combat (F3).

### Modifications à me renvoyer

Quels personnages retravailler en priorité, ce qui manque au menu et à l'histoire, et si tu veux que je déploie sur Coolify.

---

## 23. Session 16 : combat plus fluide (combos, mouvements, pause, touches, aide)

### Demande (simplifiée)

Retravailler le combat pour qu'il soit plus fluide. Combos par personnage (ex. trois appuis sur un même bouton = trois coups rapides), mêmes entrées possibles d'un personnage à l'autre mais animations différentes. Menu Échap (au lieu de quitter) avec réglage des touches. Bouton « Aide » qui affiche et masque le texte des mouvements. Revoir animations et déplacements.

### Ce qui est fait

- **Combos** (moteur) : 8 nouveaux coups `lp2 lp3 rp2 rp3 lk2 lk3 rk2 rk3`. Un coup d'ouverture (jab, direct, pied frontal, circulaire) mène au 2e coup du bouton pressé, puis au 3e. Les boutons se mélangent (ex. LP RP RK = jab, `rp2`, `rk3`). Pas de direction tenue : avec une direction, les coups directionnels d'avant restent disponibles. Le combo continue même si un coup rate. Données dans `characters/combos.ts` : 9 styles (karaté, boxe, bête, lourd, ninja, judo, ombre, mécanique, pieds) donnent à chaque personnage ses animations, noms et rythme ; vitesse et puissance dérivent de ses propres jab et direct.
- **Mémoire d'appuis** : un bouton pressé un peu trop tôt est gardé (9 ticks hors coup, jusqu'à la fenêtre de combo pendant un coup) et part au bon moment. Les appuis faits pendant l'arrêt sur image d'un impact ne sont plus perdus.
- **Élan de marche** : la vitesse monte en quelques ticks au lieu de démarrer à plein régime, et retombe vite à l'arrêt.
- **Animations** (`render/pose.ts`) : coups avec anticipation (le membre part en arrière puis accélère), tenue à l'impact, retour lissé ; torsion du corps et transfert de poids sur les coups ; marche et course avec contre-rotation du buste, rebond et foulée par personnage ; garde au repos différente par personnage (rebond du boxeur, posture basse des bêtes, raideur des robots) ; saut qui change selon la montée et la descente ; recul de réaction qui s'estompe. Le lissage des os est beaucoup plus rapide pendant les coups, les réactions et les esquives.
- **Menu pause** (Échap) : reprendre, commandes, aide, recommencer, quitter. Le jeu hors ligne s'arrête vraiment. En ligne, le menu s'ouvre mais le combat continue.
- **Réglage des touches** : deux touches par action, clic puis nouvelle touche, retour arrière pour effacer, clic droit pour retirer, « par défaut ». Sauvegardé dans le navigateur. Touches réservées : Échap, Entrée, H, T, I, F3.
- **Aide** : bouton AIDE (et touche H) qui affiche ou masque le texte ; il suit les touches réglées et liste les combos réels du personnage joué. Préférence mémorisée.

### Ce qui a été testé

| Test | Résultat |
|---|---|
| Moteur : 136 tests, dont `combos.test.ts` (trois appuis par bouton, mélange, appui en avance, combo à vide, direction tenue, un combo complet par personnage et par bouton, animations différentes entre styles, déterminisme, élan de marche) | **Tout passe** |
| Serveur : 11 tests (duel en ligne avec le nouveau moteur) | **Tout passe** |
| Typecheck des trois paquets | OK |
| Navigateur : combo de 3 coups à l'écran, pause, écran des commandes, changement de touche puis retour aux touches par défaut, aide | OK |

### Non testé ou limites (honnêteté)

- **Le ressenti** : le navigateur de test est logiciel (environ 6 images par seconde). Fluidité, rythme des combos et animations restent à juger sur ta machine.
- Deux appuis très rapprochés pendant l'arrêt sur image : un seul est gardé (la mémoire contient le dernier appui).
- Les combos sont jouables par le joueur ; l'IA ne les utilise pas encore volontairement (elle garde ses enchaînements d'avant).
- Combos non jouables avec une direction tenue (par choix, pour garder les coups directionnels).
- Le réglage des touches ne passe pas par la sauvegarde de compte (navigateur seulement). Pas de manette.
- Équilibrage des dégâts des combos non éprouvé en partie longue.
- En ligne : combos intégrés au moteur partagé (tests de duel passent), non rejoués à deux machines.
- Les animations de projection n'ont pas été modifiées.

### Tests à faire par toi

1. Entraînement : essaie trois fois chaque bouton (A, E, R, F) avec plusieurs personnages. Les enchaînements sont-ils assez rapides ?
2. Marche, course, esquive, saut : plus agréable qu'avant ?
3. Échap : pause, commandes, change une touche, reprends.
4. Bouton AIDE : affiche et masque le texte.

### Modifications à me renvoyer

Ce qui reste raide ou lent, quels personnages manquent de punch, et si l'IA doit faire des combos.

---

## 24. Session 17 : jeu sur téléphone et côté des commandes

### Fait

- **Commandes tactiles** (`ui/TouchControls.tsx`, `game/input/touch.ts`) : croix analogique (gauche/droite = marche, haut = saut, bas = accroupi), boutons FOND, ÉCRAN, COURSE, quatre attaques (poing G/D, pied G/D), bouton pause. Les doigts alimentent `KeyboardInput` comme des touches : le moteur n'a pas changé. Un tap bref entre deux ticks n'est pas perdu (`touchTapped`).
- **Réglages** (`ui/Settings.tsx`) : attaques à droite (défaut) ou à gauche, le déplacement passe de l'autre côté ; commandes tactiles AUTO / OUI / NON. Accessibles depuis le menu principal (RÉGLAGES) et le menu pause (RÉGLAGES TACTILES). Sauvegardés dans le navigateur (`iron-legacy.touch`).
- Écran en portrait : message « tourne ton téléphone ». Menu principal compacté (2 colonnes) sur écran de moins de 520 px de haut. Viewport sans zoom.

### Vérifié

Typecheck et build OK. Émulation 812x375 : menu, combat avec commandes, tap sur POING D (coup lancé), croix vers la droite (le combattant avance), bascule des attaques à gauche.

### Non vérifié

Pas testé sur un vrai téléphone (multi-touch, performances, rythme des combos au doigt). Écrans de sélection, arcade, compte, en ligne : seulement lisibles, pas adaptés au téléphone. Pas de plein écran. L'aide texte est masquée sur tactile.

---

## 25. Session 18 : combos étendus, double appui, indicateur de touches (en cours)

### Fait

- **Combos** (`engine/characters/combos.ts`) : 20 par personnage (7 faciles 3-4 entrées, 7 moyens 5-6, 6 difficiles 8-10), générés de façon déterministe d'après le style, noms propres par personnage, aucun doublon entre personnages. Entrées avec directions : `f`, `b`, `d`, `u`, `df`, `db`, `ff` (double appui avant). Tests : `comboList.test.ts`.
- **Double appui avant / arrière** : pas lancé (`dash`). `ff+lp` frappe lancée, `ff+rp` roulade offensive, `ff+lk` coup de pied lancé, `ff+rk` projection.
- **Coups au sol** : LK ou RK pressé pendant la chute → `wakeKick` / `wakeSweep` au relevé.
- **Liste des combos** : bouton COMBOS dans le menu pause (`ui/ComboList.tsx`).
- **Indicateur de touches** PC bas-droite (`ui/KeyPad.tsx`).
- **Sprint tactile** : double geste sur la croix (320 ms) = maintien de `shift`.

### Non fait

- Cartes plus claires (Shin, histoire) : pas commencé.
- Trois victoires par personnage (manche, partie, défaite) : pas commencé.
- L'IA n'utilise pas les nouveaux combos.
- Passer derrière l'adversaire (côté inversé au départ) : pas commencé.
- Le double geste tactile est relatif à l'écran, pas au sens de la face du combattant : faux si le combattant regarde à gauche.
- Pas de test navigateur de ce tour (connexion coupée).

### Session 18 suite : fins de combat

- **Victoire de manche, victoire de partie, défaite** : `render/pose.ts` (`endPose`). Victoire de manche = poing levé qui pompe ; victoire de partie = deux bras levés, sautillement ; défaite = tête basse, genoux pliés, à genoux. Tempo et ampleur viennent du style du personnage (`ANIM_STYLES`).
- Limite : même forme de pose pour tous, seul le tempo et l'ampleur changent. Pas de geste unique par personnage.
- Vérifié à l'écran par forçage d'état (KO, `matchWinner`) : « VICTOIRE » avec bras levés, « DÉFAITE » avec corps affaissé. Pas vérifié en mouvement réel.

### Session 18 suite : cartes

- Tous les décors ont une ambiance (`render/arenas/looks.ts`, `atmosphere.tsx`) : ciel dégradé (`SkyDome`), étoiles, lumière hémisphérique, contre-jour coloré, lumière centrale sur les combattants, brouillard teinté comme l'horizon, exposition par décor, particules (lucioles, feuilles, pétales, neige, braises, poussière, étincelles). Toit de Shin, rue, labo, forteresse, usine éclaircis ; immeubles plus clairs avec fenêtres lumineuses. Dojo (`render/Arena.tsx`) : même ciel et mêmes lumières.
- Vérifié à l'écran : toit de Shin (ciel étoilé, immeubles bleus lisibles), dojo (coucher de soleil). Pas relu à l'écran : les dix autres décors (forêt, automne, canyon, neige, toundra, labo, forteresse, rue, usine, temple, désert).
- Pas de nouveaux éléments de décor (formes) : seulement lumière, ciel et particules.

### Session 18 suite : départ inversé (passer derrière l'adversaire)

- La caméra ne tourne plus : la droite de l'écran est toujours +X (`VIEW_AXIS` dans `runtime.ts`). Les touches sont lues sur l'écran puis projetées sur l'avant du combattant, qui se tourne toujours vers l'adversaire. En tournant autour de lui (pas de côté : Z/S, FOND/ÉCRAN au tactile), on passe derrière et on se retrouve à droite de l'écran.
- Caméra un peu plus haute (2,5 m) pour lire la profondeur quand les combattants sont alignés avec la vue.
- En ligne, l'axe est maintenant le même pour les deux joueurs : le joueur 2 (à droite de l'écran) avance avec la touche gauche. Avant, ses touches étaient miroir. Pas testé à deux machines.
- Tests : `behind.test.ts`. Vérifié à l'écran : le pas de côté fait tourner P1 autour de P2, face à lui. Le demi-tour complet n'a pas été vu à l'écran (trop lent à 6 images/s), seulement en test moteur.

### Session 18 suite : IA et difficulté

- **L'IA fait des combos** (`engine/ai.ts`) : pendant un coup, elle suit un lien `chain` du coup en cours (tout chemin de l'arbre est un vrai combo). Niveaux 1-2 : rien de nouveau ; 3-4 : triple appui seulement ; 5 et plus : tous les combos, directions comprises. Nouveau niveau 8 « impossible » (`AI_MAX_LEVEL`). Tests : `aiCombo.test.ts`.
- **Réglage « Niveau des adversaires »** (Réglages, menu principal et pause) : facile (-2), moyen (0), difficile (+2), impossible (niveau 8 partout). Appliqué dans `runtime.start` à tous les combats contre l'ordinateur (arcade, histoire, robots, combat rapide), en plus du niveau prévu par le mode. Sauvegardé dans le navigateur (`iron-legacy.ai`). `game/difficulty.ts`.
- Limites : l'IA ne fait pas de double appui (pas de roulade ni de projection lancée) ; le réglage changé pendant un combat vaut au combat suivant ; les bots en ligne du serveur ne lisent pas ce réglage.

### Session 18 suite : téléphone à l'horizontale

- Variante Tailwind `short:` (`index.css`) = écran de moins de 520 px de haut (téléphone à l'horizontale). Utilisée pour compacter : boutons (`SlantButton`), titres (`Title`), menu pause (2 colonnes, défilable : QUITTER LE COMBAT visible), sélection de personnage (fiche réduite à gauche, aperçu 3D à droite, 12 vignettes sur une ligne), dialogue de l'histoire, panneau d'aide (défilable), HUD (portraits, horloge), bannières, commandes tactiles.
- La liste des combos affiche les boutons tactiles (POING G…) quand les commandes tactiles sont actives.
- Vérifié en 812x375 : menu, sélection, choix du mannequin, combat tactile, pause, liste des combos, histoire (sélection, narration, dialogue), arcade et robots (défilent), écran de fin. Pas vérifié : en ligne, compte, VS, écrans de fin d'histoire. Pas testé sur un vrai téléphone.
