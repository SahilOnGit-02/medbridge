from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.audit import log_audit_event
from app.models.patient import Patient
from app.models.consent import PatientHospitalConsent
from app.models.hospital import Hospital
from app.api.clinical import (
    require_patient_hospital_access,
    require_patient_clinical_read_access,
)
from app.api.deps import get_current_user, require_hospital_access
from app.models.clinical import (
    Encounter,
    PatientHospitalMapping,
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


def check_clinical_scope(db, current_user, patient_id, category=None):
    require_patient_hospital_access(db, current_user, patient_id)
    consent = require_patient_clinical_read_access(db, current_user, patient_id)
    if (
        consent is not None
        and category is not None
        and not getattr(consent, f"share_{category}")
    ):
        raise HTTPException(
            status_code=403, detail="This category is not shared by the patient"
        )
    return consent


def audit_fhir_read(db, current_user, patient_id, resource_id, category):
    log_audit_event(
        db,
        current_user=current_user,
        action="fhir_record_view",
        resource_type=category,
        resource_id=resource_id,
        patient_id=patient_id,
        success=True,
    )
    db.commit()


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

    log_audit_event(
        db,
        current_user=current_user,
        action="fhir_patient_view",
        resource_type="fhir_patient",
        resource_id=patient_id,
        patient_id=patient_id,
        success=True,
    )
    db.commit()

    return patient_to_fhir(patient)


@router.get("/hospitals/{hospital_id}")
def get_fhir_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital_access),
):
    hospital = db.get(Hospital, hospital_id)

    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found")

    return hospital_to_fhir(hospital)


@router.get("/encounters/{encounter_id}")
def get_fhir_encounter(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    encounter = db.get(Encounter, encounter_id)

    if encounter is None:
        raise HTTPException(status_code=404, detail="Encounter not found")

    if (
        current_user.role != "system_admin"
        and current_user.hospital_id != encounter.hospital_id
    ):
        raise HTTPException(
            status_code=403,
            detail="User does not have access to this hospital",
        )

    check_clinical_scope(db, current_user, encounter.patient_id, "encounters")
    audit_fhir_read(db, current_user, encounter.patient_id, encounter.id, "encounters")
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

    check_clinical_scope(db, current_user, condition.patient_id, "conditions")
    audit_fhir_read(db, current_user, condition.patient_id, condition.id, "conditions")
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

    check_clinical_scope(db, current_user, allergy.patient_id, "allergies")
    audit_fhir_read(db, current_user, allergy.patient_id, allergy.id, "allergies")
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

    if current_user.role != "system_admin":
        query = select(Prescription).where(Prescription.medication_id == medication_id)
        if current_user.role == "patient" and current_user.patient is not None:
            query = query.where(Prescription.patient_id == current_user.patient.id)
        elif (
            current_user.role in {"doctor", "hospital_admin"}
            and current_user.hospital_id is not None
        ):
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            query = (
                query.join(
                    PatientHospitalMapping,
                    PatientHospitalMapping.patient_id == Prescription.patient_id,
                )
                .join(
                    PatientHospitalConsent,
                    PatientHospitalConsent.patient_id == Prescription.patient_id,
                )
                .where(
                    PatientHospitalMapping.hospital_id == current_user.hospital_id,
                    PatientHospitalConsent.hospital_id == current_user.hospital_id,
                    PatientHospitalConsent.status == "active",
                    PatientHospitalConsent.share_medications.is_(True),
                    PatientHospitalConsent.share_prescriptions.is_(True),
                    or_(
                        PatientHospitalConsent.expires_at.is_(None),
                        PatientHospitalConsent.expires_at > now,
                    ),
                )
            )
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        if db.scalar(query.limit(1)) is None:
            raise HTTPException(
                status_code=403,
                detail="Medication details are not shared in an accessible record",
            )
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

    check_clinical_scope(db, current_user, prescription.patient_id, "prescriptions")
    check_clinical_scope(db, current_user, prescription.patient_id, "medications")
    audit_fhir_read(
        db, current_user, prescription.patient_id, prescription.id, "prescriptions"
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

    check_clinical_scope(db, current_user, observation.patient_id, "observations")
    audit_fhir_read(
        db, current_user, observation.patient_id, observation.id, "observations"
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

    require_patient_hospital_access(
        db,
        current_user,
        patient_id,
    )

    consent = check_clinical_scope(db, current_user, patient_id)
    allowed = lambda category: consent is None or getattr(consent, f"share_{category}")

    entries = [{"resource": patient_to_fhir(patient)}]

    for encounter in patient.encounters if allowed("encounters") else []:
        entries.append({"resource": encounter_to_fhir(encounter)})

    for condition in patient.conditions if allowed("conditions") else []:
        entries.append({"resource": condition_to_fhir(condition)})

    for allergy in patient.allergies if allowed("allergies") else []:
        entries.append({"resource": allergy_to_fhir(allergy)})

    medications = {
        prescription.medication_id: prescription.medication
        for prescription in (
            patient.prescriptions
            if allowed("prescriptions") and allowed("medications")
            else []
        )
    }

    for medication in medications.values():
        entries.append({"resource": medication_to_fhir(medication)})

    for prescription in (
        patient.prescriptions
        if allowed("prescriptions") and allowed("medications")
        else []
    ):
        entries.append({"resource": prescription_to_fhir(prescription)})

    for observation in patient.observations if allowed("observations") else []:
        entries.append({"resource": observation_to_fhir(observation)})

    audit_fhir_read(db, current_user, patient_id, patient_id, "clinical_record")
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "total": len(entries),
        "entry": entries,
    }
