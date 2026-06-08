#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

echo "=== Environment from compose config ==="
docker compose config | grep -A 20 "erpnext-backend:" | grep -E "(DB_|REDIS|ENV)" || true

echo ""
echo "=== Running env dump ==="
docker compose run --rm erpnext-backend env | grep -E "(DB_|HOST|ROOT)" || true
