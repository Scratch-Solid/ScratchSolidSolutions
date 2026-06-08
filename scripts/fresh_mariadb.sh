#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "=== Stopping ERPNext services ==="
docker compose stop erpnext-backend erpnext-frontend erpnext-websocket erpnext-queue-default erpnext-db

echo "=== Removing MariaDB volume ==="
docker rm -f erpnext_db 2>/dev/null || true
docker volume rm -f infra_erpnext_db_data 2>/dev/null || true

echo "=== Clearing sites ==="
docker run --rm -v erpnext_sites:/sites alpine sh -c 'rm -rf /sites/* /sites/.* 2>/dev/null || true'

echo "=== Starting fresh MariaDB ==="
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

echo "=== Start everything ==="
docker compose up -d

echo "=== Status ==="
sleep 10
docker compose ps
