# Client statique (Vite) servi par nginx. Contexte de build : racine du dépôt.
# VITE_SERVER_URL (ex. wss://iron-api.projectp.fr) est lue au build.
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
RUN npm ci --workspace @iron/client --workspace @iron/engine --include-workspace-root
COPY packages/engine packages/engine
COPY apps/client apps/client
RUN npm run build -w @iron/client

FROM nginx:alpine
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/client/dist /usr/share/nginx/html
EXPOSE 80
