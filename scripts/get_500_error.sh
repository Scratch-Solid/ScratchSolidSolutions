#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

echo "=== Frappe error logs ==="
docker exec erpnext_backend cat /home/frappe/frappe-bench/sites/scratchsolid.local/logs/error.log 2>/dev/null | tail -50 || true

echo ""
echo "=== Worker logs ==="
docker exec erpnext_backend cat /home/frappe/frappe-bench/sites/scratchsolid.local/logs/worker.log 2>/dev/null | tail -20 || true

echo ""
echo "=== Check redis connectivity ==="
docker exec erpnext_backend python3 -c "import redis; r = redis.from_url('redis://erpnext-redis-cache:6379/0'); print(r.ping())" 2>&1 || true

echo ""
echo "=== Check db connectivity from bench ==="
docker exec erpnext_backend bench --site scratchsolid.local console -c "print(frappe.db.sql('SELECT 1'))" 2>&1 || true
