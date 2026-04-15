# Scanner Map - Refactored

A real-time emergency scanner mapping system with a modern microservices architecture.

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
│                    (Event Bus / Real-time)                               │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   scanner-api   │  │ scanner-discord │  │scanner-transcribe│
│   (Fastify)     │  │   (Discord)     │  │  (Python)        │
│   Port: 3000    │  │                 │  │  Port: 8001      │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL                                      │
│                         Port: 5432                                      │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │     REDIS       │
                    │   Port: 6379    │
                    └─────────────────┘
```

## Services

| Service | Technology | Description |
|---------|------------|-------------|
| **scanner-api** | Fastify + TypeScript + Prisma | REST API, WebSocket, Authentication |
| **scanner-transcribe** | Python + faster-whisper | Audio transcription with tone detection |
| **scanner-discord** | TypeScript + discord.js | Discord bot notifications |
| **scanner-ui** | React + Vite + TailwindCSS | Web interface with Leaflet map |

## Quick Start

### Prerequisites

- Docker & Docker Compose v2+
- 4GB+ RAM recommended
- 10GB+ disk space

### 1. Clone and Configure

```bash
git clone https://github.com/Dadud/Scanner-map.git
cd Scanner-map
cp .env.example .env
```

### 2. Edit .env Configuration

```bash
# Required
DISCORD_TOKEN=your_discord_bot_token

# Optional - Geocoding
LOCATIONIQ_API_KEY=your_locationiq_api_key

# Optional - AI features
OPENAI_API_KEY=your_openai_api_key
```

### 3. Start Services

```bash
# Linux/macOS
./scripts/start.sh

# Windows (PowerShell)
.\scripts\start.ps1

# Or manually with Docker Compose
docker-compose up -d
```

### 4. Access the Application

- **Web UI**: http://localhost
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | Database connection |
| `REDIS_URL` | Redis connection string | Redis connection |
| `DISCORD_TOKEN` | - | Discord bot token |
| `LOCATIONIQ_API_KEY` | - | LocationIQ geocoding |
| `GOOGLE_MAPS_API_KEY` | - | Google Maps geocoding |
| `TRANSCRIPTION_MODE` | `local` | Transcription mode |
| `WHISPER_MODEL` | `base` | Whisper model size |
| `ENABLE_AUTH` | `false` | Enable authentication |
| `ENABLE_TONE_DETECTION` | `false` | Enable tone detection |

### Using Google Maps

If using Google Maps instead of LocationIQ:

```bash
GEOCODING_PROVIDER=google
GOOGLE_MAPS_API_KEY=your_api_key
```

### Using Remote Transcription

```bash
TRANSCRIPTION_MODE=remote
FASTER_WHISPER_URL=http://your-transcription-server:8001
```

## Docker Compose Profiles

```bash
# Core services only (API, UI, PostgreSQL, Redis)
docker-compose up -d

# Include Discord bot
docker-compose --profile discord up -d
```

## Services

### Core Services

| Service | Port | Description |
|---------|------|-------------|
| scanner-ui | 80 | Web interface |
| scanner-api | 3000 | REST API + WebSocket |
| scanner-postgres | 5432 | PostgreSQL database |
| scanner-redis | 6379 | Redis cache/pub-sub |

### Optional Services

| Service | Port | Description |
|---------|------|-------------|
| scanner-transcribe | 8001 | Local transcription |
| scanner-discord | - | Discord bot |

## API Endpoints

### Calls

- `GET /api/calls` - List calls with pagination
- `GET /api/calls/:id` - Get single call
- `POST /api/calls` - Create call
- `PUT /api/calls/:id` - Update call
- `DELETE /api/calls/:id` - Delete call

### Talkgroups

- `GET /api/talkgroups` - List talkgroups
- `GET /api/talkgroups/:id` - Get talkgroup with recent calls
- `POST /api/talkgroups` - Create/upsert talkgroup
- `POST /api/talkgroups/bulk` - Bulk import

### Users

- `POST /api/users/register` - Register user
- `POST /api/users/login` - Login
- `POST /api/users/logout` - Logout

### Admin

- `PUT /api/admin/markers/:id/location` - Update marker location
- `DELETE /api/admin/markers/:id` - Delete marker
- `POST /api/admin/calls/purge` - Purge old calls
- `GET/POST/DELETE /api/admin/keywords` - Manage keyword alerts

### Webhook

- `POST /api/webhook/call-upload` - SDRTrunk/TrunkRecorder upload

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

# Full stack
docker-compose up -d
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f scanner-api
```

## Data Persistence

Volumes are mounted for:
- `postgres_data` - Database files
- `redis_data` - Redis persistence

## Security

- JWT-based authentication
- bcrypt password hashing
- Admin-restricted marker editing
- Secure session management

## License

MIT