#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ "$EUID" -eq 0 && "$PWD" == /opt/hubpages-src-dev ]] || exit 1
source /opt/hubpages-secrets/dev-db.env
export HUBPAGES_DB_PASSWORD
compose=(docker compose -p hubpages_dev -f deploy/compose.dev.yml -f deploy/compose.postgres.yml)
backup_dir=/opt/hubpages-backups/dev
install -d -m 0700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"
dump="$backup_dir/verified-$stamp.dump"
"${compose[@]}" exec -T hubpages-db pg_dump -U hubpages -d hubpages -Fc > "$dump"
[[ -s "$dump" ]] || { echo 'Backup vazio; publicação interrompida.' >&2; exit 1; }
restore="hubpages-dev-restore-$stamp"
trap 'docker rm -f "$restore" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$restore" --network none --memory 256m --cpus 0.25 --tmpfs /var/lib/postgresql/data:rw,size=512m -e POSTGRES_USER=hubpages -e POSTGRES_DB=hubpages -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-bookworm >/dev/null
for attempt in $(seq 1 40); do
  if docker exec "$restore" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready -U hubpages -d hubpages' >/dev/null 2>&1; then break; fi
  sleep 2
done
docker exec -i "$restore" pg_restore -U hubpages -d hubpages --no-owner --no-privileges < "$dump"
docker exec "$restore" psql -U hubpages -d hubpages -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM hubpages_state WHERE id=1 AND jsonb_typeof(payload)='object';" | grep -qx 1
# Verify the critical legacy structures after PostgreSQL accepted the full restore.
docker exec "$restore" psql -U hubpages -d hubpages -At -v ON_ERROR_STOP=1 -c "SELECT jsonb_typeof(payload->'pages') FROM hubpages_state WHERE id=1;" | grep -qx object
docker exec "$restore" psql -U hubpages -d hubpages -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM hubpages_state WHERE id=1 AND payload->'admin'->>'passwordHash' IS NOT NULL;" | grep -qx 1
sha256sum "$dump" > "$dump.sha256"
docker inspect hubpages_dev-hubpages-dev-1 --format '{{.Image}}' > "$backup_dir/image-$stamp.txt"
printf 'Restore DEV verificado em container isolado sem rede ou porta pública; backup protegido: %s\n' "$dump"
