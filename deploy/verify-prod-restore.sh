#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ "$EUID" -eq 0 && "$PWD" == /opt/hubpages-src-prod ]] || exit 1
source /opt/hubpages-secrets/prod-db.env
export HUBPAGES_DB_PASSWORD
compose=(docker compose -p hubpages_prod -f deploy/compose.prod.yml -f deploy/compose.postgres.prod.yml)
backup_dir=/opt/hubpages-backups/prod
install -d -m 0700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"
dump="$backup_dir/verified-$stamp.dump"
"${compose[@]}" exec -T hubpages-db pg_dump -U hubpages -d hubpages -Fc > "$dump"
[[ -s "$dump" ]] || { echo 'Backup vazio; publicação interrompida.' >&2; exit 1; }
restore="hubpages-prod-restore-$stamp"
trap 'docker rm -fv "$restore" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$restore" --network none --memory 256m --cpus 0.25 --mount type=volume,destination=/var/lib/postgresql/data -e POSTGRES_USER=hubpages -e POSTGRES_DB=hubpages -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-bookworm >/dev/null
for attempt in $(seq 1 40); do
  if docker exec "$restore" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready -U hubpages -d hubpages' >/dev/null 2>&1; then break; fi
  sleep 2
done
docker exec -i "$restore" pg_restore -U hubpages -d hubpages --no-owner --no-privileges < "$dump"
docker exec "$restore" psql -U hubpages -d hubpages -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM hubpages_state WHERE id=1 AND jsonb_typeof(payload)='object';" | grep -qx 1
# Verify the critical legacy structures after PostgreSQL accepted the full restore.
docker exec "$restore" psql -U hubpages -d hubpages -At -v ON_ERROR_STOP=1 -c "SELECT jsonb_typeof(payload->'pages') FROM hubpages_state WHERE id=1;" | grep -qx object
docker exec "$restore" psql -U hubpages -d hubpages -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM hubpages_state WHERE id=1 AND payload->'admin'->>'passwordHash' IS NOT NULL;" | grep -qx 1
if [[ "$(docker exec "$restore" psql -U hubpages -d hubpages -At -c "SELECT to_regclass('hubpages_studio_pages') IS NOT NULL;")" == t ]]; then
  docker exec "$restore" psql -U hubpages -d hubpages -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM hubpages_studio_pages p WHERE revision <> COALESCE((SELECT max(version) FROM hubpages_studio_revisions r WHERE r.page_id=p.id),0);" | grep -qx 0
  echo 'Restore PROD: cadeias de revisoes do Studio integras.'
fi
if [[ "$(docker exec "$restore" psql -U hubpages -d hubpages -At -c "SELECT to_regclass('hubpages_studio_publications') IS NOT NULL;")" == t ]]; then
  docker exec "$restore" psql -U hubpages -d hubpages -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM hubpages_studio_publications p WHERE NOT EXISTS(SELECT 1 FROM hubpages_studio_revisions r WHERE r.page_id=p.page_id AND r.version=p.revision);" | grep -qx 0
  echo 'Restore PROD: versoes publicadas e referencias integras.'
fi
sha256sum "$dump" > "$dump.sha256"
docker inspect hubpages_prod-hubpages-prod-1 --format '{{.Image}}' > "$backup_dir/image-$stamp.txt"
printf 'Restore PROD verificado em container isolado sem rede ou porta pública; backup protegido: %s\n' "$dump"
