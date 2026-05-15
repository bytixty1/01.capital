"""Cap table projection service.

Projects cap_table_events into holdings. Called after every event write
so the holdings table always reflects current state.

Concurrency model
-----------------
- apply_share_issuance / apply_capital_increase: PostgreSQL upsert (INSERT … ON CONFLICT DO UPDATE)
  handles the first-insert race atomically — two concurrent issuances to the same stakeholder
  cannot both INSERT; one wins and the other becomes an UPDATE.
- apply_share_transfer / apply_capital_decrease: SELECT … FOR UPDATE locks the existing row
  before checking balance, preventing lost-update races on deduction paths.
- apply_share_transfer destination: also uses upsert so concurrent grants to a new holder are safe.
All paths must be called inside an open transaction (the FastAPI handler commits after returning).
"""

import uuid
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.holding import Holding
from app.models.stakeholder import Stakeholder
from app.schemas.cap_table import CapTableResponse, HoldingResponse


async def _get_holding_for_update(
    db: AsyncSession,
    company_id: uuid.UUID,
    stakeholder_id: uuid.UUID,
    share_class: str,
) -> Holding | None:
    result = await db.execute(
        select(Holding)
        .where(
            Holding.company_id == company_id,
            Holding.stakeholder_id == stakeholder_id,
            Holding.share_class == share_class,
        )
        .with_for_update()
    )
    return result.scalar_one_or_none()


async def _upsert_holding_add(
    db: AsyncSession,
    company_id: uuid.UUID,
    stakeholder_id: uuid.UUID,
    share_class: str,
    quantity: Decimal,
) -> None:
    """Atomically add `quantity` to a holding row, creating it if it does not exist.

    Uses INSERT … ON CONFLICT DO UPDATE so two concurrent first-issuances to the same
    stakeholder cannot both INSERT — one becomes an UPDATE.
    """
    stmt = (
        pg_insert(Holding)
        .values(
            id=uuid.uuid4(),
            company_id=company_id,
            stakeholder_id=stakeholder_id,
            share_class=share_class,
            quantity=quantity,
        )
        .on_conflict_do_update(
            constraint="uq_holding",
            set_={"quantity": text("holdings.quantity + EXCLUDED.quantity")},
        )
    )
    await db.execute(stmt)


async def apply_share_issuance(
    db: AsyncSession,
    company_id: uuid.UUID,
    stakeholder_id: uuid.UUID,
    share_class: str,
    quantity: Decimal,
) -> None:
    await _upsert_holding_add(db, company_id, stakeholder_id, share_class, quantity)


async def apply_share_transfer(
    db: AsyncSession,
    company_id: uuid.UUID,
    from_stakeholder_id: uuid.UUID,
    to_stakeholder_id: uuid.UUID,
    share_class: str,
    quantity: Decimal,
) -> None:
    from_holding = await _get_holding_for_update(db, company_id, from_stakeholder_id, share_class)
    if from_holding is None or from_holding.quantity < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient shares: holder has {from_holding.quantity if from_holding else 0}",
        )
    from_holding.quantity = from_holding.quantity - quantity
    # Upsert for receiver — handles the case where the recipient holds no shares yet
    await _upsert_holding_add(db, company_id, to_stakeholder_id, share_class, quantity)


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
    holding = await _get_holding_for_update(db, company_id, stakeholder_id, share_class)
    if holding is None or holding.quantity < quantity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Insufficient shares for capital decrease",
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
