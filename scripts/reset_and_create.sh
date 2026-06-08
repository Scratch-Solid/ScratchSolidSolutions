#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "=== Dropping existing database if any ==="
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "DROP DATABASE IF EXISTS scratchsolid_local;" 2>/dev/null || true
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "DROP USER IF EXISTS 'scratchsolid_local'@'%';" 2>/dev/null || true
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "FLUSH PRIVILEGES;" 2>/dev/null || true

echo "=== Clearing sites volume ==="
docker run --rm -v erpnext_sites:/sites alpine sh -c "rm -rf /sites/*" 2>/dev/null || true

echo "=== Creating ERPNext site ==="
docker compose run --rm erpnext-backend bench new-site scratchsolid.local \
    --db-host erpnext-db \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "admin123" \
    --install-app erpnext \
    --set-default

echo "=== Verifying site ==="
docker run --rm -v erpnext_sites:/sites alpine ls -la /sites/

echo "=== Starting all ERPNext services ==="
docker compose up -d erpnext-backend erpnext-frontend erpnext-websocket erpnext-queue-default

echo "SITE_CREATED_AND_STARTED"
