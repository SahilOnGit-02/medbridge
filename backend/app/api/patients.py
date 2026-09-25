from datetime import date, datetime, timezone
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.clinical import require_patient_hospital_access
from app.api.deps import get_current_patient, get_current_user
from app.db.session import get_db
from app.models.patient import Patient
from app.core.audit import log_audit_event
from app.core.security import hash_password
from app.models.user import User
from app.models.clinical import (
    PatientHospitalMapping,
    Encounter,
    Condition,
    Allergy,
    Prescription,
    Observation,
    Medication,
)
from app.schemas.patient import (
    PatientAccountCreate,
    PatientCreate,
    PatientProfileUpdate,
    PatientRead,
    PatientSearchResult,
)
from app.schemas.clinical import (
    MappingRead,
    UnifiedClinicalRecord,
    UnifiedPrescriptionRead,
    EncounterRead,
    ConditionRead,
    AllergyRead,
    ObservationRead,
    MedicationRead,
    PrescriptionRead,
)
router = APIRouter(prefix="/patients", tags=["patients"])
UPLOAD_DIR = Path("uploads/patients")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024

ALLOWED_PROFILE_PHOTO_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

@router.get("/me", response_model=PatientRead)
def get_my_patient_profile(
    current_patient: Patient = Depends(get_current_patient),
):
    return current_patient

@router.get("", response_model=list[PatientSearchResult])
def list_patients(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Patient)

    if current_user.role != "system_admin":
        if current_user.role not in {"doctor", "hospital_admin"}:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions",
            )

        query = query.join(
            PatientHospitalMapping,
            PatientHospitalMapping.patient_id == Patient.id,
        ).where(
            PatientHospitalMapping.hospital_id == current_user.hospital_id
        )

    query = query.order_by(Patient.full_name.asc())

    return db.scalars(query).unique().all()

@router.post("", response_model=PatientRead, status_code=201)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = db.scalar(
        select(Patient).where(Patient.medbridge_id == payload.medbridge_id)
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="MedBridge patient ID already exists",
        )

    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/search", response_model=list[PatientSearchResult])
def search_patients(
    q: str | None = Query(default=None, min_length=1),
    date_of_birth: date | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Patient)

    filters = []

    if q:
        search_term = f"%{q.strip()}%"
        filters.append(
            or_(
                Patient.medbridge_id.ilike(search_term),
                Patient.full_name.ilike(search_term),
            )
        )

    if date_of_birth:
        filters.append(Patient.date_of_birth == date_of_birth)

    if filters:
        query = query.where(*filters)
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide a search query or date_of_birth",
        )

    if current_user.role != "system_admin":
        if current_user.role not in {"doctor", "hospital_admin"}:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions",
            )

        query = query.join(
            PatientHospitalMapping,
            PatientHospitalMapping.patient_id == Patient.id,
        ).where(
            PatientHospitalMapping.hospital_id == current_user.hospital_id
        )

    query = query.order_by(Patient.full_name.asc())

    return db.scalars(query).unique().all()


@router.get("/{medbridge_id}", response_model=PatientRead)
def get_patient(
    medbridge_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.scalar(
        select(Patient).where(Patient.medbridge_id == medbridge_id)
    )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    require_patient_hospital_access(
        db,
        current_user,
        patient.id,
    )

    return patient

from app.schemas.patient import (
    PatientCreate,
    PatientProfileUpdate,
    PatientRead,
    PatientSearchResult,
)

@router.patch("/{medbridge_id}/profile", response_model=PatientRead)
def update_patient_profile(
    medbridge_id: str,
    payload: PatientProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.scalar(
        select(Patient).where(Patient.medbridge_id == medbridge_id)
    )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    require_patient_hospital_access(
        db,
        current_user,
        patient.id,
    )

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)

    return patient


@router.post("/{medbridge_id}/verify", response_model=PatientRead)
def verify_patient_identity(
    medbridge_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.scalar(
        select(Patient).where(Patient.medbridge_id == medbridge_id)
    )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    require_patient_hospital_access(
        db,
        current_user,
        patient.id,
    )

    patient.identity_verification_status = "verified"
    patient.identity_verified_at = datetime.now(timezone.utc)
    patient.identity_verified_by = current_user.id

    log_audit_event(
        db,
        current_user=current_user,
        action="patient_identity_verified",
        resource_type="patient_identity",
        resource_id=patient.id,
        patient_id=patient.id,
        success=True,
        details="Patient identity verified by authorized hospital user.",
    )

    db.commit()
    db.refresh(patient)

    return patient

@router.post("/{medbridge_id}/create-account", response_model=PatientRead)
def create_patient_account(
    medbridge_id: str,
    payload: PatientAccountCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.scalar(
        select(Patient).where(Patient.medbridge_id == medbridge_id)
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    require_patient_hospital_access(
        db,
        current_user,
        patient.id,
    )

    if patient.identity_verification_status != "verified":
        raise HTTPException(
            status_code=403,
            detail="Patient identity must be verified before creating an account",
        )

    if patient.user_id is not None:
        raise HTTPException(
            status_code=409,
            detail="Patient already has an account",
        )

    existing_user = db.scalar(
        select(User).where(User.email == payload.email)
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email address is already registered",
        )

    patient_user = User(
        email=payload.email,
        full_name=patient.full_name,
        password_hash=hash_password(payload.password),
        role="patient",
        hospital_id=None,
        is_active=True,
    )

    db.add(patient_user)
    db.flush()

    patient.user_id = patient_user.id

    log_audit_event(
        db,
        current_user=current_user,
        action="patient_account_created",
        resource_type="patient",
        resource_id=patient.id,
        patient_id=patient.id,
        success=True,
        details="Patient account created and linked after identity verification.",
    )

    db.commit()
    db.refresh(patient)

    return patient

@router.post("/{medbridge_id}/photo", response_model=PatientRead)
async def upload_patient_photo(
    medbridge_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.scalar(
        select(Patient).where(Patient.medbridge_id == medbridge_id)
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    require_patient_hospital_access(
        db,
        current_user,
        patient.id,
    )

    if file.content_type not in ALLOWED_PROFILE_PHOTO_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and WebP images are allowed",
        )

    file_bytes = await file.read()

    if len(file_bytes) > MAX_PROFILE_PHOTO_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Profile photo must be 5 MB or smaller",
        )

    extension_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    extension = extension_map[file.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename

    destination.write_bytes(file_bytes)

    patient.profile_photo_url = f"/uploads/patients/{filename}"

    log_audit_event(
        db,
        current_user=current_user,
        action="patient_profile_photo_uploaded",
        resource_type="patient",
        resource_id=patient.id,
        patient_id=patient.id,
        success=True,
        details="Patient profile photo uploaded by authorized hospital user.",
    )

    db.commit()
    db.refresh(patient)

    return patient

@router.get("/me/summary", response_model=UnifiedClinicalRecord)
def get_my_clinical_summary(
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient),
):
    prescriptions = [
        UnifiedPrescriptionRead(
            **PrescriptionRead.model_validate(prescription).model_dump(),
            medication=MedicationRead.model_validate(prescription.medication),
        )
        for prescription in current_patient.prescriptions
    ]

    return UnifiedClinicalRecord(
        patient=PatientRead.model_validate(current_patient),
        hospital_mappings=[
            MappingRead.model_validate(mapping)
            for mapping in current_patient.hospital_mappings
        ],
        encounters=[
            EncounterRead.model_validate(encounter)
            for encounter in current_patient.encounters
        ],
        conditions=[
            ConditionRead.model_validate(condition)
            for condition in current_patient.conditions
        ],
        allergies=[
            AllergyRead.model_validate(allergy)
            for allergy in current_patient.allergies
        ],
        prescriptions=prescriptions,
        observations=[
            ObservationRead.model_validate(observation)
            for observation in current_patient.observations
        ],
    )