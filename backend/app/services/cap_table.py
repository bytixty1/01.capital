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

from app.models.esop_grant import EsopGrant, GrantStatus
from app.models.esop_plan import EsopPlan, EsopPlanStatus
from app.models.holding import Holding
from app.models.instrument import Instrument, InstrumentStatus, InstrumentType
from app.models.stakeholder import Stakeholder
from app.schemas.cap_table import (
    CapTableResponse,
    HoldingResponse,
    ProjectedHolding,
    RoundPreviewRequest,
    RoundPreviewResponse,
)


def validate_share_class_for_entity(entity_type: str, share_class: str) -> None:
    """Reject share classes that are illegal for the company's entity type.

    Per the 2023 Saudi Companies Law: LLC ownership is distributed as partner
    quotas, not shares, so preferred/common classes are not permitted. SJSC
    and JSC entities support flexible share-class taxonomies.
    """
    if entity_type == "LLC" and share_class != "quota":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "LLC entities use the 'quota' share class only — preferred/common "
                "classes are not permitted under the 2023 Saudi Companies Law "
                "(LLC ownership is via partner quotas, not shares)."
            ),
        )
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


async def apply_share_split(
    db: AsyncSession,
    company_id: uuid.UUID,
    share_class: str,
    numerator: int,
    denominator: int,
) -> None:
    """Multiply all holdings in share_class by (numerator / denominator).

    For a 2-for-1 split: numerator=2, denominator=1 → every holder's shares double.
    For a 1-for-10 reverse split: numerator=1, denominator=10.
    Quantities are rounded to the nearest whole share (ROUND_HALF_UP) since fractional
    shares are not recognised under the 2023 Saudi Companies Law.
    """
    result = await db.execute(
        select(Holding)
        .where(Holding.company_id == company_id, Holding.share_class == share_class)
        .with_for_update()
    )
    holdings = result.scalars().all()
    ratio = Decimal(numerator) / Decimal(denominator)
    for h in holdings:
        h.quantity = (h.quantity * ratio).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


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


async def _compute_diluted_additions(
    db: AsyncSession, company_id: uuid.UUID
) -> list[tuple[str, str, Decimal, str]]:
    """Return synthetic rows contributing to fully-diluted total.

    Each tuple is (synthetic_kind, label, quantity, share_class).
    """
    additions: list[tuple[str, str, Decimal, str]] = []

    # ESOP pool — unallocated reserves (one row per active plan)
    plans = (await db.execute(
        select(EsopPlan).where(
            EsopPlan.company_id == company_id,
            EsopPlan.status == EsopPlanStatus.ACTIVE,
        )
    )).scalars().all()
    for p in plans:
        unallocated = p.total_pool - p.allocated
        if unallocated > 0:
            additions.append(("esop_pool", f"ESOP pool — {p.name} (unallocated)", unallocated, p.share_class))

    # ESOP grants — unexercised options (one synthetic row aggregating all active grants per share class)
    grants = (await db.execute(
        select(EsopGrant, EsopPlan)
        .join(EsopPlan, EsopGrant.plan_id == EsopPlan.id)
        .where(
            EsopGrant.company_id == company_id,
            EsopGrant.status.in_([GrantStatus.ACTIVE, GrantStatus.PARTIALLY_EXERCISED]),
        )
    )).all()
    grant_by_class: dict[str, Decimal] = {}
    for row in grants:
        remaining = row.EsopGrant.quantity - row.EsopGrant.exercised_quantity
        if remaining > 0:
            grant_by_class[row.EsopPlan.share_class] = grant_by_class.get(row.EsopPlan.share_class, Decimal("0")) + remaining
    for share_class, qty in grant_by_class.items():
        additions.append(("esop_grants", "ESOP grants — unexercised", qty, share_class))

    # Convertibles — sukuk-convertibles and warrants, one row per instrument
    instruments = (await db.execute(
        select(Instrument).where(
            Instrument.company_id == company_id,
            Instrument.status == InstrumentStatus.ACTIVE,
            Instrument.instrument_type.in_([InstrumentType.SUKUK_CONVERTIBLE, InstrumentType.WARRANT]),
        )
    )).scalars().all()
    for inst in instruments:
        # Parse conversion_shares from terms JSONB; skip if missing/invalid.
        raw = (inst.terms or {}).get("conversion_shares")
        if raw is None:
            continue
        try:
            conv_qty = Decimal(str(raw))
        except Exception:
            continue
        if conv_qty > 0:
            additions.append(("convertible", inst.name, conv_qty, "as-converted"))

    return additions


async def get_cap_table(
    db: AsyncSession, company_id: uuid.UUID, diluted: bool = False
) -> CapTableResponse:
    result = await db.execute(
        select(Holding, Stakeholder)
        .join(Stakeholder, Holding.stakeholder_id == Stakeholder.id)
        .where(Holding.company_id == company_id, Holding.quantity > 0)
        .order_by(Holding.quantity.desc())
    )
    rows = result.all()

    issued_total = sum((r.Holding.quantity for r in rows), Decimal("0"))

    additions: list[tuple[str, str, Decimal, str]] = []
    diluted_total = issued_total
    if diluted:
        additions = await _compute_diluted_additions(db, company_id)
        diluted_total = issued_total + sum((a[2] for a in additions), Decimal("0"))

    # Denominator for percentages: diluted total if diluted else issued total
    denom = diluted_total if diluted else issued_total

    holdings: list[HoldingResponse] = []
    for row in rows:
        pct = (
            (row.Holding.quantity / denom * 100).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            if denom > 0
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

    # Append synthetic rows in diluted mode
    if diluted:
        for kind, label, qty, share_class in additions:
            pct = (
                (qty / denom * 100).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
                if denom > 0
                else Decimal("0")
            )
            holdings.append(
                HoldingResponse(
                    stakeholder_id=None,
                    stakeholder_name=label,
                    share_class=share_class,
                    quantity=qty,
                    percentage=pct,
                    synthetic=kind,  # type: ignore[arg-type]
                )
            )

    return CapTableResponse(
        company_id=company_id,
        total_shares=denom,
        holdings=holdings,
        total_shares_issued=issued_total,
        total_shares_diluted=diluted_total if diluted else None,
    )


async def _esop_pool_unallocated(db: AsyncSession, company_id: uuid.UUID) -> Decimal:
    """Sum of (total_pool − allocated) across all active ESOP plans for the company."""
    plans = (await db.execute(
        select(EsopPlan).where(
            EsopPlan.company_id == company_id,
            EsopPlan.status == EsopPlanStatus.ACTIVE,
        )
    )).scalars().all()
    return sum((p.total_pool - p.allocated for p in plans), Decimal("0"))


async def preview_round(
    db: AsyncSession,
    company_id: uuid.UUID,
    req: RoundPreviewRequest,
) -> RoundPreviewResponse:
    """Pure projection — model a new priced round against the current cap table.

    NO state mutations. NO event log writes. Caller renders the result for UI display.
    Math convention: ESOP top-up dilutes pre-money holders (added to pre_total before
    new investor shares are issued).
    """
    # 1. Current fully-diluted cap table snapshot.
    diluted_pre = await get_cap_table(db, company_id, diluted=True)
    pre_total = diluted_pre.total_shares_diluted or Decimal("0")

    # 2. Valuations.
    pre_money = pre_total * req.price_per_share

    # 3. New investor shares.
    new_inv_shares = (req.round_size_sar / req.price_per_share).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )

    # 4. ESOP top-up (optional).
    topup = Decimal("0")
    if req.target_esop_post_money_pct is not None and req.target_esop_post_money_pct > 0:
        existing_pool = await _esop_pool_unallocated(db, company_id)
        tgt = req.target_esop_post_money_pct / Decimal("100")
        # Solve: tgt = (existing_pool + topup) / (pre_total + topup + new_inv_shares)
        # => topup = (tgt * (pre_total + new_inv_shares) − existing_pool) / (1 − tgt)
        if tgt < Decimal("1"):
            topup_raw = (tgt * (pre_total + new_inv_shares) - existing_pool) / (Decimal("1") - tgt)
            topup = max(Decimal("0"), topup_raw.quantize(Decimal("1"), rounding=ROUND_HALF_UP))

    # 5. Post-round totals.
    post_total = pre_total + topup + new_inv_shares
    post_money = post_total * req.price_per_share

    # 6. Build projected holdings.
    projected: list[ProjectedHolding] = []
    for h in diluted_pre.holdings:
        pre_pct = Decimal(str(h.percentage))
        post_pct = (
            (h.quantity / post_total * 100).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            if post_total > 0
            else Decimal("0")
        )
        projected.append(ProjectedHolding(
            stakeholder_name=h.stakeholder_name,
            share_class=h.share_class,
            pre_round_quantity=h.quantity,
            pre_round_percentage=pre_pct,
            post_round_quantity=h.quantity,
            post_round_percentage=post_pct,
            dilution_delta_pp=post_pct - pre_pct,
            is_new=False,
            synthetic=h.synthetic,  # type: ignore[arg-type]
        ))

    if topup > 0:
        topup_pct = (topup / post_total * 100).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        projected.append(ProjectedHolding(
            stakeholder_name="ESOP pool — top-up",
            share_class="esop",
            pre_round_quantity=Decimal("0"),
            pre_round_percentage=Decimal("0"),
            post_round_quantity=topup,
            post_round_percentage=topup_pct,
            dilution_delta_pp=topup_pct,
            is_new=True,
            synthetic="esop_topup",
        ))

    new_inv_pct = (
        (new_inv_shares / post_total * 100).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        if post_total > 0
        else Decimal("0")
    )
    projected.append(ProjectedHolding(
        stakeholder_name=req.new_investor_name,
        share_class=req.new_share_class,
        pre_round_quantity=Decimal("0"),
        pre_round_percentage=Decimal("0"),
        post_round_quantity=new_inv_shares,
        post_round_percentage=new_inv_pct,
        dilution_delta_pp=new_inv_pct,
        is_new=True,
        synthetic="new_investor",
    ))

    return RoundPreviewResponse(
        pre_money_valuation_sar=pre_money,
        post_money_valuation_sar=post_money,
        pre_round_total_shares=pre_total,
        post_round_total_shares=post_total,
        new_investor_shares=new_inv_shares,
        esop_topup_shares=topup,
        holdings=projected,
    )
