#!/bin/bash

echo "=== ERPNext labels ==="
docker inspect erpnext_backend --format '{{json .Config.Labels}}' | python3 -m json.tool

echo ""
echo "=== Calcom labels ==="
docker inspect calcom_engine --format '{{json .Config.Labels}}' | python3 -m json.tool

echo ""
echo "=== n8n labels ==="
docker inspect n8n_orchestrator --format '{{json .Config.Labels}}' | python3 -m json.tool

echo ""
echo "=== uptime-kuma labels ==="
docker inspect scratch_uptime_kuma --format '{{json .Config.Labels}}' | python3 -m json.tool
