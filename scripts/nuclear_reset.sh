#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "=== Nuclear cleanup ==="
# Stop backend
docker compose stop erpnext-backend erpnext-frontend erpnext-websocket erpnext-queue-default 2>/dev/null || true

# Remove ALL files from sites volume
docker run --rm -v erpnext_sites:/sites alpine sh -c 'rm -rf /sites/* /sites/.* 2>/dev/null; ls -la /sites/'

# Drop DB and user
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "DROP DATABASE IF EXISTS scratchsolid_local; DROP USER IF EXISTS 'scratchsolid_local'@'%'; FLUSH PRIVILEGES;" 2>/dev/null || true

echo "=== Verify clean ==="
docker run --rm -v erpnext_sites:/sites alpine ls -la /sites/

echo "=== Create common_site_config ==="
docker run --rm -v erpnext_sites:/sites alpine sh -c 'mkdir -p /sites && cat > /sites/common_site_config.json <<EOF
{
  "db_host": "erpnext-db",
  "db_port": 3306,
  "redis_cache": "redis://erpnext-redis-cache:6379/0",
  "redis_queue": "redis://erpnext-redis-queue:6379/0",
  "redis_socketio": "redis://erpnext-redis-socketio:6379/0"
}
EOF'

echo "=== Start backend ==="
docker compose up -d --no-deps erpnext-backend

echo "=== Wait for backend to start ==="
sleep 5

echo "=== Create site ==="
docker exec erpnext_backend bench new-site scratchsolid.local \
    --db-host erpnext-db \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "admin123" \
    --install-app erpnext \
    --set-default

echo "SITE_CREATED"
