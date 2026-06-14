"""Tests for the e-signing adapter and the one-click audit-pack generator."""

import io
import zipfile
from datetime import date

import pytest
from httpx import AsyncClient


async def _company_with_holding(client: AsyncClient, headers: dict) -> tuple[str, str]:
    company = (await client.post(
        "/api/companies", json={"name_en": "Pack Co", "entity_type": "SJSC"}, headers=headers
    )).json()
    cid = company["id"]
    sh = (await client.post(
        f"/api/companies/{cid}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": "Holder One"},
        headers=headers,
    )).json()
    await client.post(
        f"/api/companies/{cid}/cap-table/issue",
        json={"stakeholder_id": sh["id"], "share_class": "ordinary", "quantity": 1000, "event_date": date.today().isoformat()},
        headers=headers,
    )
    return cid, sh["id"]


# ── E-signing ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_send_for_signature_creates_record(db_client, mfa_headers, company_id):
    res = await db_client.post(
        f"/api/companies/{company_id}/signing",
        json={
            "document_type": "board_resolution",
            "document_name": "Series A board consent",
            "signers": [{"name": "Chair", "email": "chair@example.com"}],
        },
        headers=mfa_headers,
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["provider"] == "stub"
    assert body["envelope_id"].startswith("stub-")
    assert body["status"] == "sent"
    assert len(body["signers"]) == 1


@pytest.mark.asyncio
async def test_signing_requires_mfa(db_client, auth_headers, company_id):
    res = await db_client.post(
        f"/api/companies/{company_id}/signing",
        json={"document_type": "x", "document_name": "y", "signers": [{"name": "A", "email": "a@b.com"}]},
        headers=auth_headers,
    )
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_signing_lifecycle_list_and_mark_signed(db_client, mfa_headers, company_id):
    created = (await db_client.post(
        f"/api/companies/{company_id}/signing",
        json={"document_type": "grant_offer", "document_name": "Grant offer — Sara", "signers": [{"name": "Sara", "email": "sara@example.com"}]},
        headers=mfa_headers,
    )).json()

    listing = await db_client.get(f"/api/companies/{company_id}/signing", headers=mfa_headers)
    assert listing.status_code == 200
    assert any(r["id"] == created["id"] for r in listing.json())

    signed = await db_client.post(
        f"/api/companies/{company_id}/signing/{created['id']}/mark-signed", headers=mfa_headers
    )
    assert signed.status_code == 200, signed.text
    assert signed.json()["status"] == "signed"
    assert signed.json()["completed_at"] is not None

    # Marking again should fail — not in 'sent' state.
    again = await db_client.post(
        f"/api/companies/{company_id}/signing/{created['id']}/mark-signed", headers=mfa_headers
    )
    assert again.status_code == 422


# ── Audit pack ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_audit_pack_returns_zip_with_expected_members(db_client, mfa_headers):
    cid, _ = await _company_with_holding(db_client, mfa_headers)
    res = await db_client.get(f"/api/companies/{cid}/documents/audit-pack.zip", headers=mfa_headers)
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/zip"

    zf = zipfile.ZipFile(io.BytesIO(res.content))
    names = set(zf.namelist())
    # CSVs + manifest are always present; cap-table.pdf only when WeasyPrint is available.
    assert {"manifest.txt", "holdings.csv", "events.csv", "grants.csv"}.issubset(names)

    holdings = zf.read("holdings.csv").decode("utf-8")
    assert "Holder One" in holdings
    assert "stakeholder,share_class,quantity,percentage" in holdings

    manifest = zf.read("manifest.txt").decode("utf-8")
    assert "01 Capital — Audit Pack" in manifest
    assert "REVIEW WITH LEGAL COUNSEL" in manifest


@pytest.mark.asyncio
async def test_audit_pack_requires_mfa(db_client, auth_headers, company_id):
    res = await db_client.get(f"/api/companies/{company_id}/documents/audit-pack.zip", headers=auth_headers)
    assert res.status_code in (401, 403)
