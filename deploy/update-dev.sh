#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ "$EUID" -eq 0 ]] || { echo "Execute como root." >&2; exit 1; }

REPO=/opt/hubpages-src-dev
COMPOSE_FILE="$REPO/deploy/compose.dev.yml"
SISTERA_HEALTH=https://app.sistera.com.br/api/health

cd "$REPO"
[[ "$(git branch --show-current)" == develop ]] || { echo "A cópia DEV não está na branch develop." >&2; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "Há alterações locais; atualização interrompida." >&2; exit 1; }
git pull --ff-only origin develop

curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null

tag="$(git rev-parse --short=12 HEAD)"
IMAGE_TAG="$tag" docker compose -p hubpages_dev -f "$COMPOSE_FILE" config --quiet
IMAGE_TAG="$tag" docker compose -p hubpages_dev -f "$COMPOSE_FILE" build hubpages-dev
IMAGE_TAG="$tag" docker compose -p hubpages_dev -f "$COMPOSE_FILE" up -d --no-build --wait --wait-timeout 120 hubpages-dev

container="$(docker compose -p hubpages_dev -f "$COMPOSE_FILE" ps -q hubpages-dev)"
[[ -n "$container" ]] || { echo "Contêiner DEV não encontrado." >&2; exit 1; }
docker exec "$container" wget -q -O - http://127.0.0.1:8080/health.json | grep -q '"status":"ok"'
curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null

echo "HubPages DEV atualizado para $tag."
