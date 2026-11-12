# Déploiement (Coolify) — à valider avant exécution

État : **non déployé**. Ce document décrit la configuration prévue. Rien n'est en ligne tant qu'il n'est pas exécuté.

## Pré-requis

- Dépôt GitHub : `https://github.com/PierreWZK/day-28-iron-legacy` (public). La branche `master` doit contenir le code à déployer : pour l'instant elle ne contient que le commit d'initialisation. Les branches `feat/...` sont à pousser et fusionner par toi (voir consigne de la phase 0).
- Coolify : serveur accessible, projet créé.
- Base de données : **SQLite actuelle**, à remplacer par Postgres avant la mise en ligne réelle (voir CLAUDE_CONTEXTE.md, phase 11).

## Service 1 — serveur de combat (`apps/server`)

| Réglage | Valeur |
|---|---|
| Source | dépôt GitHub, branche à déployer |
| Build | Dockerfile : `apps/server/Dockerfile`, contexte = racine du dépôt |
| Port | `2567` |
| Volume | `/data` (base SQLite) |
| Variables | `PORT=2567`, `IRON_DB=/data/iron.sqlite`, `NODE_ENV=production` |
| Domaine | sous-domaine HTTPS, ex. `api.<domaine>` (le client utilisera `wss://`) |

Vérification après déploiement : `GET https://api.<domaine>/api/ranking` doit répondre `{"rows":[]}`.

## Service 2 — client statique (`apps/client`)

| Réglage | Valeur |
|---|---|
| Build | `npm ci && npm run build -w @iron/client` (racine du dépôt) |
| Dossier publié | `apps/client/dist` |
| Variable au build | `VITE_SERVER_URL=wss://api.<domaine>` |
| Domaine | sous-domaine HTTPS, ex. `jeu.<domaine>` |

`VITE_SERVER_URL` est lue au moment du build : tout changement d'adresse du serveur impose un nouveau build du client.

## Points de sécurité à traiter avant l'ouverture au public

- **CORS** : restreindre `Access-Control-Allow-Origin` à l'URL du client (actuellement `*`, dans `apps/server/src/api.ts`).
- **Base** : migrer `node:sqlite` vers Postgres (Docker Compose prévu au plan) ; sauvegardes du volume.
- **Jetons** : expiration et révocation à ajouter (actuellement sans expiration).
- **Limite de tentatives** : par IP, en mémoire (20 par 10 min). Insuffisant si plusieurs instances.
- **Dockerfile** : jamais exécuté. Le tester sur une machine avec Docker avant le premier déploiement.

## Ordre conseillé

1. Tester `docker build -f apps/server/Dockerfile .` en local.
2. Déployer le serveur, vérifier `/api/ranking`.
3. Construire le client avec `VITE_SERVER_URL` pointant sur le serveur, déployer le statique.
4. Test de bout en bout : inscription, salon, partie en ligne sur deux appareils.
