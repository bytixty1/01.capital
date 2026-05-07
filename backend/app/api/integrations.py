"""Mock integrations for Ministry of Commerce (MoC) and other external services."""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.core.deps import get_current_user

router = APIRouter(prefix="/integrations", tags=["integrations"])

@router.get("/moc/cr/{cr_number}", response_model=Dict[str, Any])
async def fetch_moc_company_info(cr_number: str, _ = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Mock endpoint to fetch company details from MoC given a CR number.
    Returns dummy data based on the CR number for demonstration purposes.
    """
    if len(cr_number) != 10 or not cr_number.isdigit():
        raise HTTPException(status_code=400, detail="Invalid CR number format")

    # Generate deterministic mock data based on the CR number
    # If CR starts with '1', region is Riyadh, etc.
    
    mock_companies = {
        "1010": {"name_en": "TechRiyadh LLC", "name_ar": "شركة تك الرياض ذ.م.م", "entity_type": "LLC", "capital": 100000},
        "4030": {"name_en": "Jeddah Pioneers SJSC", "name_ar": "رواد جدة مساهمة مبسطة", "entity_type": "SJSC", "capital": 500000},
        "2050": {"name_en": "Eastern Sands JSC", "name_ar": "رمال الشرقية مساهمة", "entity_type": "JSC", "capital": 5000000},
    }

    # Match by prefix or return a default mock
    prefix = cr_number[:4]
    company_data = mock_companies.get(prefix, {
        "name_en": f"Mock Company {cr_number}",
        "name_ar": f"شركة افتراضية {cr_number}",
        "entity_type": "LLC",
        "capital": 100000
    })

    return {
        "cr_number": cr_number,
        "status": "ACTIVE",
        "name_en": company_data["name_en"],
        "name_ar": company_data["name_ar"],
        "entity_type": company_data["entity_type"],
        "capital": company_data["capital"],
        "incorporation_date": "2023-01-01",
        "mock": True
    }
