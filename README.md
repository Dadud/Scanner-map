# Scanner Map - Refactored

A real-time emergency scanner mapping system with a modern architecture.

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
│   Core API      │  │  Discord Bot    │  │  Transcription  │
│   (Fastify)     │  │  (Separate)     │  │  (Python)       │
│   Port: 3000    │  │  Port: -        │  │  Port: 8001     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL                                       │
│                   Port: 5432                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

## Services

### scanner-api
Fastify + TypeScript + Prisma API server
- REST API for calls, talkgroups, users
- WebSocket (Socket.IO) for real-time updates
- Redis pub/sub for inter-service communication
- Port: 3000

### scanner-transcribe
Python + faster-whisper transcription service
- Local transcription with faster-whisper
- gRPC or REST API interface
- Port: 8001

### scanner-discord
Node.js Discord bot
- Slash commands
- Alert notifications
- Summary embeds
- Subscribes to Redis for new calls

### scanner-ui
React + Vite + TailwindCSS frontend
- Leaflet map with markers
- Real-time updates via WebSocket
- Audio playback
- Port: 5173 (dev) / 80 (prod)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- PostgreSQL 16+
- Redis 7+
- Node.js 20+ (for development)
- Python 3.11+ (for transcription)

### Development

1. Clone the repository

2. Copy environment configuration:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Start infrastructure:
```bash
docker-compose up -d postgres redis
```

4. Start API:
```bash
cd scanner-api
npm install
npx prisma db push
npm run dev
```

5. Start transcription service:
```bash
cd scanner-transcribe
pip install -r requirements.txt
python -m uvicorn src.api:app --reload
```

6. Start UI:
```bash
cd scanner-ui
npm install
npm run dev
```

### Production

```bash
docker-compose up -d
```

## Configuration

See `.env.example` for all environment variables.

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `DISCORD_TOKEN` - Discord bot token

### Optional
- `LOCATIONIQ_API_KEY` or `GOOGLE_MAPS_API_KEY` - Geocoding
- `OPENAI_API_KEY` - AI features

## API Endpoints

### Calls
- `GET /api/calls` - List calls (supports pagination, filtering)
- `GET /api/calls/:id` - Get single call
- `POST /api/calls` - Create call
- `PUT /api/calls/:id` - Update call
- `DELETE /api/calls/:id` - Delete call

### Talkgroups
- `GET /api/talkgroups` - List talkgroups
- `GET /api/talkgroups/:id` - Get talkgroup with recent calls
- `POST /api/talkgroups` - Create/upsert talkgroup
- `POST /api/talkgroups/bulk` - Bulk import talkgroups

### Users & Auth
- `POST /api/users/register` - Register user
- `POST /api/users/login` - Login
- `POST /api/users/logout` - Logout
- `GET /api/users/sessions/current` - Get current session

### Webhook (for SDRTrunk)
- `POST /api/webhook/call-upload` - Receive audio uploads

## Real-time Events

Connect to `/ws` with Socket.IO client. Subscribe to `calls` channel:

```javascript
socket.emit('subscribe', 'calls');
socket.on('newCall', (call) => { ... });
socket.on('updatedCall', (call) => { ... });
socket.on('deletedCall', ({ id }) => { ... });
```

## License

MIT