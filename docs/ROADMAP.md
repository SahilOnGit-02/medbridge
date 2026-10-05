# MedBridge roadmap

## Implemented prototype capabilities

- Canonical patient identity, hospital mappings and normalized clinical history
- Simulated Hospital A/B ingestion exports and FHIR-compatible mapping
- Separate clinician/patient portals, registration, verification and recovery
- Administrator-approved doctor access, RBAC, consent scopes and key audit events
- Limited emergency sessions and Medical Reports
- Configurable TLS SMTP, local capture and generated technical references

## Finalization sequence

Sync > fix/test > email integration > staging verification > documentation freeze > release/smoke test > demo video > submit.

- [x] Branch from merged portal/report integration
- [x] Separate reports from category/timeline history and add direct navigation
- [x] Persist and test report consent independently
- [x] Add TLS SMTP configuration and safe delivery failure handling
- [x] Add current code-derived API/ER references and technical handoff
- [x] Complete local final verification record for this branch
- [ ] Configure real provider, verified sender and final frontend/backend URLs
- [ ] Run live email and staging account/consent journeys
- [ ] Reconfigure and rerun n8n exports against the protected API
- [ ] Complete production security/operations review and release smoke tests
- [ ] Record demo video and finish capstone report/case study

AI-generated clinical summaries and real hospital/ABDM integrations remain future work.
