#!/bin/bash
set -e

echo "=== Scanner Map Quick Installer ==="
echo ""

DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-scannermap}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="${DOCKERHUB_USERNAME}/scanner-map"

echo "Configuration:"
echo "  Docker Hub: ${DOCKERHUB_USERNAME}"
echo "  Image Tag: ${IMAGE_TAG}"
echo ""

if ! command -v docker &> /dev/null; then
    echo "Docker is not installed!"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose is not installed!"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

DOCKER_COMPOSE="docker-compose"
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# Scanner Map Configuration
# Replace these values with your own

# Discord Bot (required for Discord features)
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_ALERT_CHANNEL_ID=your_alert_channel_id
DISCORD_SUMMARY_CHANNEL_ID=your_summary_channel_id

# Geocoding (optional - for address lookup)
LOCATIONIQ_API_KEY=your_locationiq_api_key_here

# AI Features (optional)
OPENAI_API_KEY=your_openai_api_key_here

# Database (defaults are fine for most users)
POSTGRES_USER=scanner
POSTGRES_PASSWORD=change_this_password
POSTGRES_DB=scanner

# Security
JWT_SECRET=change_this_to_a_random_string
EOF
    echo ".env file created. Please edit it and add your configuration values."
    echo ""
    read -p "Press Enter when ready to continue..."
fi

echo "Pulling prebuilt images from Docker Hub..."
echo ""

echo "  Pulling scanner-map-api..."
docker pull "${IMAGE_NAME}-api:${IMAGE_TAG}" || echo "  Failed to pull scanner-map-api"

echo "  Pulling scanner-map-transcribe..."
docker pull "${IMAGE_NAME}-transcribe:${IMAGE_TAG}" || echo "  Failed to pull scanner-map-transcribe"

echo "  Pulling scanner-map-ui..."
docker pull "${IMAGE_NAME}-ui:${IMAGE_TAG}" || echo "  Failed to pull scanner-map-ui"

echo ""
echo "Starting Scanner Map..."
echo ""

export DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME}"
export IMAGE_TAG="${IMAGE_TAG}"

if [ -f "docker-compose.prebuilt.yml" ]; then
    $DOCKER_COMPOSE -f docker-compose.prebuilt.yml up -d
else
    $DOCKER_COMPOSE up -d
fi

echo ""
echo "=== Scanner Map is starting! ==="
echo ""
echo "Access the application at: http://localhost"
echo ""
echo "Useful commands:"
echo "  View logs:    $DOCKER_COMPOSE logs -f"
echo "  Stop:        $DOCKER_COMPOSE stop"
echo "  Restart:     $DOCKER_COMPOSE restart"
echo "  Full reset:  $DOCKER_COMPOSE down -v"
echo ""