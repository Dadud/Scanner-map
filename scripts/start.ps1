$ErrorActionPreference = 'Stop'

Write-Host "=== Scanner Map Docker Setup (Windows) ===" -ForegroundColor Cyan

$ScriptDir = $PSScriptRoot

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from example..." -ForegroundColor Yellow
    Copy-Item "$ScriptDir\.env.example" "$ScriptDir\.env"
    Write-Host ""
    Write-Host "IMPORTANT: Please edit .env and add your configuration values:" -ForegroundColor Red
    Write-Host "  - DISCORD_TOKEN (required for Discord bot)"
    Write-Host "  - DATABASE_URL (uses PostgreSQL credentials)"
    Write-Host "  - REDIS_URL (uses Redis)"
    Write-Host "  - LOCATIONIQ_API_KEY or GOOGLE_MAPS_API_KEY (for geocoding)"
    Write-Host ""
    $null = Read-Host "Press Enter when you've configured .env..."
}

Write-Host ""
Write-Host "Starting Docker services..." -ForegroundColor Green

$env:COMPOSE_PROJECT_NAME = "scannermap"

docker network create scanner-network 2>$null | Out-Null

docker-compose up -d scanner-postgres scanner-redis

Write-Host ""
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

docker-compose up -d scanner-api scanner-transcribe

Write-Host ""
Write-Host "Initializing database..." -ForegroundColor Yellow
docker-compose exec -T scanner-api npx prisma db push --accept-data-loss 2>$null

Write-Host ""
Write-Host "Starting UI..." -ForegroundColor Green
docker-compose up -d scanner-ui

Write-Host ""
Write-Host "=== Scanner Map is starting up ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "  UI:        http://localhost"
Write-Host "  API:       http://localhost:3000"
Write-Host "  API Docs:  http://localhost:3000/docs"
Write-Host ""
Write-Host "To enable Discord bot, run:" -ForegroundColor Yellow
Write-Host "  docker-compose --profile discord up -d"
Write-Host ""
Write-Host "View logs with:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f"
Write-Host ""