"""Auth endpoint integration tests.

Requires a running Postgres instance pointed at by DATABASE_URL
(the test database suffix `/01capital_test` is applied automatically in conftest).
Run with: pytest tests/test_auth.py -v
"""

import pytest
from httpx import AsyncClient


# ── Register ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_returns_token(db_client: AsyncClient) -> None:
    response = await db_client.post(
        "/api/auth/register",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_with_full_name(db_client: AsyncClient) -> None:
    response = await db_client.post(
        "/api/auth/register",
        json={"email": "named@example.com", "password": "password123", "full_name": "Ali Alghamdi"},
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_register_duplicate_email_is_409(db_client: AsyncClient) -> None:
    payload = {"email": "dup@example.com", "password": "password123"}
    await db_client.post("/api/auth/register", json=payload)
    response = await db_client.post("/api/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_short_password_is_422(db_client: AsyncClient) -> None:
    response = await db_client.post(
        "/api/auth/register",
        json={"email": "user@example.com", "password": "short"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email_is_422(db_client: AsyncClient) -> None:
    response = await db_client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "password123"},
    )
    assert response.status_code == 422


# ── Login ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_valid_credentials(db_client: AsyncClient) -> None:
    await db_client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "password123"},
    )
    response = await db_client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password_is_401(db_client: AsyncClient) -> None:
    await db_client.post(
        "/api/auth/register",
        json={"email": "wrong@example.com", "password": "password123"},
    )
    response = await db_client.post(
        "/api/auth/login",
        json={"email": "wrong@example.com", "password": "not-the-password"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_is_401(db_client: AsyncClient) -> None:
    response = await db_client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "password123"},
    )
    assert response.status_code == 401


# ── /me ────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_me_returns_user_data(db_client: AsyncClient) -> None:
    reg = await db_client.post(
        "/api/auth/register",
        json={"email": "me@example.com", "password": "password123", "full_name": "Test User"},
    )
    token = reg.json()["access_token"]

    response = await db_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["full_name"] == "Test User"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_me_without_token_is_403(db_client: AsyncClient) -> None:
    response = await db_client.get("/api/auth/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_me_invalid_token_is_401(db_client: AsyncClient) -> None:
    response = await db_client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    assert response.status_code == 401
