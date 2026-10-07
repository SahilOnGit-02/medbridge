# MedBridge Architecture

> **Current architecture reference — October 2026**
>
> This document describes the current implemented MedBridge system. Historical
> project-stage documents remain in `docs/` for reference and should not be
> interpreted as the current architecture.

## 1. Project Overview

MedBridge is a healthcare interoperability platform prototype that provides a
canonical patient identity and controlled clinical-record access across
participating hospitals.

The system addresses fragmented medical records by connecting
hospital-specific patient identities to a canonical MedBridge patient while
keeping access controlled through authentication, hospital authorization,
patient consent, scoped sharing, expiry/revocation, and emergency-access
controls.

The current implementation includes:

- Canonical MedBridge patient identity
- Hospital-specific patient identity mappings
- Hospital-scoped doctor access
- Authentication and role-based authorization
- Patient-hospital connections
- Category-scoped clinical-record sharing
- Sharing duration and expiry
- Patient-controlled revocation
- Emergency access with reason and time limit
- Access/audit history
- Medical-report access controls
- Synthetic Hospital A and Hospital B n8n ingestion workflows
- FHIR mapping support
- PostgreSQL persistence
- Alembic database migrations
- React/Vite patient and doctor portals

The system is a capstone/proof-of-concept implementation. It is not a
production healthcare deployment and must not be used with real patient data.

---

## 2. System Goals

MedBridge separates three concepts that are often conflated in fragmented
healthcare systems:

1. **Hospital identity** — the identifier used by an individual hospital.
2. **MedBridge identity** — the canonical patient identifier.
3. **Clinical access** — the permission required for a hospital clinician to
   retrieve the patient's protected clinical information.

A hospital connection does not automatically grant clinical-record access.

Likewise, discovering a patient's identity does not by itself grant access
to the patient's clinical history.

---

## 3. High-Level Architecture

```text
                         ┌─────────────────────┐
                         │   Patient Portal    │
                         │   React / Vite      │
                         └──────────┬──────────┘
                                    │
                                    │ HTTPS / JWT
                                    ▼
┌──────────────────┐       ┌─────────────────────┐
│   Doctor Portal  │──────►│   MedBridge API     │
│   React / Vite   │       │   FastAPI           │
└──────────────────┘       └──────────┬──────────┘
                                      │
                     ┌────────────────┼────────────────┐
                     │                │                │
                     ▼                ▼                ▼
              Authentication      Consent /       Emergency /
              & RBAC              Sharing         Audit
                     │                │                │
                     └────────────────┼────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │  PostgreSQL   │
                              │               │
                              │ Patients      │
                              │ Hospitals     │
                              │ Mappings      │
                              │ Clinical      │
                              │ Consents      │
                              │ Reports       │
                              │ Audit logs    │
                              └───────────────┘

 Hospital A ───────► n8n ───────► MedBridge API
 Hospital B ───────► n8n ───────► MedBridge API
## 4. Core Access Model

MedBridge uses layered authorization.

### 4.1 Authentication

Users authenticate through the MedBridge authentication API.

The current system supports patient and clinical/hospital-facing accounts,
with JWT-based authenticated sessions.

Unauthenticated protected API requests return `401 Unauthorized`.

### 4.2 Role and Hospital Authorization

Authenticated users are additionally checked against their role and, where
applicable, their hospital.

A doctor or hospital administrator is not automatically authorized to access
another hospital's protected clinical data.

Hospital-scoped clinical operations enforce the authenticated user's hospital
context.

### 4.3 Patient Consent

Patient clinical access is controlled separately from hospital connection.

The patient can:

- connect a hospital;
- select which clinical categories are shared;
- select a sharing duration;
- review the sharing configuration;
- revoke sharing.

A connection alone does not expose clinical records.

### 4.4 Sharing Scope

Clinical information can be shared by category.

Current categories include:

- Allergies
- Medications
- Conditions
- Prescriptions
- Observations
- Encounters
- Medical reports

The API applies the sharing scope server-side. The frontend does not provide
security by hiding fields alone.

### 4.5 Expiry and Revocation

A sharing grant can have a defined duration or no fixed expiry.

When a grant expires or is revoked, normal clinical-record requests are
blocked by the backend.

The existing hospital connection can remain in place after sharing is
revoked.

---

## 5. Emergency Access

MedBridge provides a separate emergency-access mechanism for appropriate
clinical situations.

Emergency access:

- requires authentication;
- requires an emergency reason;
- records the requesting clinician;
- records the patient;
- records the hospital context;
- has a time limit;
- exposes a restricted emergency profile;
- creates audit/access-history events;
- can be ended explicitly.

The emergency profile is intentionally narrower than the complete clinical
record.

The demonstrated emergency profile includes information such as:

- allergies;
- current medications;
- active conditions;
- blood group;
- emergency contact information.

Emergency access does not permanently modify the patient's normal sharing
grant.

---

## 6. Patient Identity Architecture

The canonical patient is represented by a MedBridge identifier.

Hospital-specific identifiers are preserved separately.

```text
Hospital A
external_patient_id = A-DEMO-005
          |
          v
PatientHospitalMapping
          |
          v
MedBridge Patient
medbridge_id = MB-...
```

This prevents a hospital's local identifier from becoming the global
identifier.

### Identity discovery

Normal doctor discovery is hospital-scoped.

Search can use the identity information permitted by the current workflow,
including:

- patient name;
- date of birth;
- MedBridge ID.

An exact MedBridge ID can be used for limited identity resolution across
hospital boundaries, but identity discovery does not automatically grant
clinical-record access.

Clinical access still requires the appropriate hospital authorization and
patient sharing policy.

---

## 7. Clinical Data Model

The current normalized model includes:

### Patient

Canonical MedBridge patient identity and demographic information.

### Hospital

Participating healthcare organization.

### PatientHospitalMapping

Maps a hospital's external patient identifier to the canonical patient.

### Encounter

Represents a clinical interaction at a hospital.

### Condition

Represents a patient's clinical condition or diagnosis.

### Allergy

Represents known allergy information.

### Medication

Represents medication information used by prescriptions.

### Prescription

Represents patient-specific medication orders/history.

### Observation

Represents a clinical measurement, laboratory result, or observation.

### MedicalReport

Represents protected clinical documents/reports with access controlled by
the same authorization and consent model.

### Consent

Represents patient-controlled hospital sharing and category-level sharing
scope.

### EmergencyAccess

Represents time-limited emergency clinical access.

### AuditLog

Records security-sensitive access and account events used by the access
history experience.

---
## 8. Backend Architecture

The MedBridge backend is built around a FastAPI application with a PostgreSQL database and SQLAlchemy ORM.

### Core stack
| Technology | Responsibility |
|---|---|
| FastAPI | HTTP API and application entry point |
| SQLAlchemy | Database ORM and persistence layer |
| PostgreSQL | Persistent relational database |
| Alembic | Database schema migrations |
| Pydantic | Request and response validation |
| JWT | Authenticated user sessions |
| n8n | Hospital integration automation |

The primary application entry point is:

```text
backend/app/main.py
```

### API modules

The backend API is organized into domain-specific modules:
- `accounts.py` — account and profile operations
- `auth.py` — authentication and session handling
- `clinical.py` — clinical record operations
- `consents.py` — patient sharing and consent management
- `emergency.py` — emergency access
- `fhir.py` — interoperability-oriented FHIR operations
- `medical_reports.py` — medical report operations
- `patients.py` — patient discovery and patient operations
- `patient_access.py` — patient access and authorization workflows

Supporting backend layers include:

- `core/` — configuration and application infrastructure
- `db/` — database setup and session management
- `fhir/` — FHIR mapping and interoperability logic
- `models/` — SQLAlchemy database models
- `schemas/` — Pydantic API schemas
- `services/` — reusable business logic

The backend remains the security authority for authentication,
authorization, consent enforcement, emergency access, and clinical-data
access. The frontend does not independently determine whether protected
clinical information may be returned.

---

## 9. Frontend Architecture

The MedBridge frontend is implemented with React and Vite.

The frontend provides the user-facing workflows for patients and clinicians while relying on the backend for authentication, authorization, consent enforcement, and protected clinical-data access.

### Major components

- `AccessHistory.jsx` — patient access and audit-history presentation
- `AccountEntry.jsx` — account entry and authentication-related UI
- `DoctorWorkspace.jsx` — clinician-facing patient discovery and clinical workspace
- `EmergencyAccess.jsx` — emergency access initiation and session controls
- `EmergencyProfile.jsx` — restricted emergency patient profile
- `MedicalReports.jsx` — medical report presentation
- `PatientAdministration.jsx` — patient administration workflows
- `PatientPortal.jsx` — patient-facing portal
- `Records.jsx` — clinical record presentation
- `ReportPreview.jsx` — medical report preview
- `Sharing.jsx` — hospital connections and patient-controlled sharing
- `UI.jsx` — shared interface components

### Frontend responsibilities

The frontend is responsible for presenting:

- authentication and account flows;
- patient portal workflows;
- doctor workspace and patient discovery;
- hospital connections and consent/sharing controls;
- clinical records and medical reports;
- emergency-access workflows;
- patient access history;
- loading, error, empty, and restricted-access states.

The frontend must not treat the existence of a patient, hospital connection, or UI state as proof of clinical-data authorization. Protected data is displayed only when permitted by the backend response.

---

## 10. Medical Report Architecture

Medical reports are stored and handled separately from ordinary structured clinical records.

Report access is protected by multiple authorization layers:

1. authenticated user access;
2. hospital and role authorization where applicable;
3. patient sharing scope;
4. report-specific consent scope.

The existence of a patient record or hospital connection does not by itself grant access to protected medical reports.

The frontend must not assume that a report is accessible merely because the patient or hospital is otherwise visible. Report access is determined by the backend authorization and applicable consent policy.

---

## 11. n8n Integration Architecture

MedBridge uses n8n as the hospital-integration automation layer.

The repository contains two synthetic hospital workflow exports:

- `hospital-a.json`
- `hospital-b.json`

These workflows simulate hospital systems sending clinical information to MedBridge.

### Integration flow

A hospital workflow generally performs the following operations:

1. receive a hospital payload;
2. normalize the incoming information;
3. authenticate against the MedBridge API;
4. resolve the hospital-specific patient identity;
5. create or resolve the canonical MedBridge patient where appropriate;
6. create the hospital-to-patient identity mapping;
7. create encounters and clinical records;
8. retrieve or resolve the resulting record where appropriate.

Hospital integrations use hospital-specific authenticated integration accounts. Credentials are supplied through environment variables rather than embedded passwords in workflow source.

### Hospital A

The production Hospital A workflow targets the deployed MedBridge API and authenticates as the Hospital A integration account. Its exported credential reference uses the `HOSPITAL_A_PASSWORD` environment variable.

A production Hospital A encounter ingestion has been successfully demonstrated.

### Hospital B

The production Hospital B workflow targets the deployed MedBridge API and authenticates as the Hospital B integration account. Its exported credential reference uses the `HOSPITAL_B_PASSWORD` environment variable.

A production Hospital B observation ingestion has been successfully demonstrated.

The workflows are synthetic hospital adapters for the capstone demonstration. They are not direct integrations with real hospital EHR systems.

The backend and workflow design also support duplicate protection so repeated synthetic ingestion does not unnecessarily create duplicate clinical encounters when the same ingestion criteria are matched.

---

## 12. FHIR Interoperability

MedBridge includes FHIR-oriented mapping under `backend/app/fhir/`.

The FHIR layer provides an interoperability-oriented representation of MedBridge clinical information and supports the project's standards-alignment goals.

The presence of FHIR mapping does not mean that MedBridge is a certified FHIR, ABDM, or production interoperability implementation.

A production interoperability deployment would require appropriate conformance testing, validation, governance, integration agreements, deployment controls, and standards-specific certification or compliance work where applicable.

---

## 13. Database and Migrations

MedBridge uses PostgreSQL as its persistent relational database.

Database schema changes are managed through Alembic migrations located under `backend/alembic/versions/`.

The migration history covers major application capabilities including:

- patient identity and hospital mappings;
- users and role-based access control;
- patient-hospital connections;
- consent and sharing controls;
- emergency access;
- audit logging;
- patient account linking;
- email verification and account recovery;
- medical reports;
- report-specific consent scope.

Database structure should be changed through migrations rather than manual schema edits so that development, testing, and deployment environments can reproduce the expected schema.

---

## 14. Deployment Architecture

### Local environment

The local development environment can run the MedBridge stack using Docker.

The local architecture consists of:

- frontend development server;
- FastAPI backend container;
- PostgreSQL database;
- n8n integration workflows.

The local API is exposed on port 8001 while the API container listens on port 8000 internally.

### Hosted environment

The current capstone demonstration uses deployed hosting for the MedBridge application. The production n8n workflow exports are configured to communicate with the deployed MedBridge API rather than the obsolete local Docker service name `medbridge-github-api-1`.

The demonstrated Hospital A and Hospital B workflows have successfully ingested synthetic clinical data through the deployed API.

### Future n8n infrastructure

A dedicated Oracle VPS deployment for operational n8n hosting remains future work. It should not be described as completed production infrastructure until it has actually been deployed and verified.

---

## 15. Security Principles

MedBridge follows the following security principles:

- least privilege;
- server-side authorization;
- patient control over normal clinical-data sharing;
- explicit and time-limited emergency access;
- synthetic demonstration data;
- secrets kept outside source control.

The backend is responsible for enforcing protected-data access. Frontend controls are not treated as a security boundary.

Hospital integration credentials are supplied through environment variables and are not embedded as plaintext passwords in the workflow exports.

The capstone demonstration uses synthetic data and should not be treated as a system for processing real patient records.

---

## 16. Current Demonstrated Flows

The following workflows have been manually verified in the current capstone build:

- doctor authentication;
- hospital-scoped patient search;
- wrong-date-of-birth rejection;
- cross-hospital name isolation;
- exact MedBridge ID lookup;
- clinical-access denial without patient sharing;
- patient-hospital connection;
- category-scoped sharing;
- sharing expiry;
- patient sharing revocation;
- backend enforcement after revocation;
- emergency access;
- emergency access reason capture;
- emergency audit and access-history events;
- emergency session termination;
- Hospital A synthetic encounter ingestion against the deployed API;
- Hospital B synthetic observation ingestion against the deployed API;
- authenticated hospital-specific API access;
- frontend production build;
- backend automated regression tests.

The current backend regression suite reports 146 passed tests and 1 skipped test.

The Hospital A and Hospital B integrations use synthetic demonstration data and hospital-specific integration accounts.

---

## 17. Current Limitations

MedBridge is a capstone proof-of-concept and is not presented as a production healthcare information system.

The current implementation does not claim:

- real hospital EHR integrations;
- production hospital contractual integration;
- production clinical deployment;
- formal healthcare regulatory certification;
- formal security assessment;
- production operational monitoring;
- a production backup and disaster-recovery program;
- production SMTP/provider acceptance;
- production-scale reliability testing;
- formal clinical validation;
- production ABDM integration;
- certified FHIR interoperability;
- processing of real patient data.

Hospital A and Hospital B are synthetic demonstrations used to prove the integration architecture and workflow behavior.

---

## 18. Future Operational Work

The following work remains outside the current capstone demonstration:

1. Deploy and verify dedicated Oracle VPS infrastructure for n8n.
2. Configure production secrets and hospital integration credentials.
3. Complete production SMTP/provider configuration.
4. Establish production monitoring and alerting.
5. Establish backup and disaster-recovery procedures.
6. Perform formal security testing and review.
7. Develop real hospital adapters and establish integration agreements.
8. Complete applicable healthcare interoperability and standards-compliance work.

These items must not be described as deployed or production-ready until they have actually been implemented and verified.

---

## 19. Repository Architecture

The repository is organized around the backend, frontend, documentation, deployment configuration, and hospital integration workflow exports.

```text
medbridge-github/
|-- backend/
|   |-- alembic/
|   |-- app/
|   |   |-- api/
|   |   |-- core/
|   |   |-- db/
|   |   |-- fhir/
|   |   |-- models/
|   |   |-- schemas/
|   |   -- services/
|   |-- scripts/
|   |-- tests/
|   |-- Dockerfile
|   -- requirements.txt
|-- docs/
|-- frontend/
|-- hospital-a.json
|-- hospital-b.json
|-- docker-compose.yml
|-- openapi-current.json
-- README.md
```

The repository also contains automated verification and release-support scripts under `backend/scripts/`.

---

## 20. Architecture Principle

```text
Hospital identity
       |
       v
Identity mapping
       |
       v
Canonical MedBridge patient
       |
       +---------------> Clinical records
       |
       +---------------> Medical reports
       |
       +---------------> Patient-controlled sharing
                              |
                              v
                       Hospital-authorized access
                              |
                    +---------+---------+
                    |                   |
                    v                   v
              Normal access       Emergency access
                    |                   |
                    +---------+---------+
                              |
                              v
                         Audit history
```

The central architectural rule is:

> Identity discovery, hospital connection, and clinical-record access are separate operations. Clinical access is granted only when authentication, authorization, and applicable sharing policy permit it.

This separation is the foundation of the MedBridge privacy and access-control model.

---