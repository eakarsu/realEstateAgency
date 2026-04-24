#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
DB_NAME="realestate"

echo "=========================================="
echo "  Real Estate Agency AI Platform"
echo "  Startup Script"
echo "=========================================="
echo ""

# Set default DATABASE_URL if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "==> DATABASE_URL not set, using default..."
  DB_USER="${USER:-$(whoami)}"
  export DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}?schema=public"
fi
echo "DATABASE_URL: ${DATABASE_URL}"
echo ""

# Check if PostgreSQL is running
echo "==> Checking PostgreSQL status..."
if ! command -v psql &> /dev/null; then
  echo "WARNING: psql command not found. Assuming PostgreSQL is configured correctly."
else
  if ! psql -h localhost -c "SELECT 1;" postgres >/dev/null 2>&1 && \
     ! psql -c "SELECT 1;" postgres >/dev/null 2>&1; then
    echo ""
    echo "ERROR: Cannot connect to PostgreSQL server."
    echo ""
    echo "Please start PostgreSQL:"
    echo "  macOS:  brew services start postgresql"
    echo "  Linux:  sudo systemctl start postgresql"
    echo ""
    exit 1
  fi
  echo "PostgreSQL server is running."

  # Create database if it doesn't exist
  echo ""
  echo "==> Ensuring database '${DB_NAME}' exists..."
  if ! psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}" && \
     ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Creating database '${DB_NAME}'..."
    createdb "${DB_NAME}" 2>/dev/null || createdb -h localhost "${DB_NAME}" 2>/dev/null || {
      echo "Could not create database automatically."
      echo "Please create it manually: createdb ${DB_NAME}"
      exit 1
    }
    echo "Database created successfully!"
  else
    echo "Database '${DB_NAME}' already exists."
  fi
fi

# Clean up processes on the ports
echo ""
echo "==> Cleaning up processes on ports ${BACKEND_PORT} and ${FRONTEND_PORT}..."
if lsof -ti tcp:"${BACKEND_PORT}" >/dev/null 2>&1; then
  echo "Found processes on port ${BACKEND_PORT}, killing them..."
  lsof -ti tcp:"${BACKEND_PORT}" | xargs kill -9 || true
  sleep 1
fi
if lsof -ti tcp:"${FRONTEND_PORT}" >/dev/null 2>&1; then
  echo "Found processes on port ${FRONTEND_PORT}, killing them..."
  lsof -ti tcp:"${FRONTEND_PORT}" | xargs kill -9 || true
  sleep 1
fi
echo "Ports cleared."

# Backend setup
echo ""
echo "==> Setting up Backend..."
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi

# Update .env file with current DATABASE_URL
echo ""
echo "==> Updating backend .env file..."
if [ -f ".env" ]; then
  if grep -q "^DATABASE_URL=" .env; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env 2>/dev/null || \
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
  else
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
  fi
else
  echo "ERROR: backend/.env not found."
  echo "Please create backend/.env with the required variables:"
  echo "  DATABASE_URL, JWT_SECRET, PORT, NODE_ENV, OPENROUTER_API_KEY, OPENROUTER_MODEL"
  echo "See backend/.env.example if available."
  exit 1
fi
echo ".env file updated."

# Generate Prisma client
echo ""
echo "==> Generating Prisma client..."
npx prisma generate

# Run database migrations
echo ""
echo "==> Running Prisma migrations..."
npx prisma db push || {
  echo "Migration failed. Trying to create initial schema..."
  npx prisma db push --force-reset
}

# Check if database has been seeded
echo ""
echo "==> Checking if database needs seeding..."
LEAD_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"Lead\";" 2>/dev/null | tr -d ' ' || echo "0")
if [ "${LEAD_COUNT}" = "0" ] || [ -z "${LEAD_COUNT}" ]; then
  echo "Database appears empty. Running seed..."
  npm run seed
else
  echo "Database already contains data (${LEAD_COUNT} leads). Skipping seed."
fi

cd ..

# Frontend setup
echo ""
echo "==> Setting up Frontend..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

cd ..

# Start the application
echo ""
echo "=========================================="
echo "  Starting Real Estate Agency AI Platform"
echo "=========================================="
echo ""
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo ""
echo "Test credentials:"
echo "  Admin:   admin@realestate.com / password123"
echo "  Manager: manager@realestate.com / password123"
echo "  Agent:   john@realestate.com / password123"
echo "  Client:  client@example.com / password123"
echo ""

# Function to cleanup background processes on exit
cleanup() {
  echo ""
  echo "==> Shutting down servers..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo "==> Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend server
echo "==> Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
