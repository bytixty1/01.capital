"""Tests for bilingual PDF document generation.

The HTML rendering layer (pure Jinja2) is tested directly and deterministically.
The PDF endpoints are tested for auth + availability: WeasyPrint's native libs
are absent in CI, so endpoints return 503 there and 200 (application/pdf) where
the libraries are installed. Both are accepted.
"""

from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest
from httpx import AsyncClient

from app.services.pdf import (
    WATERMARK_AR,
    WATERMARK_EN,
    render_cap_table_html,
    render_share_certificate_html,
    render_vesting_schedule_html,
)


# ── HTML layer (no native deps) ───────────────────────────────────────────────

def _company():
    return SimpleNamespace(name_en="Acme SJSC", name_ar="أكمي", entity_type="SJSC", cr_number="1010123456")


def _holdings(*rows):
    return SimpleNamespace(
        holdings=[SimpleNamespace(**r) for r in rows],
        total_shares_issued=Decimal("10000"),
        total_shares_diluted=Decimal("12000"),
    )


def test_cap_table_html_has_watermark_and_bilingual_content():
    issued = _holdings(
        {"stakeholder_name": "Founder A", "share_class": "ordinary", "quantity": Decimal("7000"), "percentage": Decimal("70.00"), "synthetic": None},
        {"stakeholder_name": "Founder B", "share_class": "ordinary", "quantity": Decimal("3000"), "percentage": Decimal("30.00"), "synthetic": None},
    )
    diluted = _holdings(
        {"stakeholder_name": "Founder A", "share_class": "ordinary", "quantity": Decimal("7000"), "percentage": Decimal("58.33"), "synthetic": None},
        {"stakeholder_name": "ESOP pool", "share_class": "esop", "quantity": Decimal("2000"), "percentage": Decimal("16.67"), "synthetic": "esop_pool"},
    )
    html = render_cap_table_html(_company(), issued, diluted, is_draft=True)

    assert WATERMARK_EN in html
    assert WATERMARK_AR in html
    assert "Acme SJSC" in html
    assert "أكمي" in html  # Arabic name rendered
    assert "Founder A" in html
    assert "7,000" in html          # thousands formatting
    assert "Capitalization Table" in html
    assert "جدول الملكية" in html   # Arabic title
    assert "esop_pool" in html      # synthetic row labelled


def test_cap_table_html_final_has_no_watermark():
    issued = _holdings({"stakeholder_name": "X", "share_class": "ordinary", "quantity": Decimal("10000"), "percentage": Decimal("100.00"), "synthetic": None})
    html = render_cap_table_html(_company(), issued, issued, is_draft=False)
    # The diagonal body::before watermark is omitted when not a draft.
    assert "body::before" not in html
    # Final badge present
    assert "FINAL" in html


def test_share_certificate_html_llc_uses_quota_wording():
    company = SimpleNamespace(name_en="Beta LLC", name_ar=None, entity_type="LLC", cr_number=None)
    holder = SimpleNamespace(name_en="Partner One", name_ar="شريك", nationality="SAU")
    html = render_share_certificate_html(company, holder, "quota", Decimal("500"), Decimal("50.00"), is_draft=True)
    assert "Quota Certificate" in html
    assert "شهادة حصص" in html
    assert "Partner One" in html
    assert "SAU" in html
    assert WATERMARK_EN in html


def test_vesting_schedule_html_performance_lists_milestones():
    company = _company()
    plan = SimpleNamespace(name="Pool 2026")
    grant = SimpleNamespace(
        quantity=Decimal("1000"),
        exercised_quantity=Decimal("0"),
        grant_date=date(2026, 1, 1),
        exercise_price=Decimal("1.00"),
        vesting_schedule={
            "type": "performance",
            "milestones": [
                {"label": "Revenue SAR 10M", "fraction": "0.5", "achieved": True, "achieved_date": "2026-03-01"},
                {"label": "IPO filing", "fraction": "0.5", "achieved": False, "achieved_date": None},
            ],
        },
    )
    html = render_vesting_schedule_html(company, plan, grant, "Employee X", Decimal("500"), Decimal("50.00"), is_draft=True)
    assert "Revenue SAR 10M" in html
    assert "IPO filing" in html
    assert "Milestones" in html
    assert "Vesting Schedule" in html
    assert "جدول الاستحقاق" in html


# ── Endpoint layer (auth + availability) ──────────────────────────────────────

async def _setup_company_with_holding(client: AsyncClient, headers: dict) -> tuple[str, str]:
    company = (await client.post(
        "/api/companies", json={"name_en": "Doc Co", "entity_type": "SJSC"}, headers=headers
    )).json()
    company_id = company["id"]
    sh = (await client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": "Holder One"},
        headers=headers,
    )).json()
    await client.post(
        f"/api/companies/{company_id}/cap-table/issue",
        json={"stakeholder_id": sh["id"], "share_class": "ordinary", "quantity": 1000, "event_date": date.today().isoformat()},
        headers=headers,
    )
    return company_id, sh["id"]


@pytest.mark.asyncio
async def test_cap_table_pdf_requires_mfa(db_client, auth_headers, company_id):
    # auth_headers is a verified user WITHOUT MFA — cap table / docs require MFA.
    res = await db_client.get(f"/api/companies/{company_id}/documents/cap-table.pdf", headers=auth_headers)
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_cap_table_pdf_returns_pdf_or_503(db_client, mfa_headers):
    company_id, _ = await _setup_company_with_holding(db_client, mfa_headers)
    res = await db_client.get(f"/api/companies/{company_id}/documents/cap-table.pdf", headers=mfa_headers)
    assert res.status_code in (200, 503)
    if res.status_code == 200:
        assert res.headers["content-type"] == "application/pdf"
        assert res.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_certificate_pdf_404_for_unknown_stakeholder(db_client, mfa_headers, company_id):
    import uuid as _uuid
    res = await db_client.get(
        f"/api/companies/{company_id}/documents/stakeholders/{_uuid.uuid4()}/certificate.pdf",
        headers=mfa_headers,
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_certificate_pdf_422_when_no_holdings(db_client, mfa_headers, company_id, stakeholder_id):
    res = await db_client.get(
        f"/api/companies/{company_id}/documents/stakeholders/{stakeholder_id}/certificate.pdf",
        headers=mfa_headers,
    )
    # stakeholder exists but holds no shares
    assert res.status_code == 422
