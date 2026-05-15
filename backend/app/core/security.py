"""Password hashing, JWT tokens, MFA (TOTP), and field encryption utilities."""

import asyncio
import base64
import os
from datetime import datetime, timedelta, timezone
from functools import partial

import bcrypt
import jwt
import pyotp
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings


# ── Password ──────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


async def verify_password_async(password: str, hashed: str) -> bool:
    """Run bcrypt.checkpw in a thread pool so it doesn't block the event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(bcrypt.checkpw, password.encode(), hashed.encode()))


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(subject: str, mfa_verified: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    return jwt.encode(
        {"sub": subject, "exp": expire, "mfa": mfa_verified},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict:
    payload = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
    return payload


# ── MFA (TOTP) ────────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    """Generate a new base32 TOTP secret."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    """Return the otpauth:// URI for QR code generation."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name="01 Capital")


def verify_totp(secret: str, code: str) -> bool:
    """Verify a 6-digit TOTP code. Allows 1-step drift."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


# ── Field-level encryption (AES-256-GCM) ────────────────────────────────────
# Used for PII fields: national_id, IBAN.
# Key is derived from settings.field_encryption_key (32-byte hex in env).

def _get_field_key() -> bytes:
    key_hex = settings.field_encryption_key
    if len(key_hex) != 64:
        raise RuntimeError("FIELD_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
    return bytes.fromhex(key_hex)


def encrypt_field(plaintext: str) -> str:
    """Encrypt a plaintext string. Returns base64-encoded ciphertext."""
    key = _get_field_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt_field(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext string."""
    key = _get_field_key()
    aesgcm = AESGCM(key)
    raw = base64.b64decode(ciphertext)
    nonce, ct = raw[:12], raw[12:]
    return aesgcm.decrypt(nonce, ct, None).decode()
