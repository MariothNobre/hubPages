#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ "$EUID" -eq 0 ]] || { echo "Execute como root." >&2; exit 1; }

REPOSITORY_URL="${HUBPAGES_REPOSITORY_URL:-https://github.com/MariothNobre/hubPages.git}"
PROD_REPO=/opt/hubpages-src-prod
DEV_REPO=/opt/hubpages-src-dev
PROD_COMPOSE="$PROD_REPO/deploy/compose.prod.yml"
DEV_COMPOSE="$DEV_REPO/deploy/compose.dev.yml"
SISTERA_CADDY=sistera_vps-caddy-1
SISTERA_HEALTH=https://app.sistera.com.br/api/health

for command_name in docker git curl install grep; do
  command -v "$command_name" >/dev/null || { echo "Comando ausente: $command_name" >&2; exit 1; }
done

docker inspect "$SISTERA_CADDY" >/dev/null
docker network inspect sistera_vps_sistera_internal >/dev/null
curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null

if [[ ! -d "$PROD_REPO/.git" ]]; then
  git clone --branch main --single-branch "$REPOSITORY_URL" "$PROD_REPO"
fi

if [[ ! -d "$DEV_REPO/.git" ]]; then
  git clone --branch develop --single-branch "$REPOSITORY_URL" "$DEV_REPO"
fi

[[ "$(git -C "$PROD_REPO" branch --show-current)" == main ]]
[[ "$(git -C "$DEV_REPO" branch --show-current)" == develop ]]
git -C "$PROD_REPO" diff --quiet
git -C "$DEV_REPO" diff --quiet
git -C "$PROD_REPO" pull --ff-only origin main
git -C "$DEV_REPO" pull --ff-only origin develop

prod_tag="$(git -C "$PROD_REPO" rev-parse --short=12 HEAD)"
dev_tag="$(git -C "$DEV_REPO" rev-parse --short=12 HEAD)"

IMAGE_TAG="$prod_tag" docker compose -p hubpages_prod -f "$PROD_COMPOSE" config --quiet
IMAGE_TAG="$dev_tag" docker compose -p hubpages_dev -f "$DEV_COMPOSE" config --quiet

IMAGE_TAG="$dev_tag" docker compose -p hubpages_dev -f "$DEV_COMPOSE" build hubpages-dev
IMAGE_TAG="$dev_tag" docker compose -p hubpages_dev -f "$DEV_COMPOSE" up -d --no-build --wait --wait-timeout 120 hubpages-dev

IMAGE_TAG="$prod_tag" docker compose -p hubpages_prod -f "$PROD_COMPOSE" build hubpages-prod
IMAGE_TAG="$prod_tag" docker compose -p hubpages_prod -f "$PROD_COMPOSE" up -d --no-build --wait --wait-timeout 120 hubpages-prod

dev_container="$(docker compose -p hubpages_dev -f "$DEV_COMPOSE" ps -q hubpages-dev)"
prod_container="$(docker compose -p hubpages_prod -f "$PROD_COMPOSE" ps -q hubpages-prod)"
[[ -n "$dev_container" && -n "$prod_container" ]]

docker exec "$dev_container" wget -q -O - http://127.0.0.1:8080/health.json | grep -q '"status":"ok"'
docker exec "$prod_container" wget -q -O - http://127.0.0.1:8080/health.json | grep -q '"status":"ok"'

install -o root -g root -m 0755 "$PROD_REPO/deploy/hubpages-deploy-gateway" /usr/local/sbin/hubpages-deploy-gateway
curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null

echo "Compartimentos HubPages instalados. Proxy e DNS não foram alterados."
