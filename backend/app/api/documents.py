"""Document generation API — bilingual (AR + EN) PDFs.

Every generated document carries the "DRAFT — REVIEW WITH LEGAL COUNSEL"
watermark until cleared by counsel, and every export is written to the audit
log (Rule 8: audit every document access).
"""

import uuid
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_company_member, require_admin, require_mfa
from app.models.audit_log import AuditAction, AuditLog
from app.models.company import Company
from app.models.company_member import CompanyMember
from app.models.esop_grant import EsopGrant
from app.models.esop_plan import EsopPlan
from app.models.holding import Holding
from app.models.signing_record import SigningRecord, SigningStatus
from app.models.stakeholder import Stakeholder
from app.models.user import User
from app.schemas.signing import (
    CreateSigningRequest,
    SigningRecordResponse,
)
from app.services.audit_pack import build_audit_pack
from app.services.cap_table import get_cap_table
from app.services.esign import Signer, get_signing_adapter
from app.services.pdf import (
    html_to_pdf,
    render_cap_table_html,
    render_share_certificate_html,
    render_vesting_schedule_html,
)
from app.services.vesting import compute_vested

router = APIRouter(prefix="/companies", tags=["documents"])


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


async def _audit_export(
    db: AsyncSession, user_id: uuid.UUID, company_id: uuid.UUID, request: Request, detail: str
) -> None:
    db.add(AuditLog(
        user_id=user_id,
        company_id=company_id,
        action=AuditAction.DOCUMENT_EXPORTED.value,
        ip_address=_ip(request),
        user_agent=request.headers.get("user-agent"),
        detail=detail,
    ))
    await db.commit()


def _pdf_response(pdf: bytes, filename: str) -> Response:
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _render(html: str) -> bytes:
    try:
        return html_to_pdf(html)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e


@router.get("/{company_id}/documents/cap-table.pdf")
async def cap_table_pdf(
    request: Request,
    member: CompanyMember = Depends(get_company_member),
    current_user: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> Response:
    company = (await db.execute(
        select(Company).where(Company.id == member.company_id)
    )).scalar_one()

    issued = await get_cap_table(db, member.company_id, diluted=False)
    diluted = await get_cap_table(db, member.company_id, diluted=True)

    html = render_cap_table_html(company, issued, diluted, is_draft=True)
    pdf = _render(html)
    await _audit_export(db, current_user.id, member.company_id, request, "cap_table.pdf")
    return _pdf_response(pdf, f"cap-table-{company.name_en.replace(' ', '_')}.pdf")


@router.get("/{company_id}/documents/stakeholders/{stakeholder_id}/certificate.pdf")
async def share_certificate_pdf(
    stakeholder_id: uuid.UUID,
    request: Request,
    share_class: str | None = None,
    member: CompanyMember = Depends(get_company_member),
    current_user: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> Response:
    company = (await db.execute(
        select(Company).where(Company.id == member.company_id)
    )).scalar_one()

    holder = (await db.execute(
        select(Stakeholder).where(
            Stakeholder.id == stakeholder_id,
            Stakeholder.company_id == member.company_id,
        )
    )).scalar_one_or_none()
    if holder is None:
        raise HTTPException(status_code=404, detail="Stakeholder not found")

    holdings = (await db.execute(
        select(Holding).where(
            Holding.company_id == member.company_id,
            Holding.stakeholder_id == stakeholder_id,
            Holding.quantity > 0,
        ).order_by(Holding.quantity.desc())
    )).scalars().all()
    if not holdings:
        raise HTTPException(status_code=422, detail="Stakeholder holds no shares — nothing to certify")

    chosen = next((h for h in holdings if h.share_class == share_class), holdings[0])

    # Ownership % against issued total.
    issued = await get_cap_table(db, member.company_id, diluted=False)
    total = issued.total_shares_issued or Decimal("0")
    pct = (chosen.quantity / total * 100).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP) if total > 0 else Decimal("0")

    html = render_share_certificate_html(
        company, holder, chosen.share_class, chosen.quantity, pct, is_draft=True
    )
    pdf = _render(html)
    await _audit_export(
        db, current_user.id, member.company_id, request,
        f"certificate.pdf stakeholder={stakeholder_id} class={chosen.share_class}",
    )
    return _pdf_response(pdf, f"certificate-{holder.name_en.replace(' ', '_')}.pdf")


@router.get("/{company_id}/esop/{plan_id}/grants/{grant_id}/vesting.pdf")
async def vesting_schedule_pdf(
    plan_id: uuid.UUID,
    grant_id: uuid.UUID,
    request: Request,
    member: CompanyMember = Depends(get_company_member),
    current_user: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> Response:
    company = (await db.execute(
        select(Company).where(Company.id == member.company_id)
    )).scalar_one()

    grant = (await db.execute(
        select(EsopGrant).where(
            EsopGrant.id == grant_id,
            EsopGrant.plan_id == plan_id,
            EsopGrant.company_id == member.company_id,
        )
    )).scalar_one_or_none()
    if grant is None:
        raise HTTPException(status_code=404, detail="Grant not found")

    plan = (await db.execute(
        select(EsopPlan).where(EsopPlan.id == plan_id, EsopPlan.company_id == member.company_id)
    )).scalar_one()

    holder = (await db.execute(
        select(Stakeholder).where(Stakeholder.id == grant.stakeholder_id)
    )).scalar_one_or_none()
    holder_name = holder.name_en if holder else str(grant.stakeholder_id)

    from datetime import date
    vested = compute_vested(grant.grant_date, grant.vesting_schedule, grant.quantity, date.today())
    vesting_pct = (vested / grant.quantity * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if grant.quantity > 0 else Decimal("0")

    html = render_vesting_schedule_html(
        company, plan, grant, holder_name, vested, vesting_pct, is_draft=True
    )
    pdf = _render(html)
    await _audit_export(
        db, current_user.id, member.company_id, request, f"vesting.pdf grant={grant_id}"
    )
    return _pdf_response(pdf, f"vesting-{holder_name.replace(' ', '_')}.pdf")


# ── Audit pack (one-click ZIP) ───────────────────────────────────────────────

@router.get("/{company_id}/documents/audit-pack.zip")
async def audit_pack_zip(
    request: Request,
    member: CompanyMember = Depends(get_company_member),
    current_user: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Bundle cap table (PDF+CSV) + event log + grant register into one ZIP."""
    zip_bytes, filename = await build_audit_pack(db, member.company_id)
    await _audit_export(db, current_user.id, member.company_id, request, "audit-pack.zip")
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── E-signing (vendor-neutral adapter) ───────────────────────────────────────

@router.post(
    "/{company_id}/signing",
    response_model=SigningRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_for_signature(
    body: CreateSigningRequest,
    member: CompanyMember = Depends(require_admin),
    current_user: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> SigningRecord:
    """Send a document for e-signature via the configured adapter (stub in V1).

    Produces an audit-traceable signing record. No external delivery happens
    with the stub adapter — the record tracks intent until a real provider is
    wired in behind the same interface.
    """
    adapter = get_signing_adapter()
    result = adapter.send_for_signature(
        body.document_name,
        [Signer(name=s.name, email=s.email) for s in body.signers],
    )

    record = SigningRecord(
        company_id=member.company_id,
        document_type=body.document_type,
        document_name=body.document_name,
        provider=result.provider,
        envelope_id=result.envelope_id,
        status=SigningStatus.SENT,
        signers=[{"name": s.name, "email": s.email} for s in body.signers],
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/{company_id}/signing", response_model=list[SigningRecordResponse])
async def list_signing_records(
    member: CompanyMember = Depends(get_company_member),
    _mfa: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> list[SigningRecord]:
    result = await db.execute(
        select(SigningRecord)
        .where(SigningRecord.company_id == member.company_id)
        .order_by(SigningRecord.created_at.desc())
    )
    return list(result.scalars().all())


@router.post(
    "/{company_id}/signing/{record_id}/mark-signed",
    response_model=SigningRecordResponse,
)
async def mark_signed(
    record_id: uuid.UUID,
    member: CompanyMember = Depends(require_admin),
    _mfa: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> SigningRecord:
    """Mark a signing envelope as completed.

    With the stub adapter there is no provider webhook, so completion is
    recorded manually by an admin. A real provider would drive this from a
    signed-event callback instead.
    """
    record = (await db.execute(
        select(SigningRecord).where(
            SigningRecord.id == record_id,
            SigningRecord.company_id == member.company_id,
        )
    )).scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Signing record not found")
    if record.status != SigningStatus.SENT:
        raise HTTPException(status_code=422, detail=f"Record is {record.status}, cannot mark signed")

    record.status = SigningStatus.SIGNED
    record.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(record)
    return record
