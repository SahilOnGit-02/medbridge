from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientRead, PatientSearchResult

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientRead, status_code=201)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
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

    query = query.order_by(Patient.full_name.asc())

    return db.scalars(query).all()


@router.get("/{medbridge_id}", response_model=PatientRead)
def get_patient(medbridge_id: str, db: Session = Depends(get_db)):
    patient = db.scalar(
        select(Patient).where(Patient.medbridge_id == medbridge_id)
    )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient