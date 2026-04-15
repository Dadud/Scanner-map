#!/bin/bash
set -e

echo "=== Scanner Map Docker Setup ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp "${REPO_ROOT}/.env.example" "${REPO_ROOT}/.env"
    echo ""
    echo "IMPORTANT: Please edit .env and add your configuration values:"
    echo "  - DISCORD_TOKEN (required for Discord bot)"
    echo "  - DATABASE_URL (uses PostgreSQL credentials)"
    echo "  - REDIS_URL (uses Redis)"
    echo "  - LOCATIONIQ_API_KEY or GOOGLE_MAPS_API_KEY (for geocoding)"
    echo ""
    read -p "Press Enter when you've configured .env..."
else
    echo ".env already exists, using existing configuration."
fi

echo ""
echo "Starting Docker services..."

docker network create scanner-network 2>/dev/null || true

docker-compose up -d scanner-postgres scanner-redis

echo ""
echo "Waiting for database to be ready..."
sleep 10

docker-compose up -d scanner-api scanner-transcribe

echo ""
echo "Initializing database..."
docker-compose exec -T scanner-api npx prisma db push --accept-data-loss 2>/dev/null || true

echo ""
echo "Starting UI..."
docker-compose up -d scanner-ui

echo ""
echo "=== Scanner Map is starting up ==="
echo ""
echo "Services:"
echo "  UI:        http://localhost"
echo "  API:       http://localhost:3000"
echo "  API Docs:  http://localhost:3000/docs"
echo ""
echo "To enable Discord bot, run:"
echo "  docker-compose --profile discord up -d"
echo ""
echo "View logs with:"
echo "  docker-compose logs -f"
echo ""
