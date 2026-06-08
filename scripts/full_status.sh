#!/bin/bash
cd /opt/ScratchSolidSolutions/infra

echo "=== Docker Compose PS ==="
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"

echo ""
echo "=== ERPNext API Test ==="
curl -sk -o /dev/null -w "%{http_code}" -H "Host: erp.scratchsolidsolutions.org" https://localhost/api/method/ping
echo ""

echo ""
echo "=== Cal.com Test ==="
curl -sk -o /dev/null -w "%{http_code}" -H "Host: booking.scratchsolidsolutions.org" https://localhost/api/health || echo "No health endpoint"
curl -sk -o /dev/null -w "%{http_code}" -H "Host: booking.scratchsolidsolutions.org" https://localhost/
echo ""

echo ""
echo "=== n8n Test ==="
curl -sk -o /dev/null -w "%{http_code}" -H "Host: n8n.scratchsolidsolutions.org" https://localhost/healthz || echo ""
curl -sk -o /dev/null -w "%{http_code}" -H "Host: n8n.scratchsolidsolutions.org" https://localhost/
echo ""
