import hmac

from fastapi import APIRouter, Header, HTTPException

from app.core.config import settings
from seed_medical_reports import main as seed_medical_reports


router = APIRouter(
    prefix="/internal",
    tags=["internal"],
)


@router.post("/seed-medical-reports")
def run_medical_report_seed(
    x_medbridge_seed_key: str | None = Header(default=None),
):
    if settings.app_env != "production":
        raise HTTPException(status_code=404, detail="Not found")

    configured_key = settings.medical_report_seed_key

    if not configured_key or not x_medbridge_seed_key:
        raise HTTPException(status_code=404, detail="Not found")

    if not hmac.compare_digest(x_medbridge_seed_key, configured_key):
        raise HTTPException(status_code=404, detail="Not found")

    seed_medical_reports()

    return {
        "status": "ok",
        "message": "Medical report seed completed",
    }
