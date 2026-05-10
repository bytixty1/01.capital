"""MFA lifecycle integration tests: setup → enable → login with partial token → verify → disable."""

import pyotp
import pytest
from httpx import AsyncClient

from tests.conftest import _register_and_verify


async def _setup_and_enable_mfa(client: AsyncClient, token: str) -> str:
    """Call /mfa/setup then /mfa/enable with a real TOTP code. Returns the TOTP secret."""
    headers = {"Authorization": f"Bearer {token}"}

    setup_res = await client.post("/api/auth/mfa/setup", headers=headers)
    assert setup_res.status_code == 200, setup_res.text
    secret = setup_res.json()["secret"]

    code = pyotp.TOTP(secret).now()
    enable_res = await client.post("/api/auth/mfa/enable", json={"code": code}, headers=headers)
    assert enable_res.status_code == 200, enable_res.text
    assert enable_res.json()["mfa_enabled"] is True

    return secret


async def _full_token(client: AsyncClient, email: str, password: str, secret: str) -> str:
    """After MFA is enabled: login → verify → return full (mfa=True) token."""
    login_res = await client.post("/api/auth/login", json={"email": email, "password": password})
    partial = login_res.json()["access_token"]
    code = pyotp.TOTP(secret).now()
    verify_res = await client.post(
        "/api/auth/mfa/verify",
        json={"code": code},
        headers={"Authorization": f"Bearer {partial}"},
    )
    assert verify_res.status_code == 200, verify_res.text
    return verify_res.json()["access_token"]


# ── Setup ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mfa_setup_returns_secret_and_uri(db_client: AsyncClient, auth_headers: dict) -> None:
    res = await db_client.post("/api/auth/mfa/setup", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert "secret" in body
    assert body["otpauth_uri"].startswith("otpauth://totp/")
    assert len(body["secret"]) >= 16


@pytest.mark.asyncio
async def test_mfa_setup_requires_auth(db_client: AsyncClient) -> None:
    res = await db_client.post("/api/auth/mfa/setup")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_mfa_setup_when_already_enabled_is_409(db_client: AsyncClient) -> None:
    email, password = "setup409@example.com", "password123"
    token = await _register_and_verify(db_client, email=email, password=password)
    secret = await _setup_and_enable_mfa(db_client, token)
    full = await _full_token(db_client, email, password, secret)
    res = await db_client.post("/api/auth/mfa/setup", headers={"Authorization": f"Bearer {full}"})
    assert res.status_code == 409


# ── Enable ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mfa_enable_with_valid_code(db_client: AsyncClient, auth_headers: dict, token: str) -> None:
    setup_res = await db_client.post("/api/auth/mfa/setup", headers=auth_headers)
    secret = setup_res.json()["secret"]
    code = pyotp.TOTP(secret).now()
    res = await db_client.post("/api/auth/mfa/enable", json={"code": code}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["mfa_enabled"] is True


@pytest.mark.asyncio
async def test_mfa_enable_with_invalid_code_is_400(db_client: AsyncClient, auth_headers: dict) -> None:
    await db_client.post("/api/auth/mfa/setup", headers=auth_headers)
    res = await db_client.post("/api/auth/mfa/enable", json={"code": "000000"}, headers=auth_headers)
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_mfa_enable_without_setup_is_400(db_client: AsyncClient, auth_headers: dict) -> None:
    res = await db_client.post("/api/auth/mfa/enable", json={"code": "123456"}, headers=auth_headers)
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_mfa_enable_non_digit_code_is_422(db_client: AsyncClient, auth_headers: dict) -> None:
    await db_client.post("/api/auth/mfa/setup", headers=auth_headers)
    res = await db_client.post("/api/auth/mfa/enable", json={"code": "abcdef"}, headers=auth_headers)
    assert res.status_code == 422


# ── me reflects mfa_enabled ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_me_shows_mfa_enabled_after_setup(db_client: AsyncClient) -> None:
    email, password = "mecheck@example.com", "password123"
    token = await _register_and_verify(db_client, email=email, password=password)
    secret = await _setup_and_enable_mfa(db_client, token)
    full = await _full_token(db_client, email, password, secret)
    res = await db_client.get("/api/auth/me", headers={"Authorization": f"Bearer {full}"})
    assert res.status_code == 200
    assert res.json()["mfa_enabled"] is True


# ── Login with MFA → partial token ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_with_mfa_returns_partial_token(db_client: AsyncClient) -> None:
    email, password = "mfauser@example.com", "password123"
    token = await _register_and_verify(db_client, email=email, password=password)
    await _setup_and_enable_mfa(db_client, token)

    res = await db_client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    body = res.json()
    assert body["mfa_required"] is True
    assert "access_token" in body


@pytest.mark.asyncio
async def test_partial_token_blocked_from_protected_routes(db_client: AsyncClient) -> None:
    email, password = "blocked@example.com", "password123"
    token = await _register_and_verify(db_client, email=email, password=password)
    await _setup_and_enable_mfa(db_client, token)

    login_res = await db_client.post("/api/auth/login", json={"email": email, "password": password})
    partial_token = login_res.json()["access_token"]

    # /me should be blocked with 403
    res = await db_client.get("/api/auth/me", headers={"Authorization": f"Bearer {partial_token}"})
    assert res.status_code == 403
    assert "MFA" in res.json()["detail"]


# ── MFA verify ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mfa_verify_with_valid_code_returns_full_token(db_client: AsyncClient) -> None:
    email, password = "verify@example.com", "password123"
    token = await _register_and_verify(db_client, email=email, password=password)
    secret = await _setup_and_enable_mfa(db_client, token)

    login_res = await db_client.post("/api/auth/login", json={"email": email, "password": password})
    partial_token = login_res.json()["access_token"]

    code = pyotp.TOTP(secret).now()
    res = await db_client.post(
        "/api/auth/mfa/verify",
        json={"code": code},
        headers={"Authorization": f"Bearer {partial_token}"},
    )
    assert res.status_code == 200
    full_token = res.json()["access_token"]

    # Full token must work on /me
    me_res = await db_client.get("/api/auth/me", headers={"Authorization": f"Bearer {full_token}"})
    assert me_res.status_code == 200


@pytest.mark.asyncio
async def test_mfa_verify_wrong_code_is_401(db_client: AsyncClient) -> None:
    email, password = "badverify@example.com", "password123"
    token = await _register_and_verify(db_client, email=email, password=password)
    await _setup_and_enable_mfa(db_client, token)

    login_res = await db_client.post("/api/auth/login", json={"email": email, "password": password})
    partial_token = login_res.json()["access_token"]

    res = await db_client.post(
        "/api/auth/mfa/verify",
        json={"code": "000000"},
        headers={"Authorization": f"Bearer {partial_token}"},
    )
    assert res.status_code == 401


# ── Disable ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mfa_disable_with_valid_code(db_client: AsyncClient) -> None:
    email, password = "disable@example.com", "password123"
    token = await _register_and_verify(db_client, email=email, password=password)
    secret = await _setup_and_enable_mfa(db_client, token)
    full = await _full_token(db_client, email, password, secret)
    headers = {"Authorization": f"Bearer {full}"}

    code = pyotp.TOTP(secret).now()
    res = await db_client.post("/api/auth/mfa/disable", json={"code": code}, headers=headers)
    assert res.status_code == 200
    assert res.json()["mfa_enabled"] is False

    # After disabling, the full token (mfa=True in payload) still works for /me
    me_res = await db_client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["mfa_enabled"] is False


@pytest.mark.asyncio
async def test_mfa_disable_with_invalid_code_is_400(db_client: AsyncClient) -> None:
    email, password = "badisable@example.com", "password123"
    token = await _register_and_verify(db_client, email=email, password=password)
    secret = await _setup_and_enable_mfa(db_client, token)
    full = await _full_token(db_client, email, password, secret)
    headers = {"Authorization": f"Bearer {full}"}

    res = await db_client.post("/api/auth/mfa/disable", json={"code": "000000"}, headers=headers)
    assert res.status_code == 400
    # MFA must still be enabled
    me_res = await db_client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["mfa_enabled"] is True


@pytest.mark.asyncio
async def test_mfa_disable_when_not_enabled_is_400(db_client: AsyncClient, auth_headers: dict) -> None:
    res = await db_client.post("/api/auth/mfa/disable", json={"code": "123456"}, headers=auth_headers)
    assert res.status_code == 400
