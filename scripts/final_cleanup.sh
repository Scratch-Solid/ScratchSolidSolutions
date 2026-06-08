#!/bin/bash

echo "=== Final comprehensive test ==="
echo ""
echo "--- HTTPS routing (valid certificates) ---"
for host in erp.scratchsolidsolutions.org booking.scratchsolidsolutions.org n8n.scratchsolidsolutions.org status.scratchsolidsolutions.org; do
    result=$(curl -s -o /dev/null -w "%{http_code}" --resolve "$host:443:127.0.0.1" "https://$host/" 2>/dev/null)
    echo "$host: $result"
done

echo ""
echo "--- Container health ---"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "erpnext_backend|calcom_engine|n8n_orchestrator|scratch_uptime_kuma|scratch_traefik"

echo ""
echo "--- Traefik routers ---"
docker exec scratch_traefik wget -qO- http://localhost:8080/api/http/routers 2>/dev/null | python3 -c "
import sys, json
routers = json.load(sys.stdin)
for r in routers:
    if r['provider'] == 'docker':
        print(f'{r[\"name\"]}: {r[\"rule\"]}')
"

echo ""
echo "--- Clean up temporary scripts on server ---"
rm -f /tmp/*.sh /tmp/*.py

echo ""
echo "=== All tests complete ==="
