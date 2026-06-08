#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

echo "=== Search entire bench for site name ==="
docker exec erpnext_backend find /home/frappe/frappe-bench -name "*scratchsolid*" -o -name "*currentsite*" 2>/dev/null || true

echo ""
echo "=== All files in sites dir ==="
docker exec erpnext_backend find /home/frappe/frappe-bench/sites -type f 2>/dev/null || true

echo ""
echo "=== Search in container root ==="
docker exec erpnext_backend find / -name "*scratchsolid*" 2>/dev/null | head -20 || true

echo ""
echo "=== Bench version and new-site help ==="
docker exec erpnext_backend bench --version 2>/dev/null || true
docker exec erpnext_backend bench new-site --help 2>/dev/null || true
