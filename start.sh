#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="${RUNTIME_PROJECT_SOURCE:-$PROJECT_DIR}"
: "${PORT:?PORT is required; choose an unused port explicitly}"
export PORT

for name in DATABASE_URL JWT_SECRET CORS_ORIGINS; do
  [[ -n "${!name:-}" ]] || { echo "Missing required environment variable: $name" >&2; exit 1; }
done
(( ${#JWT_SECRET} >= 32 )) || { echo "JWT_SECRET must be at least 32 characters" >&2; exit 1; }
lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $PORT is already in use; refusing to stop an unrelated process" >&2; exit 1; }
[[ -d "$SOURCE_DIR/backend/node_modules" ]] || { echo "Run npm ci in backend first" >&2; exit 1; }
[[ -d "$SOURCE_DIR/frontend/node_modules" ]] || { echo "Run npm ci in frontend first" >&2; exit 1; }
[[ -f "$SOURCE_DIR/frontend/dist/index.html" ]] || { echo "Run npm run build in frontend first" >&2; exit 1; }

cd "$SOURCE_DIR/backend"
exec node src/index.js
