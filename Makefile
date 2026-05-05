.PHONY: help up build down destroy logs logs-backend logs-db \
        backend frontend migrate migrate-new \
        test test-cov type-check install build-frontend

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
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

# ── Local dev (requires running postgres) ──────────────────────────────────────

backend: ## Run backend locally with hot reload
	cd backend && uvicorn app.main:app --reload --port 8000

frontend: ## Run frontend locally with hot reload
	cd frontend && npm run dev

# ── Database ───────────────────────────────────────────────────────────────────

migrate: ## Apply all pending migrations
	cd backend && alembic upgrade head

migrate-down: ## Roll back one migration
	cd backend && alembic downgrade -1

migrate-new: ## Generate a migration (usage: make migrate-new name="describe change")
	cd backend && alembic revision --autogenerate -m "$(name)"

migrate-history: ## Show migration history
	cd backend && alembic history --verbose

# ── Testing ────────────────────────────────────────────────────────────────────

test: ## Run backend tests
	cd backend && pytest -v

test-cov: ## Run backend tests with coverage report
	cd backend && pytest --cov=app --cov-report=term-missing -v

# ── Frontend ───────────────────────────────────────────────────────────────────

type-check: ## TypeScript type-check (no emit)
	cd frontend && npm run type-check

install: ## Install frontend dependencies
	cd frontend && npm install

build-frontend: ## Production build of frontend
	cd frontend && npm run build
