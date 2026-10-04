# API documentation

Generated from `app.main:app`. Do not hand-edit the endpoint inventory.
Run `python -m scripts.generate_reference` from backend/ with a configured environment.

Interactive schema: `/docs`; machine-readable schema: `/openapi.json`.
The committed [OpenAPI snapshot](../openapi-current.json) comes from the same generator.

## Authorization

Bearer means an authenticated active account. It does not imply permission for every role or patient.
See [authentication](AUTHENTICATION.md), [consent](CONSENT-AND-ACCESS-CONTROL.md),
[emergency access](EMERGENCY-ACCESS.md) and [reports](MEDICAL-REPORTS.md) for role and resource checks.

| Method | Path | Authentication | Tags |
|---|---|---|---|
| GET | `/auth/me` | Bearer | auth |
| GET | `/auth/registrations/hospitals` | Bearer | accounts |
| GET | `/auth/registrations/pending` | Bearer | accounts |
| POST | `/auth/registrations/{user_id}/approve` | Bearer | accounts |
| POST | `/auth/{portal}/login` | Public | accounts |
| POST | `/auth/{portal}/recover/{kind}` | Public | accounts |
| POST | `/auth/{portal}/reset-password` | Public | accounts |
| POST | `/auth/{portal}/signup` | Public | accounts |
| POST | `/auth/{portal}/verify-email` | Public | accounts |
| POST | `/clinical/allergies` | Bearer | clinical-record |
| POST | `/clinical/conditions` | Bearer | clinical-record |
| POST | `/clinical/encounters` | Bearer | clinical-record |
| POST | `/clinical/hospitals` | Bearer | clinical-record |
| POST | `/clinical/medications` | Bearer | clinical-record |
| POST | `/clinical/observations` | Bearer | clinical-record |
| POST | `/clinical/patient-mappings` | Bearer | clinical-record |
| GET | `/clinical/patients/{patient_id}/record` | Bearer | clinical-record |
| POST | `/clinical/prescriptions` | Bearer | clinical-record |
| GET | `/clinical/resolve/{hospital_id}/{external_patient_id}` | Bearer | clinical-record |
| POST | `/consents` | Bearer | consents |
| GET | `/consents/me` | Bearer | consents |
| POST | `/consents/me` | Bearer | consents |
| PATCH | `/consents/me/{consent_id}` | Bearer | consents |
| POST | `/consents/me/{consent_id}/revoke` | Bearer | consents |
| GET | `/consents/patient/{patient_id}` | Bearer | consents |
| POST | `/consents/{consent_id}/revoke` | Bearer | consents |
| POST | `/emergency-access` | Bearer | Emergency Access |
| GET | `/emergency-access/me/active` | Bearer | Emergency Access |
| GET | `/emergency-access/{access_id}` | Bearer | Emergency Access |
| POST | `/emergency-access/{access_id}/end` | Bearer | Emergency Access |
| GET | `/fhir/allergies/{allergy_id}` | Bearer | fhir |
| GET | `/fhir/conditions/{condition_id}` | Bearer | fhir |
| GET | `/fhir/encounters/{encounter_id}` | Bearer | fhir |
| GET | `/fhir/hospitals/{hospital_id}` | Bearer | fhir |
| GET | `/fhir/medications/{medication_id}` | Bearer | fhir |
| GET | `/fhir/observations/{observation_id}` | Bearer | fhir |
| GET | `/fhir/patients/{patient_id}` | Bearer | fhir |
| GET | `/fhir/patients/{patient_id}/bundle` | Bearer | fhir |
| GET | `/fhir/prescriptions/{prescription_id}` | Bearer | fhir |
| GET | `/health` | Public | system |
| GET | `/patients` | Bearer | patients |
| POST | `/patients` | Bearer | patients |
| GET | `/patients/me` | Bearer | patients |
| GET | `/patients/me/access-history` | Bearer | Patient Access History |
| GET | `/patients/me/emergency-profile` | Bearer | patients |
| PATCH | `/patients/me/emergency-profile` | Bearer | patients |
| POST | `/patients/me/photo` | Bearer | patients |
| PATCH | `/patients/me/profile` | Bearer | patients |
| GET | `/patients/me/reports` | Bearer | Medical Reports |
| GET | `/patients/me/reports/{report_id}/file` | Bearer | Medical Reports |
| GET | `/patients/me/summary` | Bearer | patients |
| GET | `/patients/recent` | Bearer | patients |
| GET | `/patients/search` | Bearer | patients |
| GET | `/patients/{medbridge_id}` | Bearer | patients |
| POST | `/patients/{medbridge_id}/create-account` | Bearer | patients |
| POST | `/patients/{medbridge_id}/photo` | Bearer | patients |
| PATCH | `/patients/{medbridge_id}/profile` | Bearer | patients |
| POST | `/patients/{medbridge_id}/verify` | Bearer | patients |
| GET | `/patients/{patient_id}/reports` | Bearer | Medical Reports |
| GET | `/patients/{patient_id}/reports/{report_id}/file` | Bearer | Medical Reports |
