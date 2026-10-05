# MedBridge technical handoff

This package describes the current implementation, not a claim of production readiness. Read the [release checklist](DEPLOYMENT.md) and [verification record](finalization/VERIFICATION.md) before releasing.

| Topic | Reference |
|---|---|
| Product and boundaries | [Project overview](PROJECT-OVERVIEW.md), [problem statement](PROBLEM-STATEMENT.md) |
| Architecture | [System architecture](SYSTEM-ARCHITECTURE.md) |
| Schema and endpoints | [Database/ER reference](DATABASE-DESIGN.md), [API reference](API-DOCUMENTATION.md) |
| Accounts | [Authentication](AUTHENTICATION.md) |
| Authorization | [Consent](CONSENT-AND-ACCESS-CONTROL.md), [emergency access](EMERGENCY-ACCESS.md) |
| PDF records | [Medical Reports](MEDICAL-REPORTS.md) |
| Integrations | [n8n exports](N8N-WORKFLOWS.md) |
| Operations | [Environment setup](ENVIRONMENT-SETUP.md), [deployment](DEPLOYMENT.md) |
| Evidence | [Testing](TESTING.md), [security boundaries](SECURITY.md) |
| Demonstration | [Demo guide](DEMO-GUIDE.md), [submission checklist](CAPSTONE-SUBMISSION.md) |

API and schema inventories are generated from application metadata by `backend/scripts/generate_reference.py`. Historical UX evidence remains in [portal revision](PORTAL-REVISION.md) and [UX implementation](UX-IMPLEMENTATION.md). Historical architecture and phase notes describe earlier milestones; the documents above are the current handoff.

- [Portal refinements and verification](portal-polish/VERIFICATION.md)
