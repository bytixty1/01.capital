"""ZATCA export service.

Produces a structured JSON export of the cap table for zakat-year reporting.
Format is aligned with ZATCA's data requirements for corporate ownership disclosure.
Never auto-submits — the export is a data artefact for the company's accountant.
"""

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.holding import Holding
from app.models.stakeholder import Stakeholder


async def build_zatca_export(db: AsyncSession, company_id: uuid.UUID) -> dict:
    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one()

    rows_result = await db.execute(
        select(Holding, Stakeholder)
        .join(Stakeholder, Holding.stakeholder_id == Stakeholder.id)
        .where(Holding.company_id == company_id, Holding.quantity > 0)
        .order_by(Holding.quantity.desc())
    )
    rows = rows_result.all()

    total = sum((r.Holding.quantity for r in rows), Decimal("0"))

    shareholders = []
    for r in rows:
        pct = (r.Holding.quantity / total * 100) if total > 0 else Decimal("0")
        shareholders.append({
            "name_en": r.Stakeholder.name_en,
            "name_ar": r.Stakeholder.name_ar,
            "type": r.Stakeholder.stakeholder_type,
            "nationality": r.Stakeholder.nationality,
            "national_id_masked": f"****{r.Stakeholder.national_id[-4:]}" if r.Stakeholder.national_id else None,
            "cr_number": r.Stakeholder.cr_number,
            "share_class": r.Holding.share_class,
            "shares_held": str(r.Holding.quantity),
            "ownership_pct": f"{pct:.4f}",
        })

    return {
        "_note": "DRAFT — REVIEW WITH LEGAL COUNSEL AND ACCOUNTANT BEFORE USE",
        "export_type": "zatca_ownership_disclosure",
        "company": {
            "name_en": company.name_en,
            "name_ar": company.name_ar,
            "entity_type": company.entity_type,
            "cr_number": company.cr_number,
            "paid_up_capital_sar": str(company.paid_up_capital) if company.paid_up_capital else None,
        },
        "total_shares": str(total),
        "shareholders": shareholders,
    }
