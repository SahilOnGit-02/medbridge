# Consent and access control

Source: `app/api/consents.py`, `app/api/clinical.py`, `app/api/medical_reports.py`, `app/api/deps.py`.

Patient accounts read their own profile, history, reports, sharing and access history through `/me` endpoints. They cannot use doctor endpoints to select another person's record.

Normal doctor/hospital-admin record reads require the intended hospital relationship and a current hospital consent. Grants have purpose, status, optional expiry and independent scopes: allergies, medication details, conditions, prescriptions, observations, encounters and medical reports. The requesting hospital's mapping is exposed in normal clinician records. System administrators retain the prototype's broad administrative access, including reports; this must be reviewed before a real clinical deployment.

The inherited report migration/model/schema defaults `share_reports` to true for legacy grants or omitted backend fields. The patient UI starts new sharing choices unchecked. This branch preserves existing grants; review legacy defaults and request fresh informed choices before any real clinical release.

The patient creates sharing with `POST /consents/me`, changes it using `PATCH /consents/me/{id}` and revokes it with `POST /consents/me/{id}/revoke`. `share_reports` is now persisted on creation, update and reactivation. A report-only grant permits reports without revealing the other clinical categories. Declining reports does not suppress separately permitted allergies or history.

Each report list and file request checks consent. A file URL listed earlier must fail after report sharing is disabled, revoked or expired. Files are not exposed through the static uploads route. Emergency access follows a separate limited record flow and does not override report consent.

The prototype also retains clinician/admin consent endpoints. Do not describe all consent creation as patient-exclusive. Existing clinical write and administrative policies need broader production review. Tests cover the current policy; they are not a certification of a least-privilege production design.
