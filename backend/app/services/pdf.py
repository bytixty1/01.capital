"""Bilingual (AR + EN) PDF document generation.

Architecture
------------
Two layers, deliberately separated so the suite runs without native libraries:

1. render_*_html(...)  — pure Jinja2. Produces the document HTML. Testable
   anywhere (no system dependencies).
2. html_to_pdf(html)   — lazily imports WeasyPrint and rasterises to PDF bytes.
   WeasyPrint needs libpango/libcairo at runtime (present in the Docker image,
   absent on most dev machines and in CI), so the import is deferred and a
   clear error is raised if the libraries are unavailable.

Every document carries the bilingual legal watermark until a lawyer signs off
(is_draft), per CLAUDE.md Rule 2 and Rule 9.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "pdf"

WATERMARK_EN = "DRAFT — REVIEW WITH LEGAL COUNSEL"
WATERMARK_AR = "مسودة — يُرجى المراجعة مع مستشار قانوني"


def _fmt_num(value: Any) -> str:
    if value is None:
        return "—"
    d = Decimal(str(value))
    # Whole shares render without decimals; fractional keep up to 4 dp trimmed.
    if d == d.to_integral_value():
        return f"{int(d):,}"
    return f"{d:,.4f}".rstrip("0").rstrip(".")


def _fmt_pct(value: Any) -> str:
    if value is None:
        return "—"
    return f"{Decimal(str(value)):.2f}%"


def _fmt_sar(value: Any) -> str:
    if value is None:
        return "—"
    return f"SAR {Decimal(str(value)):,.2f}"


def _env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    env.filters["num"] = _fmt_num
    env.filters["pct"] = _fmt_pct
    env.filters["sar"] = _fmt_sar
    return env


def _common_context(is_draft: bool) -> dict[str, Any]:
    """Translation strings + watermark/footer shared by every template."""
    return {
        "is_draft": is_draft,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "watermark_en": WATERMARK_EN,
        "watermark_ar": WATERMARK_AR,
        "doc_footer_en": "01 Capital — Generated document",
        "doc_footer_ar": "مستند تم إنشاؤه",
        "t_page_en": "Page",
        "t_generated_en": "Generated",
        "t_generated_ar": "تاريخ الإنشاء",
        "t_entity_type_en": "Entity type",
        "t_cr_en": "CR",
        "t_holder_en": "Stakeholder",
        "t_holder_ar": "صاحب المصلحة",
        "t_class_en": "Class",
        "t_class_ar": "الفئة",
        "t_shares_en": "Shares",
        "t_shares_ar": "الأسهم",
        "t_total_en": "Total",
        "t_total_ar": "الإجمالي",
        "t_nationality_en": "Nationality",
        "t_nationality_ar": "الجنسية",
        "t_ownership_en": "Ownership",
        "t_ownership_ar": "نسبة الملكية",
        "t_issue_date_en": "Issue date",
        "t_issue_date_ar": "تاريخ الإصدار",
        "t_authorized_en": "Authorized signatory",
        "t_authorized_ar": "التوقيع المعتمد",
        "t_date_en": "Date",
        "t_date_ar": "التاريخ",
        "t_plan_en": "Plan",
        "t_granted_en": "Granted",
        "t_granted_ar": "الممنوحة",
        "t_vested_en": "Vested",
        "t_vested_ar": "المستحقة",
        "t_exercised_en": "Exercised",
        "t_exercised_ar": "المُمارَسة",
        "t_grant_date_en": "Grant date",
        "t_grant_date_ar": "تاريخ المنح",
        "t_strike_en": "Exercise price",
        "t_strike_ar": "سعر الممارسة",
        "t_milestone_en": "Milestone",
        "t_milestone_ar": "المرحلة",
        "t_fraction_en": "Fraction",
        "t_status_en": "Status",
        "t_status_ar": "الحالة",
        "t_cliff_en": "Cliff",
        "t_cliff_ar": "فترة الحرمان",
        "t_total_period_en": "Total period",
        "t_total_period_ar": "إجمالي المدة",
        "t_months_en": "months",
    }


# ── HTML renderers (pure, testable) ──────────────────────────────────────────

def render_cap_table_html(company: Any, issued: Any, diluted: Any, is_draft: bool = True) -> str:
    ctx = _common_context(is_draft)
    ctx.update({"company": company, "issued": issued, "diluted": diluted})
    return _env().get_template("cap_table.html").render(**ctx)


def render_share_certificate_html(
    company: Any, holder: Any, share_class: str, quantity: Any, percentage: Any, is_draft: bool = True
) -> str:
    ctx = _common_context(is_draft)
    ctx.update({
        "company": company,
        "holder": holder,
        "share_class": share_class,
        "quantity": quantity,
        "percentage": percentage,
        "cert_title_en": "Share Certificate" if company.entity_type != "LLC" else "Quota Certificate",
        "cert_title_ar": "شهادة أسهم" if company.entity_type != "LLC" else "شهادة حصص",
    })
    return _env().get_template("share_certificate.html").render(**ctx)


def render_vesting_schedule_html(
    company: Any,
    plan: Any,
    grant: Any,
    holder_name: str,
    vested: Any,
    vesting_pct: Any,
    is_draft: bool = True,
) -> str:
    ctx = _common_context(is_draft)
    vs = grant.vesting_schedule or {}
    schedule_type = vs.get("type", "cliff_monthly")
    ctx.update({
        "company": company,
        "plan": plan,
        "grant": grant,
        "holder_name": holder_name,
        "vested": vested,
        "vesting_pct": vesting_pct,
        "schedule_type": schedule_type,
        "milestones": vs.get("milestones", []),
        "cliff_months": vs.get("cliff_months", 0),
        "total_months": vs.get("total_months", 0),
    })
    return _env().get_template("vesting_schedule.html").render(**ctx)


def render_filing_document_html(
    company: Any, ref: Any, due_date: Any, trigger: Any = None, is_draft: bool = True
) -> str:
    """Render a draft compliance filing document.

    `ref` is a FilingReference; `trigger` is an optional object with
    .event_type / .event_date / .payload describing the cap table event.
    """
    ctx = _common_context(is_draft)
    ctx.update({"company": company, "ref": ref, "due_date": due_date, "trigger": trigger})
    return _env().get_template("filing_document.html").render(**ctx)


def render_cma_esop_plan_html(
    company: Any, plan: Any, available: Any, checklist: list[dict], is_draft: bool = True
) -> str:
    """Render a CMA-aligned ESOP plan document with the Article 29 checklist."""
    ctx = _common_context(is_draft)
    ctx.update({"company": company, "plan": plan, "available": available, "checklist": checklist})
    return _env().get_template("cma_esop_plan.html").render(**ctx)


# ── PDF conversion (lazy native dependency) ──────────────────────────────────

def html_to_pdf(html: str) -> bytes:
    """Convert an HTML string to PDF bytes via WeasyPrint.

    WeasyPrint and its native libraries are imported lazily. If they are not
    available in this environment, a RuntimeError is raised so the caller can
    surface a clear 503 rather than failing at import time.
    """
    try:
        from weasyprint import HTML  # noqa: PLC0415 — deliberate lazy import
    except (OSError, ImportError) as e:  # native libs (pango/cairo) or package missing
        raise RuntimeError(
            "PDF rendering is unavailable: WeasyPrint or its native libraries are not "
            "installed in this environment."
        ) from e

    try:
        return HTML(string=html).write_pdf()
    except Exception as e:  # noqa: BLE001 — any rendering failure → clean 503, never a 500
        raise RuntimeError(f"PDF rendering failed: {e}") from e
