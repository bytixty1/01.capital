"""Sophisticated instrument API routes (sukuk-convertible, notes, SAFEs, phantom, warrants)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_company_member, require_admin, require_mfa
from app.models.cap_table_event import CapTableEvent, EventType
from app.models.company_member import CompanyMember
from app.models.instrument import (
    CONVERTIBLE_TYPES,
    Instrument,
    InstrumentStatus,
)
from app.models.stakeholder import Stakeholder
from app.models.user import User
from app.schemas.instrument import (
    AntiDilutionRequest,
    AntiDilutionResponse,
    ConversionResultResponse,
    ConvertInstrumentRequest,
    CreateInstrumentRequest,
    InstrumentResponse,
)
from app.services.antidilution import broad_based_weighted_average, full_ratchet
from app.services.cap_table import apply_share_issuance, get_cap_table
from app.services.conversion import compute_conversion

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


@router.post("/{company_id}/instruments/antidilution-preview", response_model=AntiDilutionResponse)
async def antidilution_preview(
    body: AntiDilutionRequest,
    _member: CompanyMember = Depends(get_company_member),
) -> AntiDilutionResponse:
    """Pure calculation of a down-round anti-dilution adjustment. Nothing persisted."""
    if body.mechanism == "full_ratchet":
        result = full_ratchet(
            old_conversion_price=body.old_conversion_price,
            new_issue_price=body.new_issue_price,
            amount_invested=body.amount_invested,
        )
    else:
        if body.pre_round_fd_shares is None or body.new_shares_issued is None:
            raise HTTPException(
                status_code=422,
                detail="broad_based_weighted_average requires pre_round_fd_shares and new_shares_issued",
            )
        result = broad_based_weighted_average(
            old_conversion_price=body.old_conversion_price,
            new_issue_price=body.new_issue_price,
            pre_round_fd_shares=body.pre_round_fd_shares,
            new_shares_issued=body.new_shares_issued,
            amount_invested=body.amount_invested,
        )
    return AntiDilutionResponse(
        mechanism=result.mechanism,
        old_conversion_price=result.old_conversion_price,
        new_conversion_price=result.new_conversion_price,
        old_shares_on_conversion=result.old_shares_on_conversion,
        new_shares_on_conversion=result.new_shares_on_conversion,
        extra_shares=result.extra_shares,
    )


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


@router.post(
    "/{company_id}/instruments/{instrument_id}/convert",
    response_model=ConversionResultResponse,
)
async def convert_instrument(
    instrument_id: uuid.UUID,
    body: ConvertInstrumentRequest,
    member: CompanyMember = Depends(require_admin),
    current_user: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> ConversionResultResponse:
    """Convert a convertible instrument into real shares at a priced round.

    With preview=true, returns the computed conversion without persisting. Otherwise
    issues shares to the holder, records an INSTRUMENT_CONVERSION event, and marks
    the instrument CONVERTED.
    """
    instrument = (await db.execute(
        select(Instrument)
        .where(Instrument.id == instrument_id, Instrument.company_id == member.company_id)
        .with_for_update()
    )).scalar_one_or_none()
    if instrument is None:
        raise HTTPException(status_code=404, detail="Instrument not found")

    if instrument.instrument_type not in CONVERTIBLE_TYPES:
        raise HTTPException(status_code=422, detail=f"{instrument.instrument_type} is not a convertible instrument")
    if instrument.status != InstrumentStatus.ACTIVE:
        raise HTTPException(status_code=422, detail=f"Instrument is {instrument.status}, cannot convert")

    # Pre-money fully-diluted shares power the valuation-cap price.
    diluted = await get_cap_table(db, member.company_id, diluted=True)
    pre_money_shares = diluted.total_shares_diluted or None

    try:
        result = compute_conversion(
            instrument_type=instrument.instrument_type,
            face_value=instrument.face_value,
            terms=instrument.terms,
            round_price_per_share=body.round_price_per_share,
            pre_money_shares=pre_money_shares,
            accrued_amount=body.accrued_amount,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    if body.preview:
        return ConversionResultResponse(
            instrument_id=instrument.id,
            shares=result.shares,
            conversion_price=result.conversion_price,
            method=result.method,
            principal=result.principal,
            share_class=body.share_class,
            committed=False,
        )

    # Persist: issue shares, log event, mark converted.
    event = CapTableEvent(
        company_id=member.company_id,
        event_type=EventType.INSTRUMENT_CONVERSION,
        event_date=body.event_date,
        payload={
            "instrument_id": str(instrument.id),
            "instrument_type": instrument.instrument_type,
            "stakeholder_id": str(instrument.stakeholder_id),
            "share_class": body.share_class,
            "shares": str(result.shares),
            "conversion_price": str(result.conversion_price) if result.conversion_price is not None else None,
            "method": result.method,
            "principal": str(result.principal),
        },
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(event)
    await db.flush()

    await apply_share_issuance(
        db, company_id=member.company_id,
        stakeholder_id=instrument.stakeholder_id,
        share_class=body.share_class,
        quantity=result.shares,
    )

    instrument.status = InstrumentStatus.CONVERTED
    await db.commit()

    return ConversionResultResponse(
        instrument_id=instrument.id,
        shares=result.shares,
        conversion_price=result.conversion_price,
        method=result.method,
        principal=result.principal,
        share_class=body.share_class,
        committed=True,
    )
