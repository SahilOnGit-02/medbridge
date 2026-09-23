from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.consent import PatientHospitalConsent
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.schemas.consent import ConsentCreate, ConsentRead


router = APIRouter(prefix="/consents", tags=["consents"])


@router.post("", response_model=ConsentRead, status_code=status.HTTP_201_CREATED)
def create_consent(
    payload: ConsentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    hospital = db.get(Hospital, payload.hospital_id)
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found")

    if current_user.role != "system_admin":
        if current_user.role not in {"doctor", "hospital_admin"}:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        if current_user.hospital_id != payload.hospital_id:
            raise HTTPException(
                status_code=403,
                detail="User does not have access to this hospital",
            )

    if payload.status not in {"active", "revoked", "expired"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid consent status",
        )

    consent = PatientHospitalConsent(
        patient_id=payload.patient_id,
        hospital_id=payload.hospital_id,
        status=payload.status,
        purpose=payload.purpose,
        granted_at=payload.granted_at,
        expires_at=payload.expires_at,
        revoked_at=None,
    )

    if payload.status == "revoked":
        consent.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.add(consent)
    db.commit()
    db.refresh(consent)

    return consent


@router.get(
    "/patient/{patient_id}",
    response_model=list[ConsentRead],
)
def list_patient_consents(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    query = select(PatientHospitalConsent).where(
        PatientHospitalConsent.patient_id == patient_id
    )

    if current_user.role != "system_admin":
        if current_user.role not in {"doctor", "hospital_admin"}:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        query = query.where(
            PatientHospitalConsent.hospital_id == current_user.hospital_id
        )

    query = query.order_by(PatientHospitalConsent.created_at.desc())

    return db.scalars(query).all()


@router.post(
    "/{consent_id}/revoke",
    response_model=ConsentRead,
)
def revoke_consent(
    consent_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    consent = db.get(PatientHospitalConsent, consent_id)

    if consent is None:
        raise HTTPException(status_code=404, detail="Consent not found")

    if current_user.role != "system_admin":
        if current_user.role not in {"doctor", "hospital_admin"}:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        if current_user.hospital_id != consent.hospital_id:
            raise HTTPException(
                status_code=403,
                detail="User does not have access to this hospital",
            )

    if consent.status == "revoked":
        raise HTTPException(
            status_code=400,
            detail="Consent is already revoked",
        )

    consent.status = "revoked"
    consent.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.commit()
    db.refresh(consent)

    return consent