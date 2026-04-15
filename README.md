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

## Verification

Run the verification script from the repo root:

```bash
# Linux/macOS
./scripts/verify.sh

# Windows PowerShell
./scripts/verify.ps1

# Allow running while you still have local edits
./scripts/verify.ps1 -AllowDirtyWorktree
```

What it checks:

1. clean git worktree
2. latest successful `Build and Push Images` workflow for the current commit, when `gh` is available
3. local service builds, when Node and Python are installed
4. compose file validation, when Docker is installed

GitHub Actions also runs `Verify Refactor` automatically on pushes to `main` and `refactor`, plus pull requests to `main`.

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
