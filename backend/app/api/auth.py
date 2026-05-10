"""Auth routes: register, login, MFA setup/verify, /me."""

import io

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_partial_user
from app.core.security import (
    create_access_token,
    decrypt_field,
    generate_totp_secret,
    get_totp_uri,
    hash_password,
    verify_password,
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

router = APIRouter(prefix="/auth", tags=["auth"])
_limiter = Limiter(key_func=get_remote_address)


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

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    await db.flush()
    await _audit(db, AuditAction.LOGIN_SUCCESS, request, user_id=user.id, detail="registered")
    await db.commit()
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

    # TODO: replace with real OTP email flow in Sprint 2
    if body.otp != "000000":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    user.is_verified = True
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

    if not user or not verify_password(body.password, user.hashed_password):
        await _audit(db, AuditAction.LOGIN_FAILED, request, detail=f"email={body.email}")
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    # If MFA is enabled, return a partial token requiring TOTP verification
    if user.mfa_enabled:
        # Token with mfa=False — only usable for the /auth/mfa/verify endpoint
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
    current_user.mfa_secret = secret  # stored as plaintext base32; encrypt at rest via DB encryption
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

    uri = get_totp_uri(current_user.mfa_secret, current_user.email)
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

    if not verify_totp(current_user.mfa_secret, body.code):
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

    if not verify_totp(current_user.mfa_secret, body.code):
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

    if not verify_totp(current_user.mfa_secret, body.code):
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
