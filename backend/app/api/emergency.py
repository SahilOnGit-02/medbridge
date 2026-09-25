from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.audit import log_audit_event
from app.models.clinical import (
    Allergy,
    Condition,
    Medication,
    PatientHospitalMapping,
    Prescription,
)
from app.models.emergency import EmergencyAccess
from app.models.patient import Patient
from app.models.user import User
from app.schemas.emergency import EmergencyAccessCreate, EmergencyAccessRead


router = APIRouter(
    prefix="/emergency-access",
    tags=["Emergency Access"],
)


def require_emergency_user(current_user: User) -> User:
    if current_user.role not in {"doctor", "hospital_admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors and hospital administrators can request emergency access",
        )

    if current_user.hospital_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with a hospital",
        )

    return current_user


def get_active_emergency_access(
    db: Session,
    access_id: int,
) -> EmergencyAccess:
    access = db.scalar(
        select(EmergencyAccess).where(
            EmergencyAccess.id == access_id,
            EmergencyAccess.status == "active",
        )
    )

    if access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency access not found",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if access.expires_at <= now:
        access.status = "expired"
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Emergency access has expired",
        )

    return access


@router.post(
    "",
    response_model=EmergencyAccessRead,
    status_code=status.HTTP_201_CREATED,
)
def create_emergency_access(
    payload: EmergencyAccessCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_emergency_user(current_user)

    reason = payload.reason.strip()

    if not reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Emergency reason is required",
        )

    patient = db.get(Patient, payload.patient_id)

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    mapping = db.scalar(
        select(PatientHospitalMapping).where(
            PatientHospitalMapping.patient_id == payload.patient_id,
            PatientHospitalMapping.hospital_id == current_user.hospital_id,
        )
    )

    if mapping is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient is not associated with your hospital",
        )

    now = datetime.utcnow()

    access = EmergencyAccess(
        patient_id=payload.patient_id,
        user_id=current_user.id,
        hospital_id=current_user.hospital_id,
        reason=reason,
        status="active",
        granted_at=now,
        expires_at=now + timedelta(minutes=30),
    )

    db.add(access)
    db.flush()

    log_audit_event(
        db,
        current_user=current_user,
        action="emergency_access_granted",
        resource_type="emergency_access",
        resource_id=access.id,
        patient_id=patient.id,
        hospital_id=current_user.hospital_id,
        success=True,
        details=reason,
    )

    db.commit()
    db.refresh(access)

    return access


@router.get("/{access_id}")
def get_emergency_profile(
    access_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_emergency_user(current_user)

    access = get_active_emergency_access(db, access_id)

    if access.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to use this emergency access session",
        )

    if access.hospital_id != current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Emergency access belongs to another hospital",
        )

    patient = db.get(Patient, access.patient_id)

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    allergies = list(
        db.scalars(
            select(Allergy)
            .where(Allergy.patient_id == patient.id)
            .order_by(Allergy.recorded_on.desc())
        )
    )

    conditions = list(
        db.scalars(
            select(Condition)
            .where(
                Condition.patient_id == patient.id,
                Condition.clinical_status == "active",
            )
            .order_by(Condition.diagnosed_on.desc())
        )
    )

    prescriptions = list(
        db.scalars(
            select(Prescription)
            .where(
                Prescription.patient_id == patient.id,
                Prescription.status == "active",
            )
        )
    )

    medications = []

    for prescription in prescriptions:
        medication = db.get(Medication, prescription.medication_id)

        if medication is not None:
            medications.append(
                {
                    "id": medication.id,
                    "name": medication.name,
                    "generic_name": medication.generic_name,
                    "form": medication.form,
                    "strength": medication.strength,
                }
            )

    log_audit_event(
        db,
        current_user=current_user,
        action="emergency_access_viewed",
        resource_type="emergency_access",
        resource_id=access.id,
        patient_id=patient.id,
        hospital_id=current_user.hospital_id,
        success=True,
        details="Emergency profile viewed",
    )

    db.commit()

    return {
        "access": {
            "id": access.id,
            "reason": access.reason,
            "status": access.status,
            "granted_at": access.granted_at,
            "expires_at": access.expires_at,
        },
        "patient": {
            "id": patient.id,
            "medbridge_id": patient.medbridge_id,
            "full_name": patient.full_name,
            "date_of_birth": patient.date_of_birth,
            "blood_group": patient.blood_group,
        },
        "allergies": [
            {
                "id": allergy.id,
                "substance": allergy.substance,
                "reaction": allergy.reaction,
                "severity": allergy.severity,
                "verified": allergy.verified,
            }
            for allergy in allergies
        ],
        "medications": medications,
        "conditions": [
            {
                "id": condition.id,
                "code": condition.code,
                "name": condition.name,
                "clinical_status": condition.clinical_status,
                "diagnosed_on": condition.diagnosed_on,
                "notes": condition.notes,
            }
            for condition in conditions
        ],
        "emergency_contact": {
            "name": patient.emergency_contact_name,
            "phone": patient.emergency_contact_phone,
        },
    }


@router.post("/{access_id}/end", response_model=EmergencyAccessRead)
def end_emergency_access(
    access_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_emergency_user(current_user)

    access = get_active_emergency_access(db, access_id)

    if access.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to end this emergency access session",
        )

    now = datetime.utcnow()

    access.status = "ended"
    access.ended_at = now

    log_audit_event(
        db,
        current_user=current_user,
        action="emergency_access_ended",
        resource_type="emergency_access",
        resource_id=access.id,
        patient_id=access.patient_id,
        hospital_id=current_user.hospital_id,
        success=True,
        details="Emergency access session ended",
    )

    db.commit()
    db.refresh(access)

    return access