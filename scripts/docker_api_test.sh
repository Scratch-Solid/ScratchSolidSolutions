#!/bin/bash

echo "=== Query Docker API for n8n config ==="
docker exec scratch_traefik sh -c 'apk add --no-cache curl jq 2>/dev/null || true; curl -s --unix-socket /var/run/docker.sock http://localhost/containers/n8n_orchestrator/json' 2>/dev/null | python3 -c "
import sys, json
try:
    c = json.load(sys.stdin)
    labels = c.get('Config', {}).get('Labels', {})
    traefik = {k:v for k,v in labels.items() if 'traefik' in k}
    print('traefik labels:', traefik)
    print('Networks:', list(c.get('NetworkSettings', {}).get('Networks', {}).keys()))
except Exception as e:
    print('Error:', e)
"

echo ""
echo "=== Query Docker API for uptime-kuma config ==="
docker exec scratch_traefik sh -c 'curl -s --unix-socket /var/run/docker.sock http://localhost/containers/scratch_uptime_kuma/json' 2>/dev/null | python3 -c "
import sys, json
try:
    c = json.load(sys.stdin)
    labels = c.get('Config', {}).get('Labels', {})
    traefik = {k:v for k,v in labels.items() if 'traefik' in k}
    print('traefik labels:', traefik)
    print('Networks:', list(c.get('NetworkSettings', {}).get('Networks', {}).keys()))
except Exception as e:
    print('Error:', e)
"

echo ""
echo "=== Query Docker API for erpnext config ==="
docker exec scratch_traefik sh -c 'curl -s --unix-socket /var/run/docker.sock http://localhost/containers/erpnext_backend/json' 2>/dev/null | python3 -c "
import sys, json
try:
    c = json.load(sys.stdin)
    labels = c.get('Config', {}).get('Labels', {})
    traefik = {k:v for k,v in labels.items() if 'traefik' in k}
    print('traefik labels:', traefik)
    print('Networks:', list(c.get('NetworkSettings', {}).get('Networks', {}).keys()))
except Exception as e:
    print('Error:', e)
"
