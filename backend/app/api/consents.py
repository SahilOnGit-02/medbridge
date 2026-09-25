from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.clinical import require_patient_hospital_access
from app.api.deps import get_current_patient, get_current_user
from app.db.session import get_db
from app.models.clinical import PatientHospitalMapping
from app.models.consent import PatientHospitalConsent
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.schemas.consent import (
    ConsentCreate,
    ConsentRead,
    PatientConsentCreate,
)


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
    require_patient_hospital_access(
        db,
        current_user,
        payload.patient_id,
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
    "/me",
    response_model=list[ConsentRead],
)
def list_my_consents(
    db: Session = Depends(get_db),
    current_patient=Depends(get_current_patient),
):
    query = (
        select(PatientHospitalConsent)
        .where(
            PatientHospitalConsent.patient_id == current_patient.id
        )
        .order_by(PatientHospitalConsent.created_at.desc())
    )

    return db.scalars(query).all()

@router.post(
    "/me",
    response_model=ConsentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_my_consent(
    payload: PatientConsentCreate,
    db: Session = Depends(get_db),
    current_patient=Depends(get_current_patient),
):
    hospital = db.get(Hospital, payload.hospital_id)

    if hospital is None:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found",
        )

    mapping = db.scalar(
        select(PatientHospitalMapping).where(
            PatientHospitalMapping.patient_id == current_patient.id,
            PatientHospitalMapping.hospital_id == payload.hospital_id,
        )
    )

    if mapping is None:
        raise HTTPException(
            status_code=403,
            detail="Patient is not connected to this hospital",
        )

    existing_active_consent = db.scalar(
        select(PatientHospitalConsent).where(
            PatientHospitalConsent.patient_id == current_patient.id,
            PatientHospitalConsent.hospital_id == payload.hospital_id,
            PatientHospitalConsent.status == "active",
        )
    )

    if existing_active_consent is not None:
        raise HTTPException(
            status_code=409,
            detail="Active consent already exists for this hospital",
        )

    existing_revoked_consent = db.scalar(
        select(PatientHospitalConsent)
        .where(
            PatientHospitalConsent.patient_id == current_patient.id,
            PatientHospitalConsent.hospital_id == payload.hospital_id,
            PatientHospitalConsent.status == "revoked",
        )
        .order_by(PatientHospitalConsent.created_at.desc())
    )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if existing_revoked_consent is not None:
        existing_revoked_consent.status = "active"
        existing_revoked_consent.purpose = payload.purpose
        existing_revoked_consent.share_allergies = payload.share_allergies
        existing_revoked_consent.share_medications = payload.share_medications
        existing_revoked_consent.share_conditions = payload.share_conditions
        existing_revoked_consent.share_prescriptions = payload.share_prescriptions
        existing_revoked_consent.share_observations = payload.share_observations
        existing_revoked_consent.share_encounters = payload.share_encounters
        existing_revoked_consent.granted_at = now
        existing_revoked_consent.expires_at = payload.expires_at
        existing_revoked_consent.revoked_at = None

        db.commit()
        db.refresh(existing_revoked_consent)

        return existing_revoked_consent

    consent = PatientHospitalConsent(
        patient_id=current_patient.id,
        hospital_id=payload.hospital_id,
        status="active",
        purpose=payload.purpose,
        share_allergies=payload.share_allergies,
        share_medications=payload.share_medications,
        share_conditions=payload.share_conditions,
        share_prescriptions=payload.share_prescriptions,
        share_observations=payload.share_observations,
        share_encounters=payload.share_encounters,
        granted_at=now,
        expires_at=payload.expires_at,
        revoked_at=None,
    )

    db.add(consent)
    db.commit()
    db.refresh(consent)

    return consent


@router.post(
    "/me/{consent_id}/revoke",
    response_model=ConsentRead,
)
def revoke_my_consent(
    consent_id: int,
    db: Session = Depends(get_db),
    current_patient=Depends(get_current_patient),
):
    consent = db.get(
        PatientHospitalConsent,
        consent_id,
    )

    if consent is None:
        raise HTTPException(
            status_code=404,
            detail="Consent not found",
        )

    if consent.patient_id != current_patient.id:
        raise HTTPException(
            status_code=403,
            detail="You can only revoke your own consent",
        )

    if consent.status == "revoked":
        raise HTTPException(
            status_code=400,
            detail="Consent is already revoked",
        )

    consent.status = "revoked"
    consent.revoked_at = datetime.now(timezone.utc).replace(
        tzinfo=None
    )

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

    require_patient_hospital_access(db, current_user, patient_id)

    query = select(PatientHospitalConsent).where(
        PatientHospitalConsent.patient_id == patient_id
    )

    if current_user.role != "system_admin":
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