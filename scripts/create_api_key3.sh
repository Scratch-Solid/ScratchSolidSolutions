#!/bin/bash

cat << 'PYEOF' > /tmp/api_key_gen.py
import frappe
from frappe.utils import generate_hash

frappe.init(site="scratchsolid.local")
frappe.connect()

user = frappe.get_doc("User", "Administrator")
if not user.api_key:
    user.api_key = generate_hash(length=15)
    api_secret = generate_hash(length=15)
    user.api_secret = api_secret
    user.save()
    frappe.db.commit()
    print(f"API_KEY={user.api_key}")
    print(f"API_SECRET={api_secret}")
else:
    print(f"API_KEY={user.api_key}")
    print("API_SECRET=already_set")

frappe.destroy()
PYEOF

docker cp /tmp/api_key_gen.py erpnext_backend:/tmp/api_key_gen.py

docker exec erpnext_backend bash -c '
cd /home/frappe/frappe-bench
/home/frappe/frappe-bench/env/bin/python /tmp/api_key_gen.py
'
