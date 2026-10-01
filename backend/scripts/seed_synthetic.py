"""Explicit local-only UX dataset. No real patient data or clinical guidance."""

import argparse
import json
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.engine import make_url

from app.models.clinical import (
    Allergy,
    Condition,
    Encounter,
    Medication,
    Observation,
    PatientHospitalMapping,
    Prescription,
)
from app.models.consent import PatientHospitalConsent
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.user import User

SOURCE = "Synthetic local demo dataset"
FIRST_NAMES = [
    "Aditi",
    "Arjun",
    "Ananya",
    "Dev",
    "Diya",
    "Ishaan",
    "Kabir",
    "Kavya",
    "Meera",
    "Nikhil",
    "Priya",
    "Rohan",
    "Sana",
    "Sanjay",
    "Tara",
    "Veer",
    "Zoya",
    "Aarav",
    "Neha",
    "Vikram",
]
LAST_NAMES = ["Mehta", "Sharma", "Rao", "Patel", "Kapoor"]
SCENARIOS = [
    ("Hypertension", "Blood pressure follow-up", "Amlodipine", "5 mg", "Once daily"),
    ("Type 2 diabetes", "Diabetes review", "Metformin", "500 mg", "Twice daily"),
    ("Asthma", "Respiratory follow-up", "Salbutamol", "100 mcg", "As recorded in demo"),
    (
        "Osteoarthritis",
        "Joint pain review",
        "Paracetamol",
        "500 mg",
        "As recorded in demo",
    ),
    ("Hypothyroidism", "Thyroid review", "Levothyroxine", "50 mcg", "Once daily"),
    (
        "Gastroesophageal reflux",
        "Digestive health review",
        "Omeprazole",
        "20 mg",
        "Once daily",
    ),
]
ALLERGIES = [
    ("Penicillin", "Hives", "severe"),
    ("Peanuts", "Swelling", "severe"),
    ("Latex", "Contact rash", "moderate"),
    ("Pollen", "Sneezing", "mild"),
    ("Shellfish", "Hives", "moderate"),
    ("Dust mites", "Rhinitis", "mild"),
]


def require_local_database(database_url, app_env):
    url = make_url(database_url)
    host = url.host or url.query.get("host", "")
    if app_env != "development" or not (
        url.drivername.startswith("sqlite")
        or host in {"localhost", "127.0.0.1", "::1"}
        or (url.drivername.startswith("postgresql") and str(host).startswith("/"))
    ):
        raise RuntimeError(
            "Synthetic seeding is restricted to a local development database"
        )


def seed(db, today=None):
    """100 profiles total: existing demo patient plus 99 labeled synthetic profiles.

    Transactional and idempotent. Existing clinical data is never replaced.
    Only the explicitly named local demo doctor is assigned to the demo provider.
    Sharing grants are labeled simulation fixtures, not represented as user actions.
    """
    today = today or date.today()
    anchor = datetime.combine(today, datetime.min.time()).replace(hour=10)
    doctor = db.scalar(select(User).where(User.email == "doctor.a@medbridge.in"))
    patient_user = db.scalar(
        select(User).where(User.email == "patient.demo@medbridge.in")
    )
    if (
        not doctor
        or doctor.role != "doctor"
        or not patient_user
        or patient_user.role != "patient"
        or not patient_user.patient
    ):
        raise RuntimeError(
            "Create the authorized local doctor and patient accounts first"
        )
    if doctor.hospital_id and not doctor.hospital.code.startswith("SYN-LOCAL-"):
        raise RuntimeError("Refusing to change a non-demo hospital assignment")
    demo = patient_user.patient
    marked = db.scalar(
        select(PatientHospitalMapping).where(
            PatientHospitalMapping.patient_id == demo.id,
            PatientHospitalMapping.source_system == SOURCE,
        )
    )
    if not marked and any(
        [
            demo.encounters,
            demo.conditions,
            demo.allergies,
            demo.prescriptions,
            demo.observations,
        ]
    ):
        raise RuntimeError(
            "Refusing to add fictional records to an existing non-demo clinical history"
        )
    hospitals = []
    for index, label in enumerate(["Central", "North", "Community"], 1):
        code = f"SYN-LOCAL-{index}"
        hospital = db.scalar(select(Hospital).where(Hospital.code == code))
        if not hospital:
            hospital = Hospital(code=code, name=f"Synthetic {label} Hospital")
            db.add(hospital)
            db.flush()
        hospitals.append(hospital)
    doctor.hospital_id = hospitals[0].id
    medications = []
    for _, _, name, strength, _ in SCENARIOS:
        medication = db.scalar(
            select(Medication).where(Medication.name == f"{name} (synthetic)")
        )
        if not medication:
            medication = Medication(
                name=f"{name} (synthetic)",
                generic_name=name,
                strength=strength,
                form="inhaler" if name == "Salbutamol" else "tablet",
            )
            db.add(medication)
            db.flush()
        medications.append(medication)
    added = 0
    profiles = []
    for index in range(100):
        if index == 0:
            patient = demo
        else:
            medbridge_id = f"MB-SYN-{index:03d}"
            patient = db.scalar(
                select(Patient).where(Patient.medbridge_id == medbridge_id)
            )
            if not patient:
                patient = Patient(
                    medbridge_id=medbridge_id,
                    full_name=f"Synthetic {FIRST_NAMES[index % 20]} {LAST_NAMES[index // 20]}",
                    date_of_birth=date(
                        1946 + (index * 7) % 59, 1 + index % 12, 1 + (index * 3) % 27
                    ),
                    gender=["Female", "Male", "Not specified"][index % 3],
                    blood_group=["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"][
                        index % 8
                    ],
                    blood_group_source="patient_reported",
                    email=f"synthetic.patient.{index:03d}@example.com",
                    address="Fictional address, local demonstration only",
                    emergency_contact_name="Synthetic family contact",
                    identity_verification_status="unverified",
                )
                db.add(patient)
                db.flush()
        profiles.append(patient)
        existing = db.scalar(
            select(PatientHospitalMapping).where(
                PatientHospitalMapping.patient_id == patient.id,
                PatientHospitalMapping.source_system == SOURCE,
            )
        )
        if existing:
            continue
        if any(
            [
                patient.encounters,
                patient.conditions,
                patient.allergies,
                patient.prescriptions,
                patient.observations,
            ]
        ):
            raise RuntimeError(
                f"Refusing to modify existing clinical history: {patient.medbridge_id}"
            )
        if index == 0 and not patient.date_of_birth:
            patient.date_of_birth = date(1981, 6, 15)
        for hospital in hospitals:
            db.add(
                PatientHospitalMapping(
                    patient_id=patient.id,
                    hospital_id=hospital.id,
                    external_patient_id=f"SYN-{hospital.code}-{index:03d}",
                    source_system=SOURCE,
                )
            )
            db.add(
                PatientHospitalConsent(
                    patient_id=patient.id,
                    hospital_id=hospital.id,
                    status="active",
                    purpose="Synthetic UX simulation grant, created by local demo seed, not a real patient authorization",
                    granted_at=anchor - timedelta(days=3000),
                    expires_at=None,
                    share_allergies=True,
                    share_medications=True,
                    share_conditions=True,
                    share_prescriptions=True,
                    share_observations=True,
                    share_encounters=True,
                )
            )
        for number in range(1 + index % 3):
            substance, reaction, severity = ALLERGIES[(index + number) % len(ALLERGIES)]
            db.add(
                Allergy(
                    patient_id=patient.id,
                    substance=substance,
                    reaction=f"{reaction} (synthetic)",
                    severity=severity,
                    verified=False,
                    recorded_on=today - timedelta(days=800 + 40 * number),
                )
            )
        visit_count = 96 if index == 0 else 12 + index % 49
        for visit in range(visit_count):
            scenario_index = (index + (1 if visit == 1 else visit // 6)) % len(
                SCENARIOS
            )
            condition, reason, _, dose, frequency = SCENARIOS[scenario_index]
            started = anchor - timedelta(days=(index % 7) + visit * 30)
            hospital = hospitals[visit % 3]
            encounter = Encounter(
                patient_id=patient.id,
                hospital_id=hospital.id,
                encounter_type=["outpatient", "teleconsultation", "follow-up"][
                    visit % 3
                ],
                reason=f"{reason} (synthetic visit {visit + 1:03d})",
                started_at=started,
                ended_at=started + timedelta(minutes=30 + visit % 30),
                attending_doctor=f"Synthetic clinician {1 + visit % 5}",
            )
            db.add(encounter)
            db.flush()
            db.add(
                Prescription(
                    patient_id=patient.id,
                    encounter_id=encounter.id,
                    medication_id=medications[scenario_index].id,
                    dose=dose,
                    frequency=frequency,
                    route="inhaled" if scenario_index == 2 else "oral",
                    started_on=started.date(),
                    ended_on=(
                        None if visit < 2 else (started + timedelta(days=14)).date()
                    ),
                    status=(
                        "active" if visit < 2 else ["completed", "stopped"][visit % 2]
                    ),
                    instructions="Fictional prescription for interface testing only. Not treatment guidance.",
                )
            )
            if visit % 6 == 0 or visit == 1:
                db.add(
                    Condition(
                        patient_id=patient.id,
                        encounter_id=encounter.id,
                        name=condition,
                        clinical_status="active" if visit < 2 else "resolved",
                        diagnosed_on=started.date(),
                        notes="Synthetic diagnosis for UX testing. No real clinical assessment.",
                    )
                )
            for test in range(2):
                db.add(
                    Observation(
                        patient_id=patient.id,
                        encounter_id=encounter.id,
                        name=["Blood pressure (synthetic)", "Hemoglobin (synthetic)"][
                            test
                        ],
                        value=[
                            f"{118 + (index + visit) % 35}/{74 + visit % 18}",
                            f"{11 + (index + visit) % 5}.{visit % 10}",
                        ][test],
                        unit=["mmHg", "g/dL"][test],
                        reference_range="Synthetic example, not a clinical interpretation",
                        observed_at=started + timedelta(minutes=15 + test),
                        status="final",
                    )
                )
        added += 1
    db.flush()
    ids = [patient.id for patient in profiles]
    return {
        "dataset": SOURCE,
        "profiles": len(profiles),
        "newly_populated_profiles": added,
        "demo_patient_id": demo.id,
        "demo_patient_medbridge_id": demo.medbridge_id,
        "demo_patient_visits": db.scalar(
            select(func.count())
            .select_from(Encounter)
            .where(Encounter.patient_id == demo.id)
        ),
        "counts": {
            model.__tablename__: db.scalar(
                select(func.count()).select_from(model).where(model.patient_id.in_(ids))
            )
            for model in [Encounter, Condition, Allergy, Prescription, Observation]
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-demo", action="store_true", required=True)
    parser.parse_args()
    from app.core.config import settings
    from app.db.session import SessionLocal

    require_local_database(settings.database_url, settings.app_env)
    with SessionLocal.begin() as db:
        result = seed(db)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
