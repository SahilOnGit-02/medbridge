from datetime import date, datetime
import os

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User
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
from app.models.consent import PatientHospitalConsent


DOCTOR_EMAIL = "doctor.a@medbridge.in"
DOCTOR_PASSWORD = os.environ["DEMO_DOCTOR_PASSWORD"]

PATIENT_EMAIL = "patient.demo@medbridge.in"
PATIENT_PASSWORD = os.environ["DEMO_PATIENT_PASSWORD"]

HOSPITAL_CODE = "MB-HOSP-A-002"
EXTERNAL_PATIENT_ID = "A-DEMO-001"
PATIENT_MEDBRIDGE_ID = "MB-DEMO-001"


def get_or_create(session, model, conditions, defaults=None):
    stmt = select(model)

    for field, value in conditions.items():
        stmt = stmt.where(getattr(model, field) == value)

    obj = session.scalar(stmt)

    if obj:
        return obj, False

    obj = model(**conditions, **(defaults or {}))
    session.add(obj)
    session.flush()

    return obj, True


def main():
    db = SessionLocal()

    try:
        # ------------------------------------------------------------
        # Hospital
        # ------------------------------------------------------------
        hospital, _ = get_or_create(
            db,
            Hospital,
            {"code": HOSPITAL_CODE},
            {"name": "Hospital A"},
        )

        # ------------------------------------------------------------
        # Doctor
        # ------------------------------------------------------------
        doctor, created = get_or_create(
            db,
            User,
            {"email": DOCTOR_EMAIL},
            {
                "full_name": "Dr. Hospital A",
                "password_hash": hash_password(DOCTOR_PASSWORD),
                "role": "doctor",
                "hospital_id": hospital.id,
                "is_active": True,
            },
        )

        if not created:
            doctor.full_name = "Dr. Hospital A"
            doctor.role = "doctor"
            doctor.hospital_id = hospital.id
            doctor.is_active = True

        # ------------------------------------------------------------
        # Patient user
        # ------------------------------------------------------------
        patient_user, created = get_or_create(
            db,
            User,
            {"email": PATIENT_EMAIL},
            {
                "full_name": "Aarav Sharma",
                "password_hash": hash_password(PATIENT_PASSWORD),
                "role": "patient",
                "hospital_id": None,
                "is_active": True,
            },
        )

        if not created:
            patient_user.full_name = "Aarav Sharma"
            patient_user.role = "patient"
            patient_user.is_active = True

        db.flush()

        # ------------------------------------------------------------
        # Patient
        # ------------------------------------------------------------
        patient = db.scalar(
            select(Patient).where(
                Patient.medbridge_id == PATIENT_MEDBRIDGE_ID
            )
        )

        if patient is None:
            patient = db.scalar(
                select(Patient).where(
                    Patient.user_id == patient_user.id
                )
            )

        if patient is None:
            patient = Patient(
                user_id=patient_user.id,
                medbridge_id=PATIENT_MEDBRIDGE_ID,
                full_name="Aarav Sharma",
                date_of_birth=date(1998, 4, 12),
                blood_group="O+",
                gender="Male",
                phone="+91-9000000000",
                email=PATIENT_EMAIL,
                emergency_contact_name="Neha Sharma",
                emergency_contact_phone="+91-9111111111",
                identity_verification_status="verified",
                identity_verified_at=datetime.utcnow(),
                identity_verified_by=doctor.id,
            )

            db.add(patient)
            db.flush()

        else:
            patient.user_id = patient_user.id
            patient.medbridge_id = PATIENT_MEDBRIDGE_ID
            patient.full_name = "Aarav Sharma"
            patient.date_of_birth = date(1998, 4, 12)
            patient.blood_group = "O+"
            patient.gender = "Male"
            patient.phone = "+91-9000000000"
            patient.email = PATIENT_EMAIL
            patient.emergency_contact_name = "Neha Sharma"
            patient.emergency_contact_phone = "+91-9111111111"
            patient.identity_verification_status = "verified"
            patient.identity_verified_by = doctor.id

        db.flush()

        # ------------------------------------------------------------
        # Hospital mapping
        # ------------------------------------------------------------
        mapping, _ = get_or_create(
            db,
            PatientHospitalMapping,
            {
                "patient_id": patient.id,
                "hospital_id": hospital.id,
                "external_patient_id": EXTERNAL_PATIENT_ID,
            },
            {
                "source_system": "Hospital A HIS",
            },
        )

        if mapping.source_system != "Hospital A HIS":
            mapping.source_system = "Hospital A HIS"

        # ------------------------------------------------------------
        # Consent
        # ------------------------------------------------------------
        consent = db.scalar(
            select(PatientHospitalConsent).where(
                PatientHospitalConsent.patient_id == patient.id,
                PatientHospitalConsent.hospital_id == hospital.id,
                PatientHospitalConsent.status == "active",
            )
        )

        if not consent:
            consent = PatientHospitalConsent(
                patient_id=patient.id,
                hospital_id=hospital.id,
                status="active",
                purpose="Clinical care",
                share_allergies=True,
                share_medications=True,
                share_conditions=True,
                share_prescriptions=True,
                share_observations=True,
                share_encounters=True,
                granted_at=datetime.utcnow(),
            )

            db.add(consent)

        else:
            consent.purpose = "Clinical care"
            consent.share_allergies = True
            consent.share_medications = True
            consent.share_conditions = True
            consent.share_prescriptions = True
            consent.share_observations = True
            consent.share_encounters = True
            consent.revoked_at = None

        db.flush()

        # ------------------------------------------------------------
        # Encounter
        # ------------------------------------------------------------
        encounter = db.scalar(
            select(Encounter).where(
                Encounter.patient_id == patient.id,
                Encounter.hospital_id == hospital.id,
                Encounter.reason == "Demo clinical visit",
            )
        )

        if not encounter:
            encounter = Encounter(
                patient_id=patient.id,
                hospital_id=hospital.id,
                encounter_type="outpatient",
                reason="Demo clinical visit",
                started_at=datetime(2026, 9, 28, 12, 0),
                ended_at=datetime(2026, 9, 28, 13, 0),
                attending_doctor="Dr. Hospital A",
            )

            db.add(encounter)
            db.flush()

        # ------------------------------------------------------------
        # Condition
        # ------------------------------------------------------------
        condition = db.scalar(
            select(Condition).where(
                Condition.patient_id == patient.id,
                Condition.code == "J18.9",
            )
        )

        if not condition:
            db.add(
                Condition(
                    patient_id=patient.id,
                    encounter_id=encounter.id,
                    code="J18.9",
                    name="Pneumonia",
                    clinical_status="active",
                    diagnosed_on=date(2026, 9, 28),
                )
            )

        # ------------------------------------------------------------
        # Allergy
        # ------------------------------------------------------------
        allergy = db.scalar(
            select(Allergy).where(
                Allergy.patient_id == patient.id,
                Allergy.substance == "Penicillin",
            )
        )

        if not allergy:
            db.add(
                Allergy(
                    patient_id=patient.id,
                    substance="Penicillin",
                    reaction="Skin rash",
                    severity="mild",
                    verified=True,
                    recorded_on=date(2026, 9, 28),
                )
            )

        # ------------------------------------------------------------
        # Medication
        # ------------------------------------------------------------
        medication = db.scalar(
            select(Medication).where(
                Medication.name == "Azithromycin 500 mg",
            )
        )

        if not medication:
            medication = Medication(
                name="Azithromycin 500 mg",
                generic_name="Azithromycin",
                form="Tablet",
                strength="500 mg",
            )

            db.add(medication)
            db.flush()

        # ------------------------------------------------------------
        # Prescription
        # ------------------------------------------------------------
        prescription = db.scalar(
            select(Prescription).where(
                Prescription.patient_id == patient.id,
                Prescription.medication_id == medication.id,
                Prescription.encounter_id == encounter.id,
            )
        )

        if not prescription:
            db.add(
                Prescription(
                    patient_id=patient.id,
                    medication_id=medication.id,
                    encounter_id=encounter.id,
                    dose="500 mg",
                    frequency="once daily",
                    route="oral",
                    started_on=date(2026, 9, 28),
                    status="active",
                    instructions="Take once daily after food.",
                )
            )

        # ------------------------------------------------------------
        # Observation
        # ------------------------------------------------------------
        observation = db.scalar(
            select(Observation).where(
                Observation.patient_id == patient.id,
                Observation.encounter_id == encounter.id,
                Observation.name == "Temperature",
            )
        )

        if not observation:
            db.add(
                Observation(
                    patient_id=patient.id,
                    encounter_id=encounter.id,
                    name="Temperature",
                    value="36.7",
                    unit="C",
                    observed_at=datetime(2026, 9, 28, 12, 30),
                    status="final",
                )
            )

        db.commit()

        print("MedBridge Render demo seed complete")
        print(f"Hospital: {hospital.code} / {hospital.name}")
        print(f"Doctor: {doctor.email}")
        print(
            f"Patient: {patient.medbridge_id} / "
            f"{patient_user.email}"
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()