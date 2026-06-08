#!/bin/bash

echo "=== Check if Administrator API key exists ==="
docker exec erpnext_backend bash -c '
cd /home/frappe/frappe-bench
bench --site scratchsolid.local mysql -e "SELECT name, api_key, api_secret FROM tabUser WHERE name=\"Administrator\"" 2>/dev/null || true
'

echo ""
echo "=== Check site creation logs for admin password ==="
grep -r "admin" /opt/ScratchSolidSolutions/infra/setup.sh 2>/dev/null | head -5 || true

echo ""
echo "=== Check env for default password ==="
grep -i "admin\|pass" /opt/ScratchSolidSolutions/infra/.env 2>/dev/null | head -10 || true

echo ""
echo "=== Generate API key if missing ==="
docker exec erpnext_backend bash -c '
cd /home/frappe/frappe-bench
bench --site scratchsolid.local console << PYEOF
import frappe
user = frappe.get_doc("User", "Administrator")
if not user.api_key:
    from frappe.utils import generate_hash
    user.api_key = generate_hash(length=15)
    user.api_secret = generate_hash(length=15)
    user.save()
    print("API_KEY:", user.api_key)
    print("API_SECRET:", user.api_secret)
else:
    print("API_KEY:", user.api_key)
    print("API_SECRET: (already set)")
PYEOF
' 2>&1 | tail -20
