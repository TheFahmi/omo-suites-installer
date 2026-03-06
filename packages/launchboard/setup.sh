#!/bin/bash
set -e
export PATH="$HOME/.bun/bin:$PATH"
cd "$(dirname "$0")"

# Install backend deps
[ -d "node_modules" ] || bun install

# Install frontend deps
[ -d "frontend/node_modules" ] || (cd frontend && bun install)

# Create tables if DB doesn't exist
if [ ! -f "launchboard.db" ]; then
  echo "📦 Creating database..."
  bunx drizzle-kit push
  echo "🌱 Seeding sample data..."
  bun run seed
fi

echo ""
echo "🚀 Starting Launchboard..."
echo "   Backend:  http://localhost:3030"
echo "   Frontend: http://localhost:3040"
echo "   Press Ctrl+C to stop"
echo ""

# Start backend in background
bun run start &
BACKEND_PID=$!

# Start frontend
cd frontend
bun run dev &
FRONTEND_PID=$!

# Wait and handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
