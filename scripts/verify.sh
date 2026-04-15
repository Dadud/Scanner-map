#!/bin/bash
set -euo pipefail

REPO="Dadud/Scanner-map"
BRANCH=""
IMAGE_TAG=""
ALLOW_DIRTY_WORKTREE=0
SKIP_REMOTE=0
SKIP_LOCAL_BUILD=0
SKIP_DOCKER=0
RUN_DOCKER_SMOKE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --image-tag)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --allow-dirty-worktree)
      ALLOW_DIRTY_WORKTREE=1
      shift
      ;;
    --skip-remote)
      SKIP_REMOTE=1
      shift
      ;;
    --skip-local-build)
      SKIP_LOCAL_BUILD=1
      shift
      ;;
    --skip-docker)
      SKIP_DOCKER=1
      shift
      ;;
    --run-docker-smoke)
      RUN_DOCKER_SMOKE=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

failures=()
skips=()

step() {
  local label="$1"
  shift
  echo "==> ${label}"
  if "$@"; then
    echo "PASS: ${label}"
  else
    echo "FAIL: ${label}"
    failures+=("${label}")
  fi
}

skip_step() {
  local label="$1"
  echo "SKIP: ${label}"
  skips+=("${label}")
}

cd "$REPO_ROOT"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required to run verification." >&2
  exit 1
fi

HEAD_SHA="$(git rev-parse HEAD)"
if [[ -z "$BRANCH" ]]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi
if [[ -z "$IMAGE_TAG" ]]; then
  IMAGE_TAG="$HEAD_SHA"
fi

if [[ "$ALLOW_DIRTY_WORKTREE" -eq 1 ]]; then
  skip_step "Git worktree is clean (allow-dirty-worktree enabled)"
else
  step "Git worktree is clean" bash -lc '[[ -z "$(git status --porcelain)" ]]'
fi

if [[ "$SKIP_REMOTE" -eq 0 ]]; then
  if ! command -v gh >/dev/null 2>&1; then
    skip_step "Remote workflow verification (gh not installed)"
  elif ! gh auth status >/dev/null 2>&1; then
    skip_step "Remote workflow verification (gh not authenticated)"
  else
    step "Build and Push Images workflow succeeded for HEAD" bash -lc "gh run list --repo '$REPO' --workflow 'Build and Push Images' --branch '$BRANCH' --limit 20 --json headSha,conclusion | python -c \"import json,sys; runs=json.load(sys.stdin); raise SystemExit(0 if any(run.get('headSha') == '$HEAD_SHA' and run.get('conclusion') == 'success' for run in runs) else 1)\""
  fi
fi

if [[ "$SKIP_LOCAL_BUILD" -eq 0 ]]; then
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    skip_step "Local Node builds (node/npm not installed)"
  else
    step "scanner-api installs and builds" bash -lc 'cd scanner-api && npm install --package-lock=false && npm exec -- prisma generate && npm run build'
    step "scanner-ui installs and builds" bash -lc 'cd scanner-ui && npm install --package-lock=false && npm run build'
    step "scanner-discord installs and builds" bash -lc 'cd scanner-discord && npm install --package-lock=false && npm run build'
  fi

  if command -v python >/dev/null 2>&1; then
    step "scanner-transcribe Python sources compile" python -m compileall scanner-transcribe/src
  else
    skip_step "scanner-transcribe Python compile check (python not installed)"
  fi
fi

if [[ "$SKIP_DOCKER" -eq 0 ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    skip_step "Docker compose verification (docker not installed)"
  else
    step "docker-compose.yml validates" docker compose -f docker-compose.yml config
    step "docker-compose.prebuilt.yml validates" env DOCKER_ORG=dadud DOCKER_REGISTRY=ghcr.io IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prebuilt.yml config
    if [[ "$RUN_DOCKER_SMOKE" -eq 1 ]]; then
      step "Prebuilt stack pulls successfully" env DOCKER_ORG=dadud DOCKER_REGISTRY=ghcr.io IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prebuilt.yml pull scanner-api scanner-ui scanner-transcribe scanner-discord
    fi
  fi
fi

echo
echo "Verification summary"
echo "  Branch: ${BRANCH}"
echo "  HEAD:   ${HEAD_SHA}"

if [[ ${#skips[@]} -gt 0 ]]; then
  echo "  Skipped:"
  for item in "${skips[@]}"; do
    echo "    - ${item}"
  done
fi

if [[ ${#failures[@]} -gt 0 ]]; then
  echo "  Failures:"
  for item in "${failures[@]}"; do
    echo "    - ${item}"
  done
  exit 1
fi

echo "  Result: PASS"
