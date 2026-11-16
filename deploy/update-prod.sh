#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ "$EUID" -eq 0 ]] || { echo "Execute como root." >&2; exit 1; }

REPO=/opt/hubpages-src-prod
COMPOSE_FILE="$REPO/deploy/compose.prod.yml"
SISTERA_HEALTH=https://app.sistera.com.br/api/health
SECRETS_FILE=/opt/hubpages-secrets/prod.env

cd "$REPO"
[[ -r "$SECRETS_FILE" ]] || { echo "Segredos de produção não configurados em $SECRETS_FILE." >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a
[[ "$(git branch --show-current)" == main ]] || { echo "A cópia de produção não está na branch main." >&2; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "Há alterações locais; atualização interrompida." >&2; exit 1; }
git pull --ff-only origin main

curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null

tag="$(git rev-parse --short=12 HEAD)"
IMAGE_TAG="$tag" docker compose -p hubpages_prod -f "$COMPOSE_FILE" config --quiet
IMAGE_TAG="$tag" docker compose -p hubpages_prod -f "$COMPOSE_FILE" build hubpages-prod
IMAGE_TAG="$tag" docker compose -p hubpages_prod -f "$COMPOSE_FILE" up -d --no-build --wait --wait-timeout 120 hubpages-prod

container="$(docker compose -p hubpages_prod -f "$COMPOSE_FILE" ps -q hubpages-prod)"
[[ -n "$container" ]] || { echo "Contêiner de produção não encontrado." >&2; exit 1; }
docker exec "$container" wget -q -O - http://127.0.0.1:8080/health.json | grep -q '"status":"ok"'
curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null

echo "HubPages produção atualizada para $tag."
