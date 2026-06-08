#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

echo "=== Full nuclear reset ==="
docker compose down --remove-orphans 2>/dev/null || true
docker volume prune -f

echo "=== Remove ALL erpnext volumes explicitly ==="
for vol in $(docker volume ls -q | grep erpnext); do
    docker volume rm -f "$vol" 2>/dev/null || echo "Could not remove $vol"
done

docker volume ls | grep erpnext || echo "No erpnext volumes"

echo "=== Start fresh ==="
docker compose up -d erpnext-db

echo "=== Wait for MariaDB ==="
for i in {1..90}; do
    if docker exec erpnext_db mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo "MariaDB ready"
        break
    fi
    sleep 1
done

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "=== Create site fresh ==="
docker compose run --rm erpnext-backend bench new-site scratchsolid.local \
    --db-host erpnext-db \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "admin123" \
    --install-app erpnext \
    --set-default

echo "=== Start all ERPNext ==="
docker compose up -d

echo "=== Final status ==="
sleep 15
docker compose ps | grep erpnext
