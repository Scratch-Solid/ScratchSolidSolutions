#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

echo "=== Gunicorn access log ==="
docker exec erpnext_backend cat /home/frappe/frappe-bench/logs/web.log 2>/dev/null | tail -20 || true

echo ""
echo "=== Gunicorn error log ==="
docker exec erpnext_backend cat /home/frappe/frappe-bench/logs/web.error.log 2>/dev/null | tail -30 || true

echo ""
echo "=== Site error log ==="
docker exec erpnext_backend cat /home/frappe/frappe-bench/sites/scratchsolid.local/logs/error.log 2>/dev/null | tail -30 || true

echo ""
echo "=== All log files ==="
docker exec erpnext_backend find /home/frappe/frappe-bench/sites/scratchsolid.local/logs -type f 2>/dev/null || true
docker exec erpnext_backend find /home/frappe/frappe-bench/logs -type f 2>/dev/null || true

echo ""
echo "=== Check if there are startup errors ==="
docker logs erpnext_backend --tail 40
