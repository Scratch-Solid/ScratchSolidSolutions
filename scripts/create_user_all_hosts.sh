#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

DB_PASS=$(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2)

echo "=== Create user with wildcard host ==="
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "CREATE USER '_f37c3225f30b79d2'@'%' IDENTIFIED BY 'feX9JlfSi9vTZ14v';" 2>&1 || true

echo ""
echo "=== Grant privileges ==="
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "GRANT ALL PRIVILEGES ON _f37c3225f30b79d2.* TO '_f37c3225f30b79d2'@'%'; FLUSH PRIVILEGES;" 2>&1

echo ""
echo "=== Verify user exists ==="
docker exec erpnext_db mysql -uroot -p"${DB_PASS}" -e "SELECT User, Host FROM mysql.user WHERE User = '_f37c3225f30b79d2';" 2>&1

echo ""
echo "=== Test connection ==="
docker exec erpnext_db mysql -u'_f37c3225f30b79d2' -p'feX9JlfSi9vTZ14v' -e "SELECT 1 as ok;" 2>&1

echo ""
echo "=== Restart backend ==="
docker compose restart erpnext-backend
sleep 15

echo ""
echo "=== Test ping ==="
docker exec erpnext_backend bash -c 'python3 -c "import urllib.request; req = urllib.request.Request(\"http://localhost:8000/api/method/ping\", headers={\"Host\": \"scratchsolid.local\"}); r = urllib.request.urlopen(req); print(r.read())"' 2>&1 || true

echo ""
echo "=== Health status ==="
docker inspect --format='{{.State.Health.Status}}' erpnext_backend
