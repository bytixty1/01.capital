"""Tests for Sprint 5: liquidation waterfall + breakpoint engine.

Tests 1–6 exercise the engine (compute_waterfall) directly against a seeded
cap table; test 7 is an end-to-end smoke test through the API endpoint.

Cap tables are seeded via the API (SJSC entities, since LLCs are restricted to
the 'quota' class). natural_person stakeholders are used to avoid CR-number
uniqueness collisions.
"""

import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.schemas.cap_table import WaterfallPreference, WaterfallRequest
from app.services.waterfall import compute_waterfall


# ── Seeding helpers ────────────────────────────────────────────────────────────

async def _company(client: AsyncClient, headers: dict, name: str = "Waterfall Co") -> str:
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


async def _issue(
    client: AsyncClient, headers: dict, company_id: str,
    stakeholder_id: str, quantity: int, share_class: str,
) -> None:
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


async def _run(db_engine, company_id: str, exit_value: str, preferences: list) -> object:
    """Run the waterfall engine against the committed cap table in the test DB."""
    factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with factory() as session:
        return await compute_waterfall(
            session,
            uuid.UUID(company_id),
            WaterfallRequest(exit_value_sar=Decimal(exit_value), preferences=preferences),
        )


def _by_class(resp) -> dict:
    return {c.share_class: c for c in resp.class_distributions}


# ── Engine scenarios ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_common_only_distribution(db_client, mfa_headers, db_engine):
    """No preferences: the sole common class takes the entire exit value."""
    cid = await _company(db_client, mfa_headers)
    sh = await _stakeholder(db_client, mfa_headers, cid, "Founder")
    await _issue(db_client, mfa_headers, cid, sh, 1000, "ordinary")

    resp = await _run(db_engine, cid, "1000000", [])

    classes = _by_class(resp)
    assert classes["ordinary"].total_distribution_sar == Decimal("1000000")
    assert resp.total_distributed_sar == Decimal("1000000")
    assert len(resp.stakeholder_distributions) == 1
    assert resp.stakeholder_distributions[0].distribution_sar == Decimal("1000000")


@pytest.mark.asyncio
async def test_one_x_non_participating_preferred(db_client, mfa_headers, db_engine):
    """1x non-participating preferred takes its preference and does NOT also
    share the remainder (no double-dip)."""
    cid = await _company(db_client, mfa_headers)
    founder = await _stakeholder(db_client, mfa_headers, cid, "Founder")
    investor = await _stakeholder(db_client, mfa_headers, cid, "Investor")
    await _issue(db_client, mfa_headers, cid, founder, 1000, "ordinary")
    await _issue(db_client, mfa_headers, cid, investor, 1000, "preferred-a")

    prefs = [WaterfallPreference(
        share_class="preferred-a", seniority=1, multiplier=Decimal("1"),
        participation="non_participating", original_investment_sar=Decimal("600000"),
    )]
    resp = await _run(db_engine, cid, "1000000", prefs)

    classes = _by_class(resp)
    assert classes["preferred-a"].total_distribution_sar == Decimal("600000")
    assert classes["preferred-a"].converted is False
    assert classes["ordinary"].total_distribution_sar == Decimal("400000")


@pytest.mark.asyncio
async def test_one_x_participating_preferred(db_client, mfa_headers, db_engine):
    """1x participating preferred takes its preference AND shares the remainder
    pro-rata (the double-dip that distinguishes participating)."""
    cid = await _company(db_client, mfa_headers)
    founder = await _stakeholder(db_client, mfa_headers, cid, "Founder")
    investor = await _stakeholder(db_client, mfa_headers, cid, "Investor")
    await _issue(db_client, mfa_headers, cid, founder, 1000, "ordinary")
    await _issue(db_client, mfa_headers, cid, investor, 1000, "preferred-a")

    prefs = [WaterfallPreference(
        share_class="preferred-a", multiplier=Decimal("1"),
        participation="participating", original_investment_sar=Decimal("500000"),
    )]
    resp = await _run(db_engine, cid, "1000000", prefs)

    classes = _by_class(resp)
    # 500k preference + half of the remaining 500k = 750k.
    assert classes["preferred-a"].total_distribution_sar == Decimal("750000")
    assert classes["ordinary"].total_distribution_sar == Decimal("250000")


@pytest.mark.asyncio
async def test_capped_participating_preferred(db_client, mfa_headers, db_engine):
    """Capped participating preferred is clipped at cap_multiplier * investment;
    the surplus redistributes to the uncapped common class."""
    cid = await _company(db_client, mfa_headers)
    founder = await _stakeholder(db_client, mfa_headers, cid, "Founder")
    investor = await _stakeholder(db_client, mfa_headers, cid, "Investor")
    await _issue(db_client, mfa_headers, cid, founder, 1000, "ordinary")
    await _issue(db_client, mfa_headers, cid, investor, 1000, "preferred-a")

    prefs = [WaterfallPreference(
        share_class="preferred-a", multiplier=Decimal("1"),
        participation="capped", cap_multiplier=Decimal("3"),
        original_investment_sar=Decimal("500000"),
    )]
    resp = await _run(db_engine, cid, "5000000", prefs)

    classes = _by_class(resp)
    # Cap = 3 * 500k = 1.5M; preferred clipped there, common takes the rest.
    assert classes["preferred-a"].total_distribution_sar == Decimal("1500000")
    assert classes["ordinary"].total_distribution_sar == Decimal("3500000")


@pytest.mark.asyncio
async def test_breakpoints_non_empty_with_preferred(db_client, mfa_headers, db_engine):
    """A preferred class with a real preference produces breakpoints."""
    cid = await _company(db_client, mfa_headers)
    founder = await _stakeholder(db_client, mfa_headers, cid, "Founder")
    investor = await _stakeholder(db_client, mfa_headers, cid, "Investor")
    await _issue(db_client, mfa_headers, cid, founder, 1000, "ordinary")
    await _issue(db_client, mfa_headers, cid, investor, 1000, "preferred-a")

    prefs = [WaterfallPreference(
        share_class="preferred-a", multiplier=Decimal("1"),
        participation="non_participating", original_investment_sar=Decimal("500000"),
    )]
    resp = await _run(db_engine, cid, "1000000", prefs)

    assert len(resp.breakpoints) > 0
    assert any(b.breakpoint_type == "common_starts" for b in resp.breakpoints)


@pytest.mark.asyncio
async def test_exit_below_preferences_common_gets_zero(db_client, mfa_headers, db_engine):
    """When the exit is below total liquidation preferences, common gets nothing."""
    cid = await _company(db_client, mfa_headers)
    founder = await _stakeholder(db_client, mfa_headers, cid, "Founder")
    investor = await _stakeholder(db_client, mfa_headers, cid, "Investor")
    await _issue(db_client, mfa_headers, cid, founder, 1000, "ordinary")
    await _issue(db_client, mfa_headers, cid, investor, 1000, "preferred-a")

    prefs = [WaterfallPreference(
        share_class="preferred-a", multiplier=Decimal("1"),
        participation="non_participating", original_investment_sar=Decimal("1000000"),
    )]
    resp = await _run(db_engine, cid, "500000", prefs)

    classes = _by_class(resp)
    assert classes["ordinary"].total_distribution_sar == Decimal("0")
    assert classes["preferred-a"].total_distribution_sar == Decimal("500000")


# ── API smoke test ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_waterfall_api_smoke(db_client, mfa_headers):
    """End-to-end: POST the waterfall endpoint and validate the response shape."""
    cid = await _company(db_client, mfa_headers)
    founder = await _stakeholder(db_client, mfa_headers, cid, "Founder")
    investor = await _stakeholder(db_client, mfa_headers, cid, "Investor")
    await _issue(db_client, mfa_headers, cid, founder, 1000, "ordinary")
    await _issue(db_client, mfa_headers, cid, investor, 1000, "preferred-a")

    res = await db_client.post(
        f"/api/companies/{cid}/cap-table/waterfall",
        json={
            "exit_value_sar": "2000000",
            "preferences": [{
                "share_class": "preferred-a", "seniority": 1, "multiplier": "1",
                "participation": "participating", "original_investment_sar": "500000",
            }],
        },
        headers=mfa_headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert {
        "exit_value_sar", "total_distributed_sar", "stakeholder_distributions",
        "class_distributions", "breakpoints",
    } <= set(body.keys())
    assert Decimal(body["total_distributed_sar"]) > 0
