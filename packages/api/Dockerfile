# Chill Bar API — build context is the repository root
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Install workspace dependencies
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci

# Copy source needed by the API
COPY packages/shared packages/shared
COPY packages/api packages/api

# Generate Prisma client (retry: binaries.prisma.sh may fail on transient DNS)
RUN set -e; \
  for attempt in 1 2 3 4 5; do \
    npm run db:generate -w @chill-bar/api && exit 0; \
    echo "prisma generate attempt $attempt failed, retrying in 15s..."; \
    sleep 15; \
  done; \
  exit 1

ENV NODE_ENV=production
EXPOSE 4000
WORKDIR /app/packages/api
CMD ["npm", "run", "start:migrate"]
