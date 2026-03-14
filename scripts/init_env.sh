#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  printf "\n[%s] %s\n" "$1" "$2"
}

require_cmd() {
  local cmd="$1"
  local hint="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "ERROR" "Missing required command: $cmd. $hint"
    exit 1
  fi
}

log "INFO" "Initializing multi_agent_app environment"
require_cmd python3 "Please install Python 3 first."

if command -v uv >/dev/null 2>&1; then
  log "INFO" "Installing runtime-langgraph dependencies with uv"
  (
    cd "$ROOT_DIR/apps/runtime-langgraph"
    uv sync
  )
else
  log "WARN" "uv is not installed. Skipping runtime-langgraph dependency sync."
  log "WARN" "Install uv from https://docs.astral.sh/uv/ then run: cd apps/runtime-langgraph && uv sync"
fi

install_web_deps() {
  if [ ! -f "$ROOT_DIR/apps/web/package.json" ]; then
    return 0
  fi

  if command -v bun >/dev/null 2>&1; then
    log "INFO" "Installing web dependencies with bun"
    set +e
    (
      cd "$ROOT_DIR/apps/web"
      bun install --frozen-lockfile
    )
    local bun_status=$?
    set -e

    if [ $bun_status -eq 0 ]; then
      return 0
    fi

    log "WARN" "bun install failed; attempting npm fallback"
  fi

  if command -v npm >/dev/null 2>&1; then
    log "INFO" "Installing web dependencies with npm"
    (
      cd "$ROOT_DIR/apps/web"
      npm install
    )
    return 0
  fi

  log "WARN" "Neither bun nor npm is installed. Skipping web dependency install."
}

install_web_deps

log "INFO" "Environment initialization completed"
log "INFO" "Start runtime server: cd apps/runtime-langgraph && uv run python main.py serve --no-reload"
log "INFO" "Start static test page: python3 -m http.server 8080"
