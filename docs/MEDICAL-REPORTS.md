# Medical Reports

## Interface

Patients use the dedicated Medical Reports item in the left navigation or the overview shortcut. Doctors use the Medical Reports record-section link. Reports are independent of the category/timeline history control and therefore do not disappear when switching layout.

The list shows newest reports first, title, type, date, issuing clinician/department and description. Users can search by title, clinician or date and filter report type. Ten results are displayed initially; older reports can be revealed in batches. Refresh, loading, empty and error states are explicit. Download PDF shows preparation feedback and avoids relying on a popup opened after an asynchronous request.

## API and storage

Patient list/file: `/patients/me/reports` and `/patients/me/reports/{report_id}/file`. Clinician list/file: `/patients/{patient_id}/reports` and `/patients/{patient_id}/reports/{report_id}/file`.

Each file request re-authorizes the user and current consent. Patient ownership, hospital mapping, active/unexpired grant and `share_reports` are checked as applicable. System administrators retain administrative access. Successful PDF reads create `medical_report_view` audit rows. Denied report events are not comprehensively audited in the current implementation.

Metadata uses the MedicalReport model. The file resolver uses `file_name`, not arbitrary `file_path` values, and confines files to `backend/app/demo_reports`. Traversal, absolute paths and escaping symlinks are rejected. Responses have `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. A missing PDF returns 404.

## Demo boundaries

`backend/seed_medical_reports.py` is an explicit demo script targeting the profile linked to `patient.demo@medbridge.in` and its defined source hospital. It is not run automatically and must not attach another person's report to an unrelated profile. The bundled reports are synthetic examples. Other profiles may correctly show an empty report list until matching report metadata is seeded. No report upload interface, object storage integration or report generation service is implemented.
