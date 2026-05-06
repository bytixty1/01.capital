"""Shared pytest fixtures.

Two fixture modes:
- client (no DB override) — for endpoints that don't hit the DB (health, etc.)
- db_client — full DB fixture with isolated test database and per-test cleanup

All DB fixtures are function-scoped so every test runs in the same event loop
as its fixtures, avoiding asyncpg "Future attached to a different loop" errors
that occur when a session-scoped engine's connection pool is used from a
function-scoped test's event loop.
"""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401 — registers all models on Base.metadata
from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

_db_base, _, _ = settings.database_url.rpartition("/")
TEST_DB_URL = f"{_db_base}/01capital_test"


@pytest.fixture
async def client() -> AsyncClient:
    """Lightweight client — no DB override. Use for endpoints that don't need a DB."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_engine():
    """Function-scoped engine pointing at the test DB.

    create_all is idempotent — only the very first test actually builds the
    schema; subsequent tests find the tables already present. We never drop
    tables here; clean_tables truncates rows between tests instead.
    """
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def clean_tables(db_engine):
    """Truncate all tables after each test that uses this fixture."""
    yield
    async with db_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


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
