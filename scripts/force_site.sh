#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "=== Checking what exists ==="
docker run --rm -v infra_erpnext_sites:/sites alpine find /sites -type f 2>/dev/null | head -20 || echo "No files"
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "SHOW DATABASES;" 2>/dev/null || true

echo ""
echo "=== Force create site ==="
docker compose run --rm erpnext-backend bench new-site scratchsolid.local --force \
    --db-host erpnext-db \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "admin123" \
    --install-app erpnext \
    --set-default

echo "=== Start all ==="
docker compose up -d

echo "=== Status ==="
sleep 15
docker compose ps | grep erpnext
