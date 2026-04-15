# Scanner Map

Real-time emergency scanner mapping system with modern microservices architecture.

## Quick Start

```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/Dadud/Scanner-map/refactor/scripts/install.sh | bash

# Windows
irm https://raw.githubusercontent.com/Dadud/Scanner-map/refactor/scripts/install.ps1 | iex
```

## Architecture

```
React UI (Port 80) → Fastify API (Port 3000) → PostgreSQL
       ↓                    ↓
   WebSocket           Redis Pub/Sub
       ↓                    ↓
  scanner-ui      scanner-transcribe (Python)
                        ↓
                  faster-whisper
```

## Services

| Service | Image | Description |
|---------|-------|-------------|
| scanner-api | `ghcr.io/Dadud/scanner-map-api` | Fastify REST API + WebSocket |
| scanner-transcribe | `ghcr.io/Dadud/scanner-map-transcribe` | Python transcription |
| scanner-ui | `ghcr.io/Dadud/scanner-map-ui` | React frontend |
| scanner-discord | `ghcr.io/Dadud/scanner-map-discord` | Discord bot (optional) |

## Usage

```bash
# Start all services
docker-compose up -d

# With Discord bot
docker-compose --profile discord up -d

# View logs
docker-compose logs -f
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCORD_TOKEN` | - | Discord bot token |
| `LOCATIONIQ_API_KEY` | - | Geocoding |
| `OPENAI_API_KEY` | - | AI features |
| `POSTGRES_PASSWORD` | scanner | Database password |
| `JWT_SECRET` | - | JWT signing secret |

## GitHub Container Registry

Images are automatically built and pushed to ghcr.io on every push to main/refactor branches.

Tags: `latest`, `main`, `refactor`, `v1.0.0`