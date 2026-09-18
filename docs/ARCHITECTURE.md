# MedBridge Architecture

## 1. Project Overview

MedBridge is a prototype interoperability layer designed to demonstrate how fragmented patient records from different hospital systems can be normalized into a unified clinical record.

The current implementation focuses on patient identity resolution, normalized clinical records, simulated Hospital A and Hospital B ingestion, and duplicate encounter protection.

## 2. Capstone / Professor View

### 2.1 Problem

Patient information can be fragmented across different hospital systems. A patient may have different identifiers and records at different hospitals, making it difficult to retrieve a consolidated clinical history.

MedBridge demonstrates an interoperability layer that maps hospital-specific patient identities to a canonical MedBridge patient and stores normalized clinical information in one unified record.

### 2.2 Proposed Solution

The prototype receives hospital-specific data through simulated integration workflows.

The workflow:

1. Receives a hospital payload.
2. Identifies the source hospital.
3. Normalizes the hospital-specific payload.
4. Resolves the hospital's external patient ID.
5. Uses an existing MedBridge patient when a mapping exists.
6. Creates a MedBridge patient when no mapping exists.
7. Creates the hospital-to-MedBridge identity mapping.
8. Stores encounter and clinical information.
9. Detects duplicate encounters.
10. Returns the patient's unified clinical record.

### 2.3 High-Level Architecture

```text
Hospital A ──┐
             ├──> n8n Integration Workflows
Hospital B ──┘
                       |
                       v
              Patient Identity Resolution
                       |
                       v
                 MedBridge FastAPI
                       |
                       v
                   PostgreSQL
                       |
                       v
             Unified Clinical Record
```

### 2.4 Core Concept

The central concept is the separation between hospital identity and MedBridge identity.

Example:

```text
Hospital A external patient ID: A-DEMO-005
                |
                v
     PatientHospitalMapping
                |
                v
     Canonical MedBridge Patient
                |
                v
          MB-A-DEMO-005
```

A hospital can maintain its own external identifier while MedBridge connects that identifier to a canonical patient through an explicit identity mapping.

### 2.5 Current Clinical Data Model

The normalized record currently supports:

- Patient
- Hospital
- PatientHospitalMapping
- Encounter
- Condition
- Allergy
- Medication
- Prescription
- Observation

The unified clinical record combines the patient's related mappings, encounters, conditions, allergies, prescriptions, and observations.

## 3. Developer View

### 3.1 Repository Structure

```text
medbridge-github/
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   │   ├── clinical.py
│   │   │   └── patients.py
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   │   ├── clinical.py
│   │   │   ├── hospital.py
│   │   │   └── patient.py
│   │   ├── schemas/
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PHASE-2.md
│   └── ROADMAP.md
├── hospital-a.json
├── hospital-b.json
├── docker-compose.yml
└── README.md
```

### 3.2 Backend Stack

| Component | Role |
|---|---|
| FastAPI | REST API |
| SQLAlchemy | ORM and database models |
| PostgreSQL | Relational data store |
| Alembic | Database schema migrations |
| n8n | Hospital integration workflows |
| Docker Compose | Local service/container orchestration |

### 3.3 FastAPI Structure

The application entry point is:

`backend/app/main.py`

It creates the FastAPI application and registers:

- `/health`
- `/patients`
- `/clinical`

The API version currently defined by the application is `0.2.0`.

## 4. Database Architecture

### 4.1 Patient

`Patient` is the canonical MedBridge patient identity.

Important fields:

- `id`
- `medbridge_id`
- `full_name`
- `date_of_birth`
- `blood_group`
- `created_at`

`medbridge_id` is unique.

A patient has relationships to hospital mappings, encounters, conditions, allergies, prescriptions, and observations.

### 4.2 Hospital

`Hospital` represents a participating source healthcare provider.

Important fields:

- `id`
- `code`
- `name`
- `created_at`

Hospital codes are unique.

### 4.3 PatientHospitalMapping

This table connects a hospital's local patient identifier to a canonical MedBridge patient.

Important fields:

- `patient_id`
- `hospital_id`
- `external_patient_id`
- `source_system`

This mapping is used by the identity-resolution endpoint.

### 4.4 Clinical Records

The clinical model includes:

- `Encounter` — a care interaction at a hospital.
- `Condition` — diagnosis or clinical condition.
- `Allergy` — known allergy information.
- `Medication` — medication master record.
- `Prescription` — patient-specific medication order or history.
- `Observation` — lab or measurement result.

Conditions, prescriptions, and observations can reference an encounter.

Prescriptions reference a medication master record.

### 4.5 Delete Behavior

Patient-owned clinical records use cascading deletion at the patient relationship level.

Encounter-linked conditions, prescriptions, and observations use `SET NULL` for the encounter relationship.

Prescription medication references use `RESTRICT`.

## 5. API Architecture

### 5.1 System

`GET /health`

Returns the API health status.

### 5.2 Patient API

```text
POST /patients
GET  /patients/{medbridge_id}
```

Creating a patient with an existing `medbridge_id` returns a conflict response.

Retrieving an unknown MedBridge patient returns `404`.

### 5.3 Clinical APIs

```text
POST /clinical/hospitals
POST /clinical/patient-mappings
POST /clinical/encounters
POST /clinical/conditions
POST /clinical/allergies
POST /clinical/medications
POST /clinical/prescriptions
POST /clinical/observations
```

The clinical creation endpoints contain application-level duplicate checks for their relevant record combinations.

### 5.4 Identity Resolution

`GET /clinical/resolve/{hospital_id}/{external_patient_id}`

The resolver searches for a hospital and external patient ID mapping. When a mapping exists, it returns the mapped patient, mapping, and hospital.

When the mapping does not exist, the endpoint returns `404`.

### 5.5 Unified Clinical Record

`GET /clinical/patients/{patient_id}/record`

The endpoint returns:

- patient
- hospital_mappings
- encounters
- conditions
- allergies
- prescriptions
- observations

Prescription results also include the related medication data.

## 6. n8n Integration Architecture

Two simulated hospital workflows are currently exported with the project:

- `hospital-a.json`
- `hospital-b.json`

### 6.1 Hospital A

```text
Hospital A Payload
       |
       v
Normalize Hospital A
       |
       v
Resolve Patient Identity
       |
       v
Patient Found?
   /          \
 YES          NO
 |             |
 v             v
Existing      Create Patient
Patient       |
Record        v
 |           Create Mapping
 v             |
Check          v
Encounter   Create Encounter
 |
 v
Duplicate Check
 /          \
YES         NO
 |           |
 v           v
Unified    Clinical Records
Record     Creation
```

### 6.2 Hospital B

```text
Hospital B Payload
       |
       v
Normalize Hospital B Payload
       |
       v
Find Hospital B
       |
       v
Resolve Patient Identity
       |
       v
Patient Found?
   /          \
 YES          NO
 |             |
 v             v
Existing      Create Patient
Patient       |
Record        v
 |           Create Mapping
 v             |
Check          v
Encounter   Create Encounter
 |
 v
Duplicate Check
 /          \
YES         NO
 |           |
 v           v
Unified    Encounter
Record       |
             v
        Condition
             |
             v
          Allergy
             |
             v
        Medication
             |
             v
        Prescription
             |
             v
        Observation
             |
             v
      Unified Record
```

### 6.3 Duplicate Encounter Protection

Duplicate detection checks the patient's existing encounters against the incoming encounter's source hospital and start timestamp.

When a duplicate is detected, the workflow retrieves the existing unified clinical record instead of creating another encounter and its associated clinical records.

This behavior has been tested with repeated identical synthetic payloads for both Hospital A and Hospital B.

## 7. Docker Architecture

The GitHub project API is containerized and connected to the existing local MedBridge network.

```text
GitHub Repository
       |
       v
Docker Compose
       |
       v
MedBridge API Container
       |
       +------> PostgreSQL Container
       |
       +------> n8n Integration Network
```

The repository API is exposed locally on host port `8001` and the container listens on port `8000`.

The GitHub API container connects to the external Docker network `medbridge-phase2_default`.

Local API documentation: `http://localhost:8001/docs`

n8n: `http://localhost:5678`

## 8. Demonstrated Test Scenarios

The prototype has been manually verified with synthetic data for:

- API health
- Patient creation
- Patient retrieval
- Hospital lookup
- Patient identity resolution
- Unknown identity handling
- Unknown patient handling
- Unified clinical record retrieval
- Hospital A ingestion
- Hospital B ingestion
- New patient creation
- Existing patient processing
- New encounter creation
- Duplicate encounter detection
- Clinical record creation
- Docker service availability
- Git working-tree cleanliness

The temporary audit and test records were cleaned from the demonstration database while baseline synthetic demonstration records were retained.

## 9. Current Limitations

The current system is a proof of concept and is not ready for real hospital deployment.

Important missing production capabilities include:

- Production authentication and authorization
- Role-based access control
- Consent management
- Comprehensive audit trails
- Encryption and secure secret management
- Formal security testing
- Production infrastructure
- Hospital-specific integration agreements
- Production-grade adapters
- FHIR-compatible interoperability
- ABDM-aligned integration
- Clinical governance and validation
- Production monitoring and reliability controls

The current Hospital A and Hospital B integrations are simulated workflows rather than direct production hospital integrations.

## 10. Future Architecture Direction

Future development can evolve the prototype toward hospital-specific adapters, FHIR-compatible mapping, consent and authorization, stronger identity resolution, a doctor dashboard, AI-assisted clinical summaries, emergency workflows, and comprehensive audit trails.

These represent future development and are not currently implemented as production capabilities.

## 11. Development Principles

### Synthetic Data

Only synthetic patient data should be used in the repository and demonstrations.

### Separation of Source and Canonical Identity

Hospital identifiers should remain distinct from the canonical MedBridge identity and be connected through explicit mappings.

### Idempotent Ingestion

Repeated clinical submissions should not create duplicate records when the relevant duplicate criteria match.

### Explicit Schema Evolution

Alembic migrations are used so database schema changes can be tracked and reproduced.

### Prototype Before Production

The current architecture demonstrates the core interoperability concept. Production deployment would require additional technical, security, regulatory, clinical, and organizational work.

## 12. Current Project Status

Implemented:

- Phase 1 — Backend/database foundation
- Phase 2 — Unified clinical record
- Phase 3 — Simulated Hospital A/B ingestion workflows

Planned:

- Interoperability adapters and FHIR-compatible mapping
- Doctor dashboard
- Emergency mode
- AI clinical summary and retrieval
- RBAC, consent, and audit trail
- Evaluation and security review
- Final capstone demonstration and documentation
