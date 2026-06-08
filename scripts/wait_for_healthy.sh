#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

echo "=== Waiting for backend to become healthy ==="
for i in {1..60}; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' erpnext_backend 2>/dev/null || echo "none")
    echo "Health status: ${STATUS}"
    if [ "${STATUS}" = "healthy" ]; then
        echo "BACKEND HEALTHY"
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo "Backend health check timeout"
        docker logs erpnext_backend --tail 20
        exit 1
    fi
    sleep 3
done

echo ""
echo "=== Start all services ==="
docker compose up -d

echo ""
echo "=== Final status ==="
sleep 10
docker compose ps
