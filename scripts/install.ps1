$ErrorActionPreference = 'Stop'
$GithubOrg = if ($env:GITHUB_ORG) { $env:GITHUB_ORG } else { "Dadud" }
$ImageTag = if ($env:IMAGE_TAG) { $env:IMAGE_TAG } else { "latest" }

Write-Host "=== Scanner Map Installer ===" -ForegroundColor Cyan
Write-Host "Registry: ghcr.io/$GithubOrg"
Write-Host ""

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker is required. Install: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Red
    exit 1
}

Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    @"
DISCORD_TOKEN=
DISCORD_ALERT_CHANNEL_ID=
DISCORD_SUMMARY_CHANNEL_ID=
LOCATIONIQ_API_KEY=
OPENAI_API_KEY=
POSTGRES_PASSWORD=change_this_password
JWT_SECRET=change_this_random_string
"@ | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "Created .env - please edit with your values" -ForegroundColor Yellow
    Read-Host "Press Enter when done"
}

Write-Host "Pulling images..." -ForegroundColor Green
foreach ($img in @("api", "transcribe", "ui")) {
    docker pull "ghcr.io/$GithubOrg/scanner-map-${img}:$ImageTag" 2>$null | Out-Null
}

$env:GITHUB_ORG = $GithubOrg
$env:IMAGE_TAG = $ImageTag
docker-compose up -d

Write-Host ""
Write-Host "Scanner Map running at http://localhost" -ForegroundColor Cyan