from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.api.deps import get_db
from app.main import app
from app.core.audit import log_audit_event
from app.models.consent import PatientHospitalConsent
from app.models.user import User
from app.models.patient import Patient
from app.models.clinical import PatientHospitalMapping
from tests.ux_fixtures import create_fixture_database


@pytest.fixture
def fixture():
    engine, sessions = create_fixture_database()
    previous = app.dependency_overrides.get(get_db)

    def database():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = database
    with TestClient(app) as client:
        yield client, sessions
    if previous is None:
        app.dependency_overrides.pop(get_db, None)
    else:
        app.dependency_overrides[get_db] = previous
    engine.dispose()


def headers(client, email):
    response = client.post(
        "/auth/login", json={"email": email, "password": "UXTestOnly123!"}
    )
    assert response.status_code == 200
    return {"Authorization": f'Bearer {response.json()["access_token"]}'}


def payload(**changes):
    return {
        "hospital_id": 1,
        "purpose": "Synthetic test care",
        "share_allergies": True,
        "share_medications": False,
        "share_conditions": False,
        "share_prescriptions": False,
        "share_observations": False,
        "share_encounters": False,
        **changes,
    }


def test_first_grant_partial_scope_fhir_update_and_revoke(fixture):
    client, _ = fixture
    patient = headers(client, "patient.ux@example.com")
    doctor = headers(client, "DOCTOR.UX@EXAMPLE.COM")
    assert client.get("/clinical/patients/1/record", headers=doctor).status_code == 403
    consent = client.post("/consents/me", headers=patient, json=payload()).json()
    record = client.get("/clinical/patients/1/record", headers=doctor).json()
    assert record["allergies"][0]["substance"] == "Synthetic allergy"
    assert record["conditions"] == []
    assert "conditions" in record["access"]["withheld_categories"]
    assert (
        record["hospital_mappings"][0]["hospital_name"] == "Synthetic Test Hospital 1"
    )
    assert client.get("/fhir/conditions/1", headers=doctor).status_code == 403
    assert client.get("/fhir/medications/1", headers=doctor).status_code == 403
    bundle = client.get("/fhir/patients/1/bundle", headers=doctor).json()
    assert [entry["resource"]["resourceType"] for entry in bundle["entry"]] == [
        "Patient",
        "AllergyIntolerance",
    ]
    updated = client.patch(
        f'/consents/me/{consent["id"]}',
        headers=patient,
        json=payload(share_conditions=True),
    )
    assert updated.status_code == 200
    assert updated.json()["share_medications"] is False
    assert (
        client.get("/clinical/patients/1/record", headers=doctor).json()["conditions"][
            0
        ]["source_hospital_name"]
        == "Synthetic Test Hospital 1"
    )
    assert (
        client.patch(
            f'/consents/me/{consent["id"]}',
            headers=patient,
            json=payload(share_medications=True, share_prescriptions=True),
        ).status_code
        == 200
    )
    assert client.get("/fhir/medications/1", headers=doctor).status_code == 200
    assert (
        client.post(f'/consents/me/{consent["id"]}/revoke', headers=patient).status_code
        == 200
    )
    assert client.get("/clinical/patients/1/record", headers=doctor).status_code == 403
    assert client.get("/fhir/patients/1/bundle", headers=doctor).status_code == 403
    actions = {
        row["action"]
        for row in client.get("/patients/me/access-history", headers=patient).json()
    }
    assert {
        "patient_record_view",
        "fhir_record_view",
        "patient_sharing_updated",
        "patient_sharing_revoked",
    } <= actions


def test_expired_grant_can_be_regranted_without_resetting_scope(fixture):
    client, sessions = fixture
    patient = headers(client, "patient.ux@example.com")
    first = client.post("/consents/me", headers=patient, json=payload()).json()
    with sessions() as db:
        db.get(PatientHospitalConsent, first["id"]).expires_at = datetime.now(
            timezone.utc
        ).replace(tzinfo=None) - timedelta(seconds=1)
        db.commit()
    doctor = headers(client, "doctor.ux@example.com")
    assert client.get("/clinical/patients/1/record", headers=doctor).status_code == 403
    second = client.post(
        "/consents/me", headers=patient, json=payload(share_observations=True)
    )
    assert second.status_code == 201
    assert second.json()["share_medications"] is False
    assert client.get("/clinical/patients/1/record", headers=doctor).json()[
        "observations"
    ]


def test_sharing_ownership_and_invalid_expiry(fixture):
    client, _ = fixture
    patient = headers(client, "patient.ux@example.com")
    stranger = headers(client, "other.patient.ux@example.com")
    first = client.post("/consents/me", headers=patient, json=payload()).json()
    assert (
        client.patch(
            f'/consents/me/{first["id"]}', headers=stranger, json=payload()
        ).status_code
        == 403
    )
    assert (
        client.post(f'/consents/me/{first["id"]}/revoke', headers=stranger).status_code
        == 403
    )
    assert (
        client.patch(
            f'/consents/me/{first["id"]}', headers=patient, json=payload(hospital_id=2)
        ).status_code
        == 422
    )
    assert (
        client.patch(
            f'/consents/me/{first["id"]}',
            headers=patient,
            json=payload(expires_at="2000-01-01T00:00:00Z"),
        ).status_code
        == 422
    )


def test_emergency_provenance_normalization_and_invalid_fields(fixture):
    client, _ = fixture
    patient = headers(client, "patient.ux@example.com")
    result = client.patch(
        "/patients/me/emergency-profile",
        headers=patient,
        json={
            "blood_group": " o + ",
            "emergency_contact_name": " Synthetic Contact ",
            "emergency_contact_phone": "+91 (90000) 00000",
        },
    )
    assert result.status_code == 200
    assert result.json()["blood_group"] == "O+"
    assert result.json()["blood_group_source"] == "patient_reported"
    assert result.json()["emergency_contact"]["phone"] == "+919000000000"
    summary = client.get("/patients/me/summary", headers=patient).json()
    assert summary["patient"]["blood_group_source"] == "patient_reported"
    assert summary["patient"]["emergency_contact_name"] == "Synthetic Contact"
    assert (
        client.patch(
            "/patients/me/emergency-profile",
            headers=patient,
            json={"blood_group": "guess"},
        ).status_code
        == 422
    )
    assert (
        client.patch(
            "/patients/me/emergency-profile",
            headers=patient,
            json={"emergency_contact_phone": "+1 555 abc"},
        ).status_code
        == 422
    )
    assert (
        client.patch(
            "/patients/me/emergency-profile",
            headers=patient,
            json={"blood_group": "unknown"},
        ).json()["blood_group"]
        is None
    )


def test_history_pagination_filters_and_patient_isolation(fixture):
    client, sessions = fixture
    patient = headers(client, "patient.ux@example.com")
    stranger = headers(client, "other.patient.ux@example.com")
    with sessions() as db:
        doctor = db.get(User, 1)
        for index in range(61):
            log_audit_event(
                db,
                current_user=doctor,
                action="patient_record_view",
                resource_type="clinical_record",
                patient_id=1,
                resource_id=index,
            )
        log_audit_event(
            db,
            current_user=doctor,
            action="patient_record_view",
            resource_type="clinical_record",
            patient_id=2,
        )
        db.commit()
    first = client.get(
        "/patients/me/access-history?limit=25&activity=normal", headers=patient
    ).json()
    second = client.get(
        f'/patients/me/access-history?limit=25&activity=normal&before_id={first[-1]["id"]}',
        headers=patient,
    ).json()
    third = client.get(
        f'/patients/me/access-history?limit=25&activity=normal&before_id={second[-1]["id"]}',
        headers=patient,
    ).json()
    assert len(first + second + third) == 61
    assert len({row["id"] for row in first + second + third}) == 61
    assert len(client.get("/patients/me/access-history", headers=stranger).json()) == 1
    assert (
        client.get(
            "/patients/me/access-history?activity=emergency", headers=patient
        ).json()
        == []
    )


def test_emergency_session_restoration_identity_and_end(fixture):
    client, _ = fixture
    doctor = headers(client, "doctor.ux@example.com")
    patient = headers(client, "patient.ux@example.com")
    access = client.post(
        "/emergency-access",
        headers=doctor,
        json={"patient_id": 1, "reason": "Synthetic test emergency"},
    )
    assert access.status_code == 201
    assert (
        client.get("/emergency-access/me/active", headers=doctor).json()[0][
            "medbridge_id"
        ]
        == "MB-UX-TEST-1"
    )
    assert client.get("/emergency-access/me/active", headers=patient).status_code == 403
    assert (
        client.post(
            "/emergency-access",
            headers=doctor,
            json={"patient_id": 2, "reason": "Another test"},
        ).status_code
        == 409
    )
    profile = client.get(f'/emergency-access/{access.json()["id"]}', headers=doctor)
    assert profile.status_code == 200
    assert profile.json()["medications"][0]["dose"] == "250 mg"
    assert (
        client.post(
            f'/emergency-access/{access.json()["id"]}/end', headers=doctor
        ).status_code
        == 200
    )
    assert client.get("/emergency-access/me/active", headers=doctor).json() == []


def test_clinician_entered_blood_group_has_separate_provenance(fixture):
    client, _ = fixture
    doctor = headers(client, "doctor.ux@example.com")
    response = client.patch(
        "/patients/MB-UX-TEST-1/profile", headers=doctor, json={"blood_group": "B+"}
    )
    assert response.status_code == 200
    assert response.json()["blood_group_source"] == "clinician_recorded"
    assert response.json()["identity_verification_status"] is None


def test_recent_patients_are_unique_owned_successful_and_currently_accessible(fixture):
    client, sessions = fixture
    doctor = headers(client, "doctor.ux@example.com")
    patient = headers(client, "patient.ux@example.com")
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    with sessions() as db:
        actor = db.get(User, 1)
        for patient_id, days, success in [
            (1, 3, True),
            (2, 2, True),
            (1, 1, True),
            (2, 0, False),
        ]:
            event = log_audit_event(
                db,
                current_user=actor,
                action="patient_record_view",
                resource_type="clinical_record",
                patient_id=patient_id,
                success=success,
            )
            event.created_at = now - timedelta(days=days)
        log_audit_event(
            db,
            current_user=db.get(User, 2),
            action="patient_record_view",
            resource_type="clinical_record",
            patient_id=2,
        )
        db.commit()
    recent = client.get("/patients/recent", headers=doctor)
    assert recent.status_code == 200
    assert [row["id"] for row in recent.json()] == [1, 2]
    assert datetime.fromisoformat(
        recent.json()[0]["last_viewed_at"]
    ) == now - timedelta(days=1)
    assert len(client.get("/patients/recent?limit=1", headers=doctor).json()) == 1
    assert client.get("/patients/recent", headers=patient).status_code == 403
    with sessions() as db:
        db.query(PatientHospitalMapping).filter_by(patient_id=1, hospital_id=1).delete()
        db.commit()
    assert [
        row["id"] for row in client.get("/patients/recent", headers=doctor).json()
    ] == [2]


def test_visible_dob_search_can_be_used_alone_or_with_identity(fixture):
    client, sessions = fixture
    doctor = headers(client, "doctor.ux@example.com")
    with sessions() as db:
        dob = db.get(Patient, 1).date_of_birth.isoformat()
    assert [
        row["id"]
        for row in client.get(
            f"/patients/search?date_of_birth={dob}", headers=doctor
        ).json()
    ] == [1]
    assert (
        client.get(
            f"/patients/search?date_of_birth={dob}&q=MB-UX-TEST-2", headers=doctor
        ).json()
        == []
    )
