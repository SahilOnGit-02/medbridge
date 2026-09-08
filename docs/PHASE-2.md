# Phase 2 — Unified Clinical Record

## Goal

Move from a patient identity foundation to a normalized clinical record that can receive data from multiple hospital systems.

## Model

- `Patient`: MedBridge's canonical patient identity.
- `Hospital`: participating healthcare provider.
- `PatientHospitalMapping`: maps a hospital's local patient ID to a MedBridge patient.
- `Encounter`: a care interaction at a hospital.
- `Condition`: diagnosis/clinical condition.
- `Allergy`: known allergy information.
- `Medication`: medication master record.
- `Prescription`: patient-specific medication order/history.
- `Observation`: lab/measurement result.

## Why Alembic

Phase 1 used `create_all()` for a minimal foundation. Phase 2 introduces Alembic so schema changes are explicit and reproducible. This is more appropriate as the capstone grows.

## API

All endpoints are documented automatically by FastAPI at `/docs`.

Clinical endpoints:
- `POST /clinical/hospitals`
- `POST /clinical/patient-mappings`
- `POST /clinical/encounters`
- `POST /clinical/conditions`
- `POST /clinical/allergies`
- `POST /clinical/medications`
- `POST /clinical/prescriptions`
- `POST /clinical/observations`

## Synthetic data only

No real patient information should be placed in this repository or used in demos.
