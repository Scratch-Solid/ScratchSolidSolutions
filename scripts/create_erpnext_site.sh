#!/bin/bash
set -euo pipefail

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD /opt/ScratchSolidSolutions/infra/.env | cut -d= -f2)
ADMIN_PASS=$(grep ADMIN_PASSWORD /opt/ScratchSolidSolutions/infra/.env | cut -d= -f2 || echo "admin")

cd /opt/ScratchSolidSolutions/infra

# Wait for MariaDB to be ready
echo "Waiting for MariaDB..."
until docker exec erpnext_db mysqladmin ping -h localhost -p"${DB_PASS}" --silent 2>/dev/null; do
    sleep 2
done
echo "MariaDB ready"

# Create site
echo "Creating ERPNext site..."
docker compose exec -T erpnext_backend bench new-site scratchsolid.local \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "${ADMIN_PASS}" \
    --db-root-username root \
    --install-app erpnext \
    --set-default

echo "SITE_CREATED"
