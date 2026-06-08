#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

# Start DB and Redis first
echo "Starting DB and Redis..."
docker compose up -d erpnext-db erpnext-redis-cache erpnext-redis-queue erpnext-redis-socketio

echo "Waiting for MariaDB..."
for i in {1..60}; do
    if docker exec erpnext_db mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo "MariaDB ready"
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo "MariaDB timeout"
        exit 1
    fi
    sleep 1
done

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "Creating ERPNext site..."
docker compose run --rm erpnext-backend bench new-site scratchsolid.local \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "admin123" \
    --install-app erpnext \
    --set-default

echo "SITE_CREATED"
