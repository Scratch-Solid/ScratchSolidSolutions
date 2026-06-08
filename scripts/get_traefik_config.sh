#!/bin/bash

echo "=== Get Traefik raw config ==="
docker exec scratch_traefik wget -qO- http://localhost:8080/api/rawdata 2>/dev/null | python3 -m json.tool 2>/dev/null | head -100 || echo "Failed"

echo ""
echo "=== Get Traefik routers ==="
docker exec scratch_traefik wget -qO- http://localhost:8080/api/http/routers 2>/dev/null | python3 -m json.tool 2>/dev/null | head -100 || echo "Failed"
