from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientRead

router = APIRouter(prefix="/patients", tags=["patients"])

@router.post("", response_model=PatientRead, status_code=201)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(Patient).where(Patient.medbridge_id == payload.medbridge_id))
    if existing:
        raise HTTPException(status_code=409, detail="MedBridge patient ID already exists")
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

@router.get("/{medbridge_id}", response_model=PatientRead)
def get_patient(medbridge_id: str, db: Session = Depends(get_db)):
    patient = db.scalar(select(Patient).where(Patient.medbridge_id == medbridge_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
