"""One-click audit-pack generator.

Bundles everything a Saudi external auditor asks for into a single ZIP:
the current cap table (PDF + CSV), the immutable event log, the ESOP grant
register, and a manifest. Pure stdlib for the archive and CSVs, so the pack
builds and is testable even where WeasyPrint's native libs are absent — the
cap-table PDF is included when rendering is available and noted as skipped
otherwise.
"""

from __future__ import annotations

import csv
import io
import uuid
import zipfile
from datetime import date, datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cap_table_event import CapTableEvent
from app.models.company import Company
from app.models.esop_grant import EsopGrant
from app.models.esop_plan import EsopPlan
from app.models.stakeholder import Stakeholder
from app.services.cap_table import get_cap_table
from app.services.pdf import html_to_pdf, render_cap_table_html
from app.services.vesting import compute_vested


def _csv_bytes(header: list[str], rows: list[list]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")


async def build_audit_pack(db: AsyncSession, company_id: uuid.UUID) -> tuple[bytes, str]:
    """Return (zip_bytes, suggested_filename)."""
    company = (await db.execute(
        select(Company).where(Company.id == company_id)
    )).scalar_one()

    issued = await get_cap_table(db, company_id, diluted=False)
    diluted = await get_cap_table(db, company_id, diluted=True)

    # ── holdings.csv ──────────────────────────────────────────────────────────
    holdings_rows = [
        [h.stakeholder_name, h.share_class, str(h.quantity), str(h.percentage)]
        for h in issued.holdings
    ]
    holdings_csv = _csv_bytes(["stakeholder", "share_class", "quantity", "percentage"], holdings_rows)

    # ── events.csv (immutable log) ────────────────────────────────────────────
    events = (await db.execute(
        select(CapTableEvent)
        .where(CapTableEvent.company_id == company_id)
        .order_by(CapTableEvent.event_date.asc(), CapTableEvent.created_at.asc())
    )).scalars().all()
    events_rows = [
        [str(e.event_date), e.event_type, str(e.payload), e.notes or "", str(e.created_at)]
        for e in events
    ]
    events_csv = _csv_bytes(["event_date", "event_type", "payload", "notes", "recorded_at"], events_rows)

    # ── grants.csv (grant register, with vested-as-of-today) ──────────────────
    grant_rows_q = (await db.execute(
        select(EsopGrant, EsopPlan, Stakeholder)
        .join(EsopPlan, EsopGrant.plan_id == EsopPlan.id)
        .join(Stakeholder, EsopGrant.stakeholder_id == Stakeholder.id)
        .where(EsopGrant.company_id == company_id)
        .order_by(EsopGrant.grant_date.asc())
    )).all()
    today = date.today()
    grants_rows = []
    for row in grant_rows_q:
        g, plan, holder = row.EsopGrant, row.EsopPlan, row.Stakeholder
        vested = compute_vested(g.grant_date, g.vesting_schedule, g.quantity, today)
        grants_rows.append([
            plan.name, holder.name_en, str(g.quantity), str(g.exercised_quantity),
            str(vested), str(g.grant_date), g.status,
            str(g.exercise_price) if g.exercise_price is not None else "",
            g.vesting_schedule.get("type", ""),
        ])
    grants_csv = _csv_bytes(
        ["plan", "stakeholder", "granted", "exercised", "vested_today", "grant_date", "status", "exercise_price", "vesting_type"],
        grants_rows,
    )

    # ── cap-table.pdf (optional — degrades to a note if WeasyPrint unavailable) ─
    pdf_bytes: bytes | None = None
    pdf_note = ""
    try:
        html = render_cap_table_html(company, issued, diluted, is_draft=True)
        pdf_bytes = html_to_pdf(html)
    except RuntimeError as e:
        pdf_note = f"cap-table.pdf was not included — {e}"

    # ── manifest.txt ──────────────────────────────────────────────────────────
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    manifest_lines = [
        "01 Capital — Audit Pack",
        f"Company: {company.name_en} ({company.entity_type})",
        f"CR number: {company.cr_number or '—'}",
        f"Generated: {generated}",
        "",
        "Contents:",
        "  - holdings.csv          Current issued cap table",
        "  - events.csv            Immutable cap table event log",
        "  - grants.csv            ESOP grant register (vested as of generation date)",
        f"  - cap-table.pdf         Bilingual cap table (issued + fully diluted){'' if pdf_bytes else ' [SKIPPED]'}",
        "",
        f"Issued total shares:   {issued.total_shares_issued}",
        f"Diluted total shares:  {diluted.total_shares_diluted}",
        "",
        "DRAFT — REVIEW WITH LEGAL COUNSEL / مسودة — يُرجى المراجعة مع مستشار قانوني",
        "This pack is generated by 01 Capital and must be reviewed by qualified",
        "Saudi legal counsel and the company's external auditor. It is not legal advice.",
    ]
    if pdf_note:
        manifest_lines += ["", pdf_note]
    manifest = "\n".join(manifest_lines).encode("utf-8")

    # ── assemble zip ──────────────────────────────────────────────────────────
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.txt", manifest)
        zf.writestr("holdings.csv", holdings_csv)
        zf.writestr("events.csv", events_csv)
        zf.writestr("grants.csv", grants_csv)
        if pdf_bytes is not None:
            zf.writestr("cap-table.pdf", pdf_bytes)

    safe_name = company.name_en.replace(" ", "_")
    return zip_buf.getvalue(), f"audit-pack-{safe_name}.zip"
