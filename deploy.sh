#!/usr/bin/env bash
# Detectra AI — Docker production deploy
set -euo pipefail
cd "$(dirname "$0")"

PROFILE="${1:-production}"
if [[ "$PROFILE" != "dev" && "$PROFILE" != "production" ]]; then
  echo "Usage: ./deploy.sh [dev|production]"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Creating .env from .env.example — edit secrets before public deploy."
  cp .env.example .env
fi

if grep -q "CHANGE_ME_IN_PRODUCTION" .env 2>/dev/null; then
  if command -v openssl >/dev/null 2>&1; then
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i.bak "s/^SECRET_KEY=.*/SECRET_KEY=${SECRET_KEY}/" .env && rm -f .env.bak
    echo "Generated SECRET_KEY in .env"
  fi
fi

echo "Building Detectra AI (profile: ${PROFILE})..."
# Remove legacy standalone containers (old docker run -t detectra-ai)
docker rm -f detectra-ai detecra-ai 2>/dev/null || true
docker compose down --remove-orphans 2>/dev/null || true

if [[ "$PROFILE" == "production" ]]; then
  docker compose --profile production up -d --build api frontend nginx
  APP_URL="http://localhost:${HTTP_PORT:-80}"
else
  docker compose up -d --build api frontend
  APP_URL="http://localhost:${FRONTEND_PORT:-3000}"
fi

echo "Waiting for API health..."
for i in $(seq 1 40); do
  if curl -fsS "http://localhost:${API_PORT:-8000}/health" >/dev/null 2>&1; then
    echo "API is healthy."
    break
  fi
  sleep 3
  if [[ "$i" -eq 40 ]]; then
    echo "API did not become healthy in time. Check: docker compose logs api"
    exit 1
  fi
done

echo ""
echo "Detectra AI is running."
echo "  App:    ${APP_URL}"
echo "  API:    http://localhost:${API_PORT:-8000}"
echo "  Health: http://localhost:${API_PORT:-8000}/health"
echo ""
echo "Logs:  docker compose logs -f api frontend"
echo "Stop:  docker compose down"
echo "GPU:   docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build"
