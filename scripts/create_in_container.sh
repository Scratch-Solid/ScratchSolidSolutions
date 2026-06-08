#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "=== Starting just DB and backend without deps ==="
docker compose up -d --no-deps erpnext-db erpnext-redis-cache erpnext-redis-queue erpnext-redis-socketio erpnext-backend

echo "=== Wait for DB ==="
for i in {1..60}; do
    if docker exec erpnext_db mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo "DB ready"
        break
    fi
    sleep 1
done

echo "=== Drop partial DB ==="
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "DROP DATABASE IF EXISTS scratchsolid_local; DROP USER IF EXISTS 'scratchsolid_local'@'%'; FLUSH PRIVILEGES;" 2>/dev/null || true

echo "=== Creating site inside running backend ==="
docker exec erpnext_backend bench new-site scratchsolid.local \
    --db-host erpnext-db \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "admin123" \
    --install-app erpnext \
    --set-default

echo "=== Starting remaining services ==="
docker compose up -d

echo "DONE"
