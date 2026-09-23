from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User


def log_audit_event(
    db: Session,
    *,
    current_user: User | None,
    action: str,
    resource_type: str,
    resource_id: int | None = None,
    patient_id: int | None = None,
    hospital_id: int | None = None,
    success: bool = True,
    details: str | None = None,
) -> AuditLog:
    audit_log = AuditLog(
        user_id=current_user.id if current_user else None,
        hospital_id=(
            hospital_id
            if hospital_id is not None
            else current_user.hospital_id if current_user else None
        ),
        patient_id=patient_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        success=success,
        details=details,
    )

    db.add(audit_log)
    db.flush()

    return audit_log