"""Synthetic, isolated UX data. Never writes to the configured project database."""

from datetime import date, datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.session import Base
from app.core.security import hash_password
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.user import User
from app.models.clinical import (
    Allergy,
    Condition,
    Encounter,
    Medication,
    Observation,
    PatientHospitalMapping,
    Prescription,
)


def create_fixture_database(path=None):
    engine = create_engine(
        f"sqlite:///{path}" if path else "sqlite://",
        connect_args={"check_same_thread": False},
        **({} if path else {"poolclass": StaticPool}),
    )
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    with sessions() as db:
        hospitals = [
            Hospital(code=f"UX-{index}", name=f"Synthetic Test Hospital {index}")
            for index in range(1, 4)
        ]
        db.add_all(hospitals)
        db.flush()
        patients = [
            Patient(
                medbridge_id=f"MB-UX-TEST-{index}",
                full_name=f"Synthetic UX Patient {index}",
                date_of_birth=date(1990 + index, 4, 12),
                gender="Not specified",
                blood_group="O+",
            )
            for index in (1, 2)
        ]
        db.add_all(patients)
        db.flush()
        db.add_all(
            [
                User(
                    email="doctor.ux@example.com",
                    full_name="Synthetic UX Doctor",
                    role="doctor",
                    hospital_id=hospitals[0].id,
                    is_active=True,
                    password_hash=hash_password("UXTestOnly123!"),
                ),
                User(
                    email="patient.ux@example.com",
                    full_name=patients[0].full_name,
                    role="patient",
                    patient=patients[0],
                    is_active=True,
                    password_hash=hash_password("UXTestOnly123!"),
                ),
                User(
                    email="other.patient.ux@example.com",
                    full_name=patients[1].full_name,
                    role="patient",
                    patient=patients[1],
                    is_active=True,
                    password_hash=hash_password("UXTestOnly123!"),
                ),
            ]
        )
        for patient in patients:
            db.add(
                PatientHospitalMapping(
                    patient_id=patient.id,
                    hospital_id=hospitals[0].id,
                    external_patient_id=f"UX-A-{patient.id}",
                    source_system="Synthetic test source",
                )
            )
        for hospital in hospitals[1:]:
            db.add(
                PatientHospitalMapping(
                    patient_id=patients[0].id,
                    hospital_id=hospital.id,
                    external_patient_id=f"UX-{hospital.id}-1",
                    source_system="Synthetic test source",
                )
            )
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        encounter = Encounter(
            patient_id=patients[0].id,
            hospital_id=hospitals[0].id,
            encounter_type="outpatient",
            reason="Synthetic test visit",
            started_at=now - timedelta(days=2),
            attending_doctor="Synthetic UX Doctor",
        )
        medication = Medication(
            name="Synthetic medication",
            generic_name="Test generic",
            strength="500 mg",
            form="tablet",
        )
        db.add_all([encounter, medication])
        db.flush()
        db.add_all(
            [
                Allergy(
                    patient_id=patients[0].id,
                    substance="Synthetic allergy",
                    reaction="Synthetic rash",
                    severity="severe",
                    verified=True,
                    recorded_on=date.today(),
                ),
                Condition(
                    patient_id=patients[0].id,
                    encounter_id=encounter.id,
                    name="Synthetic active condition",
                    clinical_status="active",
                    diagnosed_on=date.today(),
                ),
                Prescription(
                    patient_id=patients[0].id,
                    encounter_id=encounter.id,
                    medication_id=medication.id,
                    dose="250 mg",
                    frequency="Once daily",
                    route="oral",
                    status="active",
                    started_on=date.today(),
                ),
                Observation(
                    patient_id=patients[0].id,
                    encounter_id=encounter.id,
                    name="C-reactive protein (synthetic)",
                    value="12",
                    unit="mg/L",
                    reference_range="Test range only",
                    observed_at=now,
                    status="final",
                ),
            ]
        )
        db.commit()
    return engine, sessions
