#!/bin/bash

echo "=== Wait for Traefik to pick up uptime-kuma ==="
sleep 15

echo ""
echo "=== All Traefik routers ==="
docker exec scratch_traefik wget -qO- http://localhost:8080/api/http/routers 2>/dev/null | python3 -c "
import sys, json
routers = json.load(sys.stdin)
for r in routers:
    print(f'{r[\"name\"]} ({r[\"provider\"]})')
"

echo ""
echo "=== Test all HTTPS routes ==="
for host in erp.scratchsolidsolutions.org booking.scratchsolidsolutions.org n8n.scratchsolidsolutions.org status.scratchsolidsolutions.org; do
    code=$(curl -sk -o /dev/null -w "%{http_code}" --resolve "$host:443:127.0.0.1" "https://$host/")
    echo "$host: $code"
done

echo ""
echo "=== Check container health ==="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "erpnext|calcom|n8n|uptime|traefik"
