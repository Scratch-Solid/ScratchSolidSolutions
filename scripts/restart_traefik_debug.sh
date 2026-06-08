#!/bin/bash
cd /opt/ScratchSolidSolutions/infra

echo "=== Restart Traefik with debug log ==="
docker compose stop traefik
docker compose rm -f traefik

echo ""
echo "=== Update Traefik to enable API and debug logs ==="
python3 << 'PYEOF'
with open('docker-compose.yml', 'r') as f:
    content = f.read()

# Find the traefik command and add --api.insecure=true and --log.level=DEBUG
old = '--api.dashboard=false'
new = '--api.dashboard=false\n      - "--api.insecure=true"\n      - "--log.level=DEBUG"'

if old in content:
    content = content.replace(old, new, 1)
    print("Updated Traefik config")
else:
    print("Could not find pattern")

with open('docker-compose.yml', 'w') as f:
    f.write(content)
PYEOF

docker compose up -d traefik

echo ""
echo "=== Wait for Traefik to start ==="
sleep 10

echo ""
echo "=== Check Traefik routers via API ==="
curl -s http://localhost:8080/api/http/routers | python3 -m json.tool 2>/dev/null | grep -E '"name"|"rule"|"service"|"status"' | head -40 || true

echo ""
echo "=== Check Traefik services via API ==="
curl -s http://localhost:8080/api/http/services | python3 -m json.tool 2>/dev/null | grep -E '"name"|"status"' | head -30 || true
