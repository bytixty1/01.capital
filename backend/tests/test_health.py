"""Health endpoint smoke tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_is_reachable(client: AsyncClient) -> None:
    """Always responds — even if DB is down (returns 503 instead of 200)."""
    response = await client.get("/health")
    assert response.status_code in (200, 503)


@pytest.mark.asyncio
async def test_health_payload_shape(client: AsyncClient) -> None:
    data = (await client.get("/health")).json()
    assert data["service"] == "01capital-backend"
    assert data["status"] in ("healthy", "degraded")
    assert data["database"] in ("healthy", "unreachable")
    assert "environment" in data
    assert "version" in data
