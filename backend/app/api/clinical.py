from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.hospital import Hospital
from app.models.clinical import (
    PatientHospitalMapping, Encounter, Condition, Allergy,
    Medication, Prescription, Observation
)
from app.schemas.clinical import (
    HospitalCreate, HospitalRead, MappingCreate, MappingRead,
    EncounterCreate, EncounterRead, ConditionCreate, ConditionRead,
    AllergyCreate, AllergyRead, MedicationCreate, MedicationRead,
    PrescriptionCreate, PrescriptionRead, ObservationCreate, ObservationRead
)

router = APIRouter(prefix="/clinical", tags=["clinical-record"])

def create_and_refresh(db, model, payload):
    obj = model(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.post("/hospitals", response_model=HospitalRead, status_code=201)
def create_hospital(payload: HospitalCreate, db: Session = Depends(get_db)):
    return create_and_refresh(db, Hospital, payload)

@router.post("/patient-mappings", response_model=MappingRead, status_code=201)
def create_mapping(payload: MappingCreate, db: Session = Depends(get_db)):
    return create_and_refresh(db, PatientHospitalMapping, payload)

@router.post("/encounters", response_model=EncounterRead, status_code=201)
def create_encounter(payload: EncounterCreate, db: Session = Depends(get_db)):
    return create_and_refresh(db, Encounter, payload)

@router.post("/conditions", response_model=ConditionRead, status_code=201)
def create_condition(payload: ConditionCreate, db: Session = Depends(get_db)):
    return create_and_refresh(db, Condition, payload)

@router.post("/allergies", response_model=AllergyRead, status_code=201)
def create_allergy(payload: AllergyCreate, db: Session = Depends(get_db)):
    return create_and_refresh(db, Allergy, payload)

@router.post("/medications", response_model=MedicationRead, status_code=201)
def create_medication(payload: MedicationCreate, db: Session = Depends(get_db)):
    return create_and_refresh(db, Medication, payload)

@router.post("/prescriptions", response_model=PrescriptionRead, status_code=201)
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db)):
    return create_and_refresh(db, Prescription, payload)

@router.post("/observations", response_model=ObservationRead, status_code=201)
def create_observation(payload: ObservationCreate, db: Session = Depends(get_db)):
    return create_and_refresh(db, Observation, payload)
