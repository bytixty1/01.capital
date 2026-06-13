"""Company and stakeholder integration tests."""

import pytest
from httpx import AsyncClient


# ── List / create companies ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_company_returns_201(db_client: AsyncClient, auth_headers: dict) -> None:
    res = await db_client.post(
        "/api/companies",
        json={"name_en": "ZeroOne IT", "entity_type": "LLC"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["name_en"] == "ZeroOne IT"
    assert body["entity_type"] == "LLC"
    assert "id" in body


@pytest.mark.asyncio
async def test_create_company_sjsc_type(db_client: AsyncClient, auth_headers: dict) -> None:
    res = await db_client.post(
        "/api/companies",
        json={"name_en": "Saudi Simplified Co", "entity_type": "SJSC"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    assert res.json()["entity_type"] == "SJSC"


@pytest.mark.asyncio
async def test_create_company_requires_auth(db_client: AsyncClient) -> None:
    res = await db_client.post("/api/companies", json={"name_en": "No Auth", "entity_type": "LLC"})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_list_companies_returns_own_companies(db_client: AsyncClient, auth_headers: dict) -> None:
    await db_client.post("/api/companies", json={"name_en": "Co A", "entity_type": "LLC"}, headers=auth_headers)
    await db_client.post("/api/companies", json={"name_en": "Co B", "entity_type": "JSC"}, headers=auth_headers)

    res = await db_client.get("/api/companies", headers=auth_headers)
    assert res.status_code == 200
    names = [c["name_en"] for c in res.json()]
    assert "Co A" in names
    assert "Co B" in names


@pytest.mark.asyncio
async def test_list_companies_empty_for_new_user(db_client: AsyncClient, auth_headers: dict) -> None:
    res = await db_client.get("/api/companies", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


# ── Get / update company ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_company_detail(
    db_client: AsyncClient, mfa_headers: dict, company_id: str
) -> None:
    res = await db_client.get(f"/api/companies/{company_id}", headers=mfa_headers)
    assert res.status_code == 200
    assert res.json()["id"] == company_id
    assert res.json()["name_en"] == "Test Co"


@pytest.mark.asyncio
async def test_get_company_not_member_is_403(
    db_client: AsyncClient, company_id: str
) -> None:
    from tests.conftest import _register_and_verify
    other_token = await _register_and_verify(db_client, email="other@example.com")
    res = await db_client.get(
        f"/api/companies/{company_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_update_company_name(
    db_client: AsyncClient, mfa_headers: dict, company_id: str
) -> None:
    res = await db_client.patch(
        f"/api/companies/{company_id}",
        json={"name_en": "Updated Name"},
        headers=mfa_headers,
    )
    assert res.status_code == 200
    assert res.json()["name_en"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_company_with_cr_number(
    db_client: AsyncClient, mfa_headers: dict, company_id: str
) -> None:
    res = await db_client.patch(
        f"/api/companies/{company_id}",
        json={"cr_number": "4030123456"},
        headers=mfa_headers,
    )
    assert res.status_code == 200
    assert res.json()["cr_number"] == "4030123456"


# ── Stakeholders ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_stakeholder_natural_person(
    db_client: AsyncClient, mfa_headers: dict, company_id: str
) -> None:
    res = await db_client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "natural_person", "name_en": "Khalid Al-Mutairi"},
        headers=mfa_headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["name_en"] == "Khalid Al-Mutairi"
    assert body["stakeholder_type"] == "natural_person"
    assert body["company_id"] == company_id


@pytest.mark.asyncio
async def test_create_stakeholder_legal_entity(
    db_client: AsyncClient, mfa_headers: dict, company_id: str
) -> None:
    res = await db_client.post(
        f"/api/companies/{company_id}/stakeholders",
        json={"stakeholder_type": "legal_entity", "name_en": "SVC Fund LP", "cr_number": "1010000001"},
        headers=mfa_headers,
    )
    assert res.status_code == 201
    assert res.json()["stakeholder_type"] == "legal_entity"
    assert res.json()["cr_number"] == "1010000001"


@pytest.mark.asyncio
async def test_list_stakeholders(
    db_client: AsyncClient, mfa_headers: dict, company_id: str, stakeholder_id: str
) -> None:
    res = await db_client.get(f"/api/companies/{company_id}/stakeholders", headers=mfa_headers)
    assert res.status_code == 200
    assert any(s["id"] == stakeholder_id for s in res.json())


@pytest.mark.asyncio
async def test_stakeholder_requires_auth(db_client: AsyncClient, company_id: str) -> None:
    res = await db_client.get(f"/api/companies/{company_id}/stakeholders")
    assert res.status_code == 403


# ── Members ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_members_includes_creator(
    db_client: AsyncClient, mfa_headers: dict, company_id: str
) -> None:
    res = await db_client.get(f"/api/companies/{company_id}/members", headers=mfa_headers)
    assert res.status_code == 200
    members = res.json()
    assert len(members) == 1
    assert members[0]["role"] == "admin"
