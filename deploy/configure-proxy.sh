#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ "$EUID" -eq 0 ]] || { echo "Execute como root." >&2; exit 1; }

EXPECTED_IPV4=179.199.148.219
CADDY_CONTAINER=sistera_vps-caddy-1
BLOCK_FILE=/opt/hubpages-src-prod/deploy/Caddyfile.hubpages.caddy
SISTERA_HEALTH=https://app.sistera.com.br/api/health

for domain in hubpages.com.br dev.hubpages.com.br; do
  resolved="$(getent ahostsv4 "$domain" | awk '{print $1}' | sort -u)"
  [[ "$resolved" == "$EXPECTED_IPV4" ]] || {
    echo "$domain ainda não aponta exclusivamente para $EXPECTED_IPV4." >&2
    exit 1
  }
done

curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null
docker inspect "$CADDY_CONTAINER" >/dev/null

caddy_source="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' "$CADDY_CONTAINER")"
[[ -n "$caddy_source" && -f "$caddy_source" && -f "$BLOCK_FILE" ]] || { echo "Caddyfile ativo ou bloco HubPages não localizado." >&2; exit 1; }

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="${caddy_source}.before-hubpages-${timestamp}"
candidate="$(mktemp)"
cp -a "$caddy_source" "$backup"

python3 - "$caddy_source" "$BLOCK_FILE" "$candidate" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text()
block = Path(sys.argv[2]).read_text().strip() + "\n"
start = "# BEGIN HUBPAGES MANAGED BLOCK"
end = "# END HUBPAGES MANAGED BLOCK"

if (start in source) != (end in source):
    raise SystemExit("Marcadores HubPages inconsistentes no Caddyfile ativo.")

if start in source:
    before, remainder = source.split(start, 1)
    _, after = remainder.split(end, 1)
    result = before.rstrip() + "\n\n" + block + after.lstrip("\n")
else:
    result = source.rstrip() + "\n\n" + block

Path(sys.argv[3]).write_text(result)
PY

cleanup() { rm -f -- "$candidate"; }
trap cleanup EXIT

docker run --rm -v "$candidate:/etc/caddy/Caddyfile:ro" caddy:2.10.2-alpine caddy validate --config /etc/caddy/Caddyfile
tee "$caddy_source" < "$candidate" >/dev/null
chmod 0644 "$caddy_source"

if ! docker cp "$candidate" "$CADDY_CONTAINER:/tmp/HubPages.Caddyfile" \
  || ! docker exec "$CADDY_CONTAINER" caddy reload --config /tmp/HubPages.Caddyfile --force; then
  tee "$caddy_source" < "$backup" >/dev/null
  docker cp "$backup" "$CADDY_CONTAINER:/tmp/HubPages.rollback.Caddyfile"
  docker exec "$CADDY_CONTAINER" caddy reload --config /tmp/HubPages.rollback.Caddyfile --force
  echo "Falha ao ativar HubPages; proxy restaurado a partir de $backup." >&2
  exit 1
fi

curl --silent --show-error --fail --connect-timeout 5 --max-time 20 "$SISTERA_HEALTH" >/dev/null
echo "Proxy HubPages ativado; backup preservado em $backup."
