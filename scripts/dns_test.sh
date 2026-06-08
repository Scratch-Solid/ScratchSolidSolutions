#!/bin/bash

echo "=== Test erpnext_backend ==="
docker exec scratch_traefik nslookup erpnext_backend 127.0.0.11 2>/dev/null || true

echo ""
echo "=== Test scratch_traefik from backend ==="
docker exec erpnext_backend nslookup scratch_traefik 127.0.0.11 2>/dev/null || true

echo ""
echo "=== Check all containers on scratch_internal ==="
docker network inspect infra_scratch_internal --format '{{range .Containers}}{{.Name}} {{end}}'

echo ""
echo "=== Check Docker provider config in Traefik ==="
docker exec scratch_traefik cat /etc/traefik/traefik.yml 2>/dev/null || docker exec scratch_traefik cat /etc/traefik/traefik.toml 2>/dev/null || true
