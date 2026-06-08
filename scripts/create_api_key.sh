#!/bin/bash

echo "=== Create API Key ==="
docker exec erpnext_backend bash -c '
cd /home/frappe/frappe-bench
bench --site scratchsolid.local execute "
import frappe
from frappe.utils import generate_hash
user = frappe.get_doc(\"User\", \"Administrator\")
if not user.api_key:
    user.api_key = generate_hash(length=15)
    api_secret = generate_hash(length=15)
    user.api_secret = api_secret
    user.save()
    frappe.db.commit()
    print(\"API_KEY:\", user.api_key)
    print(\"API_SECRET:\", api_secret)
else:
    print(\"API_KEY:\", user.api_key)
    print(\"API_SECRET: already set\")
" 2>&1
'
