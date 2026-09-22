from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.patient import Patient
from app.models.hospital import Hospital
from app.api.clinical import require_patient_hospital_access
from app.api.deps import get_current_user, require_hospital_access
from app.models.clinical import (
    Encounter,
    Condition,
    Allergy,
    Medication,
    Prescription,
    Observation,
)
from app.fhir.mappings import (
    patient_to_fhir,
    hospital_to_fhir,
    encounter_to_fhir,
    condition_to_fhir,
    allergy_to_fhir,
    medication_to_fhir,
    prescription_to_fhir,
    observation_to_fhir,
)

router = APIRouter(prefix="/fhir", tags=["fhir"])


@router.get("/patients/{patient_id}")
def get_fhir_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_patient_hospital_access(
        db,
        current_user,
        patient_id,
    )

    patient = db.get(Patient, patient_id)

    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient_to_fhir(patient)


@router.get("/hospitals/{hospital_id}")
def get_fhir_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    hospital = db.get(Hospital, hospital_id)

    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found")

    return hospital_to_fhir(hospital)


@router.get("/encounters/{encounter_id}")
def get_fhir_encounter(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital_access),
):
    encounter = db.get(Encounter, encounter_id)

    if encounter is None:
        raise HTTPException(status_code=404, detail="Encounter not found")

    return encounter_to_fhir(encounter)


@router.get("/conditions/{condition_id}")
def get_fhir_condition(
    condition_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    condition = db.get(Condition, condition_id)

    if condition is None:
        raise HTTPException(status_code=404, detail="Condition not found")

    require_patient_hospital_access(
        db,
        current_user,
        condition.patient_id,
    )

    return condition_to_fhir(condition)


@router.get("/allergies/{allergy_id}")
def get_fhir_allergy(
    allergy_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    allergy = db.get(Allergy, allergy_id)

    if allergy is None:
        raise HTTPException(status_code=404, detail="Allergy not found")

    require_patient_hospital_access(
        db,
        current_user,
        allergy.patient_id,
    )

    return allergy_to_fhir(allergy)

@router.get("/medications/{medication_id}")
def get_fhir_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    medication = db.get(Medication, medication_id)

    if medication is None:
        raise HTTPException(status_code=404, detail="Medication not found")

    return medication_to_fhir(medication)


@router.get("/prescriptions/{prescription_id}")
def get_fhir_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    prescription = db.get(Prescription, prescription_id)

    if prescription is None:
        raise HTTPException(status_code=404, detail="Prescription not found")

    require_patient_hospital_access(
        db,
        current_user,
        prescription.patient_id,
    )

    return prescription_to_fhir(prescription)


@router.get("/observations/{observation_id}")
def get_fhir_observation(
    observation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    observation = db.get(Observation, observation_id)

    if observation is None:
        raise HTTPException(status_code=404, detail="Observation not found")

    require_patient_hospital_access(
        db,
        current_user,
        observation.patient_id,
    )

    return observation_to_fhir(observation)

@router.get("/patients/{patient_id}/bundle")
def get_fhir_patient_bundle(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)

    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    entries = [
        {"resource": patient_to_fhir(patient)}
    ]

    for encounter in patient.encounters:
        entries.append({"resource": encounter_to_fhir(encounter)})

    for condition in patient.conditions:
        entries.append({"resource": condition_to_fhir(condition)})

    for allergy in patient.allergies:
        entries.append({"resource": allergy_to_fhir(allergy)})

    medications = {
        prescription.medication_id: prescription.medication
        for prescription in patient.prescriptions
    }

    for medication in medications.values():
        entries.append({"resource": medication_to_fhir(medication)})

    for prescription in patient.prescriptions:
        entries.append({"resource": prescription_to_fhir(prescription)})

    for observation in patient.observations:
        entries.append({"resource": observation_to_fhir(observation)})

    return {
        "resourceType": "Bundle",
        "type": "collection",
        "total": len(entries),
        "entry": entries,
    }
