#!/bin/bash
# Runs DB migrations then starts the API server.
# Used as the Docker entrypoint so every container start is migration-safe.
set -e

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

echo "[entrypoint] Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
