"""Pure unit tests for security primitives — no DB, no HTTP client needed."""

import time

import jwt
import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    decrypt_field,
    encrypt_field,
    generate_totp_secret,
    get_totp_uri,
    hash_password,
    verify_password,
    verify_totp,
)
from app.core.config import settings


# ── Password ──────────────────────────────────────────────────────────────────

def test_hash_password_produces_bcrypt_hash() -> None:
    h = hash_password("mysecret")
    assert h.startswith("$2b$")


def test_verify_password_correct() -> None:
    h = hash_password("correcthorse")
    assert verify_password("correcthorse", h) is True


def test_verify_password_wrong() -> None:
    h = hash_password("correcthorse")
    assert verify_password("wrong", h) is False


def test_different_calls_produce_different_hashes() -> None:
    h1 = hash_password("same")
    h2 = hash_password("same")
    assert h1 != h2  # bcrypt salts each hash


# ── JWT ───────────────────────────────────────────────────────────────────────

def test_create_access_token_contains_sub() -> None:
    token = create_access_token("user-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"


def test_partial_token_has_mfa_false() -> None:
    token = create_access_token("user-123", mfa_verified=False)
    payload = decode_access_token(token)
    assert payload["mfa"] is False


def test_full_token_has_mfa_true() -> None:
    token = create_access_token("user-123", mfa_verified=True)
    payload = decode_access_token(token)
    assert payload["mfa"] is True


def test_token_has_expiry() -> None:
    token = create_access_token("user-123")
    payload = decode_access_token(token)
    assert "exp" in payload
    assert payload["exp"] > time.time()


def test_tampered_token_raises() -> None:
    token = create_access_token("user-123")
    bad = token[:-4] + "xxxx"
    with pytest.raises(Exception):
        decode_access_token(bad)


def test_wrong_key_raises() -> None:
    token = jwt.encode({"sub": "x", "mfa": False}, "wrong-key", algorithm="HS256")
    with pytest.raises(Exception):
        decode_access_token(token)


# ── TOTP ──────────────────────────────────────────────────────────────────────

def test_generate_totp_secret_is_base32() -> None:
    import base64
    secret = generate_totp_secret()
    assert len(secret) >= 16
    # base32 alphabet only
    base64.b32decode(secret)  # raises if invalid


def test_get_totp_uri_contains_issuer_and_email() -> None:
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, "ali@example.com")
    assert "otpauth://totp/" in uri
    assert "01%20Capital" in uri or "01+Capital" in uri or "01 Capital" in uri or "01Capital" in uri
    assert "ali" in uri


def test_verify_totp_with_current_code() -> None:
    import pyotp
    secret = generate_totp_secret()
    code = pyotp.TOTP(secret).now()
    assert verify_totp(secret, code) is True


def test_verify_totp_with_wrong_code() -> None:
    secret = generate_totp_secret()
    assert verify_totp(secret, "000000") is False


def test_verify_totp_with_non_numeric_code() -> None:
    secret = generate_totp_secret()
    assert verify_totp(secret, "abcdef") is False


# ── Field encryption ──────────────────────────────────────────────────────────

def test_encrypt_decrypt_roundtrip() -> None:
    plaintext = "1234567890"
    assert decrypt_field(encrypt_field(plaintext)) == plaintext


def test_encrypt_unicode_roundtrip() -> None:
    plaintext = "محمد العمري"
    assert decrypt_field(encrypt_field(plaintext)) == plaintext


def test_encrypt_produces_different_ciphertexts() -> None:
    # Each call uses a fresh random nonce
    ct1 = encrypt_field("same")
    ct2 = encrypt_field("same")
    assert ct1 != ct2


def test_encrypted_output_is_base64() -> None:
    import base64
    ct = encrypt_field("test")
    base64.b64decode(ct)  # raises if not valid base64


def test_decrypt_tampered_ciphertext_raises() -> None:
    ct = encrypt_field("secret")
    tampered = ct[:-4] + "AAAA"
    with pytest.raises(Exception):
        decrypt_field(tampered)
