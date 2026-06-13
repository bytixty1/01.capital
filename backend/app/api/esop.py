"""ESOP plan and grant API routes."""

import uuid
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_company_member, require_admin, require_mfa
from app.models.cap_table_event import CapTableEvent, EventType
from app.models.company_member import CompanyMember
from app.models.esop_grant import EsopGrant, GrantStatus, LeaverType
from app.models.esop_plan import EsopPlan, EsopPlanStatus
from app.models.stakeholder import Stakeholder
from app.models.user import User
from app.schemas.esop import (
    AchieveMilestoneRequest,
    BulkGrantRequest,
    BulkGrantResponse,
    BulkGrantRowResult,
    CreateEsopPlanRequest,
    CreateGrantRequest,
    EsopPlanResponse,
    ExerciseGrantRequest,
    GrantResponse,
    IFRS2ExpenseResponse,
    IFRS2ValuationInputs,
    TerminateGrantRequest,
    VestingStatusResponse,
)
from app.services.cap_table import apply_share_issuance
from app.services.ifrs2 import compute_grant_ifrs2_expense
from app.services.vesting import compute_vested

router = APIRouter(prefix="/companies", tags=["esop"])


@router.get("/{company_id}/esop", response_model=list[EsopPlanResponse])
async def list_plans(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> list[EsopPlan]:
    result = await db.execute(
        select(EsopPlan)
        .where(EsopPlan.company_id == member.company_id)
        .order_by(EsopPlan.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/{company_id}/esop", response_model=EsopPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    body: CreateEsopPlanRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EsopPlan:
    plan = EsopPlan(company_id=member.company_id, **body.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/{company_id}/esop/{plan_id}", response_model=EsopPlanResponse)
async def get_plan(
    plan_id: uuid.UUID,
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> EsopPlan:
    result = await db.execute(
        select(EsopPlan).where(EsopPlan.id == plan_id, EsopPlan.company_id == member.company_id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.get("/{company_id}/esop/{plan_id}/grants", response_model=list[GrantResponse])
async def list_grants(
    plan_id: uuid.UUID,
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> list[EsopGrant]:
    result = await db.execute(
        select(EsopGrant)
        .where(EsopGrant.plan_id == plan_id, EsopGrant.company_id == member.company_id)
        .order_by(EsopGrant.grant_date.desc())
    )
    return list(result.scalars().all())


@router.post(
    "/{company_id}/esop/{plan_id}/grants",
    response_model=GrantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_grant(
    plan_id: uuid.UUID,
    body: CreateGrantRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EsopGrant:
    plan_result = await db.execute(
        select(EsopPlan)
        .where(EsopPlan.id == plan_id, EsopPlan.company_id == member.company_id)
        .with_for_update()
    )
    plan = plan_result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.status != EsopPlanStatus.ACTIVE:
        raise HTTPException(status_code=422, detail="Plan is not active")

    available = plan.total_pool - plan.allocated
    if body.quantity > available:
        raise HTTPException(
            status_code=422,
            detail=f"Quantity exceeds available pool ({available} remaining)",
        )

    stakeholder_result = await db.execute(
        select(Stakeholder).where(
            Stakeholder.id == body.stakeholder_id,
            Stakeholder.company_id == member.company_id,
        )
    )
    if stakeholder_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Stakeholder not found")

    if body.vesting_type == "performance":
        vesting_schedule = {
            "type": "performance",
            "milestones": [
                {
                    "label": m.label,
                    "fraction": str(m.fraction),
                    "achieved": m.achieved,
                    "achieved_date": m.achieved_date.isoformat() if m.achieved_date else None,
                }
                for m in (body.milestones or [])
            ],
        }
    else:
        vesting_schedule = {
            "type": "cliff_monthly",
            "cliff_months": body.cliff_months,
            "total_months": body.total_months,
        }

    grant = EsopGrant(
        plan_id=plan_id,
        company_id=member.company_id,
        stakeholder_id=body.stakeholder_id,
        quantity=body.quantity,
        grant_date=body.grant_date,
        expiry_date=body.expiry_date,
        exercise_price=body.exercise_price,
        vesting_schedule=vesting_schedule,
        notes=body.notes,
    )
    db.add(grant)

    plan.allocated = plan.allocated + body.quantity
    if plan.allocated >= plan.total_pool:
        plan.status = EsopPlanStatus.EXHAUSTED

    await db.commit()
    await db.refresh(grant)
    return grant


@router.get("/{company_id}/esop/{plan_id}/grants/{grant_id}/vesting", response_model=VestingStatusResponse)
async def grant_vesting_status(
    plan_id: uuid.UUID,
    grant_id: uuid.UUID,
    as_of: date | None = None,
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> VestingStatusResponse:
    result = await db.execute(
        select(EsopGrant).where(
            EsopGrant.id == grant_id,
            EsopGrant.plan_id == plan_id,
            EsopGrant.company_id == member.company_id,
        )
    )
    grant = result.scalar_one_or_none()
    if grant is None:
        raise HTTPException(status_code=404, detail="Grant not found")

    as_of_date = as_of or date.today()
    vested = compute_vested(grant.grant_date, grant.vesting_schedule, grant.quantity, as_of_date)
    exercisable = max(vested - grant.exercised_quantity, 0)
    unvested = grant.quantity - vested

    from decimal import Decimal, ROUND_HALF_UP
    vesting_pct = (vested / grant.quantity * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if grant.quantity > 0 else Decimal("0")

    return VestingStatusResponse(
        grant_id=grant.id,
        as_of_date=as_of_date,
        total_granted=grant.quantity,
        vested=vested,
        exercised=grant.exercised_quantity,
        exercisable=exercisable,
        unvested=unvested,
        vesting_pct=vesting_pct,
    )


@router.post(
    "/{company_id}/esop/{plan_id}/grants/{grant_id}/ifrs2-expense",
    response_model=IFRS2ExpenseResponse,
)
async def grant_ifrs2_expense(
    plan_id: uuid.UUID,
    grant_id: uuid.UUID,
    body: IFRS2ValuationInputs,
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> IFRS2ExpenseResponse:
    """Compute IFRS 2 share-based payment expense schedule for a grant.

    Uses Black-Scholes to price the option at grant date, then amortises
    straight-line over the vesting period (yearly buckets).

    Inputs are caller-supplied — fair value of shares, volatility, risk-free
    rate. Sprint 5 will persist these on the company so they don't have to
    be re-entered each time.
    """
    # Defensive check: the grant must belong to this plan + this company.
    result = await db.execute(
        select(EsopGrant).where(
            EsopGrant.id == grant_id,
            EsopGrant.plan_id == plan_id,
            EsopGrant.company_id == member.company_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Grant not found")

    try:
        return await compute_grant_ifrs2_expense(db, member.company_id, grant_id, body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


async def _load_grant_for_update(
    db: AsyncSession, company_id: uuid.UUID, plan_id: uuid.UUID, grant_id: uuid.UUID
) -> EsopGrant:
    result = await db.execute(
        select(EsopGrant)
        .where(
            EsopGrant.id == grant_id,
            EsopGrant.plan_id == plan_id,
            EsopGrant.company_id == company_id,
        )
        .with_for_update()
    )
    grant = result.scalar_one_or_none()
    if grant is None:
        raise HTTPException(status_code=404, detail="Grant not found")
    return grant


@router.post(
    "/{company_id}/esop/{plan_id}/grants/{grant_id}/exercise",
    response_model=GrantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def exercise_grant(
    plan_id: uuid.UUID,
    grant_id: uuid.UUID,
    body: ExerciseGrantRequest,
    member: CompanyMember = Depends(require_admin),
    current_user: User = Depends(require_mfa),
    db: AsyncSession = Depends(get_db),
) -> EsopGrant:
    """Exercise vested options. Exercised options become real shares in the cap table.

    cash exercise:  holder pays strike × quantity; full `quantity` shares are issued.
    net exercise:   holder surrenders shares worth the strike; fewer net shares issue.
                    Net shares require a current FMV — for v1 we issue the full
                    quantity and record exercise_type for the audit trail, since FMV
                    capture lands in Sprint 5. (Documented limitation.)
    """
    grant = await _load_grant_for_update(db, member.company_id, plan_id, grant_id)

    if grant.status in (GrantStatus.FORFEITED, GrantStatus.TERMINATED, GrantStatus.EXPIRED):
        raise HTTPException(status_code=422, detail=f"Grant is {grant.status} and cannot be exercised")

    vested = compute_vested(grant.grant_date, grant.vesting_schedule, grant.quantity, body.exercise_date)
    exercisable = vested - grant.exercised_quantity
    if body.quantity > exercisable:
        raise HTTPException(
            status_code=422,
            detail=f"Only {exercisable} options are vested and exercisable as of {body.exercise_date}",
        )

    plan_result = await db.execute(
        select(EsopPlan).where(EsopPlan.id == plan_id, EsopPlan.company_id == member.company_id)
    )
    plan = plan_result.scalar_one()

    grant.exercised_quantity = grant.exercised_quantity + body.quantity
    if grant.exercised_quantity >= grant.quantity:
        grant.status = GrantStatus.EXERCISED
    else:
        grant.status = GrantStatus.PARTIALLY_EXERCISED

    # Exercised options convert to real holdings under the plan's share class.
    await apply_share_issuance(
        db, company_id=member.company_id,
        stakeholder_id=grant.stakeholder_id,
        share_class=plan.share_class,
        quantity=body.quantity,
    )

    event = CapTableEvent(
        company_id=member.company_id,
        event_type=EventType.OPTION_EXERCISE,
        event_date=body.exercise_date,
        payload={
            "grant_id": str(grant.id),
            "stakeholder_id": str(grant.stakeholder_id),
            "share_class": plan.share_class,
            "quantity": str(body.quantity),
            "exercise_type": body.exercise_type,
            "exercise_price": str(grant.exercise_price) if grant.exercise_price is not None else None,
        },
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(event)

    await db.commit()
    await db.refresh(grant)
    return grant


@router.post(
    "/{company_id}/esop/{plan_id}/grants/{grant_id}/terminate",
    response_model=GrantResponse,
)
async def terminate_grant(
    plan_id: uuid.UUID,
    grant_id: uuid.UUID,
    body: TerminateGrantRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EsopGrant:
    """Handle employee departure under good-leaver / bad-leaver rules.

    good_leaver: keeps vested options; unvested are forfeited back to the pool.
    bad_leaver:  forfeits ALL options (vested and unvested) back to the pool.

    Forfeited quantity is returned to the plan's available pool by decrementing
    allocated. Already-exercised shares are never clawed back (they are issued shares).
    """
    grant = await _load_grant_for_update(db, member.company_id, plan_id, grant_id)

    if grant.status in (GrantStatus.FORFEITED, GrantStatus.TERMINATED):
        raise HTTPException(status_code=422, detail="Grant is already terminated")

    vested = compute_vested(grant.grant_date, grant.vesting_schedule, grant.quantity, body.termination_date)

    if body.leaver_type == LeaverType.GOOD_LEAVER:
        # Forfeit unvested only.
        forfeited = grant.quantity - vested
    else:
        # Bad leaver: forfeit everything not yet exercised.
        forfeited = grant.quantity - grant.exercised_quantity

    forfeited = max(forfeited, Decimal("0"))

    plan_result = await db.execute(
        select(EsopPlan)
        .where(EsopPlan.id == plan_id, EsopPlan.company_id == member.company_id)
        .with_for_update()
    )
    plan = plan_result.scalar_one()
    plan.allocated = max(plan.allocated - forfeited, Decimal("0"))
    if plan.status == EsopPlanStatus.EXHAUSTED and plan.allocated < plan.total_pool:
        plan.status = EsopPlanStatus.ACTIVE

    grant.status = GrantStatus.TERMINATED
    grant.termination_date = body.termination_date
    grant.leaver_type = body.leaver_type
    if body.notes:
        grant.notes = body.notes

    await db.commit()
    await db.refresh(grant)
    return grant


@router.post(
    "/{company_id}/esop/{plan_id}/grants/{grant_id}/achieve-milestone",
    response_model=GrantResponse,
)
async def achieve_milestone(
    plan_id: uuid.UUID,
    grant_id: uuid.UUID,
    body: AchieveMilestoneRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EsopGrant:
    """Mark a performance-vesting milestone as achieved, vesting its fraction."""
    grant = await _load_grant_for_update(db, member.company_id, plan_id, grant_id)

    schedule = dict(grant.vesting_schedule)
    if schedule.get("type") != "performance":
        raise HTTPException(status_code=422, detail="Grant does not use performance vesting")

    milestones = list(schedule.get("milestones", []))
    if body.milestone_index >= len(milestones):
        raise HTTPException(status_code=404, detail="Milestone index out of range")

    milestones[body.milestone_index] = {
        **milestones[body.milestone_index],
        "achieved": True,
        "achieved_date": body.achieved_date.isoformat(),
    }
    schedule["milestones"] = milestones
    grant.vesting_schedule = schedule

    await db.commit()
    await db.refresh(grant)
    return grant


@router.post(
    "/{company_id}/esop/{plan_id}/grants/bulk",
    response_model=BulkGrantResponse,
)
async def bulk_create_grants(
    plan_id: uuid.UUID,
    body: BulkGrantRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> BulkGrantResponse:
    """Validate and (optionally) create many grants in one atomic operation.

    With dry_run=true (default) nothing is written — the response is a preview:
    per-row validation plus the resulting pool position. The client shows this,
    the user confirms, then resubmits with dry_run=false to commit.
    All-or-nothing: if any row fails on a real (non-dry-run) submit, nothing commits.
    """
    plan_result = await db.execute(
        select(EsopPlan)
        .where(EsopPlan.id == plan_id, EsopPlan.company_id == member.company_id)
        .with_for_update()
    )
    plan = plan_result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.status != EsopPlanStatus.ACTIVE:
        raise HTTPException(status_code=422, detail="Plan is not active")

    # Preload valid stakeholder IDs for this company in one query.
    sh_result = await db.execute(
        select(Stakeholder.id).where(Stakeholder.company_id == member.company_id)
    )
    valid_stakeholders = {row[0] for row in sh_result.all()}

    available = plan.total_pool - plan.allocated
    running_total = Decimal("0")
    results: list[BulkGrantRowResult] = []

    for row in body.grants:
        err: str | None = None
        if row.stakeholder_id not in valid_stakeholders:
            err = "stakeholder not found"
        elif running_total + row.quantity > available:
            err = f"exceeds remaining pool (running total would be {running_total + row.quantity}, available {available})"
        if err is None:
            running_total += row.quantity
        results.append(
            BulkGrantRowResult(
                stakeholder_id=row.stakeholder_id,
                quantity=row.quantity,
                ok=err is None,
                error=err,
            )
        )

    valid_rows = sum(1 for r in results if r.ok)
    all_valid = valid_rows == len(results)
    committed = 0

    if not body.dry_run:
        if not all_valid:
            raise HTTPException(
                status_code=422,
                detail="Bulk grant rejected: one or more rows are invalid. Fix and resubmit.",
            )
        for row in body.grants:
            grant = EsopGrant(
                plan_id=plan_id,
                company_id=member.company_id,
                stakeholder_id=row.stakeholder_id,
                quantity=row.quantity,
                grant_date=row.grant_date,
                exercise_price=row.exercise_price,
                vesting_schedule={
                    "type": "cliff_monthly",
                    "cliff_months": row.cliff_months,
                    "total_months": row.total_months,
                },
            )
            db.add(grant)
            committed += 1
        plan.allocated = plan.allocated + running_total
        if plan.allocated >= plan.total_pool:
            plan.status = EsopPlanStatus.EXHAUSTED
        await db.commit()

    return BulkGrantResponse(
        dry_run=body.dry_run,
        total_rows=len(results),
        valid_rows=valid_rows,
        total_quantity=running_total,
        pool_remaining_after=(available - running_total).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
        committed=committed,
        results=results,
    )
