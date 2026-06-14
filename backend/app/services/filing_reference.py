"""Static reference data for compliance filings.

For each filing type, surfaces what a Saudi founder needs to know to act:
the authority, the deadline window, the typical fee, which portal section, and
the supporting documents required. This is informational structuring only —
never legal advice, never auto-submission (CLAUDE.md Rule 2).

Deadlines and fees follow common 2023 Saudi Companies Law practice; the
watermark on every generated document directs the user to confirm with counsel.
"""

from app.models.filing import FilingType


class FilingReference:
    def __init__(
        self,
        *,
        authority: str,
        title_en: str,
        title_ar: str,
        deadline_days: int,
        fee_note_en: str,
        portal_section: str,
        required_documents: list[str],
        description_en: str,
    ) -> None:
        self.authority = authority
        self.title_en = title_en
        self.title_ar = title_ar
        self.deadline_days = deadline_days
        self.fee_note_en = fee_note_en
        self.portal_section = portal_section
        self.required_documents = required_documents
        self.description_en = description_en

    def as_dict(self) -> dict:
        return {
            "authority": self.authority,
            "title_en": self.title_en,
            "title_ar": self.title_ar,
            "deadline_days": self.deadline_days,
            "fee_note_en": self.fee_note_en,
            "portal_section": self.portal_section,
            "required_documents": self.required_documents,
            "description_en": self.description_en,
        }


FILING_REFERENCE: dict[str, FilingReference] = {
    FilingType.MOC_PARTNER_REGISTER: FilingReference(
        authority="MoC",
        title_en="Partner / Shareholder Register Update",
        title_ar="تحديث سجل الشركاء / المساهمين",
        deadline_days=30,
        fee_note_en="No fee for register update in most cases; confirm on the MoC portal.",
        portal_section="MoC → Company Services → Amend Partners/Shares",
        required_documents=[
            "Updated cap table / partner register",
            "Share transfer or issuance instrument",
            "Board or partners' resolution (if required by AoA)",
        ],
        description_en="Reflects a change in ownership at the Ministry of Commerce after an issuance or transfer.",
    ),
    FilingType.MOC_AOA_AMENDMENT: FilingReference(
        authority="MoC",
        title_en="Articles of Association Amendment",
        title_ar="تعديل عقد التأسيس",
        deadline_days=30,
        fee_note_en="MoC publication + notarisation fees apply; varies by entity type.",
        portal_section="MoC → Company Services → Amend Articles of Association",
        required_documents=[
            "Amended Articles of Association draft",
            "Partners' / shareholders' resolution approving the amendment",
            "Updated capital structure schedule",
        ],
        description_en="Amends the AoA when capital structure or governance terms change.",
    ),
    FilingType.MOC_CAPITAL_CHANGE: FilingReference(
        authority="MoC",
        title_en="Capital Change Filing",
        title_ar="إجراء تغيير رأس المال",
        deadline_days=30,
        fee_note_en="Capital-change publication fee applies; confirm current schedule on the MoC portal.",
        portal_section="MoC → Company Services → Increase/Decrease Capital",
        required_documents=[
            "Resolution approving the capital increase/decrease",
            "Auditor certificate (for certain capital changes)",
            "Updated capital structure schedule",
        ],
        description_en="Registers an increase or decrease in the company's capital at the MoC.",
    ),
    FilingType.ZATCA_ZAKAT_YEAR: FilingReference(
        authority="ZATCA",
        title_en="Zakat-Year Ownership Data",
        title_ar="بيانات الملكية للسنة الزكوية",
        deadline_days=120,
        fee_note_en="No filing fee; submitted as part of the annual zakat return by the accountant.",
        portal_section="ZATCA → Zakat return → Ownership schedule",
        required_documents=[
            "Year-end cap table",
            "Ownership changes during the fiscal year",
        ],
        description_en="Structured ownership data for the annual zakat return.",
    ),
    FilingType.CMA_ESOP_DISCLOSURE: FilingReference(
        authority="CMA",
        title_en="ESOP Quarterly Disclosure",
        title_ar="الإفصاح الربعي لبرنامج الأسهم",
        deadline_days=30,
        fee_note_en="No fee; quarterly disclosure for CMA-registered employee share programs.",
        portal_section="CMA → Employee Share Programs → Disclosure",
        required_documents=[
            "Grant register for the period",
            "Pool utilisation summary",
            "Plan parameters reference",
        ],
        description_en="Quarterly disclosure of ESOP activity to the Capital Market Authority.",
    ),
}


def get_filing_reference(filing_type: str) -> FilingReference | None:
    return FILING_REFERENCE.get(filing_type)
