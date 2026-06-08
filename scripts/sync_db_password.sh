#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)
SITE_CONFIG=$(docker run --rm -v infra_erpnext_sites:/sites alpine cat /sites/scratchsolid.local/site_config.json 2>/dev/null || echo '{}')
DB_NAME=$(echo "$SITE_CONFIG" | grep -o '"db_name": "[^"]*"' | cut -d'"' -f4 || echo "")
DB_PW=$(echo "$SITE_CONFIG" | grep -o '"db_password": "[^"]*"' | cut -d'"' -f4 || echo "")

echo "Current DB Name: ${DB_NAME}"
echo "Current DB Password from config: ${DB_PW}"

echo ""
echo "=== Reset DB password to match current site_config ==="
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "ALTER USER '${DB_NAME}'@'%' IDENTIFIED BY '${DB_PW}'; FLUSH PRIVILEGES;" 2>/dev/null || true

echo ""
echo "=== Verify connection ==="
docker exec erpnext_db mysql -u"${DB_NAME}" -p"${DB_PW}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${DB_NAME}';" 2>/dev/null || true

echo ""
echo "=== Restart backend ==="
docker compose restart erpnext-backend
sleep 10

echo ""
echo "=== Test ping ==="
docker exec erpnext_backend bash -c 'python3 -c "import urllib.request; req = urllib.request.Request(\"http://localhost:8000/api/method/ping\", headers={\"Host\": \"scratchsolid.local\"}); r = urllib.request.urlopen(req); print(r.read())"' 2>&1 || true

echo ""
echo "=== Health status ==="
docker inspect --format='{{.State.Health.Status}}' erpnext_backend
