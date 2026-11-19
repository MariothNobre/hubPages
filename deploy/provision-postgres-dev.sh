#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ "$EUID" -eq 0 ]] || { echo 'Execute como root.' >&2; exit 1; }
cd /opt/hubpages-src-dev
[[ "$(git branch --show-current)" == develop ]] || { echo 'Somente homologação.' >&2; exit 1; }
install -d -m 0700 /opt/hubpages-secrets /opt/hubpages-backups/dev
if [[ ! -f /opt/hubpages-secrets/dev-db.env ]]; then
  printf 'HUBPAGES_DB_PASSWORD=%s\n' "$(openssl rand -hex 32)" > /opt/hubpages-secrets/dev-db.env
fi
set -a
source /opt/hubpages-secrets/dev.env
source /opt/hubpages-secrets/dev-db.env
set +a
export IMAGE_TAG="$(git rev-parse --short=12 HEAD)"
compose=(docker compose -p hubpages_dev -f deploy/compose.dev.yml -f deploy/compose.postgres.yml)
curl --fail --silent --show-error https://app.sistera.com.br/api/health >/dev/null
container="$(docker compose -p hubpages_dev -f deploy/compose.dev.yml ps -q hubpages-dev)"
[[ -n "$container" ]] || { echo 'Container DEV ausente.' >&2; exit 1; }
docker cp "$container:/data/content.json" "/opt/hubpages-backups/dev/content-$(date -u +%Y%m%dT%H%M%SZ).json"
"${compose[@]}" config --quiet
"${compose[@]}" build hubpages-dev
"${compose[@]}" up -d --wait --wait-timeout 180
curl --fail --silent --show-error https://dev.hubpages.com.br/health.json
curl --fail --silent --show-error https://app.sistera.com.br/api/health >/dev/null
