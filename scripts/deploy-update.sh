#!/usr/bin/env bash
# Deploy latest code on the server (run from repo root or via scripts/).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export BUILD_SHA="$(git rev-parse --short HEAD)"
NO_CACHE=()

if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE=(--no-cache)
  shift
fi

echo "==> Pulling latest code..."
git pull

echo "==> Building admin + api (commit $BUILD_SHA)..."
docker compose build "${NO_CACHE[@]}" admin api

echo "==> Recreating containers..."
docker compose up -d --force-recreate admin api

echo "==> Status:"
docker compose ps

echo ""
echo "Done. Open admin panel and check sidebar footer: build $BUILD_SHA"
echo "If UI still looks old: hard refresh (Ctrl+Shift+R) or incognito window."
