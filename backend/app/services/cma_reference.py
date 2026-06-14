"""CMA employee-share-program reference data.

Provides an informational Article 29 "safe harbour" checklist and the structure
for a CMA-aligned ESOP plan document. This is structuring and education only —
not legal advice, and never a CMA submission (CLAUDE.md Rule 2/6). Every
generated document carries the bilingual review-with-counsel watermark.

Article 29 of the CMA Rules on the Offer of Securities and Continuing
Obligations provides an exemption for offers of shares to employees under an
employee share scheme. The checklist below restates common conditions a Saudi
company confirms before relying on the exemption; the company must verify the
current CMA rulebook with counsel.
"""


class ChecklistItem:
    def __init__(self, *, key: str, requirement_en: str, requirement_ar: str) -> None:
        self.key = key
        self.requirement_en = requirement_en
        self.requirement_ar = requirement_ar

    def as_dict(self) -> dict:
        return {
            "key": self.key,
            "requirement_en": self.requirement_en,
            "requirement_ar": self.requirement_ar,
        }


ARTICLE_29_CHECKLIST: list[ChecklistItem] = [
    ChecklistItem(
        key="eligible_offerees",
        requirement_en="The offer is limited to current employees, board members, or advisers of the company or its group.",
        requirement_ar="العرض مقتصر على موظفي الشركة أو مجموعتها أو أعضاء مجلس الإدارة أو المستشارين الحاليين.",
    ),
    ChecklistItem(
        key="no_public_offer",
        requirement_en="The shares are not offered to the public and are not marketed through public channels.",
        requirement_ar="لا تُطرح الأسهم على الجمهور ولا يتم تسويقها عبر القنوات العامة.",
    ),
    ChecklistItem(
        key="plan_documented",
        requirement_en="The employee share plan is documented with defined pool size, eligibility, vesting, and exercise terms.",
        requirement_ar="برنامج أسهم الموظفين موثّق بحجم محدد للمجموع، وشروط الأهلية والاستحقاق والممارسة.",
    ),
    ChecklistItem(
        key="aoa_authority",
        requirement_en="The Articles of Association (or shareholders' resolution) authorise the employee share program.",
        requirement_ar="يُجيز عقد التأسيس (أو قرار المساهمين) برنامج أسهم الموظفين.",
    ),
    ChecklistItem(
        key="disclosure",
        requirement_en="Employees receive clear disclosure of the plan terms and associated risks before accepting a grant.",
        requirement_ar="يحصل الموظفون على إفصاح واضح عن شروط البرنامج والمخاطر المرتبطة قبل قبول المنحة.",
    ),
    ChecklistItem(
        key="record_keeping",
        requirement_en="The company maintains a grant register and provides any disclosures the CMA requires for the program.",
        requirement_ar="تحتفظ الشركة بسجل للمنح وتقدّم أي إفصاحات تطلبها هيئة السوق المالية للبرنامج.",
    ),
]


def article_29_checklist() -> list[dict]:
    return [item.as_dict() for item in ARTICLE_29_CHECKLIST]
