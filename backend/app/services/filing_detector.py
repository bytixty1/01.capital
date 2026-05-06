"""Filing detection — creates Filing records when cap table events require compliance action.

Per CLAUDE.md: never auto-submits to MoC/ZATCA/CMA. Only surfaces obligations.
"""

import uuid
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cap_table_event import EventType
from app.models.company import EntityType
from app.models.filing import Filing, FilingType


# Days after an event that the corresponding MoC filing is typically due
_MOC_FILING_WINDOW_DAYS = 30


def _due(event_date: date) -> date:
    return event_date + timedelta(days=_MOC_FILING_WINDOW_DAYS)


async def detect_and_create_filings(
    db: AsyncSession,
    company_id: uuid.UUID,
    entity_type: str,
    event_id: uuid.UUID,
    event_type: str,
    event_date: date,
) -> list[Filing]:
    """Create Filing rows for any compliance obligations triggered by the event."""
    filings: list[Filing] = []

    # Share issuance → update partner register at MoC (LLC/SJSC requirement)
    if event_type == EventType.SHARE_ISSUANCE and entity_type in (EntityType.LLC, EntityType.SJSC):
        filings.append(Filing(
            company_id=company_id,
            filing_type=FilingType.MOC_PARTNER_REGISTER,
            trigger_event_id=event_id,
            due_date=_due(event_date),
        ))

    # Share transfer → update partner register
    if event_type == EventType.SHARE_TRANSFER and entity_type in (EntityType.LLC, EntityType.SJSC):
        filings.append(Filing(
            company_id=company_id,
            filing_type=FilingType.MOC_PARTNER_REGISTER,
            trigger_event_id=event_id,
            due_date=_due(event_date),
        ))

    # Capital increase or decrease → capital change filing + AoA amendment
    if event_type in (EventType.CAPITAL_INCREASE, EventType.CAPITAL_DECREASE):
        filings.append(Filing(
            company_id=company_id,
            filing_type=FilingType.MOC_CAPITAL_CHANGE,
            trigger_event_id=event_id,
            due_date=_due(event_date),
        ))
        filings.append(Filing(
            company_id=company_id,
            filing_type=FilingType.MOC_AOA_AMENDMENT,
            trigger_event_id=event_id,
            due_date=_due(event_date),
        ))

    for f in filings:
        db.add(f)

    return filings
