"""Filing tracker API routes.

Exposes compliance obligations triggered by cap table events.
Never auto-submits — surfaces and structures only.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_company_member, require_admin
from app.models.company_member import CompanyMember
from app.models.filing import Filing, FilingStatus
from app.schemas.filing import FilingResponse, UpdateFilingRequest

router = APIRouter(prefix="/companies", tags=["filings"])


@router.get("/{company_id}/filings", response_model=list[FilingResponse])
async def list_filings(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> list[Filing]:
    result = await db.execute(
        select(Filing)
        .where(Filing.company_id == member.company_id)
        .order_by(Filing.due_date.asc().nullslast(), Filing.created_at.desc())
    )
    return list(result.scalars().all())


@router.patch("/{company_id}/filings/{filing_id}", response_model=FilingResponse)
async def update_filing(
    filing_id: uuid.UUID,
    body: UpdateFilingRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Filing:
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
    return filing
