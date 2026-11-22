#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ "$EUID" -eq 0 && "$PWD" == /opt/hubpages-src-dev ]] || exit 1
exec 9>/run/lock/hubpages-dev-domains.lock
flock -x 9
proxy=sistera_vps-caddy-1
source_file="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' "$proxy")"
[[ -n "$source_file" && -f "$source_file" ]] || { echo 'Proxy ativo não localizado; nenhuma alteração aplicada.' >&2; exit 1; }
for url in https://hubpages.com.br/health.json https://app.sistera.com.br/api/health https://dev.hubpages.com.br/health.json; do curl -fsS --max-time 20 "$url" >/dev/null; done
candidate="$(mktemp)"
backup="/opt/hubpages-backups/dev/proxy-before-domains-$(date -u +%Y%m%dT%H%M%SZ).caddy"
cp -a "$source_file" "$backup"
chmod 0600 "$backup"
trap 'rm -f -- "$candidate"' EXIT
python3 deploy/custom-domains-proxy.py "$source_file" "$candidate"
if cmp -s "$candidate" "$source_file"; then echo 'Rota de domínios próprios DEV já configurada.'; exit 0; fi
docker cp "$candidate" "$proxy:/tmp/HubPages.DevDomains.Caddyfile"
docker exec "$proxy" caddy validate --adapter caddyfile --config /tmp/HubPages.DevDomains.Caddyfile
cmp -s "$source_file" "$backup" || { echo 'Configuração alterada em paralelo; nenhuma alteração aplicada.' >&2; exit 1; }
restore_proxy(){ tee "$source_file" < "$backup" >/dev/null; docker cp "$backup" "$proxy:/tmp/HubPages.DevDomains.rollback"; docker exec "$proxy" caddy reload --adapter caddyfile --config /tmp/HubPages.DevDomains.rollback --force; }
tee "$source_file" < "$candidate" >/dev/null
if ! docker exec "$proxy" caddy reload --adapter caddyfile --config /tmp/HubPages.DevDomains.Caddyfile --force; then restore_proxy; exit 1; fi
for url in https://hubpages.com.br/health.json https://app.sistera.com.br/api/health https://dev.hubpages.com.br/health.json; do
 if ! curl -fsS --retry 3 --retry-delay 2 --max-time 20 "$url" >/dev/null; then restore_proxy; echo 'Health falhou; somente o acréscimo do proxy foi revertido.' >&2; exit 1; fi
done
echo "Domínios próprios DEV habilitados; sites existentes preservados. Backup: $backup"
