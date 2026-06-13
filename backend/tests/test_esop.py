"""Tests for ESOP plans, grants, vesting, exercise, termination, and bulk issuance."""

from datetime import date, timedelta

import pytest
from httpx import AsyncClient


async def _create_plan(client: AsyncClient, headers: dict, company_id: str, pool: int = 100000) -> str:
    res = await client.post(
        f"/api/companies/{company_id}/esop",
        json={"name": "Employee Pool 2026", "total_pool": str(pool), "share_class": "esop"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


async def _create_stakeholder(client: AsyncClient, headers: dict, company_id: str, name: str) -> str:
    res = await client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": name},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def _years_ago(years: int) -> str:
    return (date.today() - timedelta(days=365 * years)).isoformat()


# ── Plan + grant basics ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_plan_and_time_based_grant(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id)
    res = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={
            "stakeholder_id": stakeholder_id,
            "quantity": "1000",
            "grant_date": _years_ago(2),
            "cliff_months": 12,
            "total_months": 48,
        },
        headers=mfa_headers,
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["vesting_schedule"]["type"] == "cliff_monthly"
    assert body["status"] == "active"


@pytest.mark.asyncio
async def test_grant_exceeding_pool_is_rejected(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id, pool=500)
    res = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={"stakeholder_id": stakeholder_id, "quantity": "1000", "grant_date": _years_ago(1)},
        headers=mfa_headers,
    )
    assert res.status_code == 422


# ── Vesting ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_vesting_before_cliff_is_zero(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id)
    grant = (await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={
            "stakeholder_id": stakeholder_id, "quantity": "4800",
            "grant_date": (date.today() - timedelta(days=90)).isoformat(),
            "cliff_months": 12, "total_months": 48,
        },
        headers=mfa_headers,
    )).json()
    res = await db_client.get(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/{grant['id']}/vesting",
        headers=mfa_headers,
    )
    assert res.status_code == 200
    assert float(res.json()["vested"]) == 0


@pytest.mark.asyncio
async def test_vesting_after_two_years_is_half(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id)
    grant = (await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={
            "stakeholder_id": stakeholder_id, "quantity": "4800",
            "grant_date": _years_ago(2), "cliff_months": 12, "total_months": 48,
        },
        headers=mfa_headers,
    )).json()
    res = await db_client.get(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/{grant['id']}/vesting",
        headers=mfa_headers,
    )
    vested = float(res.json()["vested"])
    # ~24/48 of 4800 = ~2400 (allow a small window for day-rounding)
    assert 2350 <= vested <= 2450


# ── Exercise ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_exercise_unvested_is_rejected(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id)
    grant = (await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={
            "stakeholder_id": stakeholder_id, "quantity": "1000",
            "grant_date": (date.today() - timedelta(days=30)).isoformat(),
            "cliff_months": 12, "total_months": 48,
        },
        headers=mfa_headers,
    )).json()
    res = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/{grant['id']}/exercise",
        json={"quantity": "100", "exercise_type": "cash", "exercise_date": date.today().isoformat()},
        headers=mfa_headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_exercise_vested_issues_shares(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id)
    grant = (await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={
            "stakeholder_id": stakeholder_id, "quantity": "4800",
            "grant_date": _years_ago(2), "cliff_months": 12, "total_months": 48,
            "exercise_price": "1.00",
        },
        headers=mfa_headers,
    )).json()
    res = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/{grant['id']}/exercise",
        json={"quantity": "1000", "exercise_type": "cash", "exercise_date": date.today().isoformat()},
        headers=mfa_headers,
    )
    assert res.status_code == 201, res.text
    assert res.json()["status"] == "partially_exercised"
    assert float(res.json()["exercised_quantity"]) == 1000

    # The exercised options should now be real shares in the cap table.
    cap = await db_client.get(f"/api/companies/{company_id}/cap-table", headers=mfa_headers)
    esop_holdings = [h for h in cap.json()["holdings"] if h["share_class"] == "esop"]
    assert any(float(h["quantity"]) == 1000 for h in esop_holdings)


# ── Termination ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_good_leaver_forfeits_unvested_and_frees_pool(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id, pool=10000)
    grant = (await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={
            "stakeholder_id": stakeholder_id, "quantity": "4800",
            "grant_date": _years_ago(2), "cliff_months": 12, "total_months": 48,
        },
        headers=mfa_headers,
    )).json()

    res = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/{grant['id']}/terminate",
        json={"leaver_type": "good_leaver", "termination_date": date.today().isoformat()},
        headers=mfa_headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "terminated"
    assert res.json()["leaver_type"] == "good_leaver"

    # Pool should be partially freed: ~2400 unvested returned, ~2400 vested still allocated.
    plan = (await db_client.get(f"/api/companies/{company_id}/esop/{plan_id}", headers=mfa_headers)).json()
    assert 2350 <= float(plan["allocated"]) <= 2450


@pytest.mark.asyncio
async def test_bad_leaver_forfeits_everything(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id, pool=10000)
    grant = (await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={
            "stakeholder_id": stakeholder_id, "quantity": "4800",
            "grant_date": _years_ago(2), "cliff_months": 12, "total_months": 48,
        },
        headers=mfa_headers,
    )).json()

    res = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/{grant['id']}/terminate",
        json={"leaver_type": "bad_leaver", "termination_date": date.today().isoformat()},
        headers=mfa_headers,
    )
    assert res.status_code == 200, res.text
    plan = (await db_client.get(f"/api/companies/{company_id}/esop/{plan_id}", headers=mfa_headers)).json()
    assert float(plan["allocated"]) == 0


# ── Performance vesting ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_performance_vesting_milestone_flow(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id)
    grant = (await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={
            "stakeholder_id": stakeholder_id, "quantity": "1000",
            "grant_date": _years_ago(1), "vesting_type": "performance",
            "milestones": [
                {"label": "Revenue SAR 10M", "fraction": "0.5"},
                {"label": "IPO filing", "fraction": "0.5"},
            ],
        },
        headers=mfa_headers,
    )).json()
    assert grant["vesting_schedule"]["type"] == "performance"

    # Nothing achieved yet → 0 vested
    v = (await db_client.get(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/{grant['id']}/vesting",
        headers=mfa_headers,
    )).json()
    assert float(v["vested"]) == 0

    # Achieve first milestone → 50% vests
    res = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/{grant['id']}/achieve-milestone",
        json={"milestone_index": 0, "achieved_date": date.today().isoformat()},
        headers=mfa_headers,
    )
    assert res.status_code == 200, res.text
    v = (await db_client.get(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/{grant['id']}/vesting",
        headers=mfa_headers,
    )).json()
    assert float(v["vested"]) == 500


@pytest.mark.asyncio
async def test_performance_vesting_requires_milestones(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id)
    res = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants",
        json={
            "stakeholder_id": stakeholder_id, "quantity": "1000",
            "grant_date": _years_ago(1), "vesting_type": "performance",
        },
        headers=mfa_headers,
    )
    assert res.status_code == 422


# ── Bulk grants ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_bulk_grant_dry_run_then_commit(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id, pool=10000)
    sh2 = await _create_stakeholder(db_client, mfa_headers, company_id, "Employee Two")

    rows = {
        "dry_run": True,
        "grants": [
            {"stakeholder_id": stakeholder_id, "quantity": "1000", "grant_date": _years_ago(1)},
            {"stakeholder_id": sh2, "quantity": "2000", "grant_date": _years_ago(1)},
        ],
    }

    preview = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/bulk", json=rows, headers=mfa_headers
    )
    assert preview.status_code == 200, preview.text
    pj = preview.json()
    assert pj["dry_run"] is True
    assert pj["valid_rows"] == 2
    assert pj["committed"] == 0
    assert float(pj["total_quantity"]) == 3000

    rows["dry_run"] = False
    commit = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/bulk", json=rows, headers=mfa_headers
    )
    assert commit.status_code == 200, commit.text
    assert commit.json()["committed"] == 2

    grants = (await db_client.get(
        f"/api/companies/{company_id}/esop/{plan_id}/grants", headers=mfa_headers
    )).json()
    assert len(grants) == 2


@pytest.mark.asyncio
async def test_bulk_grant_over_pool_is_rejected_on_commit(db_client, mfa_headers, company_id, stakeholder_id):
    plan_id = await _create_plan(db_client, mfa_headers, company_id, pool=1000)
    rows = {
        "dry_run": False,
        "grants": [
            {"stakeholder_id": stakeholder_id, "quantity": "800", "grant_date": _years_ago(1)},
            {"stakeholder_id": stakeholder_id, "quantity": "800", "grant_date": _years_ago(1)},
        ],
    }
    res = await db_client.post(
        f"/api/companies/{company_id}/esop/{plan_id}/grants/bulk", json=rows, headers=mfa_headers
    )
    assert res.status_code == 422
    # Nothing should have committed.
    grants = (await db_client.get(
        f"/api/companies/{company_id}/esop/{plan_id}/grants", headers=mfa_headers
    )).json()
    assert len(grants) == 0
