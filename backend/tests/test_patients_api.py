from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.session import Base
from app.main import app
from app.models.clinical import PatientHospitalMapping
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
        date_of_birth=date(2000, 1, 1),
        blood_group="A+",
    )

    patient_b = Patient(
        medbridge_id="MB-TEST-B-001",
        full_name="Test Patient B",
        date_of_birth=date(2001, 2, 2),
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
        ]
    )

    db.commit()
    db.close()


def setup_function():
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


def test_hospital_doctor_can_retrieve_patient_in_own_hospital():
    token = login_as_hospital_a_doctor()

    response = client.get(
        "/patients/MB-TEST-A-001",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["medbridge_id"] == "MB-TEST-A-001"

def test_hospital_doctor_cannot_retrieve_patient_from_other_hospital():
    token = login_as_hospital_a_doctor()

    response = client.get(
        "/patients/MB-TEST-B-001",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have access to this patient"

def test_hospital_doctor_search_returns_only_own_hospital_patient():
    token = login_as_hospital_a_doctor()

    response = client.get(
        "/patients/search?q=Test%20Patient",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    results = response.json()

    assert len(results) == 1
    assert results[0]["medbridge_id"] == "MB-TEST-A-001"


def test_hospital_doctor_search_cannot_find_other_hospital_patient():
    token = login_as_hospital_a_doctor()

    response = client.get(
        "/patients/search?q=Test%20Patient%20B",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == []