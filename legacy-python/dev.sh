#!/bin/bash

# Configuration
BACKEND_PORT=8000
FRONTEND_PORT=3000
BACKEND_LOG="backend.log"
FRONTEND_LOG="frontend.log"

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Starting BitBoyLab development environment..."

# 1. Cleanup old processes
echo "🧹 Cleaning up old processes on ports $BACKEND_PORT and $FRONTEND_PORT..."
lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null

# 2. Start Backend (FastAPI)
echo "🐍 Starting Backend (FastAPI) on port $BACKEND_PORT..."
cd "$PROJECT_ROOT"
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found."
fi

source .venv/bin/activate
# Use 127.0.0.1 explicitly
nohup uvicorn api.main:app --host 127.0.0.1 --port $BACKEND_PORT > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# 3. Start Frontend (Next.js)
echo "⚛️ Starting Frontend (Next.js) on port $FRONTEND_PORT..."
cd "$PROJECT_ROOT/frontend"
nohup npm run dev -- -p $FRONTEND_PORT > "../$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo ""
echo "✅ BitBoyLab is starting up!"
echo "   - Frontend: http://localhost:$FRONTEND_PORT"
echo "   - Backend:  http://localhost:$BACKEND_PORT"
echo "   - Logs:     tail -f $BACKEND_LOG $FRONTEND_LOG"
echo ""
echo "Press Ctrl+C to stop everything."

# Trap Ctrl+C to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; echo 'Stopping...'; exit" SIGINT

# Keep script running
wait
