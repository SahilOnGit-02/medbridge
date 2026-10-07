## 1. Overview

MedBridge uses n8n as an integration and automation layer for synthetic hospital data ingestion.

The repository contains two hospital workflow exports:

- `hospital-a.json` — synthetic Hospital A ingestion workflow
- `hospital-b.json` — synthetic Hospital B ingestion workflow

The workflows receive hospital-specific payloads, normalize the incoming fields, authenticate against the MedBridge API, resolve hospital-specific patient identity, create or resolve canonical patients and mappings where appropriate, and create clinical records.

The current workflows have been verified against the deployed MedBridge API using authenticated hospital-specific integration accounts and synthetic data.

The workflow exports are integration demonstrations rather than direct integrations with real hospital EHR systems.

---

## 2. Hospital A Workflow

Hospital A is represented by the workflow export `hospital-a.json`.

The current deployed API configuration targets the MedBridge API:

- API base: `https://medbridge-m1b5.onrender.com`
- Production hospital ID: `2`
- Integration account: `n8n-hospital-a@medbridge.in`
- Password source: `$env.HOSPITAL_A_PASSWORD`
- Export activation flag: `false`

The workflow was successfully executed against the deployed API using synthetic data. The verified encounter ingestion produced:

- Patient ID: `4`
- Hospital ID: `2`
- Encounter type: `outpatient`
- Reason: `Demo condition`
- Attending doctor: `Demo Doctor`
- Encounter ID: `2`
- Hospital: `Hospital A`

The workflow therefore demonstrates the complete integration path from a Hospital A source payload through authenticated ingestion into the canonical MedBridge clinical data model.

---

## 3. Hospital B Workflow

Hospital B is represented by the workflow export `hospital-b.json`.

The current deployed API configuration targets the MedBridge API:

- API base: `https://medbridge-m1b5.onrender.com`
- Production hospital ID: `4`
- Integration account: `n8n-hospital-b@medbridge.in`
- Password source: `$env.HOSPITAL_B_PASSWORD`
- Export activation flag: `false`

The workflow was successfully executed against the deployed API using synthetic data. The verified observation ingestion produced:

- Patient ID: `7`
- Hospital ID: `4`
- Encounter ID: `4`
- Observation: `Demo Observation B`
- Value: `100 mg/dL`
- Reference range: `normal`
- Status: `final`
- Source hospital: `Hospital B`

The workflow therefore demonstrates the complete integration path from a Hospital B source payload through authenticated ingestion into the canonical MedBridge clinical data model.

---

## 4. Authentication and Credentials

Each hospital workflow uses a hospital-specific authenticated integration account when communicating with the MedBridge API.

The current production integration accounts are:

- Hospital A: `n8n-hospital-a@medbridge.in`
- Hospital B: `n8n-hospital-b@medbridge.in`

Passwords are supplied through environment variables and are not stored in the workflow exports or repository:

- `HOSPITAL_A_PASSWORD`
- `HOSPITAL_B_PASSWORD`

The deployed API remains the authorization authority. n8n authentication does not bypass patient sharing, hospital scope, or emergency-access rules enforced by the backend.

The legacy Docker-internal API address `http://medbridge-github-api-1:8000` is obsolete and must not be used for the current production workflows.

Credentials must never be hard-coded into workflow exports, committed to Git, or exposed in execution logs.

---

## 5. Patient Identity Mapping

Hospital workflows resolve patient identity within the context of the source hospital before creating or attaching clinical records.

The integration model separates hospital-specific patient identifiers from the canonical MedBridge patient identity:

- A source hospital identifier is meaningful within its originating hospital.
- Patient-hospital mappings connect the source identity to the canonical MedBridge patient.
- A patient identity match does not by itself grant clinical-record access.
- Hospital scope remains part of the authorization boundary.

This prevents a hospital-specific identifier from being treated as a globally authoritative patient identifier across all connected hospitals.

The workflows therefore follow the separation between identity resolution and clinical access used throughout MedBridge.

---

## 6. Clinical Data Ingestion

After authentication and patient identity resolution, the hospital workflows submit normalized clinical data to the MedBridge API.

The integration flow is:

1. Receive the source hospital payload.
2. Normalize the incoming fields into the MedBridge data format.
3. Authenticate the hospital integration account.
4. Resolve the hospital-specific patient identity.
5. Create or resolve the canonical patient and patient-hospital mapping where required.
6. Create the applicable clinical record through the protected API.
7. Return the resulting canonical record to the workflow when required.

The current verified workflows demonstrate different clinical record types:

- Hospital A successfully ingested an outpatient encounter.
- Hospital B successfully ingested a clinical observation.

The backend remains responsible for validating and persisting the resulting clinical data. n8n acts as the integration and transformation layer rather than replacing the MedBridge clinical data model.

---

## 7. Duplicate and Unknown Identity Handling

The workflows include branches for cases where incoming hospital data cannot be attached to an existing canonical patient or where an incoming clinical event may already exist.

### Unknown identity

If the source patient cannot be resolved within the hospital-specific identity context, the workflow must not guess or attach the clinical data to an unrelated patient.

The unresolved case is treated as an integration exception that requires an appropriate resolution path rather than bypassing identity controls.

### Duplicate clinical events

The workflows account for duplicate-event scenarios so that a repeated source payload does not automatically create an unintended duplicate clinical record.

Duplicate and unknown-identity handling is part of the integration workflow, while the backend remains responsible for enforcing database constraints and authorization.

---

## 8. Current Verification Evidence

The current n8n integration was verified using synthetic data and authenticated hospital-specific accounts.

Verified production workflow results:

- Hospital A encounter ingestion completed successfully.
- Hospital B observation ingestion completed successfully.
- Hospital A authenticated access to Hospital A data returned HTTP 200.
- Hospital A access to Hospital B data was rejected with HTTP 403.
- Hospital B authenticated access to Hospital B data returned HTTP 200.
- Hospital B access to Hospital A data was rejected with HTTP 403.

These cross-hospital checks confirm that authentication alone does not grant unrestricted access to another hospital's clinical data.

The backend test suite currently passes with 146 tests passed and 1 test skipped.

The frontend production build also completes successfully.

These results represent the current verification state and should be rechecked whenever the workflow exports, authentication configuration, API contracts, or access-control rules change.

---

## 9. Security and Data Handling

The n8n workflows are designed to operate with synthetic demonstration data. They are not configured as integrations with real hospital EHR systems or production patient records.

Security requirements for the workflows are:

- Store integration passwords in environment variables or the n8n credential store.
- Never commit passwords, API tokens, or other secrets to Git.
- Do not intentionally log complete patient payloads or credentials in workflow executions.
- Keep hospital integration credentials scoped to their intended hospital.
- Keep clinical authorization decisions in the MedBridge backend.
- Use synthetic fixtures for development and demonstration.

The repository also excludes local environment files and runtime upload data from version control.

The n8n layer must not be used to bypass authentication, hospital scope, patient sharing policy, consent controls, or emergency-access restrictions enforced by MedBridge.

---

## 10. Workflow Inventory and Node References

The repository contains the two n8n workflow exports used for the hospital integration demonstrations:

- `hospital-a.json` — Hospital A integration workflow
- `hospital-b.json` — Hospital B integration workflow

A node-level inventory is maintained separately in `docs/N8N-INVENTORY.md`. That inventory provides a more detailed reference to the nodes and workflow structure without duplicating the full exported JSON in this document.

The JSON files are the executable workflow artifacts; this document describes their intended integration behavior, security boundary, and current verification state.

When a workflow export changes, the corresponding inventory and verification evidence should be reviewed and updated.

---

## 11. Current Limitations

The current n8n implementation is a demonstrated integration layer rather than a fully operational hospital interoperability deployment.

Current limitations include:

- The workflows use synthetic demonstration data rather than real hospital patient records.
- The workflow exports are not connected to real hospital EHR or HIS systems.
- The Oracle Cloud n8n deployment has not yet been operationalized.
- Production hospital integrations would require formal onboarding, credential management, monitoring, and operational support.
- Real-world deployments would require additional interoperability, privacy, security, reliability, and compliance controls.

These limitations do not change the current demonstration result: the Hospital A and Hospital B workflows have been successfully verified against the deployed MedBridge API using authenticated synthetic-data integrations.

---

## 12. Future Operational Work

Before treating the n8n layer as a production interoperability service, the following work remains:

- Deploy n8n on the planned Oracle Cloud VPS.
- Configure production secrets through the deployment environment or n8n credential management.
- Add operational monitoring and failure visibility.
- Define retry and recovery behavior for failed hospital submissions.
- Establish controlled onboarding for additional hospital integrations.
- Replace synthetic adapters with formally specified hospital/EHR integrations when real deployments are introduced.

These activities are operationalization work and are separate from the current capstone demonstration, which already verifies the core authenticated Hospital A and Hospital B ingestion flows.

---

## 13. Integration Principle

n8n is the integration and automation layer of MedBridge, not the authority for clinical access.

Its responsibility is to receive, transform, authenticate, and submit hospital data through defined API contracts.

The MedBridge backend remains responsible for identity, authentication, authorization, hospital scope, patient sharing, consent, emergency access, validation, and persistence.

Therefore, no n8n workflow should grant itself access that the MedBridge API would otherwise deny.

This separation allows hospital integrations to evolve independently while keeping the core MedBridge privacy and access-control model centralized in the backend.

---
