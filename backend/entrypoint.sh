#!/bin/bash
# Runs DB migrations then starts the API server.
# Used as the Docker entrypoint so every container start is migration-safe.
set -e

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

echo "[entrypoint] Starting uvicorn..."
if [ "${ENVIRONMENT:-development}" = "development" ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
fi
