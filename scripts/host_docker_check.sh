#!/bin/bash

echo "=== All containers with traefik labels ==="
docker ps -q | while read id; do
    name=$(docker inspect --format '{{.Name}}' $id | sed 's/\///')
    has_label=$(docker inspect --format '{{.Config.Labels.traefik.enable}}' $id)
    if [ "$has_label" = "true" ]; then
        echo "$name: traefik.enable=true"
    fi
done

echo ""
echo "=== Check n8n and uptime-kuma container IDs ==="
docker inspect n8n_orchestrator --format '{{.Id}}'
docker inspect scratch_uptime_kuma --format '{{.Id}}'

echo ""
echo "=== Check if Traefik was started before or after n8n/uptime-kuma ==="
docker inspect scratch_traefik --format '{{.State.StartedAt}}'
docker inspect n8n_orchestrator --format '{{.State.StartedAt}}'
docker inspect scratch_uptime_kuma --format '{{.State.StartedAt}}'
