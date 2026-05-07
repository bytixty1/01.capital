# ZeroCaps E2E Testing

Playwright-based end-to-end tests for the ZeroCaps frontend.

## Setup

1. Install Playwright and dependencies:
   ```bash
   cd frontend
   npm install
   npx playwright install chromium
   ```

## Running Tests

### Prerequisites
The full stack must be running:
```bash
# In another terminal
docker compose -f infra/docker-compose.yml up
```

Or start servers manually:
```bash
# Terminal 1: Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Run all tests
```bash
cd frontend
npm run test:e2e
```

### Run tests in UI mode (interactive debugging)
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run tests matching a pattern
```bash
npx playwright test --grep "register"
```

### Run with headed browser (see the browser)
```bash
npx playwright test --headed
```

## Test Structure

- `e2e/helpers/auth.ts` — Shared authentication utilities
- `e2e/auth.spec.ts` — Authentication flows (register, login, verify OTP, logout)
- `e2e/company.spec.ts` — Company creation (3-step wizard)
- `e2e/stakeholders.spec.ts` — Stakeholder management and share transactions
- `e2e/esop.spec.ts` — ESOP plan and grant management
- `e2e/instruments.spec.ts` — Instrument creation (Sukuk, Phantom, Warrant)
- `e2e/filings.spec.ts` — Filing status transitions
- `e2e/members.spec.ts` — Company member role changes and removal

## Test Database

Tests run against a real backend with a real database. Each test:
- Creates its own test user via registration
- Creates isolated test data (companies, stakeholders, etc.)
- Uses the demo OTP `000000` for email verification

**Note:** For CI/production, consider adding database cleanup fixtures or a test database seed strategy.

## Troubleshooting

### Port already in use
If `3000` or `8000` is already in use, update `playwright.config.ts` baseURL or start servers on different ports.

### Tests timing out
Increase timeout in `playwright.config.ts` `use` section if the backend is slow.

### Selector not found
Use `npx playwright test --debug` to step through tests and inspect selectors in real-time.

### Screenshots on failure
Failed tests automatically save screenshots to `test-results/` (see `playwright.config.ts`).

## CI Integration

To run in CI, ensure the full stack is available:
```yaml
# Example GitHub Actions
- name: Start stack
  run: docker compose -f infra/docker-compose.yml up -d

- name: Wait for backend
  run: until curl -f http://localhost:8000/health; do sleep 1; done

- name: Run E2E tests
  run: cd frontend && npm run test:e2e
```
