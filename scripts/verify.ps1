param(
    [string]$Repo = 'Dadud/Scanner-map',
    [string]$Branch = '',
    [string]$ImageTag = '',
    [switch]$AllowDirtyWorktree,
    [switch]$SkipRemote,
    [switch]$SkipLocalBuild,
    [switch]$SkipDocker,
    [switch]$RunDockerSmoke
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path $PSScriptRoot -Parent
$Failures = New-Object System.Collections.Generic.List[string]
$Skips = New-Object System.Collections.Generic.List[string]

function Resolve-Tool {
    param(
        [string]$Name,
        [string[]]$Fallbacks = @()
    )

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    foreach ($path in $Fallbacks) {
        if (Test-Path $path) {
            return $path
        }
    }

    return $null
}

function Invoke-Step {
    param(
        [string]$Label,
        [scriptblock]$Action
    )

    Write-Host "==> $Label" -ForegroundColor Cyan
    try {
        & $Action
        Write-Host "PASS: $Label" -ForegroundColor Green
    } catch {
        $Failures.Add("${Label}: $($_.Exception.Message)") | Out-Null
        Write-Host "FAIL: $Label" -ForegroundColor Red
    }
}

function Skip-Step {
    param([string]$Label)
    $Skips.Add($Label) | Out-Null
    Write-Host "SKIP: $Label" -ForegroundColor Yellow
}

$git = Resolve-Tool git @('C:\Program Files\Git\bin\git.exe')
$gh = Resolve-Tool gh @('C:\Program Files\GitHub CLI\gh.exe')
$docker = Resolve-Tool docker @('C:\Program Files\Docker\Docker\resources\bin\docker.exe')
$node = Resolve-Tool node
$npm = Resolve-Tool npm
$python = Resolve-Tool python

if (-not $git) {
    throw 'git is required to run verification.'
}

Push-Location $RepoRoot

$headSha = (& $git rev-parse HEAD).Trim()
if (-not $Branch) {
    $Branch = (& $git rev-parse --abbrev-ref HEAD).Trim()
}
if (-not $ImageTag) {
    $ImageTag = $headSha
}

if ($AllowDirtyWorktree) {
    Skip-Step 'Git worktree is clean (allow-dirty-worktree enabled)'
} else {
    Invoke-Step 'Git worktree is clean' {
        $status = (& $git status --porcelain).Trim()
        if ($status) {
            throw "worktree is dirty`n$status"
        }
    }
}

if (-not $SkipRemote) {
    if (-not $gh) {
        Skip-Step 'Remote workflow verification (gh not installed)'
    } else {
        $authOk = $true
        try {
            & $gh auth status | Out-Null
        } catch {
            $authOk = $false
        }

        if (-not $authOk) {
            Skip-Step 'Remote workflow verification (gh not authenticated)'
        } else {
            Invoke-Step 'Build and Push Images workflow succeeded for HEAD' {
                $runs = & $gh run list --repo $Repo --workflow 'Build and Push Images' --branch $Branch --limit 20 --json databaseId,headSha,conclusion,displayTitle,workflowName,createdAt
                $entries = $runs | ConvertFrom-Json
                $match = $entries | Where-Object { $_.headSha -eq $headSha -and $_.conclusion -eq 'success' } | Select-Object -First 1
                if (-not $match) {
                    throw "no successful Build and Push Images run found for $headSha"
                }
            }
        }
    }
}

if (-not $SkipLocalBuild) {
    if (-not $node -or -not $npm) {
        Skip-Step 'Local Node builds (node/npm not installed)'
    } else {
        foreach ($service in @('scanner-api', 'scanner-ui', 'scanner-discord')) {
            Invoke-Step "$service installs and builds" {
                Push-Location (Join-Path $RepoRoot $service)
                try {
                    & $npm install --package-lock=false
                    if ($service -eq 'scanner-api') {
                        & $npm exec -- prisma generate
                    }
                    & $npm run build
                } finally {
                    Pop-Location
                }
            }
        }
    }

    if ($python) {
        Invoke-Step 'scanner-transcribe Python sources compile' {
            & $python -m compileall (Join-Path $RepoRoot 'scanner-transcribe\src')
        }
    } else {
        Skip-Step 'scanner-transcribe Python compile check (python not installed)'
    }
}

if (-not $SkipDocker) {
    if (-not $docker) {
        Skip-Step 'Docker compose verification (docker not installed)'
    } else {
        Invoke-Step 'docker-compose.yml validates' {
            & $docker compose -f (Join-Path $RepoRoot 'docker-compose.yml') config | Out-Null
        }

        Invoke-Step 'docker-compose.prebuilt.yml validates' {
            $env:IMAGE_TAG = $ImageTag
            $env:DOCKER_ORG = 'dadud'
            $env:DOCKER_REGISTRY = 'ghcr.io'
            & $docker compose -f (Join-Path $RepoRoot 'docker-compose.prebuilt.yml') config | Out-Null
        }

        if ($RunDockerSmoke) {
            Invoke-Step 'Prebuilt stack pulls successfully' {
                $env:IMAGE_TAG = $ImageTag
                $env:DOCKER_ORG = 'dadud'
                $env:DOCKER_REGISTRY = 'ghcr.io'
                & $docker compose -f (Join-Path $RepoRoot 'docker-compose.prebuilt.yml') pull scanner-api scanner-ui scanner-transcribe scanner-discord
            }
        }
    }
}

Write-Host ''
Write-Host 'Verification summary' -ForegroundColor Cyan
Write-Host "  Branch: $Branch"
Write-Host "  HEAD:   $headSha"

if ($Skips.Count -gt 0) {
    Write-Host '  Skipped:' -ForegroundColor Yellow
    foreach ($skip in $Skips) {
        Write-Host "    - $skip"
    }
}

if ($Failures.Count -gt 0) {
    Write-Host '  Failures:' -ForegroundColor Red
    foreach ($failure in $Failures) {
        Write-Host "    - $failure"
    }
    Pop-Location
    exit 1
}

Write-Host '  Result: PASS' -ForegroundColor Green
Pop-Location
