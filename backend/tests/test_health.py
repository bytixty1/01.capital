"""Basic smoke tests — verifies the app starts and the health endpoint responds."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_payload(client: AsyncClient) -> None:
    data = (await client.get("/health")).json()
    assert data["status"] == "healthy"
    assert data["service"] == "01capital-backend"
    assert "environment" in data
    assert "version" in data
