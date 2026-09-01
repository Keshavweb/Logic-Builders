#!/bin/bash
set -e

echo "[start-all] Ensuring local Postgres (Docker) is up..."
if ! docker start cbdefender_pg > /dev/null 2>&1; then
  docker run -d --name cbdefender_pg \
    -e POSTGRES_PASSWORD=cbdefender -e POSTGRES_DB=chargeback \
    -p 5433:5432 postgres:16-alpine > /dev/null
fi
until docker exec cbdefender_pg pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
echo "[start-all] Postgres is up (localhost:5433)"

echo "[start-all] Starting mock-services..."
cd apps/mock-services
node server.js &
MOCK_PID=$!
cd ../..

echo "[start-all] Waiting for mock-services to be healthy..."
while ! curl -s http://localhost:3001/health > /dev/null; do
  sleep 1
done
echo "[start-all] mock-services is up!"

echo "[start-all] Starting backend API..."
cd apps/chargeback-defender-api
npm run dev &
API_PID=$!
cd ../..

echo "[start-all] Waiting for backend API to be healthy..."
while ! curl -s http://localhost:4000/api/disputes > /dev/null; do
  sleep 1
done
echo "[start-all] backend API is up!"

echo "[start-all] Starting frontend UI (standalone Vite)..."
cd apps/logicBuilders-ui
npm run vite:dev &
UI_PID=$!
cd ../..

echo ""
echo "=================================================================="
echo "All services started!"
echo "Postgres:      localhost:5433 (Docker: cbdefender_pg)"
echo "Mock Services: http://localhost:3001"
echo "Backend API:   http://localhost:4000"
echo "Frontend UI:   http://localhost:5173"
echo ""
echo "(To run the UI inside the RocketRide shell instead, open"
echo " apps/logicBuilders-ui/logicBuilders.rrapp with the RocketRide"
echo " VS Code extension and use the Design tab.)"
echo "=================================================================="
echo "Press Ctrl+C to stop all services."

trap "kill $MOCK_PID $API_PID $UI_PID; exit" INT TERM
wait
