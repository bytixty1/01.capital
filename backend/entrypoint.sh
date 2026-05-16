#!/bin/bash
# Runs DB migrations then starts the API server.
# DEV NOTE: running migrations here on every start is convenient for development
# but races with multiple workers in production. In production, run migrations
# as a separate release job before rolling out the new image.
set -e

# Refuse to start in production with default credentials.
if [ "${ENVIRONMENT}" = "production" ]; then
  if [ "${JWT_SECRET_KEY}" = "change-me-in-every-environment" ] || [ -z "${JWT_SECRET_KEY}" ]; then
    echo "[entrypoint] FATAL: JWT_SECRET_KEY is unset or default. Refusing to start in production." >&2
    exit 1
  fi
  if [ -z "${FIELD_ENCRYPTION_KEY}" ]; then
    echo "[entrypoint] FATAL: FIELD_ENCRYPTION_KEY is not set. Refusing to start in production." >&2
    exit 1
  fi
fi

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

echo "[entrypoint] Starting uvicorn..."
if [ "${ENVIRONMENT:-development}" = "development" ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
else
  exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2
fi
