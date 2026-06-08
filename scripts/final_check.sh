#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

echo "=== Wait for backend health ==="
for i in {1..30}; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' erpnext_backend 2>/dev/null || echo "none")
    if [ "${STATUS}" = "healthy" ]; then
        echo "BACKEND HEALTHY"
        break
    fi
    echo "Health: ${STATUS}"
    if [ "$i" -eq 30 ]; then
        echo "Timeout waiting for healthy"
    fi
    sleep 5
done

echo ""
echo "=== Start all services ==="
docker compose up -d

echo ""
echo "=== All container status ==="
sleep 10
docker compose ps | grep -E '(erpnext|calcom|n8n|traefik|uptime)'

echo ""
echo "=== Verify script ==="
./verify.sh --json 2>/dev/null || true
