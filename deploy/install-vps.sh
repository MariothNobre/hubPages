#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ "$EUID" -eq 0 ]] || { echo "Execute como root." >&2; exit 1; }

REPOSITORY_URL="${HUBPAGES_REPOSITORY_URL:-git@github.com:MariothNobre/HubPages.git}"
PROD_REPO=/opt/hubpages-src-prod
DEV_REPO=/opt/hubpages-src-dev
SISTERA_CADDY=sistera_vps-caddy-1
SISTERA_HEALTH=https://app.sistera.com.br/api/health

for command_name in docker git curl install; do
  command -v "$command_name" >/dev/null || { echo "Comando ausente: $command_name" >&2; exit 1; }
done

docker inspect "$SISTERA_CADDY" >/dev/null
docker network inspect sistera_vps_sistera_internal >/dev/null
curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null

install -d -o root -g root -m 0750 /opt/hubpages

if [[ ! -d "$PROD_REPO/.git" ]]; then
  git clone --branch main --single-branch "$REPOSITORY_URL" "$PROD_REPO"
fi

if [[ ! -d "$DEV_REPO/.git" ]]; then
  git clone --branch develop --single-branch "$REPOSITORY_URL" "$DEV_REPO"
fi

install -o root -g root -m 0755 "$PROD_REPO/deploy/hubpages-deploy-gateway" /usr/local/sbin/hubpages-deploy-gateway

bash "$DEV_REPO/deploy/update-dev.sh"
bash "$PROD_REPO/deploy/update-prod.sh"

curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null
echo "Compartimentos HubPages DEV e produção instalados sem alterar o proxy ou o DNS."
