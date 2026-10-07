"""Report authorization and scope persistence against an isolated database."""

from datetime import date, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api import medical_reports
from app.api.deps import get_db
from app.core.security import hash_password
from app.main import app
from app.models.audit import AuditLog
from app.models.consent import PatientHospitalConsent
from app.models.medical_report import MedicalReport
from app.models.user import User
from tests.ux_fixtures import create_fixture_database

SCOPES = {
    f"share_{key}": False
    for key in (
        "allergies",
        "medications",
        "conditions",
        "prescriptions",
        "observations",
        "encounters",
        "reports",
    )
}


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    engine, sessions = create_fixture_database()
    source = medical_reports.REPORT_ROOT / "01_CBC_CRP_Laboratory_Report.pdf"
    (tmp_path / "report.pdf").write_bytes(source.read_bytes())
    monkeypatch.setattr(medical_reports, "REPORT_ROOT", tmp_path)
    with sessions() as db:
        db.add(
            MedicalReport(
                patient_id=1,
                hospital_id=1,
                title="Synthetic laboratory report",
                report_type="Laboratory",
                issued_on=date(2026, 8, 18),
                file_name="report.pdf",
                file_path="report.pdf",
                mime_type="application/pdf",
            )
        )
        for email, role, hospital in [
            ("other.doctor@example.com", "doctor", 2),
            ("admin@example.com", "system_admin", None),
            ("unmapped.doctor@example.com", "doctor", 3),
            ("no.hospital@example.com", "doctor", None),
        ]:
            db.add(
                User(
                    email=email,
                    full_name="Synthetic Test User",
                    role=role,
                    hospital_id=hospital,
                    is_active=True,
                    password_hash=hash_password("ReportTest123!"),
                )
            )
        db.commit()

    def database():
        with sessions() as db:
            yield db

    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = database
    with TestClient(app) as client:

        def login(portal, email, password="UXTestOnly123!"):
            response = client.post(
                f"/auth/{portal}/login",
                json={"identifier": email, "password": password},
            )
            assert response.status_code == 200
            return {"Authorization": "Bearer " + response.json()["access_token"]}

        patient = login("patient", "patient.ux@example.com")
        doctor = login("doctor", "doctor.ux@example.com")
        yield client, sessions, patient, doctor, login
    if previous is None:
        app.dependency_overrides.pop(get_db, None)
    else:
        app.dependency_overrides[get_db] = previous
    engine.dispose()


def grant(client, patient, **changes):
    response = client.post(
        "/consents/me",
        headers=patient,
        json={
            "hospital_id": 1,
            "purpose": "Synthetic report access test",
            **SCOPES,
            **changes,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.parametrize("allowed", [True, False])
def test_report_scope_creation_update_and_reactivation(fixture, allowed):
    client, _, patient, doctor, _ = fixture
    consent = grant(client, patient, share_reports=allowed, share_allergies=True)
    assert consent["share_reports"] is allowed
    endpoint = "/patients/1/reports"
    assert client.get(endpoint, headers=doctor).status_code == (200 if allowed else 403)
    body = {
        "hospital_id": 1,
        "purpose": "Updated choice",
        **SCOPES,
        "share_reports": not allowed,
        "share_allergies": True,
    }
    patched = client.patch(f"/consents/me/{consent['id']}", headers=patient, json=body)
    assert patched.status_code == 200 and patched.json()["share_reports"] is not allowed
    assert client.get(endpoint, headers=doctor).status_code == (403 if allowed else 200)
    assert (
        client.post(f"/consents/me/{consent['id']}/revoke", headers=patient).status_code
        == 200
    )
    assert client.get(endpoint, headers=doctor).status_code == 403
    reactivated = grant(client, patient, share_reports=allowed)
    assert (
        reactivated["id"] == consent["id"] and reactivated["share_reports"] is allowed
    )


@pytest.mark.parametrize(
    "endpoint", ["/patients/1/reports", "/patients/1/reports/1/file"]
)
def test_unshared_reports_block_list_and_direct_download(fixture, endpoint):
    client, _, patient, doctor, _ = fixture
    grant(client, patient, share_allergies=True, share_reports=False)
    response = client.get(endpoint, headers=doctor)
    assert (
        response.status_code == 403
        and "medical report access" in response.json()["detail"]
    )
    record = client.get("/clinical/patients/1/record", headers=doctor)
    assert record.status_code == 200 and record.json()["allergies"]


def test_report_only_grant_does_not_reveal_other_categories(fixture):
    client, _, patient, doctor, _ = fixture
    grant(client, patient, share_reports=True)
    assert client.get("/patients/1/reports", headers=doctor).status_code == 200
    record = client.get("/clinical/patients/1/record", headers=doctor).json()
    for category in (
        "allergies",
        "conditions",
        "prescriptions",
        "observations",
        "encounters",
    ):
        assert record[category] == []
    response = client.get("/patients/1/reports/1/file", headers=doctor)
    assert response.status_code == 200 and response.content.startswith(b"%PDF")
    assert response.headers["cache-control"] == "private, no-store"


def test_revoke_and_expiry_block_previously_listed_file(fixture):
    client, sessions, patient, doctor, _ = fixture
    consent = grant(client, patient, share_reports=True)
    assert client.get("/patients/1/reports", headers=doctor).status_code == 200
    with sessions() as db:
        db.get(PatientHospitalConsent, consent["id"]).expires_at = (
            datetime.utcnow() - timedelta(seconds=1)
        )
        db.commit()
    assert client.get("/patients/1/reports/1/file", headers=doctor).status_code == 403
    fresh = grant(client, patient, share_reports=True)
    assert (
        client.post(f"/consents/me/{fresh['id']}/revoke", headers=patient).status_code
        == 200
    )
    assert client.get("/patients/1/reports/1/file", headers=doctor).status_code == 403


def test_patient_ownership_hospital_boundary_and_admin_behavior(fixture):
    client, _, patient, doctor, login = fixture
    grant(client, patient, share_reports=True)
    assert (
        client.get("/patients/me/reports", headers=patient).json()[0]["patient_id"] == 1
    )
    assert client.get("/patients/me/reports/1/file", headers=patient).status_code == 200
    other_patient = login("patient", "other.patient.ux@example.com")
    assert client.get("/patients/me/reports", headers=other_patient).json() == []
    assert (
        client.get("/patients/me/reports/1/file", headers=other_patient).status_code
        == 404
    )
    assert client.get("/patients/1/reports", headers=patient).status_code == 403
    for email in ("other.doctor@example.com", "no.hospital@example.com"):
        other = login("doctor", email, "ReportTest123!")
        assert (
            client.get("/patients/1/reports/1/file", headers=other).status_code == 403
        )
    unmapped = login("doctor", "unmapped.doctor@example.com", "ReportTest123!")
    assert client.get("/patients/2/reports", headers=unmapped).status_code == 403
    assert client.get("/patients/2/reports/1/file", headers=doctor).status_code == 404
    admin = login("doctor", "admin@example.com", "ReportTest123!")
    assert client.get("/patients/1/reports/1/file", headers=admin).status_code == 200


@pytest.mark.parametrize(
    "filename", ["../report.pdf", "/tmp/report.pdf", "missing.pdf"]
)
def test_invalid_or_missing_storage_path_cannot_be_downloaded(fixture, filename):
    client, sessions, patient, _, _ = fixture
    with sessions() as db:
        db.get(MedicalReport, 1).file_name = filename
        db.commit()
    response = client.get("/patients/me/reports/1/file", headers=patient)
    assert response.status_code == (404 if filename == "missing.pdf" else 500)


def test_successful_downloads_are_audited(fixture):
    client, sessions, patient, doctor, _ = fixture
    grant(client, patient, share_reports=True)
    for endpoint, headers in [
        ("/patients/me/reports/1/file", patient),
        ("/patients/1/reports/1/file", doctor),
    ]:
        assert client.get(endpoint, headers=headers).status_code == 200
    with sessions() as db:
        events = db.scalars(
            select(AuditLog).where(AuditLog.action == "medical_report_view")
        ).all()
        assert len(events) == 2 and {event.user_id for event in events} == {1, 2}


def test_emergency_session_does_not_override_report_consent(fixture):
    client, _, patient, doctor, _ = fixture
    grant(client, patient, share_allergies=True, share_reports=False)
    response = client.post(
        "/emergency-access",
        headers=doctor,
        json={"patient_id": 1, "reason": "Synthetic emergency access testing only"},
    )
    assert response.status_code == 201, response.text
    assert client.get("/patients/1/reports/1/file", headers=doctor).status_code == 403


def test_routes_and_operation_ids_are_unique():
    routes = [
        (tuple(sorted(route.methods)), route.path)
        for route in app.routes
        if hasattr(route, "methods")
    ]
    assert len(routes) == len(set(routes))
    schema = app.openapi()
    operations = [
        op["operationId"]
        for path in schema["paths"].values()
        for op in path.values()
        if isinstance(op, dict) and "operationId" in op
    ]
    assert len(operations) == len(set(operations))


@pytest.mark.parametrize(
    "endpoint",
    [
        "/patients/me/reports",
        "/patients/me/reports/1/file",
        "/patients/1/reports",
        "/patients/1/reports/1/file",
    ],
)
def test_report_endpoints_require_authentication(fixture, endpoint):
    client, *_ = fixture
    assert client.get(endpoint).status_code == 403


def test_symlink_cannot_escape_report_storage(fixture):
    client, sessions, patient, *_ = fixture
    root = medical_reports.REPORT_ROOT
    outside = root.parent / f"outside-{root.name}.pdf"
    outside.write_bytes(b"Synthetic outside storage fixture")

    try:
        (root / "link.pdf").symlink_to(outside)
    except OSError as error:
        if getattr(error, "winerror", None) == 1314:
            pytest.skip(
                "Windows symlink creation requires Developer Mode or elevated privileges"
            )
        raise

    try:
        with sessions() as db:
            db.get(MedicalReport, 1).file_name = "link.pdf"
            db.commit()

        assert (
            client.get(
                "/patients/me/reports/1/file",
                headers=patient,
            ).status_code
            == 500
        )
    finally:
        (root / "link.pdf").unlink(missing_ok=True)
        outside.unlink(missing_ok=True)
