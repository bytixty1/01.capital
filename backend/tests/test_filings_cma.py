"""Tests for Sprint 4: MoC filing tracker enrichment, draft documents, CMA ESOP."""

from datetime import date

import pytest
from httpx import AsyncClient


async def _issue_shares(client: AsyncClient, headers: dict, company_id: str) -> None:
    sh = (await client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": "Founder One"},
        headers=headers,
    )).json()
    await client.post(
        f"/api/companies/{company_id}/cap-table/issue",
        json={"stakeholder_id": sh["id"], "share_class": "quota", "quantity": 1000, "event_date": date.today().isoformat()},
        headers=headers,
    )


# ── MoC filing tracker ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_filings_created_and_enriched_on_issuance(db_client, mfa_headers, company_id):
    # Issuing shares on an LLC triggers a partner-register filing.
    await _issue_shares(db_client, mfa_headers, company_id)

    res = await db_client.get(f"/api/companies/{company_id}/filings", headers=mfa_headers)
    assert res.status_code == 200, res.text
    filings = res.json()
    assert len(filings) >= 1
    f = filings[0]
    assert f["reference"] is not None
    assert f["reference"]["authority"] == "MoC"
    assert "deadline_days" in f["reference"]
    assert "is_overdue" in f
    # Freshly created with a 30-day window — not overdue.
    assert f["is_overdue"] is False


@pytest.mark.asyncio
async def test_filings_reference_endpoint(db_client, mfa_headers, company_id):
    res = await db_client.get(f"/api/companies/{company_id}/filings/reference", headers=mfa_headers)
    assert res.status_code == 200
    ref = res.json()
    assert "moc_partner_register" in ref
    assert ref["moc_partner_register"]["title_ar"]  # Arabic title present
    assert isinstance(ref["moc_partner_register"]["required_documents"], list)


@pytest.mark.asyncio
async def test_filing_draft_pdf_returns_pdf_or_503(db_client, mfa_headers, company_id):
    await _issue_shares(db_client, mfa_headers, company_id)
    filings = (await db_client.get(f"/api/companies/{company_id}/filings", headers=mfa_headers)).json()
    fid = filings[0]["id"]

    res = await db_client.get(f"/api/companies/{company_id}/filings/{fid}/draft.pdf", headers=mfa_headers)
    assert res.status_code in (200, 503)
    if res.status_code == 200:
        assert res.headers["content-type"] == "application/pdf"
        assert res.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_filing_draft_pdf_requires_mfa(db_client, auth_headers, mfa_headers, company_id):
    await _issue_shares(db_client, mfa_headers, company_id)
    filings = (await db_client.get(f"/api/companies/{company_id}/filings", headers=mfa_headers)).json()
    fid = filings[0]["id"]
    res = await db_client.get(f"/api/companies/{company_id}/filings/{fid}/draft.pdf", headers=auth_headers)
    assert res.status_code in (401, 403)


# ── CMA ESOP compliance ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_article_29_checklist(db_client, mfa_headers, company_id):
    res = await db_client.get(f"/api/companies/{company_id}/esop/article-29-checklist", headers=mfa_headers)
    assert res.status_code == 200, res.text
    items = res.json()["checklist"]
    assert len(items) >= 5
    assert all("requirement_en" in i and "requirement_ar" in i for i in items)


@pytest.mark.asyncio
async def test_cma_plan_pdf_returns_pdf_or_503(db_client, mfa_headers, company_id):
    plan = (await db_client.post(
        f"/api/companies/{company_id}/esop",
        json={"name": "Employee Pool 2026", "total_pool": "100000", "share_class": "esop"},
        headers=mfa_headers,
    )).json()
    res = await db_client.get(
        f"/api/companies/{company_id}/esop/{plan['id']}/cma-plan.pdf", headers=mfa_headers
    )
    assert res.status_code in (200, 503)
    if res.status_code == 200:
        assert res.headers["content-type"] == "application/pdf"
        assert res.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_cma_plan_pdf_404_for_unknown_plan(db_client, mfa_headers, company_id):
    import uuid as _uuid
    res = await db_client.get(
        f"/api/companies/{company_id}/esop/{_uuid.uuid4()}/cma-plan.pdf", headers=mfa_headers
    )
    assert res.status_code == 404
