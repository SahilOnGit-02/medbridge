# n8n workflow documentation

The actual exports are `hospital-a.json` and `hospital-b.json` in the repository root. These are simulated hospital ingestion workflows, not live hospital integrations.

They receive distinct source payloads, normalize fields, find/create hospitals, resolve hospital-specific patient mappings, create canonical patients/mappings and clinical entries as needed, retrieve unified records and handle duplicate/unknown identity branches. Node inventories are generated in [workflow inventory](N8N-INVENTORY.md).

The exports reference the legacy internal API URL `http://medbridge-github-api-1:8000`. No credentials are exported. Configure the actual API base and an appropriately scoped authenticated integration account in n8n's credential store before running against the current protected API. Final unified-record reads also need the implemented consent policy. Do not solve authorization errors by turning off protection.

Existing project notes describe earlier manual ingestion tests. These workflows have not been rerun against this finalization branch, and a running n8n instance is not supplied here. Treat current-version execution as pending. Recheck existing-patient, new-patient, new-encounter, duplicate-encounter and unknown-identity cases, with synthetic fixtures only. Avoid importing the exports with an unintended webhook environment or logging patient payloads.
