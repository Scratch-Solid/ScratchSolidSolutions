#!/bin/bash

docker exec erpnext_backend bash -c '
cd /home/frappe/frappe-bench
bench --site scratchsolid.local execute frappe.utils.password.get_decrypted_password --args "[\"User\", \"Administrator\", \"api_secret\"]" 2>/dev/null || true
'

echo ""
echo "=== Generate API key via execute ==="
docker exec erpnext_backend bash -c '
cd /home/frappe/frappe-bench
bench --site scratchsolid.local execute "frappe.get_doc(\"User\", \"Administrator\").api_key" 2>/dev/null || true
'

echo ""
echo "=== Check API key in database ==="
docker exec erpnext_backend bash -c '
cd /home/frappe/frappe-bench
bench --site scratchsolid.local mysql -e "SELECT name, api_key FROM tabUser WHERE name=\"Administrator\"" 2>/dev/null || true
'
