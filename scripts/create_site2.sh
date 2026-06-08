#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "Creating ERPNext site with explicit db-host..."
docker compose run --rm erpnext-backend bench new-site scratchsolid.local \
    --db-host erpnext-db \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "admin123" \
    --install-app erpnext \
    --set-default

echo "SITE_CREATED"
