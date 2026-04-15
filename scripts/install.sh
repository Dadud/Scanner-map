#!/bin/bash
set -e

GITHUB_ORG="${GITHUB_ORG:-Dadud}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "=== Scanner Map Installer ==="
echo "Registry: ghcr.io/${GITHUB_ORG}"
echo ""

if ! command -v docker &> /dev/null; then
    echo "Docker is required. Install: https://docs.docker.com/get-docker/"; exit 1
fi

cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
DISCORD_TOKEN=
DISCORD_ALERT_CHANNEL_ID=
DISCORD_SUMMARY_CHANNEL_ID=
LOCATIONIQ_API_KEY=
OPENAI_API_KEY=
POSTGRES_PASSWORD=change_this_password
JWT_SECRET=change_this_random_string
EOF
    echo "Created .env - please edit with your values"
    read -p "Press Enter when done..."
fi

echo "Pulling images..."
for img in api transcribe ui; do
    docker pull "ghcr.io/${GITHUB_ORG}/scanner-map-${img}:${IMAGE_TAG}" 2>/dev/null || true
done

export GITHUB_ORG IMAGE_TAG
docker-compose up -d

echo ""
echo "Scanner Map running at http://localhost"