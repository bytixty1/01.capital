"""Tests for Sprint 5: phantom-share cash payout calculator."""

from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient


async def _company(client: AsyncClient, headers: dict, name: str = "Phantom Co") -> str:
    res = await client.post(
        "/api/companies",
        json={"name_en": name, "entity_type": "SJSC"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


async def _stakeholder(client: AsyncClient, headers: dict, company_id: str, name: str) -> str:
    res = await client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": name},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


async def _phantom(client: AsyncClient, headers: dict, company_id: str, sh: str, quantity: str = "1000") -> str:
    res = await client.post(
        f"/api/companies/{company_id}/instruments",
        json={
            "stakeholder_id": sh, "instrument_type": "phantom", "name": "Phantom Plan",
            "quantity": quantity, "issue_date": date.today().isoformat(),
            "terms": {"reference_share_class": "ordinary", "settlement": "cash"},
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


async def _safe(client: AsyncClient, headers: dict, company_id: str, sh: str) -> str:
    res = await client.post(
        f"/api/companies/{company_id}/instruments",
        json={
            "stakeholder_id": sh, "instrument_type": "safe", "name": "Seed SAFE",
            "face_value": "500000", "quantity": "1", "issue_date": date.today().isoformat(),
            "terms": {"discount": "0.20", "valuation_cap": "1000000"},
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


async def _payout(client: AsyncClient, headers: dict, company_id: str, instrument_id: str, body: dict):
    return await client.post(
        f"/api/companies/{company_id}/instruments/{instrument_id}/phantom-payout",
        json=body,
        headers=headers,
    )


# ── Cash settlement ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cash_payout_no_tax(db_client, mfa_headers):
    cid = await _company(db_client, mfa_headers)
    sh = await _stakeholder(db_client, mfa_headers, cid, "Employee")
    inst = await _phantom(db_client, mfa_headers, cid, sh, quantity="1000")

    res = await _payout(db_client, mfa_headers, cid, inst, {"exit_price_per_share_sar": "10"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert Decimal(body["gross_payout_sar"]) == Decimal("10000")
    assert Decimal(body["tax_withheld_sar"]) == Decimal("0")
    assert Decimal(body["net_payout_sar"]) == Decimal("10000")


@pytest.mark.asyncio
async def test_cash_payout_with_15pct_tax(db_client, mfa_headers):
    cid = await _company(db_client, mfa_headers)
    sh = await _stakeholder(db_client, mfa_headers, cid, "Employee")
    inst = await _phantom(db_client, mfa_headers, cid, sh, quantity="1000")

    res = await _payout(
        db_client, mfa_headers, cid, inst,
        {"exit_price_per_share_sar": "10", "tax_rate": "0.15"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert Decimal(body["gross_payout_sar"]) == Decimal("10000")
    assert Decimal(body["tax_withheld_sar"]) == Decimal("1500")
    assert Decimal(body["net_payout_sar"]) == Decimal("8500")


# ── Error cases ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_wrong_instrument_type_is_400(db_client, mfa_headers):
    cid = await _company(db_client, mfa_headers)
    sh = await _stakeholder(db_client, mfa_headers, cid, "Angel")
    inst = await _safe(db_client, mfa_headers, cid, sh)

    res = await _payout(db_client, mfa_headers, cid, inst, {"exit_price_per_share_sar": "10"})
    assert res.status_code == 400, res.text


@pytest.mark.asyncio
async def test_instrument_not_found_is_404(db_client, mfa_headers):
    cid = await _company(db_client, mfa_headers)
    missing = "00000000-0000-0000-0000-000000000000"

    res = await _payout(db_client, mfa_headers, cid, missing, {"exit_price_per_share_sar": "10"})
    assert res.status_code == 404, res.text


@pytest.mark.asyncio
async def test_instrument_wrong_company_is_404(db_client, mfa_headers):
    cid_a = await _company(db_client, mfa_headers, name="Company A")
    cid_b = await _company(db_client, mfa_headers, name="Company B")
    sh = await _stakeholder(db_client, mfa_headers, cid_a, "Employee")
    inst = await _phantom(db_client, mfa_headers, cid_a, sh, quantity="1000")

    # Instrument belongs to A; request it under B's path.
    res = await _payout(db_client, mfa_headers, cid_b, inst, {"exit_price_per_share_sar": "10"})
    assert res.status_code == 404, res.text
