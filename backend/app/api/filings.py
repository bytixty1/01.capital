"""Filing tracker API routes.

Exposes compliance obligations triggered by cap table events, the reference
checklist for each, and a draft (watermarked, bilingual) document per filing.
Never auto-submits — surfaces and structures only.
"""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_company_member, require_admin, require_mfa
from app.models.audit_log import AuditAction, AuditLog
from app.models.cap_table_event import CapTableEvent
from app.models.company import Company
from app.models.company_member import CompanyMember
from app.models.filing import Filing, FilingStatus
from app.models.user import User
from app.schemas.filing import FilingResponse, UpdateFilingRequest
from app.services.filing_reference import FILING_REFERENCE, get_filing_reference
from app.services.pdf import html_to_pdf, render_filing_document_html

router = APIRouter(prefix="/companies", tags=["filings"])


def _is_overdue(filing: Filing) -> bool:
    if filing.due_date is None:
        return False
    if filing.status in (FilingStatus.SUBMITTED, FilingStatus.NOT_REQUIRED):
        return False
    return filing.due_date < date.today()


def _enrich(filing: Filing) -> FilingResponse:
    resp = FilingResponse.model_validate(filing)
    resp.is_overdue = _is_overdue(filing)
    ref = get_filing_reference(filing.filing_type)
    resp.reference = ref.as_dict() if ref else None
    return resp


@router.get("/{company_id}/filings", response_model=list[FilingResponse])
async def list_filings(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> list[FilingResponse]:
    result = await db.execute(
        select(Filing)
        .where(Filing.company_id == member.company_id)
        .order_by(Filing.due_date.asc().nullslast(), Filing.created_at.desc())
    )
    return [_enrich(f) for f in result.scalars().all()]


@router.get("/{company_id}/filings/reference")
async def filings_reference(
    _member: CompanyMember = Depends(get_company_member),
) -> dict:
    """The full filing-type checklist reference (authority, deadline, fee, docs)."""
    return {ftype: ref.as_dict() for ftype, ref in FILING_REFERENCE.items()}


@router.patch("/{company_id}/filings/{filing_id}", response_model=FilingResponse)
async def update_filing(
    filing_id: uuid.UUID,
    body: UpdateFilingRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> FilingResponse:
    result = await db.execute(
        select(Filing).where(Filing.id == filing_id, Filing.company_id == member.company_id)
    )
    filing = result.scalar_one_or_none()
    if filing is None:
        raise HTTPException(status_code=404, detail="Filing not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(filing, field, value)

    await db.commit()
    await db.refresh(filing)
    return _enrich(filing)


@router.get("/{company_id}/filings/{filing_id}/draft.pdf")
async def filing_draft_pdf(
    filing_id: uuid.UUID,
    request: Request,
    member: CompanyMember = Depends(get_company_member),
    current_user: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Generate a draft (watermarked, bilingual) document for this filing."""
    filing = (await db.execute(
        select(Filing).where(Filing.id == filing_id, Filing.company_id == member.company_id)
    )).scalar_one_or_none()
    if filing is None:
        raise HTTPException(status_code=404, detail="Filing not found")

    ref = get_filing_reference(filing.filing_type)
    if ref is None:
        raise HTTPException(status_code=422, detail="No document template for this filing type")

    company = (await db.execute(
        select(Company).where(Company.id == member.company_id)
    )).scalar_one()

    trigger = None
    if filing.trigger_event_id is not None:
        trigger = (await db.execute(
            select(CapTableEvent).where(CapTableEvent.id == filing.trigger_event_id)
        )).scalar_one_or_none()

    html = render_filing_document_html(company, ref, filing.due_date, trigger, is_draft=True)
    try:
        pdf = html_to_pdf(html)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e

    db.add(AuditLog(
        user_id=current_user.id,
        company_id=member.company_id,
        action=AuditAction.DOCUMENT_EXPORTED.value,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        detail=f"filing-draft.pdf filing={filing_id} type={filing.filing_type}",
    ))
    await db.commit()

    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="filing-{filing.filing_type}.pdf"'},
    )
