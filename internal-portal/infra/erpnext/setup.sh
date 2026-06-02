#!/bin/bash
set -e

# ERPNext Self-Hosted Setup Script
# Usage: ./setup.sh

echo "========================================"
echo "  Scratch Solid ERPNext Setup"
echo "========================================"

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Ensure .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example ..."
    cp .env.example .env
    echo "WARNING: Please edit .env and set secure passwords before proceeding."
    exit 1
fi

# Source env vars for site creation
set -a
source .env
set +a

SITE_NAME=${SITE_NAME:-scratchsolid.local}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
INSTALL_APPS=${INSTALL_APPS:-erpnext}

echo ""
echo "Starting infrastructure (MariaDB + Redis services)..."
docker compose up -d db redis-cache redis-queue redis-socketio

echo ""
echo "Waiting for MariaDB to be ready (this may take 30-60 seconds)..."
for i in {1..60}; do
    if docker compose exec -T db mysqladmin ping -h localhost --silent; then
        echo "MariaDB is ready."
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo "Error: MariaDB failed to start within 60 seconds."
        exit 1
    fi
    sleep 1
done

echo ""
echo "Starting backend services..."
docker compose up -d backend queue-default queue-short queue-long scheduler websocket

echo ""
echo "Creating ERPNext site: $SITE_NAME ..."
docker compose exec -T backend bench new-site $SITE_NAME \
    --mariadb-root-password "$MYSQL_ROOT_PASSWORD" \
    --admin-password "$ADMIN_PASSWORD" \
    --install-app erpnext \
    --set-default

# Install additional apps if specified
for app in $INSTALL_APPS; do
    if [ "$app" != "erpnext" ]; then
        echo "Installing app: $app"
        docker compose exec -T backend bench --site $SITE_NAME install-app $app || true
    fi
done

echo ""
echo "Starting frontend (nginx)..."
docker compose up -d frontend

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "ERPNext is available at: http://localhost:8080"
echo "Site: $SITE_NAME"
echo "Admin Password: $ADMIN_PASSWORD"
echo ""
echo "Next steps:"
echo "  1. Configure your company in ERPNext"
echo "  2. Create an API key/secret for integration"
echo "  3. Update internal-portal .env with ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f backend"
echo "  docker compose exec backend bench --site $SITE_NAME list-users"
echo ""
