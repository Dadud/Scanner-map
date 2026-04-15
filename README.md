# Scanner Map - Refactored

A real-time emergency scanner mapping system with a modern microservices architecture.

## Quick Start (Prebuilt Images)

### Prerequisites

- Docker & Docker Compose v2+
- 2GB+ RAM
- 5GB+ disk space

### 1. Download and Run

**Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/Dadud/Scanner-map/refactor/scripts/install.sh | bash
```

**Windows:**
```powershell
irm https://raw.githubusercontent.com/Dadud/Scanner-map/refactor/scripts/install.ps1 | iex
```

### 2. Configure

Edit the `.env` file with your settings:
```bash
nano .env
```

### 3. Access

Open http://localhost in your browser.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                        │
│                    (Browser - React UI)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         REDIS PUB/SUB                                    │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   scanner-api   │  │ scanner-discord │  │scanner-transcribe│
│   Port: 3000   │  │                 │  │  Port: 8001      │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL (5432) + REDIS (6379)                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Technology | Description |
|---------|------------|-------------|
| **scanner-api** | Fastify + TypeScript | REST API, WebSocket, Authentication |
| **scanner-transcribe** | Python + faster-whisper | Audio transcription |
| **scanner-discord** | TypeScript + discord.js | Discord bot notifications |
| **scanner-ui** | React + Vite + TailwindCSS | Web interface |

## Installation Options

### Option 1: Prebuilt Images (Recommended)

Pull prebuilt images from Docker Hub:

```bash
docker-compose -f docker-compose.prebuilt.yml up -d
```

Or use the installer script:
```bash
curl -fsSL https://raw.githubusercontent.com/Dadud/Scanner-map/refactor/scripts/install.sh | bash
```

### Option 2: Build Locally

Build images on your machine:

```bash
git clone https://github.com/Dadud/Scanner-map.git
cd Scanner-map
docker-compose up -d --build
```

## Docker Hub Images

Prebuilt images are available at:

| Image | URL |
|-------|-----|
| scanner-map-api | docker.io/scannermap/scanner-map-api |
| scanner-map-transcribe | docker.io/scannermap/scanner-map-transcribe |
| scanner-map-ui | docker.io/scannermap/scanner-map-ui |
| scanner-map-discord | docker.io/scannermap/scanner-map-discord |

Tags:
- `latest` - Latest stable release
- `main` - Latest from main branch
- `refactor` - Latest from refactor branch
- `v1.0.0` - Specific version tag

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCORD_TOKEN` | - | Discord bot token |
| `LOCATIONIQ_API_KEY` | - | LocationIQ geocoding |
| `OPENAI_API_KEY` | - | OpenAI for transcription/summaries |
| `POSTGRES_PASSWORD` | scanner | PostgreSQL password |
| `JWT_SECRET` | - | JWT signing secret |
| `ENABLE_AUTH` | false | Enable user authentication |

### Using Custom Docker Hub Organization

```bash
export DOCKERHUB_USERNAME=your-org
docker-compose -f docker-compose.prebuilt.yml up -d
```

## Docker Compose Files

| File | Use Case |
|------|----------|
| `docker-compose.yml` | Local development (builds from source) |
| `docker-compose.prebuilt.yml` | Production deployment (pulls prebuilt) |

## Quick Reference

```bash
# Start services
docker-compose -f docker-compose.prebuilt.yml up -d

# With Discord bot
docker-compose -f docker-compose.prebuilt.yml --profile discord up -d

# View logs
docker-compose -f docker-compose.prebuilt.yml logs -f

# Stop
docker-compose -f docker-compose.prebuilt.yml stop

# Full reset
docker-compose -f docker-compose.prebuilt.yml down -v
```

## Development

### Building Images

```bash
docker-compose build
```

### Running Specific Services

```bash
# API only
docker-compose up -d scanner-api scanner-postgres scanner-redis

# With transcription
docker-compose up -d scanner-api scanner-transcribe scanner-postgres scanner-redis
```

## API Endpoints

- `GET /api/calls` - List calls
- `GET /api/talkgroups` - List talkgroups
- `POST /api/users/login` - Login
- `POST /api/webhook/call-upload` - SDRTrunk upload
- `GET /ws` - WebSocket for real-time updates

## License

MIT