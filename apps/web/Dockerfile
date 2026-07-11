# Chill Bar customer PWA — build context is the repository root
FROM node:22-alpine AS build
ARG BUILD_SHA=unknown
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci
COPY packages/shared packages/shared
COPY apps/web apps/web
ENV VITE_BUILD_SHA=$BUILD_SHA
RUN npm run build -w @chill-bar/web

FROM nginx:1.27-alpine AS run
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
