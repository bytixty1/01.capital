"""Transactional email via Resend. Falls back to console log when API key is absent."""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("01capital.email")

_RESEND_URL = "https://api.resend.com/emails"


async def send_verification_email(to_email: str, otp: str) -> None:
    """Send OTP verification email. Logs to console if RESEND_API_KEY is not set."""
    if not settings.resend_api_key:
        logger.info("DEV — verification OTP for %s: %s (set RESEND_API_KEY to send real emails)", to_email, otp)
        return

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px">
      <h2 style="font-size:24px;font-weight:700;margin-bottom:8px">Verify your email</h2>
      <p style="color:#666;margin-bottom:32px">Enter this code to complete your 01 Capital registration.</p>
      <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center;
                  font-size:36px;font-weight:700;letter-spacing:12px;font-family:monospace">
        {otp}
      </div>
      <p style="color:#999;font-size:13px;margin-top:24px">
        This code expires in 15 minutes. If you didn't create an account, ignore this email.
      </p>
    </div>
    """

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            _RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": settings.email_from,
                "to": [to_email],
                "subject": "Your 01 Capital verification code",
                "html": html,
            },
        )
        if resp.status_code >= 400:
            logger.error("Resend error %s: %s", resp.status_code, resp.text)
            resp.raise_for_status()
