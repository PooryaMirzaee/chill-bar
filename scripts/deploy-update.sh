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

echo "==> Waiting for API (migrations + health)..."
for _ in $(seq 1 45); do
  health="$(curl -sf http://127.0.0.1:4000/api/health 2>/dev/null || true)"
  if echo "$health" | grep -q '"status":"ok"'; then
    echo "API healthy."
    break
  fi
  if echo "$health" | grep -q '"schema":false'; then
    echo "WARNING: DB schema outdated — running migrations..."
    docker compose exec -T api npm run db:deploy
    docker compose restart api
    sleep 5
    continue
  fi
  sleep 2
done

health="$(curl -sf http://127.0.0.1:4000/api/health 2>/dev/null || echo '{}')"
if ! echo "$health" | grep -q '"status":"ok"'; then
  echo "WARNING: API not healthy yet. Check: docker compose logs api --tail=80"
  echo "Health: $health"
fi

echo ""
echo "Done. Open admin panel and check sidebar footer: build $BUILD_SHA"
echo "If UI still looks old: hard refresh (Ctrl+Shift+R) or incognito window."
