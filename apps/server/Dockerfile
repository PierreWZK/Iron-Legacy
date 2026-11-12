# Serveur de combat + comptes. Contexte de build : racine du dépôt.
# ATTENTION : non testé (Docker absent de la machine de développement). À valider avant la mise en ligne.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
RUN npm ci --workspace @iron/server --workspace @iron/engine --include-workspace-root
COPY packages/engine packages/engine
COPY apps/server apps/server
ENV NODE_ENV=production \
    PORT=2567 \
    IRON_DB=/data/iron.sqlite
VOLUME /data
EXPOSE 2567
CMD ["npx", "tsx", "apps/server/src/index.ts"]
