from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_role, require_hospital_access
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.clinical import (
    PatientHospitalMapping,
    Encounter,
    Condition,
    Allergy,
    Medication,
    Prescription,
    Observation,
)
from app.schemas.patient import PatientRead
from app.schemas.clinical import (
    HospitalCreate,
    HospitalRead,
    MappingCreate,
    MappingRead,
    EncounterCreate,
    EncounterRead,
    ConditionCreate,
    ConditionRead,
    AllergyCreate,
    AllergyRead,
    MedicationCreate,
    MedicationRead,
    PrescriptionCreate,
    PrescriptionRead,
    ObservationCreate,
    ObservationRead,
    UnifiedClinicalRecord,
    UnifiedPrescriptionRead,
    PatientIdentityResolution,
)

router = APIRouter(
    prefix="/clinical",
    tags=["clinical-record"],
)


def create_and_refresh(db, model, payload):
    obj = model(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def require_payload_hospital_access(current_user, hospital_id: int):
    if current_user.role == "system_admin":
        return

    if current_user.role not in {"doctor", "hospital_admin"}:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions",
        )

    if current_user.hospital_id != hospital_id:
        raise HTTPException(
            status_code=403,
            detail="User does not have access to this hospital",
        )

@router.post(
    "/hospitals",
    response_model=HospitalRead,
    status_code=201,
)
def create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("hospital_admin", "system_admin")),
):
    existing = db.scalar(
        select(Hospital).where(Hospital.code == payload.code)
    )

    if existing:
        return existing

    return create_and_refresh(db, Hospital, payload)


@router.post(
    "/patient-mappings",
    response_model=MappingRead,
    status_code=201,
)
def create_mapping(
    payload: MappingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_payload_hospital_access(current_user, payload.hospital_id)
    existing = db.scalar(
        select(PatientHospitalMapping).where(
            PatientHospitalMapping.patient_id == payload.patient_id,
            PatientHospitalMapping.hospital_id == payload.hospital_id,
            PatientHospitalMapping.external_patient_id
            == payload.external_patient_id,
        )
    )

    if existing:
        return existing

    return create_and_refresh(
        db,
        PatientHospitalMapping,
        payload,
    )


@router.post(
    "/encounters",
    response_model=EncounterRead,
    status_code=201,
)
def create_encounter(
    payload: EncounterCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_payload_hospital_access(current_user, payload.hospital_id)

    existing = db.scalar(
        select(Encounter).where(
            Encounter.patient_id == payload.patient_id,
            Encounter.hospital_id == payload.hospital_id,
            Encounter.encounter_type == payload.encounter_type,
            Encounter.started_at == payload.started_at,
        )
    )

    if existing:
        return existing

    return create_and_refresh(
        db,
        Encounter,
        payload,
    )

def require_patient_hospital_access(db, current_user, patient_id: int):
    if current_user.role == "system_admin":
        return

    if current_user.role not in {"doctor", "hospital_admin"}:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions",
        )

    mapping = db.scalar(
        select(PatientHospitalMapping).where(
            PatientHospitalMapping.patient_id == patient_id,
            PatientHospitalMapping.hospital_id == current_user.hospital_id,
        )
    )

    if mapping is None:
        raise HTTPException(
            status_code=403,
            detail="User does not have access to this patient",
        )

@router.post(
    "/conditions",
    response_model=ConditionRead,
    status_code=201,
)
def create_condition(
    payload: ConditionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_patient_hospital_access(
        db,
        current_user,
        payload.patient_id,
    )

    existing = db.scalar(
        select(Condition).where(
            Condition.patient_id == payload.patient_id,
            Condition.encounter_id == payload.encounter_id,
            Condition.code == payload.code,
        )
    )

    if existing:
        return existing

    return create_and_refresh(
        db,
        Condition,
        payload,
    )


@router.post(
    "/allergies",
    response_model=AllergyRead,
    status_code=201,
)
def create_allergy(
    payload: AllergyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_patient_hospital_access(
        db,
        current_user,
        payload.patient_id,
    )

    existing = db.scalar(
        select(Allergy).where(
            Allergy.patient_id == payload.patient_id,
            Allergy.substance == payload.substance,
            Allergy.reaction == payload.reaction,
        )
    )

    if existing:
        return existing

    return create_and_refresh(
        db,
        Allergy,
        payload,
    )


@router.post(
    "/medications",
    response_model=MedicationRead,
    status_code=201,
)
def create_medication(
    payload: MedicationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = db.scalar(
        select(Medication).where(
            Medication.name == payload.name,
            Medication.generic_name == payload.generic_name,
            Medication.form == payload.form,
            Medication.strength == payload.strength,
        )
    )

    if existing:
        return existing

    return create_and_refresh(
        db,
        Medication,
        payload,
    )


@router.post(
    "/prescriptions",
    response_model=PrescriptionRead,
    status_code=201,
)
def create_prescription(
    payload: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_patient_hospital_access(
        db,
        current_user,
        payload.patient_id,
    )

    existing = db.scalar(
        select(Prescription).where(
            Prescription.patient_id == payload.patient_id,
            Prescription.medication_id == payload.medication_id,
            Prescription.encounter_id == payload.encounter_id,
            Prescription.started_on == payload.started_on,
        )
    )

    if existing:
        return existing

    return create_and_refresh(
        db,
        Prescription,
        payload,
    )


@router.post(
    "/observations",
    response_model=ObservationRead,
    status_code=201,
)
def create_observation(
    payload: ObservationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_patient_hospital_access(
        db,
        current_user,
        payload.patient_id,
    )

    existing = db.scalar(
        select(Observation).where(
            Observation.patient_id == payload.patient_id,
            Observation.encounter_id == payload.encounter_id,
            Observation.name == payload.name,
            Observation.observed_at == payload.observed_at,
        )
    )

    if existing:
        return existing

    return create_and_refresh(
        db,
        Observation,
        payload,
    )


@router.get(
    "/patients/{patient_id}/record",
    response_model=UnifiedClinicalRecord,
)
def get_unified_clinical_record(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    prescriptions = [
        UnifiedPrescriptionRead(
            **PrescriptionRead.model_validate(prescription).model_dump(),
            medication=MedicationRead.model_validate(prescription.medication),
        )
        for prescription in patient.prescriptions
    ]

    return UnifiedClinicalRecord(
        patient=PatientRead.model_validate(patient),
        hospital_mappings=patient.hospital_mappings,
        encounters=patient.encounters,
        conditions=patient.conditions,
        allergies=patient.allergies,
        prescriptions=prescriptions,
        observations=patient.observations,
    )


@router.get(
    "/resolve/{hospital_id}/{external_patient_id}",
    response_model=PatientIdentityResolution,
)
def resolve_patient_identity(
    hospital_id: int,
    external_patient_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital_access),
):
    mapping = db.scalar(
        select(PatientHospitalMapping).where(
            PatientHospitalMapping.hospital_id == hospital_id,
            PatientHospitalMapping.external_patient_id == external_patient_id,
        )
    )

    if mapping is None:
        raise HTTPException(
            status_code=404,
            detail="Patient identity mapping not found",
        )

    patient = db.get(Patient, mapping.patient_id)

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Mapped patient not found",
        )

    hospital = db.get(Hospital, mapping.hospital_id)

    if hospital is None:
        raise HTTPException(
            status_code=404,
            detail="Mapped hospital not found",
        )

    return PatientIdentityResolution(
        patient=PatientRead.model_validate(patient),
        mapping=MappingRead.model_validate(mapping),
        hospital=HospitalRead.model_validate(hospital),
    )