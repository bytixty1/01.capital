.PHONY: help dev up build down destroy logs logs-backend logs-db \
        backend frontend \
        migrate migrate-down migrate-new migrate-history \
        seed psql \
        test test-cov lint lint-fix lint-frontend type-check e2e check \
        install install-backend install-frontend build-frontend

help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Docker ─────────────────────────────────────────────────────────────────────

up: ## Start all services (no rebuild)
	cd infra && docker compose up

build: ## Start all services with rebuild
	cd infra && docker compose up --build

down: ## Stop all services
	cd infra && docker compose down

destroy: ## Stop all services and wipe volumes (deletes DB data)
	cd infra && docker compose down -v

logs: ## Tail all service logs
	cd infra && docker compose logs -f

logs-backend: ## Tail backend logs only
	cd infra && docker compose logs -f backend

logs-db: ## Tail postgres logs only
	cd infra && docker compose logs -f postgres

# ── Local dev ─────────────────────────────────────────────────────────────────

dev: ## Start backend + frontend together (Ctrl-C stops both)
	@echo "Starting backend on :8000 and frontend on :3000 ..."
	@trap 'kill 0' INT; \
	  (cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000) & \
	  (cd frontend && npm run dev) & \
	  wait

backend: ## Run backend only with hot reload
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

frontend: ## Run frontend only with hot reload
	cd frontend && npm run dev

# ── Database ───────────────────────────────────────────────────────────────────

migrate: ## Apply all pending migrations
	cd backend && .venv/bin/alembic upgrade head

migrate-down: ## Roll back one migration
	cd backend && .venv/bin/alembic downgrade -1

migrate-new: ## Generate a migration (usage: make migrate-new name="describe change")
	cd backend && .venv/bin/alembic revision --autogenerate -m "$(name)"

migrate-history: ## Show migration history
	cd backend && .venv/bin/alembic history --verbose

seed: ## Load seed.sql into the dev postgres container
	docker exec -i 01capital-postgres psql -U 01capital -d 01capital < seed.sql

psql: ## Open a psql shell against the dev postgres container
	docker exec -it 01capital-postgres psql -U 01capital -d 01capital

# ── Testing & Quality ─────────────────────────────────────────────────────────

test: ## Run backend tests
	cd backend && pytest -v

test-cov: ## Run backend tests with coverage report
	cd backend && pytest --cov=app --cov-report=term-missing -v

lint: ## Lint backend (ruff)
	cd backend && .venv/bin/ruff check app

lint-fix: ## Lint backend with auto-fix
	cd backend && .venv/bin/ruff check --fix app

lint-frontend: ## Lint frontend (ESLint)
	cd frontend && npm run lint

type-check: ## TypeScript type-check (no emit)
	cd frontend && npm run type-check

e2e: ## Run frontend end-to-end tests (Playwright)
	cd frontend && npm run test:e2e

check: lint lint-frontend type-check test ## Run all quality checks (lint + type-check + tests)

# ── Install / Build ───────────────────────────────────────────────────────────

install: install-backend install-frontend ## Install all dependencies (frontend and backend)

install-backend: ## Install backend dependencies
	cd backend && [ -d .venv ] || python3 -m venv .venv
	cd backend && .venv/bin/pip install -r requirements.txt

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

build-frontend: ## Production build of frontend
	cd frontend && npm run build
