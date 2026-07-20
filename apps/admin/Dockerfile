# Chill Bar admin panel — build context is the repository root
FROM node:22-alpine AS build
ARG BUILD_SHA=unknown
WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_NETWORK_TIMEOUT=300000

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/

RUN set -e; \
  for attempt in 1 2 3 4 5; do \
    echo "==> npm ci attempt $attempt"; \
    npm ci && exit 0; \
    echo "npm ci failed (attempt $attempt), retrying in 20s..."; \
    sleep 20; \
  done; \
  exit 1

COPY packages/shared packages/shared
COPY apps/admin apps/admin
ENV VITE_BUILD_SHA=$BUILD_SHA
RUN npm run build -w @chill-bar/admin

FROM nginx:1.27-alpine AS run
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
