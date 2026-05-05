"""Company, stakeholder, and cap table API routes."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_company_member, get_current_user, require_admin
from app.models.cap_table_event import CapTableEvent, EventType
from app.models.company import Company
from app.models.company_member import CompanyMember, MemberRole
from app.models.stakeholder import Stakeholder
from app.models.user import User
from app.schemas.cap_table import (
    CapTableEventResponse,
    CapTableResponse,
    IssueSharesRequest,
)
from app.schemas.company import CompanyResponse, CreateCompanyRequest, UpdateCompanyRequest
from app.schemas.stakeholder import CreateStakeholderRequest, StakeholderResponse
from app.services.cap_table import apply_share_issuance, get_cap_table

router = APIRouter(prefix="/companies", tags=["companies"])


# ── Companies ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[CompanyResponse])
async def list_companies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Company]:
    result = await db.execute(
        select(Company)
        .join(CompanyMember, CompanyMember.company_id == Company.id)
        .where(CompanyMember.user_id == current_user.id)
        .order_by(Company.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    body: CreateCompanyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Company:
    company = Company(**body.model_dump())
    db.add(company)
    await db.flush()  # get id before adding member

    member = CompanyMember(
        company_id=company.id,
        user_id=current_user.id,
        role=MemberRole.ADMIN,
    )
    db.add(member)
    await db.commit()
    await db.refresh(company)
    return company


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company_detail(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> Company:
    result = await db.execute(select(Company).where(Company.id == member.company_id))
    return result.scalar_one()


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    body: UpdateCompanyRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Company:
    result = await db.execute(select(Company).where(Company.id == member.company_id))
    company = result.scalar_one()
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(company, field, value)
    await db.commit()
    await db.refresh(company)
    return company


# ── Stakeholders ─────────────────────────────────────────────────────────────


@router.get("/{company_id}/stakeholders", response_model=list[StakeholderResponse])
async def list_stakeholders(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> list[Stakeholder]:
    result = await db.execute(
        select(Stakeholder)
        .where(Stakeholder.company_id == member.company_id)
        .order_by(Stakeholder.name_en)
    )
    return list(result.scalars().all())


@router.post(
    "/{company_id}/stakeholders",
    response_model=StakeholderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_stakeholder(
    body: CreateStakeholderRequest,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Stakeholder:
    stakeholder = Stakeholder(company_id=member.company_id, **body.model_dump())
    db.add(stakeholder)
    await db.commit()
    await db.refresh(stakeholder)
    return stakeholder


# ── Cap Table ─────────────────────────────────────────────────────────────────


@router.get("/{company_id}/cap-table", response_model=CapTableResponse)
async def cap_table(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> CapTableResponse:
    return await get_cap_table(db, member.company_id)


@router.post(
    "/{company_id}/cap-table/issue",
    response_model=CapTableEventResponse,
    status_code=status.HTTP_201_CREATED,
)
async def issue_shares(
    body: IssueSharesRequest,
    member: CompanyMember = Depends(require_admin),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CapTableEvent:
    # Verify stakeholder belongs to this company
    result = await db.execute(
        select(Stakeholder).where(
            Stakeholder.id == body.stakeholder_id,
            Stakeholder.company_id == member.company_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stakeholder not found")

    event = CapTableEvent(
        company_id=member.company_id,
        event_type=EventType.SHARE_ISSUANCE,
        event_date=body.event_date,
        payload={
            "stakeholder_id": str(body.stakeholder_id),
            "share_class": body.share_class,
            "quantity": str(body.quantity),
        },
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(event)

    await apply_share_issuance(
        db,
        company_id=member.company_id,
        stakeholder_id=body.stakeholder_id,
        share_class=body.share_class,
        quantity=body.quantity,
    )

    await db.commit()
    await db.refresh(event)
    return event


@router.get("/{company_id}/cap-table/events", response_model=list[CapTableEventResponse])
async def list_events(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> list[CapTableEvent]:
    result = await db.execute(
        select(CapTableEvent)
        .where(CapTableEvent.company_id == member.company_id)
        .order_by(CapTableEvent.event_date.desc(), CapTableEvent.created_at.desc())
    )
    return list(result.scalars().all())
