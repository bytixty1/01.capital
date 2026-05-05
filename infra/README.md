# Infra

Local development environment via Docker Compose.

## Quick start

```bash
# From the repo root
cp backend/.env.example backend/.env

# Start everything
cd infra
docker compose up

# Backend lives on http://localhost:8000
# Frontend lives on http://localhost:3000
# Postgres on localhost:5432 (01capital/01capital)
# Redis on localhost:6379
```

## Services

- **postgres** — PostgreSQL 16 with persistent volume
- **redis** — Redis 7 (used in later sprints; harmless to leave running)
- **backend** — FastAPI app with hot reload
- **frontend** — Next.js 15 with hot reload

## Production

This compose file is dev-only. Production deployment is its own ADR (TBD: AWS Bahrain region, container orchestration TBD).
