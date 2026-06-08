#!/bin/bash
cd /opt/ScratchSolidSolutions/infra

echo "=== Restart Traefik last ==="
docker compose stop traefik
docker compose rm -f traefik
sleep 2
docker compose up -d traefik

echo ""
echo "=== Wait for Traefik to discover all containers ==="
sleep 20

echo ""
echo "=== Test all routes ==="
for host in erp.scratchsolidsolutions.org booking.scratchsolidsolutions.org n8n.scratchsolidsolutions.org status.scratchsolidsolutions.org; do
    code=$(curl -sk -o /dev/null -w "%{http_code}" --resolve "$host:443:127.0.0.1" "https://$host/")
    echo "$host: $code"
done

echo ""
echo "=== Check Traefik logs for all routers ==="
docker logs scratch_traefik 2>&1 | grep -E "routerName=.*@docker" | head -10
