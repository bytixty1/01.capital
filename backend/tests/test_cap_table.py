"""Cap table integration tests: issuance, transfer, capital increase, event log."""

from decimal import Decimal

import pytest
from httpx import AsyncClient


async def _issue(
    client: AsyncClient,
    headers: dict,
    company_id: str,
    stakeholder_id: str,
    quantity: int,
    # The company_id fixture creates an LLC — only "quota" is legal there
    # (2023 Saudi Companies Law: LLC ownership is partner quotas, not shares).
    share_class: str = "quota",
) -> dict:
    res = await client.post(
        f"/api/companies/{company_id}/cap-table/issue",
        json={
            "stakeholder_id": stakeholder_id,
            "quantity": quantity,
            "share_class": share_class,
            "event_date": "2026-01-01",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()


# ── Issuance ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_issue_shares_creates_holding(
    db_client: AsyncClient, mfa_headers: dict, company_id: str, stakeholder_id: str
) -> None:
    await _issue(db_client, mfa_headers, company_id, stakeholder_id, 1000)

    res = await db_client.get(f"/api/companies/{company_id}/cap-table", headers=mfa_headers)
    assert res.status_code == 200
    holdings = res.json()["holdings"]
    assert len(holdings) == 1
    assert holdings[0]["stakeholder_id"] == stakeholder_id
    assert Decimal(holdings[0]["quantity"]) == 1000


@pytest.mark.asyncio
async def test_issue_shares_to_two_stakeholders_percentage(
    db_client: AsyncClient, mfa_headers: dict, company_id: str, stakeholder_id: str
) -> None:
    second = await db_client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": "Co-Founder"},
        headers=mfa_headers,
    )
    second_id = second.json()["id"]

    await _issue(db_client, mfa_headers, company_id, stakeholder_id, 600)
    await _issue(db_client, mfa_headers, company_id, second_id, 400)

    res = await db_client.get(f"/api/companies/{company_id}/cap-table", headers=mfa_headers)
    body = res.json()
    assert Decimal(body["total_shares"]) == 1000

    pcts = {h["stakeholder_id"]: Decimal(h["percentage"]) for h in body["holdings"]}
    assert pcts[stakeholder_id] == Decimal("60")
    assert pcts[second_id] == Decimal("40")


@pytest.mark.asyncio
async def test_issue_shares_accumulate(
    db_client: AsyncClient, mfa_headers: dict, company_id: str, stakeholder_id: str
) -> None:
    await _issue(db_client, mfa_headers, company_id, stakeholder_id, 500)
    await _issue(db_client, mfa_headers, company_id, stakeholder_id, 500)

    res = await db_client.get(f"/api/companies/{company_id}/cap-table", headers=mfa_headers)
    holding = res.json()["holdings"][0]
    assert Decimal(holding["quantity"]) == 1000


@pytest.mark.asyncio
async def test_issue_requires_auth(db_client: AsyncClient, company_id: str, stakeholder_id: str) -> None:
    res = await db_client.post(
        f"/api/companies/{company_id}/cap-table/issue",
        json={"stakeholder_id": stakeholder_id, "quantity": 100, "event_date": "2026-01-01"},
    )
    assert res.status_code == 403


# ── Transfer ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_transfer_shares_between_stakeholders(
    db_client: AsyncClient, mfa_headers: dict, company_id: str, stakeholder_id: str
) -> None:
    second = await db_client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": "Investor"},
        headers=mfa_headers,
    )
    second_id = second.json()["id"]

    await _issue(db_client, mfa_headers, company_id, stakeholder_id, 1000)

    res = await db_client.post(
        f"/api/companies/{company_id}/cap-table/transfer",
        json={
            "from_stakeholder_id": stakeholder_id,
            "to_stakeholder_id": second_id,
            "quantity": 300,
            "share_class": "quota",
            "event_date": "2026-02-01",
        },
        headers=mfa_headers,
    )
    assert res.status_code == 201

    cap = await db_client.get(f"/api/companies/{company_id}/cap-table", headers=mfa_headers)
    holdings = {h["stakeholder_id"]: Decimal(h["quantity"]) for h in cap.json()["holdings"]}
    assert holdings[stakeholder_id] == Decimal("700")
    assert holdings[second_id] == Decimal("300")


@pytest.mark.asyncio
async def test_transfer_more_than_held_is_400(
    db_client: AsyncClient, mfa_headers: dict, company_id: str, stakeholder_id: str
) -> None:
    second = await db_client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": "Buyer"},
        headers=mfa_headers,
    )
    second_id = second.json()["id"]

    await _issue(db_client, mfa_headers, company_id, stakeholder_id, 100)

    res = await db_client.post(
        f"/api/companies/{company_id}/cap-table/transfer",
        json={
            "from_stakeholder_id": stakeholder_id,
            "to_stakeholder_id": second_id,
            "quantity": 999,
            "share_class": "quota",
            "event_date": "2026-02-01",
        },
        headers=mfa_headers,
    )
    assert res.status_code == 400


# ── Event log ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cap_table_events_are_recorded(
    db_client: AsyncClient, mfa_headers: dict, company_id: str, stakeholder_id: str
) -> None:
    await _issue(db_client, mfa_headers, company_id, stakeholder_id, 500)

    res = await db_client.get(
        f"/api/companies/{company_id}/cap-table/events", headers=mfa_headers
    )
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 1
    assert events[0]["event_type"] == "share_issuance"
    assert events[0]["company_id"] == company_id


@pytest.mark.asyncio
async def test_multiple_events_all_recorded(
    db_client: AsyncClient, mfa_headers: dict, company_id: str, stakeholder_id: str
) -> None:
    second = await db_client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": "Second"},
        headers=mfa_headers,
    )
    second_id = second.json()["id"]

    await _issue(db_client, mfa_headers, company_id, stakeholder_id, 800)
    await db_client.post(
        f"/api/companies/{company_id}/cap-table/transfer",
        json={
            "from_stakeholder_id": stakeholder_id,
            "to_stakeholder_id": second_id,
            "quantity": 200,
            "share_class": "quota",
            "event_date": "2026-03-01",
        },
        headers=mfa_headers,
    )

    events = (await db_client.get(
        f"/api/companies/{company_id}/cap-table/events", headers=mfa_headers
    )).json()
    types = [e["event_type"] for e in events]
    assert "share_issuance" in types
    assert "share_transfer" in types


# ── Capital increase ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_capital_increase_records_event(
    db_client: AsyncClient, mfa_headers: dict, company_id: str
) -> None:
    res = await db_client.post(
        f"/api/companies/{company_id}/cap-table/capital-increase",
        json={
            "new_authorized_capital": 5000000,
            "new_paid_up_capital": 2500000,
            "event_date": "2026-04-01",
        },
        headers=mfa_headers,
    )
    assert res.status_code == 201
    assert res.json()["event_type"] == "capital_increase"
