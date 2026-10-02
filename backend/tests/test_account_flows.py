"""Account lifecycle tests use an isolated database and private temporary mailbox."""

from datetime import datetime, timedelta
import json
import re
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.api.deps import get_db
from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.account import AccountToken
from app.models.user import User
from app.models.patient import Patient
from tests.ux_fixtures import create_fixture_database

PASSWORD = "IsolatedTest123!"


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    engine, sessions = create_fixture_database()
    for key, value in {
        "account_mail_mode": "capture",
        "account_mailbox_dir": str(tmp_path / "mail"),
        "public_app_url": "http://localhost:5173",
        "app_env": "development",
    }.items():
        monkeypatch.setattr(settings, key, value)

    def database():
        with sessions() as db:
            yield db

    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = database
    with TestClient(app) as client:
        yield client, sessions, tmp_path / "mail"
    if previous is None:
        app.dependency_overrides.pop(get_db, None)
    else:
        app.dependency_overrides[get_db] = previous
    engine.dispose()


def login(client, portal, email, password="UXTestOnly123!"):
    return client.post(
        f"/auth/{portal}/login", json={"identifier": email, "password": password}
    )


def bearer(response):
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def signup(client, portal="doctor"):
    return client.post(
        f"/auth/{portal}/signup",
        json={
            "full_name": "Dr. Test Person",
            "username": f"test.{portal}",
            "email": f"new.{portal}@example.com",
            "password": PASSWORD,
            "organization": "Synthetic Test Hospital 1",
            "registration_number": "TEST-100",
            "date_of_birth": "1990-06-14",
        },
    )


def mail_token(mail):
    messages = sorted(mail.glob("*.json"), key=lambda file: file.stat().st_mtime_ns)
    assert messages
    return re.search(
        r"token=([A-Za-z0-9_-]+)", json.loads(messages[-1].read_text())["body"]
    )[1]


def test_portal_roles_and_forgiving_identifier(fixture):
    client, _, _ = fixture
    assert login(client, "patient", "doctor.ux@example.com").status_code == 401
    assert login(client, "doctor", "patient.ux@example.com").status_code == 401
    assert login(client, "doctor", " DOCTOR.UX@EXAMPLE.COM ").status_code == 200
    assert login(client, "anything", "doctor.ux@example.com").status_code == 404


def test_doctor_requires_verification_then_authorized_approval(fixture):
    client, sessions, mail = fixture
    assert signup(client).status_code == 202
    assert login(client, "doctor", "test.doctor", PASSWORD).status_code == 403
    with sessions() as db:
        applicant = db.scalar(
            select(User).where(User.email == "new.doctor@example.com")
        )
        applicant_id = applicant.id
        assert not applicant.is_active and applicant.hospital_id is None
        db.add(
            User(
                email="admin@example.com",
                full_name="Test Admin",
                role="hospital_admin",
                hospital_id=1,
                password_hash=hash_password(PASSWORD),
                is_active=True,
            )
        )
        db.commit()
    admin = bearer(login(client, "doctor", "admin@example.com", PASSWORD))
    assert (
        client.post(
            f"/auth/registrations/{applicant_id}/approve",
            headers=admin,
            json={"hospital_id": 1},
        ).status_code
        == 400
    )
    token = mail_token(mail)
    assert (
        client.post("/auth/patient/verify-email", json={"token": token}).status_code
        == 400
    )
    assert (
        client.post("/auth/doctor/verify-email", json={"token": token}).status_code
        == 200
    )
    assert (
        client.post("/auth/doctor/verify-email", json={"token": token}).status_code
        == 400
    )
    assert login(client, "doctor", "test.doctor", PASSWORD).status_code == 403
    doctor = bearer(login(client, "doctor", "doctor.ux@example.com"))
    assert client.get("/auth/registrations/pending", headers=doctor).status_code == 403
    assert (
        client.post(
            f"/auth/registrations/{applicant_id}/approve",
            headers=doctor,
            json={"hospital_id": 1},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/auth/registrations/{applicant_id}/approve",
            headers=admin,
            json={"hospital_id": 2},
        ).status_code
        == 403
    )
    assert (
        client.get("/auth/registrations/pending", headers=admin).json()[0]["id"]
        == applicant_id
    )
    assert (
        client.post(
            f"/auth/registrations/{applicant_id}/approve",
            headers=admin,
            json={"hospital_id": 1},
        ).status_code
        == 200
    )
    assert login(client, "doctor", "test.doctor", PASSWORD).status_code == 200
    assert login(client, "patient", "test.doctor", PASSWORD).status_code == 401


def test_patient_signup_empty_profile_and_no_record_claim(fixture):
    client, sessions, mail = fixture
    assert signup(client, "patient").status_code == 202
    assert (
        client.post(
            "/auth/patient/verify-email", json={"token": mail_token(mail)}
        ).status_code
        == 200
    )
    headers = bearer(login(client, "patient", "test.patient", PASSWORD))
    profile = client.get("/patients/me/summary", headers=headers).json()
    assert profile["patient"]["medbridge_id"] not in {"MB-UX-TEST-1", "MB-UX-TEST-2"}
    assert not profile["encounters"] and not profile["hospital_mappings"]
    assert client.get("/patients", headers=headers).status_code == 403
    assert (
        client.patch(
            "/patients/MB-UX-TEST-1/profile",
            headers=headers,
            json={"full_name": "Attacker"},
        ).status_code
        == 403
    )
    assert signup(client, "patient").status_code == 202
    with sessions() as db:
        assert (
            len(
                db.scalars(
                    select(User).where(User.email == "new.patient@example.com")
                ).all()
            )
            == 1
        )


def test_recovery_generic_response_private_username_and_throttle(fixture):
    client, sessions, mail = fixture
    with sessions() as db:
        user = db.scalar(select(User).where(User.email == "patient.ux@example.com"))
        user.username = "private.username"
        db.commit()
    known = client.post(
        "/auth/patient/recover/username", json={"email": "patient.ux@example.com"}
    )
    unknown = client.post(
        "/auth/patient/recover/username", json={"email": "missing@example.com"}
    )
    wrong = client.post(
        "/auth/doctor/recover/username", json={"email": "patient.ux@example.com"}
    )
    assert known.status_code == unknown.status_code == wrong.status_code == 202
    assert known.json() == unknown.json() == wrong.json()
    files = list(mail.glob("*.json"))
    assert len(files) == 1
    assert "private.username" in files[0].read_text()

    if os.name != "nt":
        assert files[0].stat().st_mode & 0o777 == 0o600

    responses = []
    for _ in range(7):
        responses.append(
            client.post(
                "/auth/patient/recover/username",
                json={"email": "patient.ux@example.com"},
            )
        )

    assert all(response.status_code == 202 for response in responses)
    assert all(response.json() == known.json() for response in responses)

    # Recovery is throttled after five attempts for the same key.
    assert len(list(mail.glob("*.json"))) == 5

def test_reset_single_use_expiry_portal_binding_session_revocation(fixture):
    client, sessions, mail = fixture
    old = bearer(login(client, "patient", "patient.ux@example.com"))
    assert (
        client.post(
            "/auth/patient/recover/password", json={"email": "patient.ux@example.com"}
        ).status_code
        == 202
    )
    token = mail_token(mail)
    assert (
        client.post(
            "/auth/doctor/reset-password", json={"token": token, "password": PASSWORD}
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/auth/patient/reset-password", json={"token": token, "password": "short"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/auth/patient/reset-password", json={"token": token, "password": PASSWORD}
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/auth/patient/reset-password", json={"token": token, "password": PASSWORD}
        ).status_code
        == 400
    )
    assert client.get("/auth/me", headers=old).status_code == 401
    assert login(client, "patient", "patient.ux@example.com").status_code == 401
    assert (
        login(client, "patient", "patient.ux@example.com", PASSWORD).status_code == 200
    )
    client.post(
        "/auth/patient/recover/password", json={"email": "patient.ux@example.com"}
    )
    token = mail_token(mail)
    with sessions() as db:
        for row in db.scalars(
            select(AccountToken).where(AccountToken.consumed_at.is_(None))
        ):
            row.expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.commit()
    assert (
        client.post(
            "/auth/patient/reset-password", json={"token": token, "password": PASSWORD}
        ).status_code
        == 400
    )


def test_mail_capture_disabled_in_production(fixture, monkeypatch):
    client, _, mail = fixture
    monkeypatch.setattr(settings, "app_env", "production")
    assert signup(client).status_code == 503
    assert (
        client.post(
            "/auth/patient/recover/password", json={"email": "patient.ux@example.com"}
        ).status_code
        == 503
    )
    assert not mail.exists()


def test_owned_profile_validation_and_account_email_preserved(fixture):
    client, sessions, _ = fixture
    headers = bearer(login(client, "patient", "patient.ux@example.com"))
    result = client.patch(
        "/patients/me/profile",
        headers=headers,
        json={
            "full_name": " Test Patient ",
            "phone": "+1 (202) 555-0123",
            "blood_group": " b + ",
            "email": "contact@example.com",
        },
    )
    assert result.status_code == 200, result.text
    assert result.json()["full_name"] == "Test Patient"
    assert result.json()["phone"] == "+12025550123"
    assert result.json()["blood_group_source"] == "patient_reported"
    assert (
        client.get("/auth/me", headers=headers).json()["email"]
        == "patient.ux@example.com"
    )
    for data in [{"user_id": 3}, {"full_name": None}, {"date_of_birth": "2999-01-01"}]:
        assert (
            client.patch("/patients/me/profile", headers=headers, json=data).status_code
            == 422
        )
    assert (
        client.post(
            "/patients/me/photo",
            headers=headers,
            files={"file": ("bad.png", b"not an image", "image/png")},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/patients",
            headers=headers,
            json={"medbridge_id": "MB-FORBIDDEN", "full_name": "Test"},
        ).status_code
        == 403
    )
    with sessions() as db:
        assert db.get(Patient, 2).full_name == "Synthetic UX Patient 2"


def test_resend_verification_and_login_rate_limit(fixture):
    client, _, mail = fixture
    signup(client)
    assert (
        client.post(
            "/auth/doctor/recover/verification",
            json={"email": "new.doctor@example.com"},
        ).status_code
        == 202
    )
    assert len(list(mail.glob("*.json"))) == 2
    for _ in range(5):
        assert (
            login(client, "doctor", "doctor.ux@example.com", "wrong").status_code == 401
        )
    assert login(client, "doctor", "doctor.ux@example.com").status_code == 429


def test_shared_login_removed_and_successful_logins_do_not_accumulate_failures(fixture):
    client, _, _ = fixture
    assert (
        client.post(
            "/auth/login",
            json={"email": "doctor.ux@example.com", "password": "UXTestOnly123!"},
        ).status_code
        == 404
    )
    for _ in range(7):
        assert login(client, "doctor", "doctor.ux@example.com").status_code == 200


def test_account_creation_email_case_and_directory_order(fixture):
    client, sessions, _ = fixture
    headers = bearer(login(client, "doctor", "doctor.ux@example.com"))
    from app.models.clinical import PatientHospitalMapping

    with sessions() as db:
        patient = Patient(
            medbridge_id="MB-NEW-SYN",
            full_name="aarav Test (synthetic)",
            identity_verification_status="verified",
        )
        db.add(patient)
        db.flush()
        db.add(
            PatientHospitalMapping(
                patient_id=patient.id,
                hospital_id=1,
                external_patient_id="NEW-TEST",
                source_system="Test",
            )
        )
        db.commit()
    assert (
        client.post(
            "/patients/MB-NEW-SYN/create-account",
            headers=headers,
            json={"email": "DOCTOR.UX@EXAMPLE.COM", "password": PASSWORD},
        ).status_code
        == 409
    )
    created = client.post(
        "/patients/MB-NEW-SYN/create-account",
        headers=headers,
        json={"email": "NEW.ACCOUNT@EXAMPLE.COM", "password": PASSWORD},
    )
    assert created.status_code == 200 and created.json()["has_account"]
    assert (
        login(client, "patient", "new.account@example.com", PASSWORD).status_code == 200
    )
    names = [
        patient["full_name"]
        for patient in client.get("/patients", headers=headers).json()
    ]
    assert names == sorted(names, key=str.lower)


def test_approval_hospital_options_are_admin_scoped(fixture):
    client, sessions, _ = fixture
    doctor = bearer(login(client, "doctor", "doctor.ux@example.com"))
    assert (
        client.get("/auth/registrations/hospitals", headers=doctor).status_code == 403
    )
    with sessions() as db:
        db.add(
            User(
                email="admin.scope@example.com",
                full_name="Test Admin",
                role="hospital_admin",
                hospital_id=1,
                password_hash=hash_password(PASSWORD),
                is_active=True,
            )
        )
        db.add(
            User(
                email="system.scope@example.com",
                full_name="Test System Admin",
                role="system_admin",
                password_hash=hash_password(PASSWORD),
                is_active=True,
            )
        )
        db.commit()
    admin = bearer(login(client, "doctor", "admin.scope@example.com", PASSWORD))
    system = bearer(login(client, "doctor", "system.scope@example.com", PASSWORD))
    assert [
        hospital["id"]
        for hospital in client.get(
            "/auth/registrations/hospitals", headers=admin
        ).json()
    ] == [1]
    assert len(client.get("/auth/registrations/hospitals", headers=system).json()) == 3
