"""ESOP plan and grant API routes."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_company_member, require_admin
from app.models.company_member import CompanyMember
from app.models.esop_grant import EsopGrant
from app.models.esop_plan import EsopPlan, EsopPlanStatus
from app.models.stakeholder import Stakeholder
from app.models.user import User
from app.schemas.esop import (
    CreateEsopPlanRequest,
    CreateGrantRequest,
    EsopPlanResponse,
    GrantResponse,
    VestingStatusResponse,
)
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
