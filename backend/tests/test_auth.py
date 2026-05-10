"""Auth endpoint integration tests.

Requires a running Postgres instance pointed at by DATABASE_URL
(the test database suffix `/01capital_test` is applied automatically in conftest).
Run with: pytest tests/test_auth.py -v
"""

import pytest
from httpx import AsyncClient

from tests.conftest import _register_and_verify


# ── Register ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_returns_message(db_client: AsyncClient) -> None:
    res = await db_client.post(
        "/api/auth/register",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["message"] == "Please verify your email"
    assert body["email"] == "user@example.com"


@pytest.mark.asyncio
async def test_register_with_full_name(db_client: AsyncClient) -> None:
    res = await db_client.post(
        "/api/auth/register",
        json={"email": "named@example.com", "password": "password123", "full_name": "Ali Alghamdi"},
    )
    assert res.status_code == 201
    assert res.json()["email"] == "named@example.com"


@pytest.mark.asyncio
async def test_register_duplicate_email_is_409(db_client: AsyncClient) -> None:
    payload = {"email": "dup@example.com", "password": "password123"}
    await db_client.post("/api/auth/register", json=payload)
    res = await db_client.post("/api/auth/register", json=payload)
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_register_short_password_is_422(db_client: AsyncClient) -> None:
    res = await db_client.post(
        "/api/auth/register",
        json={"email": "user@example.com", "password": "short"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email_is_422(db_client: AsyncClient) -> None:
    res = await db_client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "password123"},
    )
    assert res.status_code == 422


# ── Email verification ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_email_correct_otp_returns_token(db_client: AsyncClient) -> None:
    email = "verify@example.com"
    await db_client.post("/api/auth/register", json={"email": email, "password": "password123"})
    res = await db_client.post("/api/auth/verify-email", json={"email": email, "otp": "000000"})
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_verify_email_wrong_otp_is_400(db_client: AsyncClient) -> None:
    email = "badotp@example.com"
    await db_client.post("/api/auth/register", json={"email": email, "password": "password123"})
    res = await db_client.post("/api/auth/verify-email", json={"email": email, "otp": "999999"})
    assert res.status_code == 400


# ── Login ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_unverified_user_is_403(db_client: AsyncClient) -> None:
    email = "unverified@example.com"
    await db_client.post("/api/auth/register", json={"email": email, "password": "password123"})
    res = await db_client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert res.status_code == 403
    assert "not verified" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_valid_credentials_returns_token(db_client: AsyncClient) -> None:
    email = "login@example.com"
    await _register_and_verify(db_client, email=email)
    res = await db_client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert body.get("mfa_required") is False


@pytest.mark.asyncio
async def test_login_wrong_password_is_401(db_client: AsyncClient) -> None:
    email = "wrong@example.com"
    await _register_and_verify(db_client, email=email)
    res = await db_client.post("/api/auth/login", json={"email": email, "password": "wrong"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_is_401(db_client: AsyncClient) -> None:
    res = await db_client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "password123"},
    )
    assert res.status_code == 401


# ── /me ───────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_me_returns_user_data(db_client: AsyncClient) -> None:
    email = "me@example.com"
    token = await _register_and_verify(db_client, email=email, full_name="Test User")
    res = await db_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == email
    assert data["full_name"] == "Test User"
    assert data["is_active"] is True
    assert data["mfa_enabled"] is False
    assert "id" in data


@pytest.mark.asyncio
async def test_me_without_token_is_403(db_client: AsyncClient) -> None:
    res = await db_client.get("/api/auth/me")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_me_invalid_token_is_401(db_client: AsyncClient) -> None:
    res = await db_client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    assert res.status_code == 401
