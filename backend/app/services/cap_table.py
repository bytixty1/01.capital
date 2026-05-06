"""Cap table projection service.

Projects cap_table_events into holdings. Called after every event write
so the holdings table always reflects current state.
"""

import uuid
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cap_table_event import EventType
from app.models.holding import Holding
from app.models.stakeholder import Stakeholder
from app.schemas.cap_table import CapTableResponse, HoldingResponse


async def _get_holding(
    db: AsyncSession,
    company_id: uuid.UUID,
    stakeholder_id: uuid.UUID,
    share_class: str,
) -> Holding | None:
    result = await db.execute(
        select(Holding).where(
            Holding.company_id == company_id,
            Holding.stakeholder_id == stakeholder_id,
            Holding.share_class == share_class,
        )
    )
    return result.scalar_one_or_none()


async def apply_share_issuance(
    db: AsyncSession,
    company_id: uuid.UUID,
    stakeholder_id: uuid.UUID,
    share_class: str,
    quantity: Decimal,
) -> Holding:
    holding = await _get_holding(db, company_id, stakeholder_id, share_class)
    if holding is None:
        holding = Holding(
            company_id=company_id,
            stakeholder_id=stakeholder_id,
            share_class=share_class,
            quantity=quantity,
        )
        db.add(holding)
    else:
        holding.quantity = holding.quantity + quantity
    return holding


async def apply_share_transfer(
    db: AsyncSession,
    company_id: uuid.UUID,
    from_stakeholder_id: uuid.UUID,
    to_stakeholder_id: uuid.UUID,
    share_class: str,
    quantity: Decimal,
) -> None:
    from_holding = await _get_holding(db, company_id, from_stakeholder_id, share_class)
    if from_holding is None or from_holding.quantity < quantity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Insufficient shares: holder has {from_holding.quantity if from_holding else 0}",
        )
    from_holding.quantity = from_holding.quantity - quantity

    to_holding = await _get_holding(db, company_id, to_stakeholder_id, share_class)
    if to_holding is None:
        to_holding = Holding(
            company_id=company_id,
            stakeholder_id=to_stakeholder_id,
            share_class=share_class,
            quantity=quantity,
        )
        db.add(to_holding)
    else:
        to_holding.quantity = to_holding.quantity + quantity


async def apply_capital_increase(
    db: AsyncSession,
    company_id: uuid.UUID,
    stakeholder_id: uuid.UUID | None,
    share_class: str,
    shares_issued: Decimal,
) -> None:
    if shares_issued > 0 and stakeholder_id is not None:
        await apply_share_issuance(db, company_id, stakeholder_id, share_class, shares_issued)


async def apply_capital_decrease(
    db: AsyncSession,
    company_id: uuid.UUID,
    stakeholder_id: uuid.UUID,
    share_class: str,
    quantity: Decimal,
) -> None:
    holding = await _get_holding(db, company_id, stakeholder_id, share_class)
    if holding is None or holding.quantity < quantity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Insufficient shares for capital decrease",
        )
    holding.quantity = holding.quantity - quantity


async def get_cap_table(db: AsyncSession, company_id: uuid.UUID) -> CapTableResponse:
    result = await db.execute(
        select(Holding, Stakeholder)
        .join(Stakeholder, Holding.stakeholder_id == Stakeholder.id)
        .where(Holding.company_id == company_id, Holding.quantity > 0)
        .order_by(Holding.quantity.desc())
    )
    rows = result.all()

    total = sum((r.Holding.quantity for r in rows), Decimal("0"))

    holdings: list[HoldingResponse] = []
    for row in rows:
        pct = (
            (row.Holding.quantity / total * 100).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            if total > 0
            else Decimal("0")
        )
        holdings.append(
            HoldingResponse(
                stakeholder_id=row.Holding.stakeholder_id,
                stakeholder_name=row.Stakeholder.name_en,
                share_class=row.Holding.share_class,
                quantity=row.Holding.quantity,
                percentage=pct,
            )
        )

    return CapTableResponse(
        company_id=company_id,
        total_shares=total,
        holdings=holdings,
    )
