from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.session import Base
from app.main import app
from app.models.clinical import (
    Allergy,
    Condition,
    Medication,
    PatientHospitalMapping,
    Prescription,
)
from app.models.hospital import Hospital
from app.models.patient import Patient
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

app.dependency_overrides[get_db] = lambda: TestingSessionLocal()

client = TestClient(app)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


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
        date_of_birth=date(2000, 1, 1),
        blood_group="A+",
        emergency_contact_name="Emergency Contact A",
        emergency_contact_phone="9999999999",
    )

    patient_b = Patient(
        medbridge_id="MB-TEST-B-001",
        full_name="Test Patient B",
        blood_group="B+",
    )

    db.add_all([patient_a, patient_b])
    db.flush()

    medication = Medication(
        name="Test Amoxicillin",
        generic_name="Amoxicillin",
        form="capsule",
        strength="500 mg",
    )

    db.add(medication)
    db.flush()

    db.add_all(
        [
            Allergy(
                patient_id=patient_a.id,
                substance="Test Penicillin",
                reaction="Test rash",
                severity="moderate",
            ),
            Condition(
                patient_id=patient_a.id,
                code="E11",
                name="Test Diabetes",
                clinical_status="active",
            ),
            Prescription(
                patient_id=patient_a.id,
                medication_id=medication.id,
                dose="500 mg",
                frequency="twice daily",
                route="oral",
                status="active",
                instructions="Test prescription",
            ),
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
                email="doctor.emergency@medbridge.in",
                full_name="Emergency Test Doctor",
                password_hash=hash_password("EmergencyDoctor123!"),
                role="doctor",
                hospital_id=hospital_a.id,
                is_active=True,
            ),
            User(
                email="patient.emergency@medbridge.in",
                full_name="Emergency Test Patient",
                password_hash=hash_password("EmergencyPatient123!"),
                role="patient",
                hospital_id=None,
                is_active=True,
                patient=patient_a,
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


def login_as_emergency_doctor():
    response = client.post(
        "/auth/login",
        json={
            "email": "doctor.emergency@medbridge.in",
            "password": "EmergencyDoctor123!",
        },
    )

    assert response.status_code == 200

    return response.json()["access_token"]


def test_emergency_access_requires_authentication():
    response = client.post(
        "/emergency-access",
        json={
            "patient_id": 1,
            "reason": "Unconscious patient requires emergency evaluation",
        },
    )

    assert response.status_code == 403


def test_emergency_access_requires_reason():
    token = login_as_emergency_doctor()

    response = client.post(
        "/emergency-access",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 1,
            "reason": "",
        },
    )

    assert response.status_code == 422


def test_emergency_access_does_not_require_normal_consent():
    token = login_as_emergency_doctor()

    response = client.post(
        "/emergency-access",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 1,
            "reason": "Patient is unconscious and requires emergency history",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["patient_id"] == 1
    assert data["status"] == "active"
    assert data["reason"] == (
        "Patient is unconscious and requires emergency history"
    )

    assert "granted_at" in data
    assert "expires_at" in data


def test_emergency_access_requires_patient_hospital_mapping():
    token = login_as_emergency_doctor()

    response = client.post(
        "/emergency-access",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 2,
            "reason": "Emergency evaluation required",
        },
    )

    assert response.status_code == 403


def test_emergency_access_returns_only_emergency_profile():
    token = login_as_emergency_doctor()

    create_response = client.post(
        "/emergency-access",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 1,
            "reason": "Emergency evaluation required",
        },
    )

    assert create_response.status_code == 201

    access_id = create_response.json()["id"]

    response = client.get(
        f"/emergency-access/{access_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["patient"]["full_name"] == "Test Patient A"
    assert data["patient"]["medbridge_id"] == "MB-TEST-A-001"
    assert data["patient"]["blood_group"] == "A+"

    assert len(data["allergies"]) == 1
    assert data["allergies"][0]["substance"] == "Test Penicillin"

    assert len(data["medications"]) == 1
    assert data["medications"][0]["name"] == "Test Amoxicillin"

    assert len(data["conditions"]) == 1
    assert data["conditions"][0]["name"] == "Test Diabetes"

    assert data["emergency_contact"]["name"] == "Emergency Contact A"
    assert data["emergency_contact"]["phone"] == "9999999999"

    assert "encounters" not in data
    assert "observations" not in data
    assert "prescriptions" not in data


def test_emergency_access_can_be_ended():
    token = login_as_emergency_doctor()

    create_response = client.post(
        "/emergency-access",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 1,
            "reason": "Emergency evaluation required",
        },
    )

    assert create_response.status_code == 201

    access_id = create_response.json()["id"]

    response = client.post(
        f"/emergency-access/{access_id}/end",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ended"