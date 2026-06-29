# Chill Bar admin panel — build context is the repository root
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci
COPY packages/shared packages/shared
COPY apps/admin apps/admin
RUN npm run build -w @chill-bar/admin

FROM nginx:1.27-alpine AS run
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
