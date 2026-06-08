#!/bin/bash
cd /opt/ScratchSolidSolutions/infra

echo "=== Restart Traefik with HTTP-01 challenge ==="
docker compose stop traefik
docker compose rm -f traefik
docker compose up -d traefik

echo ""
echo "=== Wait for Traefik to start ==="
sleep 20

echo ""
echo "=== Check Traefik process ==="
docker exec scratch_traefik ps aux | grep traefik

echo ""
echo "=== Check for ACME errors ==="
docker logs scratch_traefik 2>&1 | grep -iE "ACME|certificate|challenge|rate" | tail -20
