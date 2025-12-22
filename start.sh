#!/usr/bin/env bash
set -euo pipefail
# Start script for Railway / Railpack
# Installs server dependencies and starts the server.
cd "$(dirname "$0")"
# install root deps (none) then server deps
if [ -f server/package.json ]; then
  echo "Installing server dependencies..."
  (cd server && npm install --no-audit --no-fund)
fi
echo "Starting server..."
node server/server.js
