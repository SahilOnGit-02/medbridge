"""Enrollment codes and doctor permission boundaries in an isolated database."""

from datetime import datetime, timedelta
import json
import re
from sqlalchemy import select
from app.models.account import EmailVerification
from app.models.user import User
from app.models.patient import Patient
from app.models.clinical import PatientHospitalMapping
from app.models.consent import PatientHospitalConsent
from tests.test_account_flows import fixture, signup, login, bearer, PASSWORD


def last_code(mail):
    latest = max(mail.glob("*.json"), key=lambda path: path.stat().st_mtime_ns)
    return re.search(
        r"verification code is: ([0-9]{6})", json.loads(latest.read_text())["body"]
    )[1]


def age_codes(sessions, *, expire=False):
    with sessions() as db:
        for row in db.scalars(select(EmailVerification)):
            row.sent_at = datetime.utcnow() - timedelta(seconds=91)
            if expire:
                row.expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.commit()


def verify(client, portal, challenge, code):
    return client.post(
        f"/auth/{portal}/verify-code", json={"challenge": challenge, "code": code}
    )


def test_code_portal_binding_single_use_and_doctor_approval(fixture):
    client, sessions, mail = fixture
    result = signup(client).json()
    code = last_code(mail)
    assert "access_token" not in result and result["resend_after"] == 90
    assert verify(client, "patient", result["challenge"], code).status_code == 400
    assert verify(client, "doctor", result["challenge"], code).status_code == 200
    assert verify(client, "doctor", result["challenge"], code).status_code == 400
    assert login(client, "doctor", "test.doctor", PASSWORD).status_code == 403
    with sessions() as db:
        user = db.scalar(select(User).where(User.email == "new.doctor@example.com"))
        assert user.registration_status == "pending_approval" and not user.is_active
        row = db.scalar(select(EmailVerification))
        assert code not in row.code_digest and row.consumed_at is not None


def test_signup_without_username_and_existing_login_unchanged(fixture):
    client, sessions, mail = fixture
    response = client.post(
        "/auth/patient/signup",
        json={
            "full_name": "Test New Patient",
            "email": "new.patient@example.com",
            "password": PASSWORD,
            "date_of_birth": "1992-04-15",
        },
    )
    assert response.status_code == 202
    assert (
        verify(
            client, "patient", response.json()["challenge"], last_code(mail)
        ).status_code
        == 200
    )
    assert (
        login(client, "patient", "new.patient@example.com", PASSWORD).status_code == 200
    )
    assert login(client, "patient", "patient.ux@example.com").status_code == 200
    with sessions() as db:
        assert (
            db.scalar(
                select(User).where(User.email == "new.patient@example.com")
            ).username
            is None
        )


def test_resend_cooldown_supersedes_old_code_and_link(fixture):
    client, sessions, mail = fixture
    old = signup(client, "patient").json()["challenge"]
    old_code = last_code(mail)
    from tests.test_account_flows import mail_token

    old_link = mail_token(mail)
    blocked = client.post("/auth/patient/verification/resend", json={"challenge": old})
    assert blocked.status_code == 429 and int(blocked.headers["Retry-After"]) > 0
    existing = client.post(
        "/auth/patient/verification/request", json={"email": "new.patient@example.com"}
    ).json()
    assert existing["challenge"] == old and len(list(mail.glob("*.json"))) == 1
    status = client.post("/auth/patient/verification/status", json={"challenge": old})
    assert 0 < status.json()["resend_after"] <= 90
    age_codes(sessions)
    assert (
        client.post(
            "/auth/patient/verification/status", json={"challenge": old}
        ).json()["resend_after"]
        == 0
    )
    result = client.post("/auth/patient/verification/resend", json={"challenge": old})
    assert result.status_code == 202 and result.json()["challenge"] != old
    assert verify(client, "patient", old, old_code).status_code == 400
    assert (
        client.post("/auth/patient/verify-email", json={"token": old_link}).status_code
        == 400
    )
    assert (
        verify(
            client, "patient", result.json()["challenge"], last_code(mail)
        ).status_code
        == 200
    )


def test_attempt_limit_and_expiry(fixture):
    client, sessions, mail = fixture
    challenge = signup(client, "patient").json()["challenge"]
    code = last_code(mail)
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        assert verify(client, "patient", challenge, wrong).status_code == 400
    assert verify(client, "patient", challenge, code).status_code == 400
    age_codes(sessions)
    fresh = client.post(
        "/auth/patient/verification/resend", json={"challenge": challenge}
    ).json()["challenge"]
    age_codes(sessions, expire=True)
    assert verify(client, "patient", fresh, last_code(mail)).status_code == 400


def test_request_response_keeps_account_existence_private(fixture):
    client, _, mail = fixture
    a = client.post(
        "/auth/patient/verification/request", json={"email": "patient.ux@example.com"}
    )
    b = client.post(
        "/auth/patient/verification/request", json={"email": "missing@example.com"}
    )
    assert a.status_code == b.status_code == 202
    assert a.json()["message"] == b.json()["message"]
    assert len(a.json()["challenge"]) == len(b.json()["challenge"]) == 64
    assert not list(mail.glob("*.json"))


def test_doctor_edit_limits_enforced_in_api(fixture):
    client, sessions, _ = fixture
    doctor = bearer(login(client, "doctor", "doctor.ux@example.com"))
    for data in (
        {"full_name": "Changed identity"},
        {"date_of_birth": "2000-01-01"},
        {"gender": "Female"},
        {"email": "new@example.com"},
    ):
        assert (
            client.patch(
                "/patients/MB-UX-TEST-1/profile", headers=doctor, json=data
            ).status_code
            == 403
        )
    for data in ({"user_id": 99}, {"password": PASSWORD}):
        assert (
            client.patch(
                "/patients/MB-UX-TEST-1/profile", headers=doctor, json=data
            ).status_code
            == 422
        )
    edited = client.patch(
        "/patients/MB-UX-TEST-1/profile",
        headers=doctor,
        json={"blood_group": "a +", "phone": "+1 (202) 555-0123"},
    )
    assert edited.status_code == 200 and edited.json()["phone"] == "+12025550123"
    with sessions() as db:
        assert db.get(Patient, 1).full_name == "Synthetic UX Patient 1"
        assert (
            db.scalar(select(User).where(User.email == "patient.ux@example.com"))
            is not None
        )


def test_doctor_enrollment_requires_identity_and_creates_no_consent(fixture):
    client, sessions, mail = fixture
    doctor = bearer(login(client, "doctor", "doctor.ux@example.com"))
    data = {
        "full_name": "Test Newly Enrolled",
        "date_of_birth": "1990-01-20",
        "email": "enrolled@example.com",
        "password": PASSWORD,
        "identity_checked": True,
    }
    assert (
        client.post(
            "/patients/enroll",
            headers=bearer(login(client, "patient", "patient.ux@example.com")),
            json=data,
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/patients/enroll", headers=doctor, json={**data, "identity_checked": False}
        ).status_code
        == 422
    )
    response = client.post("/patients/enroll", headers=doctor, json=data)
    assert response.status_code == 201, response.text
    patient_id = response.json()["id"]
    assert response.json()["has_account"]
    assert login(client, "patient", data["email"], PASSWORD).status_code == 403
    with sessions() as db:
        user = db.scalar(select(User).where(User.email == data["email"]))
        assert not user.is_active and user.registration_status == "pending_email"
        assert (
            db.scalar(
                select(PatientHospitalMapping).where(
                    PatientHospitalMapping.patient_id == patient_id
                )
            ).hospital_id
            == 1
        )
        assert (
            db.scalar(
                select(PatientHospitalConsent).where(
                    PatientHospitalConsent.patient_id == patient_id
                )
            )
            is None
        )
        assert db.get(Patient, patient_id).identity_verified_by is not None
    assert client.post("/patients/enroll", headers=doctor, json=data).status_code == 409
    from tests.test_account_flows import mail_token

    assert (
        client.post(
            "/auth/patient/verify-email", json={"token": mail_token(mail)}
        ).status_code
        == 200
    )
    assert login(client, "patient", data["email"], PASSWORD).status_code == 200
