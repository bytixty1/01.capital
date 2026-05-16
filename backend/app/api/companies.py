"""Company, stakeholder, cap table, and member API routes."""

import uuid

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
    CapitalDecreaseRequest,
    CapitalIncreaseRequest,
    CapTableEventResponse,
    CapTableResponse,
    IssueSharesRequest,
    RoundPreviewRequest,
    RoundPreviewResponse,
    TransferSharesRequest,
)
from app.schemas.company import CompanyResponse, CreateCompanyRequest, UpdateCompanyRequest
from app.schemas.stakeholder import CreateStakeholderRequest, StakeholderResponse
from app.services.cap_table import (
    apply_capital_decrease,
    apply_capital_increase,
    apply_share_issuance,
    apply_share_transfer,
    get_cap_table,
    preview_round as preview_round_service,
    validate_share_class_for_entity,
)
from app.core.security import encrypt_field
from app.services.filing_detector import detect_and_create_filings

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
    await db.flush()

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


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently delete a company and all related data.

    Filings must be deleted first because filings.trigger_event_id FK to
    cap_table_events lacks ON DELETE CASCADE. After that, deleting the Company
    row cascades to all other child tables.
    """
    from app.models.filing import Filing

    # Delete filings first to avoid FK constraint on trigger_event_id
    await db.execute(
        select(Filing).where(Filing.company_id == member.company_id)
    )
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(Filing).where(Filing.company_id == member.company_id))

    result = await db.execute(select(Company).where(Company.id == member.company_id))
    company = result.scalar_one()
    await db.delete(company)
    await db.commit()


# ── Members ──────────────────────────────────────────────────────────────────


@router.get("/{company_id}/members", response_model=list[dict])
async def list_members(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(CompanyMember, User)
        .join(User, CompanyMember.user_id == User.id)
        .where(CompanyMember.company_id == member.company_id)
    )
    return [
        {
            "id": str(row.CompanyMember.id),
            "user_id": str(row.CompanyMember.user_id),
            "email": row.User.email,
            "full_name": row.User.full_name,
            "role": row.CompanyMember.role,
            "created_at": row.CompanyMember.created_at.isoformat(),
        }
        for row in result.all()
    ]


@router.patch("/{company_id}/members/{member_id}", response_model=dict)
async def update_member_role(
    member_id: uuid.UUID,
    body: dict,
    admin: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(CompanyMember).where(
            CompanyMember.id == member_id,
            CompanyMember.company_id == admin.company_id,
        )
    )
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    new_role = body.get("role")
    if new_role not in [r.value for r in MemberRole]:
        raise HTTPException(status_code=422, detail="Invalid role")

    target.role = new_role
    await db.commit()
    return {"id": str(target.id), "role": target.role}


@router.delete("/{company_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    member_id: uuid.UUID,
    admin: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(CompanyMember).where(
            CompanyMember.id == member_id,
            CompanyMember.company_id == admin.company_id,
        )
    )
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    await db.delete(target)
    await db.commit()


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
    data = body.model_dump()
    if data.get("national_id"):
        data["national_id"] = encrypt_field(data["national_id"])
    stakeholder = Stakeholder(company_id=member.company_id, **data)
    db.add(stakeholder)
    await db.commit()
    await db.refresh(stakeholder)
    return stakeholder


@router.get("/{company_id}/stakeholders/{stakeholder_id}")
async def get_stakeholder(
    stakeholder_id: uuid.UUID,
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return a single stakeholder with their holdings."""
    from app.models.holding import Holding

    result = await db.execute(
        select(Stakeholder).where(
            Stakeholder.id == stakeholder_id,
            Stakeholder.company_id == member.company_id,
        )
    )
    stakeholder = result.scalar_one_or_none()
    if stakeholder is None:
        raise HTTPException(status_code=404, detail="Stakeholder not found")

    holdings_result = await db.execute(
        select(Holding).where(
            Holding.stakeholder_id == stakeholder_id,
            Holding.company_id == member.company_id,
        )
    )
    holdings = holdings_result.scalars().all()

    return {
        "id": str(stakeholder.id),
        "company_id": str(stakeholder.company_id),
        "stakeholder_type": stakeholder.stakeholder_type,
        "name_en": stakeholder.name_en,
        "name_ar": stakeholder.name_ar,
        "nationality": stakeholder.nationality,
        "cr_number": stakeholder.cr_number,
        "email": stakeholder.email,
        "created_at": stakeholder.created_at.isoformat(),
        "holdings": [
            {
                "share_class": h.share_class,
                "quantity": str(h.quantity),
            }
            for h in holdings
        ],
    }


@router.delete(
    "/{company_id}/stakeholders/{stakeholder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_stakeholder(
    stakeholder_id: uuid.UUID,
    member: CompanyMember = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Stakeholder).where(
            Stakeholder.id == stakeholder_id,
            Stakeholder.company_id == member.company_id,
        )
    )
    stakeholder = result.scalar_one_or_none()
    if stakeholder is None:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    await db.delete(stakeholder)
    await db.commit()


# ── Cap Table ─────────────────────────────────────────────────────────────────


@router.get("/{company_id}/cap-table", response_model=CapTableResponse)
async def cap_table(
    diluted: bool = False,
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> CapTableResponse:
    return await get_cap_table(db, member.company_id, diluted=diluted)


@router.post(
    "/{company_id}/cap-table/preview-round",
    response_model=RoundPreviewResponse,
)
async def preview_round_endpoint(
    body: RoundPreviewRequest,
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> RoundPreviewResponse:
    """Pure projection of a hypothetical priced round.

    No state mutations. No event log writes. Anyone with cap-table read access can model.
    """
    return await preview_round_service(db, member.company_id, body)


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
    company_result = await db.execute(select(Company).where(Company.id == member.company_id))
    company = company_result.scalar_one()
    validate_share_class_for_entity(company.entity_type, body.share_class)

    result = await db.execute(
        select(Stakeholder).where(
            Stakeholder.id == body.stakeholder_id,
            Stakeholder.company_id == member.company_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Stakeholder not found")

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
    await db.flush()

    await apply_share_issuance(
        db, company_id=member.company_id,
        stakeholder_id=body.stakeholder_id,
        share_class=body.share_class, quantity=body.quantity,
    )

    await detect_and_create_filings(
        db, company_id=member.company_id, entity_type=company.entity_type,
        event_id=event.id, event_type=EventType.SHARE_ISSUANCE, event_date=body.event_date,
    )

    await db.commit()
    await db.refresh(event)
    return event


@router.post(
    "/{company_id}/cap-table/transfer",
    response_model=CapTableEventResponse,
    status_code=status.HTTP_201_CREATED,
)
async def transfer_shares(
    body: TransferSharesRequest,
    member: CompanyMember = Depends(require_admin),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CapTableEvent:
    company_result = await db.execute(select(Company).where(Company.id == member.company_id))
    company = company_result.scalar_one()
    validate_share_class_for_entity(company.entity_type, body.share_class)

    # Verify both stakeholders belong to this company
    for sid in (body.from_stakeholder_id, body.to_stakeholder_id):
        r = await db.execute(
            select(Stakeholder).where(Stakeholder.id == sid, Stakeholder.company_id == member.company_id)
        )
        if r.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail=f"Stakeholder {sid} not found")

    event = CapTableEvent(
        company_id=member.company_id,
        event_type=EventType.SHARE_TRANSFER,
        event_date=body.event_date,
        payload={
            "from_stakeholder_id": str(body.from_stakeholder_id),
            "to_stakeholder_id": str(body.to_stakeholder_id),
            "share_class": body.share_class,
            "quantity": str(body.quantity),
        },
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(event)
    await db.flush()

    await apply_share_transfer(
        db, company_id=member.company_id,
        from_stakeholder_id=body.from_stakeholder_id,
        to_stakeholder_id=body.to_stakeholder_id,
        share_class=body.share_class, quantity=body.quantity,
    )

    await detect_and_create_filings(
        db, company_id=member.company_id, entity_type=company.entity_type,
        event_id=event.id, event_type=EventType.SHARE_TRANSFER, event_date=body.event_date,
    )

    await db.commit()
    await db.refresh(event)
    return event


@router.post(
    "/{company_id}/cap-table/capital-increase",
    response_model=CapTableEventResponse,
    status_code=status.HTTP_201_CREATED,
)
async def capital_increase(
    body: CapitalIncreaseRequest,
    member: CompanyMember = Depends(require_admin),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CapTableEvent:
    company_result = await db.execute(select(Company).where(Company.id == member.company_id))
    company = company_result.scalar_one()
    # Only validate share class if shares are actually being issued in this event
    if body.stakeholder_id is not None and body.shares_issued > 0:
        validate_share_class_for_entity(company.entity_type, body.share_class)

    event = CapTableEvent(
        company_id=member.company_id,
        event_type=EventType.CAPITAL_INCREASE,
        event_date=body.event_date,
        payload={
            "new_authorized_capital": str(body.new_authorized_capital) if body.new_authorized_capital else None,
            "new_paid_up_capital": str(body.new_paid_up_capital) if body.new_paid_up_capital else None,
            "share_class": body.share_class,
            "shares_issued": str(body.shares_issued),
            "stakeholder_id": str(body.stakeholder_id) if body.stakeholder_id else None,
        },
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(event)
    await db.flush()

    # Update company capital figures (company already fetched above for validation)
    if body.new_authorized_capital is not None:
        company.authorized_capital = body.new_authorized_capital
    if body.new_paid_up_capital is not None:
        company.paid_up_capital = body.new_paid_up_capital

    if body.stakeholder_id is not None:
        r = await db.execute(
            select(Stakeholder).where(
                Stakeholder.id == body.stakeholder_id,
                Stakeholder.company_id == member.company_id,
            )
        )
        if r.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stakeholder not found")

    await apply_capital_increase(
        db, company_id=member.company_id,
        stakeholder_id=body.stakeholder_id,
        share_class=body.share_class,
        shares_issued=body.shares_issued,
    )

    await detect_and_create_filings(
        db, company_id=member.company_id, entity_type=company.entity_type,
        event_id=event.id, event_type=EventType.CAPITAL_INCREASE, event_date=body.event_date,
    )

    await db.commit()
    await db.refresh(event)
    return event


@router.post(
    "/{company_id}/cap-table/capital-decrease",
    response_model=CapTableEventResponse,
    status_code=status.HTTP_201_CREATED,
)
async def capital_decrease(
    body: CapitalDecreaseRequest,
    member: CompanyMember = Depends(require_admin),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CapTableEvent:
    company_result = await db.execute(select(Company).where(Company.id == member.company_id))
    company = company_result.scalar_one()
    validate_share_class_for_entity(company.entity_type, body.share_class)

    r = await db.execute(
        select(Stakeholder).where(
            Stakeholder.id == body.stakeholder_id,
            Stakeholder.company_id == member.company_id,
        )
    )
    if r.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Stakeholder not found")

    event = CapTableEvent(
        company_id=member.company_id,
        event_type=EventType.CAPITAL_DECREASE,
        event_date=body.event_date,
        payload={
            "stakeholder_id": str(body.stakeholder_id),
            "share_class": body.share_class,
            "quantity": str(body.quantity),
            "new_paid_up_capital": str(body.new_paid_up_capital) if body.new_paid_up_capital else None,
        },
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(event)
    await db.flush()

    if body.new_paid_up_capital is not None:
        company.paid_up_capital = body.new_paid_up_capital

    await apply_capital_decrease(
        db, company_id=member.company_id,
        stakeholder_id=body.stakeholder_id,
        share_class=body.share_class, quantity=body.quantity,
    )

    await detect_and_create_filings(
        db, company_id=member.company_id, entity_type=company.entity_type,
        event_id=event.id, event_type=EventType.CAPITAL_DECREASE, event_date=body.event_date,
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


@router.get("/{company_id}/exports/zatca")
async def export_zatca(
    member: CompanyMember = Depends(get_company_member),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.zatca import build_zatca_export
    return await build_zatca_export(db, member.company_id)
