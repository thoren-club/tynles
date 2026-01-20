#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/tynles}"
LOG_FILE="${LOG_FILE:-$APP_DIR/deploy.log}"

mkdir -p "$APP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "---- Deploy started $(date -u +"%Y-%m-%d %H:%M:%S UTC") ----"

cd "$APP_DIR"

echo "[1/4] git pull"
git pull --ff-only

echo "[2/4] npm run build (backend)"
npm run build

if [ -d "web" ]; then
  echo "[3/4] npm run build (web)"
  cd web
  npm run build
  cd ..
else
  echo "web/ not found, skipping frontend build"
fi

echo "[4/4] pm2 restart all"
pm2 restart all

echo "---- Deploy finished $(date -u +"%Y-%m-%d %H:%M:%S UTC") ----"
