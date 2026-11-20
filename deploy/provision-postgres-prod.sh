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
fi
"${compose[@]}" config --quiet
"${compose[@]}" build hubpages-prod
# Build first, then quiesce writes for a consistent initial migration snapshot.
if [[ "$first_migration" == true ]]; then
  trap 'IMAGE_TAG="${old_image##*:}" "${base[@]}" up -d --no-build --wait hubpages-prod' ERR
  "${base[@]}" stop hubpages-prod
fi
docker cp "$container:/data/content.json" "/opt/hubpages-backups/prod/content-$(date -u +%Y%m%dT%H%M%SZ).json"
"${compose[@]}" up -d --wait --wait-timeout 180
if [[ "$first_migration" == true ]]; then
  "${compose[@]}" exec -T hubpages-prod node --input-type=module -e 'import pg from "pg"; import {readFile} from "node:fs/promises"; import assert from "node:assert/strict"; const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}); const result=await pool.query("SELECT payload FROM hubpages_state WHERE id=1"); assert.deepStrictEqual(result.rows[0].payload,JSON.parse(await readFile(process.env.DATA_FILE,"utf8"))); await pool.end(); console.log("Production migration verified: complete state preserved.");'
fi
trap - ERR
# Transfer only the requested user profile, never DEV commercial data.
# Pipeline carries hashes privately; neither credentials nor profile are logged.
docker exec hubpages_dev-hubpages-db-1 psql -U hubpages -d hubpages -At -v ON_ERROR_STOP=1 -c "SELECT payload->'admin' FROM hubpages_state WHERE id=1;" | "${compose[@]}" exec -T hubpages-prod node --input-type=module -e 'import pg from "pg"; import assert from "node:assert/strict"; let input=""; for await(const chunk of process.stdin) input+=chunk; const admin=JSON.parse(input); assert.ok(admin?.email && admin?.passwordHash?.startsWith("scrypt$"),"DEV administrator must be activated before release"); const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}); const result=await pool.query("SELECT payload FROM hubpages_state WHERE id=1"); const state=result.rows[0].payload; if(!state.devAccessImportedAt){state.admin=admin;state.devAccessImportedAt=new Date().toISOString();await pool.query("UPDATE hubpages_state SET payload=$1::jsonb,updated_at=now() WHERE id=1",[JSON.stringify(state)]);const verified=await pool.query("SELECT payload FROM hubpages_state WHERE id=1");assert.deepStrictEqual(verified.rows[0].payload.admin,admin);console.log("DEV user access transferred and verified.");}else console.log("User transfer already completed; production access preserved.");await pool.end();'
"${compose[@]}" up -d --no-build --force-recreate --wait --wait-timeout 180 hubpages-prod
"${compose[@]}" exec -T hubpages-db psql -U hubpages -d hubpages -v ON_ERROR_STOP=1 -c "SELECT id, (SELECT count(*) FROM jsonb_object_keys(payload->'pages')) AS pages FROM hubpages_state;"
curl -fsS https://hubpages.com.br/health.json
curl -fsS https://app.sistera.com.br/api/health >/dev/null
