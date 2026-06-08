#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "=== Ensure DB is accepting TCP ==="
for i in {1..120}; do
    if docker exec erpnext_db bash -c "mysql -h erpnext-db -P 3306 -uroot -p'${DB_PASS}' -e 'SELECT 1;'" 2>/dev/null; then
        echo "DB accepting TCP connections"
        break
    fi
    if [ "$i" -eq 120 ]; then
        echo "DB TCP timeout"
        exit 1
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

echo "=== Start all ==="
docker compose up -d

echo "=== Status ==="
sleep 15
docker compose ps | grep erpnext
