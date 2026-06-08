#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

# Show erpnext_backend service definition
echo "=== ERPNext Backend Config ==="
grep -A 40 "erpnext_backend:" docker-compose.yml

# Show health check
echo ""
echo "=== Health Checks ==="
grep -B 2 -A 5 "healthcheck" docker-compose.yml | grep -A 5 "erpnext" || true

# Start just DB first
echo ""
echo "=== Starting MariaDB ==="
docker compose up -d erpnext-db

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

echo ""
echo "=== Creating ERPNext Site ==="
# Run new-site in backend container (it may not be running, so we run it directly)
docker compose run --rm erpnext_backend bench new-site scratchsolid.local \
    --mariadb-root-password "${DB_PASS}" \
    --admin-password "admin123" \
    --install-app erpnext \
    --set-default || true

echo "SITE_CREATION_ATTEMPTED"
