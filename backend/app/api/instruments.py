"""Sophisticated instrument API routes (sukuk-convertible, phantom shares, warrants)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_company_member, require_admin
from app.models.company_member import CompanyMember
from app.models.instrument import Instrument
from app.models.stakeholder import Stakeholder
from app.schemas.instrument import CreateInstrumentRequest, InstrumentResponse

router = APIRouter(prefix="/companies", tags=["instruments"])


@router.get("/{company_id}/instruments", response_model=list[InstrumentResponse])
async def list_instruments(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> list[Instrument]:
    result = await db.execute(
        select(Instrument)
        .where(Instrument.company_id == member.company_id)
        .order_by(Instrument.issue_date.desc())
    )
    return list(result.scalars().all())


@router.post(
    "/{company_id}/instruments",
    response_model=InstrumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_instrument(
    body: CreateInstrumentRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Instrument:
    r = await db.execute(
        select(Stakeholder).where(
            Stakeholder.id == body.stakeholder_id,
            Stakeholder.company_id == member.company_id,
        )
    )
    if r.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Stakeholder not found")

    instrument = Instrument(company_id=member.company_id, **body.model_dump())
    db.add(instrument)
    await db.commit()
    await db.refresh(instrument)
    return instrument


@router.get("/{company_id}/instruments/{instrument_id}", response_model=InstrumentResponse)
async def get_instrument(
    instrument_id: uuid.UUID,
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> Instrument:
    result = await db.execute(
        select(Instrument).where(
            Instrument.id == instrument_id,
            Instrument.company_id == member.company_id,
        )
    )
    instrument = result.scalar_one_or_none()
    if instrument is None:
        raise HTTPException(status_code=404, detail="Instrument not found")
    return instrument
