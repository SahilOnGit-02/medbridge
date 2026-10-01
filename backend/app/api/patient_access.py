from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_patient
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.user import User


router = APIRouter(
    prefix="/patients",
    tags=["Patient Access History"],
)


PATIENT_VISIBLE_ACTIONS = {
    "emergency_access_granted",
    "emergency_access_viewed",
    "emergency_access_ended",
    "patient_emergency_profile_updated",
    "patient_record_view",
    "fhir_patient_view",
    "fhir_record_view",
    "patient_sharing_updated",
    "patient_sharing_revoked",
}


@router.get("/me/access-history")
def get_my_access_history(
    limit: int = Query(default=50, ge=1, le=100),
    before_id: int | None = Query(default=None, gt=0),
    activity: str = Query(default="all", pattern="^(all|normal|emergency|changes)$"),
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient),
):
    actions = PATIENT_VISIBLE_ACTIONS
    if activity == "normal":
        actions = {"patient_record_view", "fhir_patient_view", "fhir_record_view"}
    elif activity == "emergency":
        actions = {action for action in actions if action.startswith("emergency_")}
    elif activity == "changes":
        actions = {
            action
            for action in actions
            if action.startswith("patient_") and action != "patient_record_view"
        }
    rows = db.execute(
        select(AuditLog, User, Hospital)
        .outerjoin(
            User,
            AuditLog.user_id == User.id,
        )
        .outerjoin(
            Hospital,
            AuditLog.hospital_id == Hospital.id,
        )
        .where(
            AuditLog.patient_id == current_patient.id,
            AuditLog.action.in_(actions),
            AuditLog.id < before_id if before_id is not None else True,
        )
        .order_by(
            AuditLog.id.desc(),
        )
        .limit(limit)
    ).all()

    return [
        {
            "id": audit.id,
            "action": audit.action,
            "resource_type": audit.resource_type,
            "resource_id": audit.resource_id,
            "success": audit.success,
            "details": audit.details,
            "created_at": audit.created_at,
            "user": {
                "id": user.id if user else None,
                "full_name": (user.full_name if user else "Unknown user"),
                "role": user.role if user else None,
            },
            "hospital": {
                "id": hospital.id if hospital else None,
                "name": (hospital.name if hospital else "Unknown hospital"),
                "code": hospital.code if hospital else None,
            },
        }
        for audit, user, hospital in rows
    ]
