from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.hospital import Hospital
from app.models.clinical import (
    PatientHospitalMapping,
    Encounter,
    Condition,
    Allergy,
    Medication,
    Prescription,
    Observation,
)
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


@router.post("/hospitals", response_model=HospitalRead, status_code=201)

def create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
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
):
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
):
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


@router.post(
    "/conditions",
    response_model=ConditionRead,
    status_code=201,
)
def create_condition(
    payload: ConditionCreate,
    db: Session = Depends(get_db),
):
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
):
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
):
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
):
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