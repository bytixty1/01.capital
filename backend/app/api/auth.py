"""Auth routes: register, login, MFA setup/verify, /me."""

import hashlib
import io
import logging
import secrets
from datetime import datetime, timedelta, timezone

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, get_partial_user
from app.core.security import (
    create_access_token,
    decrypt_field,
    encrypt_field,
    generate_totp_secret,
    get_totp_uri,
    hash_password,
    verify_password_async,
    verify_totp,
)
from app.models.audit_log import AuditAction, AuditLog
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MFASetupResponse,
    MFAVerifyRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)

logger = logging.getLogger("01capital.auth")
router = APIRouter(prefix="/auth", tags=["auth"])
_limiter = Limiter(key_func=get_remote_address)

_OTP_TTL_MINUTES = 15


def _ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _ua(request: Request) -> str:
    return request.headers.get("user-agent", "")[:512]


async def _audit(
    db: AsyncSession,
    action: AuditAction,
    request: Request,
    user_id: object = None,
    detail: str | None = None,
) -> None:
    log = AuditLog(
        user_id=user_id,
        action=action.value,
        ip_address=_ip(request),
        user_agent=_ua(request),
        detail=detail,
    )
    db.add(log)


def _generate_otp() -> tuple[str, str]:
    """Return (plaintext_6digit_code, sha256_hex_digest)."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    digest = hashlib.sha256(code.encode()).hexdigest()
    return code, digest


def _hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@_limiter.limit("10/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    otp, otp_hash = _generate_otp()

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        verification_otp_hash=otp_hash,
        verification_otp_expires_at=datetime.now(timezone.utc) + timedelta(minutes=_OTP_TTL_MINUTES),
    )
    db.add(user)
    await db.flush()
    await _audit(db, AuditAction.LOGIN_SUCCESS, request, user_id=user.id, detail="registered")
    await db.commit()

    if settings.environment != "production":
        # In dev/staging, log OTP to console since no email service is wired yet.
        # Never log OTPs in production — email delivery required.
        logger.info("DEV — email verification OTP for %s: %s", body.email, otp)

    return RegisterResponse(message="Please verify your email", email=user.email)


# ── Email verification ────────────────────────────────────────────────────────

@router.post("/verify-email", response_model=TokenResponse)
@_limiter.limit("5/minute")
async def verify_email(
    request: Request,
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already verified")

    if not user.verification_otp_hash or not user.verification_otp_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No pending verification")

    if datetime.now(timezone.utc) > user.verification_otp_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired — please register again")

    if _hash_otp(body.otp) != user.verification_otp_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    user.is_verified = True
    user.verification_otp_hash = None
    user.verification_otp_expires_at = None
    await db.commit()
    return TokenResponse(access_token=create_access_token(str(user.id)))


# ── Dev-only bypass (never runs in production) ───────────────────────────────

@router.post("/dev/verify-email", response_model=TokenResponse, include_in_schema=False)
async def dev_verify_email(
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Mark an email as verified without OTP — only available outside production.

    Used by automated tests and local E2E suites to bypass email delivery.
    The endpoint is excluded from the OpenAPI schema and returns 404 in production.
    """
    if settings.environment == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_verified = True
    user.verification_otp_hash = None
    user.verification_otp_expires_at = None
    await db.commit()
    return TokenResponse(access_token=create_access_token(str(user.id)))


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@_limiter.limit("20/minute")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    pw_ok = await verify_password_async(body.password, user.hashed_password) if user else False
    if not user or not pw_ok:
        await _audit(db, AuditAction.LOGIN_FAILED, request, detail=f"email={body.email}")
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    # If MFA is enabled, return a partial token requiring TOTP verification
    if user.mfa_enabled:
        partial_token = create_access_token(str(user.id), mfa_verified=False)
        await _audit(db, AuditAction.LOGIN_SUCCESS, request, user_id=user.id, detail="mfa_required")
        await db.commit()
        return TokenResponse(access_token=partial_token, mfa_required=True)

    await _audit(db, AuditAction.LOGIN_SUCCESS, request, user_id=user.id)
    await db.commit()
    return TokenResponse(access_token=create_access_token(str(user.id), mfa_verified=True))


# ── MFA setup ─────────────────────────────────────────────────────────────────

@router.post("/mfa/setup", response_model=MFASetupResponse)
async def mfa_setup(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MFASetupResponse:
    """Generate a new TOTP secret and return the otpauth URI. Does not enable MFA yet."""
    if current_user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="MFA already enabled")

    secret = generate_totp_secret()
    current_user.mfa_secret = encrypt_field(secret)
    await db.commit()

    uri = get_totp_uri(secret, current_user.email)
    return MFASetupResponse(secret=secret, otpauth_uri=uri)


@router.get("/mfa/qr")
async def mfa_qr(
    current_user: User = Depends(get_current_user),
) -> Response:
    """Return a QR code PNG for the current user's TOTP secret."""
    if not current_user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Call /mfa/setup first")

    secret = decrypt_field(current_user.mfa_secret)
    uri = get_totp_uri(secret, current_user.email)
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@router.post("/mfa/enable")
async def mfa_enable(
    body: MFAVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Confirm TOTP code and activate MFA for the account."""
    if current_user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="MFA already enabled")
    if not current_user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Call /mfa/setup first")

    secret = decrypt_field(current_user.mfa_secret)
    if not verify_totp(secret, body.code):
        await _audit(db, AuditAction.LOGIN_MFA_FAILED, request, user_id=current_user.id)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid TOTP code")

    current_user.mfa_enabled = True
    await _audit(db, AuditAction.MFA_ENABLED, request, user_id=current_user.id)
    await db.commit()
    return {"mfa_enabled": True}


@router.post("/mfa/verify", response_model=TokenResponse)
@_limiter.limit("10/minute")
async def mfa_verify(
    body: MFAVerifyRequest,
    request: Request,
    current_user: User = Depends(get_partial_user),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Exchange partial token + TOTP code for a full MFA-verified token."""
    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA not enabled")

    secret = decrypt_field(current_user.mfa_secret)
    if not verify_totp(secret, body.code):
        await _audit(db, AuditAction.LOGIN_MFA_FAILED, request, user_id=current_user.id)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid TOTP code")

    await _audit(db, AuditAction.LOGIN_SUCCESS, request, user_id=current_user.id, detail="mfa_verified")
    await db.commit()
    return TokenResponse(access_token=create_access_token(str(current_user.id), mfa_verified=True))


@router.post("/mfa/disable")
async def mfa_disable(
    body: MFAVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Disable MFA after confirming current TOTP code."""
    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA not enabled")

    secret = decrypt_field(current_user.mfa_secret)
    if not verify_totp(secret, body.code):
        await _audit(db, AuditAction.LOGIN_MFA_FAILED, request, user_id=current_user.id)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid TOTP code")

    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    await _audit(db, AuditAction.MFA_DISABLED, request, user_id=current_user.id)
    await db.commit()
    return {"mfa_enabled": False}


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
