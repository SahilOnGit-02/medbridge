from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.session import Base
from app.main import app
from app.models.clinical import Medication, PatientHospitalMapping
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
                email="admin.test@medbridge.in",
                full_name="Test Hospital Admin",
                password_hash=hash_password("TestHospitalAdmin123!"),
                role="hospital_admin",
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

def test_doctor_cannot_create_hospital():
    token = login_as_hospital_a_doctor()

    response = client.post(
        "/clinical/hospitals",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "TEST-C",
            "name": "Unauthorized Hospital",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Insufficient permissions"

def test_hospital_admin_can_create_hospital():
    response = client.post(
        "/auth/login",
        json={
            "email": "admin.test@medbridge.in",
            "password": "TestHospitalAdmin123!",
        },
    )

    assert response.status_code == 200

    token = response.json()["access_token"]

    response = client.post(
        "/clinical/hospitals",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "TEST-C",
            "name": "Hospital Admin Test Hospital",
        },
    )

    assert response.status_code == 201
    assert response.json()["code"] == "TEST-C"
    assert response.json()["name"] == "Hospital Admin Test Hospital"

def test_system_admin_can_create_hospital():
    response = client.post(
        "/auth/login",
        json={
            "email": "system.admin@medbridge.in",
            "password": "TestSystemAdmin123!",
        },
    )

    assert response.status_code == 200

    token = response.json()["access_token"]

    response = client.post(
        "/clinical/hospitals",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "TEST-D",
            "name": "System Admin Test Hospital",
        },
    )

    assert response.status_code == 201
    assert response.json()["code"] == "TEST-D"
    assert response.json()["name"] == "System Admin Test Hospital"

def test_doctor_cannot_create_condition_for_other_hospital_patient():
    token = login_as_hospital_a_doctor()

    response = client.post(
        "/clinical/conditions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 2,
            "name": "Unauthorized Test Condition",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have access to this patient"

def test_doctor_can_create_condition_for_own_hospital_patient():
    token = login_as_hospital_a_doctor()

    response = client.post(
        "/clinical/conditions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 1,
            "name": "Authorized Test Condition",
        },
    )

    assert response.status_code == 201
    assert response.json()["patient_id"] == 1
    assert response.json()["name"] == "Authorized Test Condition"

def test_doctor_cannot_create_allergy_for_other_hospital_patient():
    token = login_as_hospital_a_doctor()

    response = client.post(
        "/clinical/allergies",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 2,
            "substance": "Unauthorized Test Allergy",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have access to this patient"

def test_doctor_can_create_allergy_for_own_hospital_patient():
    token = login_as_hospital_a_doctor()

    response = client.post(
        "/clinical/allergies",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 1,
            "substance": "Authorized Test Allergy",
        },
    )

    assert response.status_code == 201
    assert response.json()["patient_id"] == 1
    assert response.json()["substance"] == "Authorized Test Allergy"

def test_hospital_doctor_cannot_create_prescription_for_other_hospital_patient():
    token = login_as_hospital_a_doctor()

    db = TestingSessionLocal()
    medication = db.query(Medication).filter_by(name="Test Amoxicillin").first()
    db.close()

    response = client.post(
        "/clinical/prescriptions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 2,
            "medication_id": medication.id,
            "dose": "500 mg",
            "frequency": "twice daily",
            "route": "oral",
            "status": "active",
            "instructions": "Test prescription",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have access to this patient"

def test_hospital_doctor_can_create_prescription_for_own_hospital_patient():
    token = login_as_hospital_a_doctor()

    db = TestingSessionLocal()
    medication = db.query(Medication).filter_by(name="Test Amoxicillin").first()
    db.close()

    response = client.post(
        "/clinical/prescriptions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": 1,
            "medication_id": medication.id,
            "dose": "500 mg",
            "frequency": "twice daily",
            "route": "oral",
            "status": "active",
            "instructions": "Test prescription",
        },
    )

    assert response.status_code == 201
    assert response.json()["patient_id"] == 1
    assert response.json()["medication_id"] == medication.id