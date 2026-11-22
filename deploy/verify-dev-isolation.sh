#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$EUID" -eq 0 && "$PWD" == /opt/hubpages-src-dev && "$(git branch --show-current)" == develop ]] || exit 1
for name in hubpages_dev-hubpages-dev-1 hubpages_dev-hubpages-db-1 hubpages_prod-hubpages-prod-1 hubpages_prod-hubpages-db-1; do
 docker inspect --format '{"name":{{json .Name}},"labels":{{json .Config.Labels}},"mounts":{{json .Mounts}},"networks":{{json .NetworkSettings.Networks}},"ports":{{json .HostConfig.PortBindings}}}' "$name"
done | python3 deploy/dev-isolation.py
docker exec -i hubpages_dev-hubpages-dev-1 node --input-type=module < server/audit-dev-saas.mjs
