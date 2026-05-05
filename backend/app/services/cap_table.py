"""Cap table projection service.

Projects cap_table_events into holdings. Called after every event write
so the holdings table always reflects current state.
"""

import uuid
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cap_table_event import CapTableEvent, EventType
from app.models.holding import Holding
from app.models.stakeholder import Stakeholder
from app.schemas.cap_table import CapTableResponse, HoldingResponse


async def apply_share_issuance(
    db: AsyncSession,
    company_id: uuid.UUID,
    stakeholder_id: uuid.UUID,
    share_class: str,
    quantity: Decimal,
) -> Holding:
    result = await db.execute(
        select(Holding).where(
            Holding.company_id == company_id,
            Holding.stakeholder_id == stakeholder_id,
            Holding.share_class == share_class,
        )
    )
    holding = result.scalar_one_or_none()

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
