from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.session import Base
from app.main import app
from app.models.consent import PatientHospitalConsent
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.clinical import PatientHospitalMapping
from app.models.user import User


TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def setup_database():
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()

    hospital_a = Hospital(
        code="TEST-A",
        name="Test Hospital A",
    )
    hospital_b = Hospital(
        code="TEST-B",
        name="Test Hospital B",
    )

    db.add_all([hospital_a, hospital_b])
    db.flush()

    patient_a = Patient(
        medbridge_id="MB-TEST-A-001",
        full_name="Test Patient A",
        date_of_birth=datetime(2000, 1, 1).date(),
        blood_group="A+",
    )
    patient_b = Patient(
        medbridge_id="MB-TEST-B-001",
        full_name="Test Patient B",
        date_of_birth=datetime(2001, 2, 2).date(),
        blood_group="B+",
    )

    db.add_all([patient_a, patient_b])
    db.flush()

    db.add_all(
        [
            PatientHospitalMapping(
                patient_id=patient_a.id,
                hospital_id=hospital_a.id,
                external_patient_id="TEST-A-001",
                source_system="test",
            ),
            PatientHospitalMapping(
                patient_id=patient_b.id,
                hospital_id=hospital_b.id,
                external_patient_id="TEST-B-001",
                source_system="test",
            ),
            User(
                email="doctor.test.a@medbridge.in",
                full_name="Test Doctor A",
                password_hash=hash_password("TestDoctorA123!"),
                role="doctor",
                hospital_id=hospital_a.id,
                is_active=True,
            ),
            User(
                email="system.admin@medbridge.in",
                full_name="Test System Admin",
                password_hash=hash_password("TestSystemAdmin123!"),
                role="system_admin",
                hospital_id=None,
                is_active=True,
            ),
        ]
    )

    db.commit()
    db.close()


def setup_function():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    setup_database()


def teardown_function():
    Base.metadata.drop_all(bind=engine)


def login_as_hospital_a_doctor():
    response = client.post(
        "/auth/login",
        json={
            "email": "doctor.test.a@medbridge.in",
            "password": "TestDoctorA123!",
        },
    )

    assert response.status_code == 200
    return response.json()["access_token"]


def login_as_system_admin():
    response = client.post(
        "/auth/login",
        json={
            "email": "system.admin@medbridge.in",
            "password": "TestSystemAdmin123!",
        },
    )

    assert response.status_code == 200
    return response.json()["access_token"]


def test_hospital_doctor_can_create_consent_for_own_patient():
    token = login_as_hospital_a_doctor()

    response = client.post(
        "/consents",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 1,
            "hospital_id": 1,
            "purpose": "Continuity of care",
            "granted_at": "2026-09-23T10:00:00",
        },
    )

    assert response.status_code == 201
    assert response.json()["patient_id"] == 1
    assert response.json()["hospital_id"] == 1
    assert response.json()["status"] == "active"


def test_hospital_doctor_cannot_create_consent_for_other_hospital():
    token = login_as_hospital_a_doctor()

    response = client.post(
        "/consents",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 2,
            "hospital_id": 2,
            "purpose": "Unauthorized access",
            "granted_at": "2026-09-23T10:00:00",
        },
    )

    assert response.status_code == 403


def test_hospital_doctor_cannot_create_consent_for_unmapped_patient():
    token = login_as_hospital_a_doctor()

    response = client.post(
        "/consents",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 2,
            "hospital_id": 1,
            "purpose": "Patient not mapped to Hospital A",
            "granted_at": "2026-09-23T10:00:00",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have access to this patient"


def test_hospital_doctor_can_list_own_patient_consents():
    token = login_as_hospital_a_doctor()

    db = TestingSessionLocal()
    db.add(
        PatientHospitalConsent(
            patient_id=1,
            hospital_id=1,
            status="active",
            purpose="Continuity of care",
            granted_at=datetime(2026, 9, 23, 10, 0, 0),
        )
    )
    db.commit()
    db.close()

    response = client.get(
        "/consents/patient/1",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["patient_id"] == 1


def test_hospital_doctor_cannot_list_other_hospital_patient_consents():
    token = login_as_hospital_a_doctor()

    response = client.get(
        "/consents/patient/2",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have access to this patient"


def test_system_admin_can_list_other_hospital_patient_consents():
    token = login_as_system_admin()

    db = TestingSessionLocal()
    db.add(
        PatientHospitalConsent(
            patient_id=2,
            hospital_id=2,
            status="active",
            purpose="System administration",
            granted_at=datetime(2026, 9, 23, 10, 0, 0),
        )
    )
    db.commit()
    db.close()

    response = client.get(
        "/consents/patient/2",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["hospital_id"] == 2


def test_hospital_doctor_can_revoke_own_hospital_consent():
    token = login_as_hospital_a_doctor()

    db = TestingSessionLocal()
    consent = PatientHospitalConsent(
        patient_id=1,
        hospital_id=1,
        status="active",
        purpose="Continuity of care",
        granted_at=datetime(2026, 9, 23, 10, 0, 0),
    )
    db.add(consent)
    db.commit()
    consent_id = consent.id
    db.close()

    response = client.post(
        f"/consents/{consent_id}/revoke",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "revoked"
    assert response.json()["revoked_at"] is not None