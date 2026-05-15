"""Shared pytest fixtures.

Two fixture modes:
- client (no DB override) — for endpoints that don't hit the DB (health, etc.)
- db_client — full DB fixture with isolated test database and per-test cleanup

All DB fixtures are function-scoped so every test runs in the same event loop
as its fixtures, avoiding asyncpg "Future attached to a different loop" errors
that occur when a session-scoped engine's connection pool is used from a
function-scoped test's event loop.
"""

import hashlib
import os
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401 — registers all models on Base.metadata
from app.core.database import Base, get_db
from app.main import app

# TEST_DATABASE_URL must be set explicitly. We refuse to fall back to settings.database_url
# because a misconfigured run would truncate development or production data.
TEST_DB_URL = os.environ.get("TEST_DATABASE_URL")
if TEST_DB_URL is None:
    raise RuntimeError(
        "\n\nTEST_DATABASE_URL is not set.\n"
        "Tests require a dedicated test database to avoid accidentally truncating dev/prod data.\n"
        "Create one and export:\n"
        "  createdb -U 01capital 01capital_test\n"
        "  export TEST_DATABASE_URL=postgresql+asyncpg://01capital:01capital@localhost:5432/01capital_test\n"
    )


@pytest.fixture
async def client() -> AsyncClient:
    """Lightweight client — no DB override. Use for endpoints that don't need a DB."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_engine():
    """Function-scoped engine pointing at the test DB."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def clean_tables(db_engine):
    """Truncate all tables after each test that uses this fixture."""
    yield
    table_names = ", ".join(t.name for t in Base.metadata.sorted_tables)
    async with db_engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {table_names} RESTART IDENTITY CASCADE"))


@pytest.fixture
async def db_client(db_engine, clean_tables) -> AsyncClient:
    """Client wired to the isolated test database. Use for auth / domain tests."""
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Shared auth helpers ───────────────────────────────────────────────────────

async def _register_and_verify(
    client: AsyncClient,
    email: str = "user@test.com",
    password: str = "password123",
    full_name: str | None = None,
) -> str:
    """Register a user, bypass email OTP via the dev endpoint, return an access token."""
    body: dict = {"email": email, "password": password}
    if full_name:
        body["full_name"] = full_name
    res = await client.post("/api/auth/register", json=body)
    assert res.status_code == 201, f"register failed: {res.text}"

    # Use the dev bypass endpoint — it marks the user as verified without OTP and
    # returns a full token. This endpoint returns 404 in production, so it can
    # never be used against live data.
    res = await client.post("/api/auth/dev/verify-email", json={"email": email, "otp": ""})
    assert res.status_code == 200, f"dev/verify-email failed: {res.text}"
    return res.json()["access_token"]


async def seed_otp(engine, email: str, code: str) -> None:
    """Inject a known OTP hash into the DB so tests can call the real /verify-email endpoint."""
    digest = hashlib.sha256(code.encode()).hexdigest()
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "UPDATE users SET verification_otp_hash = :h, verification_otp_expires_at = :e "
                "WHERE email = :em"
            ),
            {"h": digest, "e": expires, "em": email},
        )


@pytest.fixture
async def token(db_client: AsyncClient) -> str:
    """Access token for a verified test user."""
    return await _register_and_verify(db_client)


@pytest.fixture
async def auth_headers(token: str) -> dict:
    """Authorization headers for a verified test user."""
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def company_id(db_client: AsyncClient, auth_headers: dict) -> str:
    """Create a test company and return its ID."""
    res = await db_client.post(
        "/api/companies",
        json={"name_en": "Test Co", "entity_type": "LLC"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    return res.json()["id"]


@pytest.fixture
async def stakeholder_id(db_client: AsyncClient, auth_headers: dict, company_id: str) -> str:
    """Create a test stakeholder and return its ID."""
    res = await db_client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": "Founder One"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    return res.json()["id"]
