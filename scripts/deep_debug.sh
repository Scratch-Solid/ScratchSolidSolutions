#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

echo "=== Sites dir in running backend ==="
docker exec erpnext_backend ls -la /home/frappe/frappe-bench/sites/

echo ""
echo "=== Search for site name ==="
docker exec erpnext_backend find /home/frappe/frappe-bench -name "*scratchsolid*" 2>/dev/null || true

echo ""
echo "=== DB list ==="
DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "SHOW DATABASES;" 2>/dev/null || true

echo ""
echo "=== Bench sites list ==="
docker exec erpnext_backend bench --site scratchsolid.local list-apps 2>&1 || true

echo ""
echo "=== Force with more flags ==="
docker exec erpnext_backend bench new-site scratchsolid.local --force --db-host erpnext-db --mariadb-root-password "${DB_PASS}" --admin-password admin123 --install-app erpnext --set-default 2>&1 || true
