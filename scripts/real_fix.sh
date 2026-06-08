#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "=== Stopping all ERPNext ==="
docker compose stop erpnext-backend erpnext-frontend erpnext-websocket erpnext-queue-default erpnext-db erpnext-redis-cache erpnext-redis-queue erpnext-redis-socketio

echo "=== Removing containers ==="
docker rm -f erpnext_backend erpnext_frontend erpnext_websocket erpnext_queue_default erpnext_db 2>/dev/null || true

echo "=== Removing volumes with correct names ==="
docker volume rm -f infra_erpnext_db_data infra_erpnext_sites infra_erpnext_logs 2>/dev/null || true

echo "=== Verify volumes removed ==="
docker volume ls | grep erpnext || true

echo "=== Starting fresh DB ==="
docker compose up -d erpnext-db

echo "=== Wait for MariaDB ==="
for i in {1..90}; do
    if docker exec erpnext_db mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo "MariaDB ready"
        break
    fi
    sleep 1
done

echo "=== Create site ==="
docker compose run --rm erpnext-backend bench new-site scratchsolid.local \
    --db-host erpnext-db \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "admin123" \
    --install-app erpnext \
    --set-default

echo "=== Start all ERPNext ==="
docker compose up -d erpnext-backend erpnext-frontend erpnext-websocket erpnext-queue-default

echo "=== Check status ==="
sleep 10
docker compose ps | grep erpnext

echo "DONE"
