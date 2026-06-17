"""Phantom-share payout calculator.

Phantom shares are a cash-settled obligation: the holder receives the value of a
reference number of shares at an exit, optionally net of withholding tax. Nothing
about this touches the real cap table — it is a pure projection.
"""

import uuid
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.instrument import Instrument, InstrumentType
from app.schemas.instrument import PhantomPayoutResponse

SAR = Decimal("0.01")


def _q(x: Decimal) -> Decimal:
    return x.quantize(SAR, rounding=ROUND_HALF_UP)


async def compute_phantom_payout(
    db: AsyncSession,
    company_id: uuid.UUID,
    instrument_id: uuid.UUID,
    exit_price_per_share_sar: Decimal,
    tax_rate: Decimal = Decimal("0"),
) -> PhantomPayoutResponse:
    instrument = (await db.execute(
        select(Instrument).where(Instrument.id == instrument_id)
    )).scalar_one_or_none()
    if instrument is None or instrument.company_id != company_id:
        raise HTTPException(status_code=404, detail="Instrument not found")
    if instrument.instrument_type != InstrumentType.PHANTOM:
        raise HTTPException(
            status_code=400,
            detail=f"{instrument.instrument_type} is not a phantom instrument",
        )

    gross = instrument.quantity * exit_price_per_share_sar
    tax_withheld = gross * tax_rate
    net = gross - tax_withheld

    return PhantomPayoutResponse(
        instrument_id=instrument.id,
        quantity=instrument.quantity,
        exit_price_per_share_sar=exit_price_per_share_sar,
        gross_payout_sar=_q(gross),
        tax_rate=tax_rate,
        tax_withheld_sar=_q(tax_withheld),
        net_payout_sar=_q(net),
    )
