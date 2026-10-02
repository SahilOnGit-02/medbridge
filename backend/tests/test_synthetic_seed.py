from datetime import date

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.db.session import Base
from app.models.patient import Patient
from app.models.user import User
from app.models.clinical import Allergy, Condition, Encounter, Observation, Prescription
from app.models.audit import AuditLog
from scripts.seed_synthetic import require_local_database, seed


def test_local_seed_population_idempotence_and_account_preservation():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        doctor = User(
            email="doctor.a@medbridge.in",
            full_name="Demo Doctor",
            role="doctor",
            password_hash="unchanged-doctor-hash",
        )
        patient_user = User(
            email="patient.demo@medbridge.in",
            full_name="Demo Patient",
            role="patient",
            password_hash="unchanged-patient-hash",
        )
        demo = Patient(
            medbridge_id="MB-EXISTING-DEMO", full_name="Demo Patient", user=patient_user
        )
        db.add_all([doctor, demo])
        db.commit()
        first = seed(db, today=date(2026, 10, 1))
        db.commit()
        assert first["profiles"] == first["newly_populated_profiles"] == 100
        assert first["demo_patient_visits"] == 96
        assert db.scalar(select(func.count()).select_from(Patient)) == 100
        for model in [Encounter, Condition, Allergy, Prescription, Observation]:
            assert db.scalar(select(func.count(func.distinct(model.patient_id)))) == 100
        assert (
            len({row.date_of_birth for row in db.scalars(select(Patient)).all()}) > 90
        )
        assert db.scalar(select(func.count()).select_from(AuditLog)) == 0
        second = seed(db, today=date(2026, 10, 2))
        db.commit()
        assert second["newly_populated_profiles"] == 0
        assert first["counts"] == second["counts"]
        assert patient_user.password_hash == "unchanged-patient-hash"
        assert doctor.password_hash == "unchanged-doctor-hash"
        assert patient_user.patient.id == demo.id
        assert doctor.hospital.name.startswith("Synthetic")
        assert len(demo.hospital_mappings) == 3
        current = db.scalars(
            select(Prescription).where(
                Prescription.patient_id == demo.id, Prescription.status == "active"
            )
        ).all()
        assert (
            len(current) == 2 and current[0].medication_id != current[1].medication_id
        )
        visits = db.scalars(
            select(Encounter)
            .where(Encounter.patient_id == demo.id)
            .order_by(Encounter.started_at)
        ).all()
        assert (visits[-1].started_at - visits[0].started_at).days > 2800
    engine.dispose()


def test_seed_rejects_remote_or_production_databases():
    require_local_database("postgresql://user@localhost/demo", "development")
    require_local_database("sqlite://", "development")
    with pytest.raises(RuntimeError):
        require_local_database(
            "postgresql://user@remote.example.com/demo", "development"
        )
    with pytest.raises(RuntimeError):
        require_local_database("postgresql://user@localhost/demo", "production")
