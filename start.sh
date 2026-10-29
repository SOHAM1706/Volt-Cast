#!/usr/bin/env bash
# Quickstart launcher for VoltCast Smart Energy Forecaster

echo "=== Starting VoltCast Full-Stack Application ==="

# Trap Ctrl+C to kill all child processes
trap 'kill $(jobs -p) 2>/dev/null; exit' SIGINT SIGTERM EXIT

# 1. Start FastAPI Backend
echo "Starting Backend on http://localhost:8000..."
cd "$(dirname "$0")"
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for Backend to initialize..."
while ! curl -s http://localhost:8000/api/health > /dev/null; do
    sleep 0.5
done
echo "Backend is live at http://localhost:8000/api/health"

# 2. Start Vite Frontend
echo "Starting Frontend Dev Server on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo "  VoltCast Dashboard is running at: http://localhost:5173"
echo "  API Docs (Swagger UI):             http://localhost:8000/docs"
echo "=========================================================="
echo "Press Ctrl+C to stop both servers."

wait
