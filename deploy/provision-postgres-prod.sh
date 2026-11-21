#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ "$EUID" -eq 0 ]] || exit 1
cd /opt/hubpages-src-prod
[[ "$(git branch --show-current)" == main ]] || exit 1
install -d -m 0700 /opt/hubpages-secrets /opt/hubpages-backups/prod
if [[ ! -f /opt/hubpages-secrets/prod-db.env ]]; then
  printf 'HUBPAGES_DB_PASSWORD=%s\n' "$(openssl rand -hex 32)" > /opt/hubpages-secrets/prod-db.env
fi
set -a
source /opt/hubpages-secrets/prod.env
source /opt/hubpages-secrets/prod-db.env
set +a
export IMAGE_TAG="$(git rev-parse --short=12 HEAD)"
base=(docker compose -p hubpages_prod -f deploy/compose.prod.yml)
compose=(docker compose -p hubpages_prod -f deploy/compose.prod.yml -f deploy/compose.postgres.prod.yml)
curl -fsS https://app.sistera.com.br/api/health >/dev/null
container="$("${base[@]}" ps -q hubpages-prod)"
[[ -n "$container" ]] || { echo 'Container produção ausente.' >&2; exit 1; }
old_image="$(docker inspect -f '{{.Config.Image}}' "$container")"
first_migration=true
if [[ -n "$("${compose[@]}" ps -q hubpages-db)" ]]; then
  first_migration=false
  "${compose[@]}" exec -T hubpages-db pg_dump -U hubpages -d hubpages > "/opt/hubpages-backups/prod/postgres-$(date -u +%Y%m%dT%H%M%SZ).sql"
  bash deploy/verify-prod-restore.sh
fi
"${compose[@]}" config --quiet
"${compose[@]}" build hubpages-prod
rollback_app() {
  if [[ "$first_migration" == true ]]; then
    IMAGE_TAG="${old_image##*:}" "${base[@]}" up -d --no-build --wait --wait-timeout 180 hubpages-prod || true
  else
    IMAGE_TAG="${old_image##*:}" "${compose[@]}" up -d --no-build --wait --wait-timeout 180 hubpages-prod || true
  fi
  echo 'Production application rollback requested; database and protected backups preserved.' >&2
}
trap 'status=$?; rollback_app; exit "$status"' ERR
# Build first, then quiesce writes for a consistent initial migration snapshot.
if [[ "$first_migration" == true ]]; then
  "${base[@]}" stop hubpages-prod
fi
docker cp "$container:/data/content.json" "/opt/hubpages-backups/prod/content-$(date -u +%Y%m%dT%H%M%SZ).json"
"${compose[@]}" up -d --wait --wait-timeout 180
if [[ "$first_migration" == true ]]; then
  "${compose[@]}" exec -T hubpages-prod node --input-type=module -e 'import pg from "pg"; import {readFile} from "node:fs/promises"; import assert from "node:assert/strict"; import {isDeepStrictEqual} from "node:util"; const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}); const result=await pool.query("SELECT payload FROM hubpages_state WHERE id=1"); assert.ok(isDeepStrictEqual(result.rows[0].payload,JSON.parse(await readFile(process.env.DATA_FILE,"utf8"))),"Production source state must remain intact"); await pool.end(); console.log("Production migration verified: complete state preserved.");'
fi
# Code-only promotion: never import DEV identities, pages or sales data.
"${compose[@]}" exec -T hubpages-prod node server/verify-production-studio.mjs
bash deploy/verify-prod-restore.sh
"${compose[@]}" exec -T hubpages-db psql -U hubpages -d hubpages -v ON_ERROR_STOP=1 -c "SELECT id, (SELECT count(*) FROM jsonb_object_keys(payload->'pages')) AS pages FROM hubpages_state;"
curl -fsS https://hubpages.com.br/health.json
curl -fsS https://app.sistera.com.br/api/health >/dev/null

trap - ERR
