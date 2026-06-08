#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

echo "=== Add Traefik labels to erpnext-backend ==="
python3 << 'PYEOF'
with open('docker-compose.yml', 'r') as f:
    lines = f.readlines()

# Find the erpnext-backend service and add labels before networks:
in_backend = False
insert_idx = None
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped == 'erpnext-backend:':
        in_backend = True
    if in_backend and stripped == 'networks:':
        insert_idx = i
        break

if insert_idx is not None:
    indent = '    '
    labels = [
        f'{indent}labels:\n',
        f'{indent}  - "traefik.enable=true"\n',
        f'{indent}  - "traefik.http.routers.erpnext.rule=Host(`erp.scratchsolidsolutions.org`)"\n',
        f'{indent}  - "traefik.http.routers.erpnext.tls.certresolver=letsencrypt"\n',
        f'{indent}  - "traefik.http.routers.erpnext.entrypoints=websecure"\n',
        f'{indent}  - "traefik.http.services.erpnext.loadbalancer.server.port=8000"\n',
        f'{indent}  - "traefik.http.middlewares.erpnext-site-header.headers.customrequestheaders.X-Frappe-Site-Name=scratchsolid.local"\n',
        f'{indent}  - "traefik.http.routers.erpnext.middlewares=erpnext-site-header"\n',
    ]
    lines = lines[:insert_idx] + labels + lines[insert_idx:]
    print(f"Inserted {len(labels)} lines at line {insert_idx}")
else:
    print("Could not find insertion point")

with open('docker-compose.yml', 'w') as f:
    f.writelines(lines)
PYEOF

echo ""
echo "=== Verify ==="
docker compose config | grep -A 20 "erpnext-backend" | grep -A 10 "labels"

echo ""
echo "=== Restart stack ==="
docker compose up -d

echo ""
echo "=== Test ERPNext through Traefik ==="
sleep 10
curl -s -o /dev/null -w "%{http_code}" -H "Host: erp.scratchsolidsolutions.org" http://localhost/api/method/ping
echo ""
