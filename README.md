# MedBridge

AI-assisted interoperable healthcare record system capstone project.

## Overview

MedBridge is a prototype interoperability layer designed to demonstrate how fragmented patient records from different hospital systems can be normalized into a unified clinical record.

The current implementation focuses on patient identity resolution, normalized clinical data, hospital integrations, and duplicate-encounter protection.

> **Important:** MedBridge is a capstone prototype. It is not a production healthcare system, diagnostic system, or prescribing system. All development and demonstration data must be synthetic.

## Current Implementation

### Patient Identity

- Canonical MedBridge patient identity
- Hospital-specific patient identifiers
- Patient-to-hospital identity mappings
- Patient identity resolution using hospital ID + external patient ID

### Unified Clinical Record

The normalized record supports:

- Patients
- Hospitals
- Hospital patient mappings
- Encounters
- Conditions / diagnoses
- Allergies
- Medications
- Prescriptions
- Observations / measurements

The unified clinical record endpoint combines these related records for a MedBridge patient.

### Integration Workflows

Simulated Hospital A and Hospital B source systems are connected through n8n workflows.

The workflows demonstrate:

1. Receiving hospital-specific patient data
2. Normalizing the incoming payload
3. Identifying the source hospital
4. Resolving the hospital's patient identity
5. Creating a MedBridge patient when no mapping exists
6. Creating the hospital-to-MedBridge mapping
7. Creating clinical records
8. Detecting duplicate encounters
9. Returning the patient's unified clinical record

Both Hospital A and Hospital B workflows have been tested with synthetic data, including existing-patient, new-patient, new-encounter, duplicate-encounter, and identity-not-found scenarios.

## Architecture

Hospital A ----\
                \
Hospital B ------> n8n Integration Workflows
                         |
                         v
                   MedBridge FastAPI
                         |
                         v
                    PostgreSQL
                         |
                         v
                Unified Clinical Record
## Main Components

- **FastAPI** — backend REST API
- **PostgreSQL** — relational clinical data store
- **SQLAlchemy** — database ORM
- **Alembic** — database migrations
- **n8n** — hospital ingestion and integration workflows
- **Docker Compose** — local development environment

## API

FastAPI automatically provides interactive API documentation at:

`http://localhost:8001/docs`

### Core Endpoints

- `GET /health`
- `POST /patients`
- `GET /patients/{medbridge_id}`

### Clinical Endpoints

- `POST /clinical/hospitals`
- `POST /clinical/patient-mappings`
- `POST /clinical/encounters`
- `POST /clinical/conditions`
- `POST /clinical/allergies`
- `POST /clinical/medications`
- `POST /clinical/prescriptions`
- `POST /clinical/observations`

### Interoperability Endpoints

- `GET /clinical/resolve/{hospital_id}/{external_patient_id}`
- `GET /clinical/patients/{patient_id}/record`

## Local Environment

| Component | Port |
|---|---:|
| MedBridge GitHub API | `8001` |
| Original Phase 2 API | `8000` |
| n8n | `5678` |
| PostgreSQL | `5432` |

## Demonstration Flow

1. A hospital sends a patient record to its n8n ingestion workflow.
2. MedBridge identifies the source hospital.
3. The hospital's external patient ID is resolved to a MedBridge patient.
4. A new patient and mapping are created when required.
5. Encounter and clinical information are normalized and stored.
6. The unified clinical record is retrieved.
7. A duplicate encounter is submitted.
8. Duplicate detection prevents the same encounter from being created twice.
9. An unknown external patient identifier returns an identity-not-found response.

## Testing

The implementation has been manually verified through:

- FastAPI health checks
- Patient retrieval
- Hospital lookup behavior
- Patient identity resolution
- Unknown identity handling
- Unified clinical record retrieval
- Hospital A n8n ingestion
- Hospital B n8n ingestion
- Duplicate encounter handling
- Docker service availability
- Git working-tree verification

All demonstration records are synthetic.

## Current Limitations

MedBridge is a capstone proof of concept and is not currently suitable for real hospital deployment.

Current limitations and future production work include:

- Consent management is not yet implemented.
- Comprehensive audit trails are not yet implemented.
- Production-grade encryption and secret-management practices are still required.
- Formal security testing and penetration testing are still required.
- Production infrastructure, monitoring, backups, and reliability controls are still required.
- Hospital-specific production integration agreements and adapters are not implemented.
- ABDM-aligned production integration is not implemented.
- Clinical governance and formal clinical validation are outside the current prototype scope.
- The current authentication and RBAC implementation is intended for the capstone prototype and requires further hardening before production use.

## Roadmap

- [x] Phase 1 — Backend/database foundation
- [x] Phase 2 — Unified clinical record
- [x] Simulated Hospital A/B ingestion workflows
- [x] Phase 4 — Interoperability adapters + FHIR-compatible mapping
- [x] Phase 5 — Doctor dashboard
- [x] Phase 6 — Emergency mode
- [x] Phase 7 — Clinical record search & retrieval
- [x] Phase 8 — Authentication + hospital-scoped RBAC
- [ ] Phase 9 — Consent management + comprehensive audit trail
- [ ] Phase 10 — Evaluation, formal security review, final demo and documentation

## Safety and Data Policy

Only synthetic patient data should be used in this repository and in demonstrations.

MedBridge is intended to demonstrate healthcare interoperability concepts. It must not be used as a substitute for clinical judgment, diagnosis, treatment, prescribing, or production medical-record infrastructure.

