#!/bin/bash
cd /opt/ScratchSolidSolutions/infra

echo "=== Recreate Traefik ==="
docker compose up -d scratch_traefik --force-recreate

echo ""
echo "=== Wait for network join ==="
sleep 10

echo ""
echo "=== Test DNS ==="
docker exec scratch_traefik wget -qO- http://erpnext-backend:8000/api/method/ping 2>&1 || true

echo ""
echo "=== Test HTTPS via Traefik ==="
curl -sk -o /dev/null -w "%{http_code}\n" -H "Host: erp.scratchsolidsolutions.org" https://localhost/api/method/ping
