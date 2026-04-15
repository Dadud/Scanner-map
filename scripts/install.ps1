#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

Write-Host "=== Scanner Map Quick Installer ===" -ForegroundColor Cyan
Write-Host ""

$DockerHubUsername = if ($env:DOCKERHUB_USERNAME) { $env:DOCKERHUB_USERNAME } else { "scannermap" }
$ImageTag = if ($env:IMAGE_TAG) { $env:IMAGE_TAG } else { "latest" }
$ImageName = "$DockerHubUsername/scanner-map"

Write-Host "Configuration:" -ForegroundColor White
Write-Host "  Docker Hub: $DockerHubUsername"
Write-Host "  Image Tag: $ImageTag"
Write-Host ""

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Write-Host "Docker is not installed!" -ForegroundColor Red
    Write-Host "Please install Docker first: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
    exit 1
}

$composeCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not (docker compose version 2>$null)) {
    Write-Host "Docker Compose is not available!" -ForegroundColor Red
    Write-Host "Please ensure Docker Desktop is installed and running." -ForegroundColor Yellow
    exit 1
}

Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
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
"@ | Out-File -FilePath ".env" -Encoding utf8

    Write-Host ".env file created. Please edit it and add your configuration values." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter when ready to continue"
}

Write-Host "Pulling prebuilt images from Docker Hub..." -ForegroundColor Green
Write-Host ""

$images = @("api", "transcribe", "ui")
foreach ($img in $images) {
    $fullImage = "$ImageName-$img`:$ImageTag"
    Write-Host "  Pulling scanner-map-$img..." -NoNewline
    try {
        docker pull $fullImage *>$null
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " FAILED (will use local build)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Starting Scanner Map..." -ForegroundColor Green
Write-Host ""

$env:DOCKERHUB_USERNAME = $DockerHubUsername
$env:IMAGE_TAG = $ImageTag

if (Test-Path "docker-compose.prebuilt.yml") {
    docker compose -f docker-compose.prebuilt.yml up -d
} else {
    docker compose up -d
}

Write-Host ""
Write-Host "=== Scanner Map is starting! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access the application at: http://localhost" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Gray
Write-Host "  View logs:    docker compose logs -f" -ForegroundColor Gray
Write-Host "  Stop:         docker compose stop" -ForegroundColor Gray
Write-Host "  Restart:      docker compose restart" -ForegroundColor Gray
Write-Host "  Full reset:   docker compose down -v" -ForegroundColor Gray
Write-Host ""