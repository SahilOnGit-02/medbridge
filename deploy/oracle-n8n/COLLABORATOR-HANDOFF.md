# Hospital workflow handoff

Updated 9 October 2026. The owner reports the workflows are configured. This checklist captures what to preserve and verify with Sahil Yadav; it does not claim that hosted acceptance testing was repeated for this commit.

## Access

Use <https://n8n.med-bridge.in/> with individual accounts. Keep owner passwords, SSH keys and backend integration credentials private. Arrange workflow and credential ownership using the features available in the installed n8n edition. Do not assume that account creation automatically shares another user's workflows or credentials.

## Record the configured versions

1. Confirm the published Hospital A and Hospital B workflow names and versions.
2. Copy each Webhook node's Production URL from the hosted editor. Do not substitute the temporary Test URL.
3. Record the intended backend, provider IDs, patient identity mapping and timezone.
4. Confirm incoming webhook authentication and the sending system's configuration. Keep passwords and tokens in private credential storage.
5. Export the configured workflows and inspect them before committing. Remove embedded secrets, sensitive names and pinned patient payloads. Preserve expressions and mappings needed for import. Document private credentials that must be recreated, using descriptive placeholders only.

This commit intentionally does not replace the root hospital JSON files with stale local copies. Add reviewed exports from the working hosted instance in a separate change when they are available. See [n8n export guidance](https://docs.n8n.io/workflows/export-import/).

## Acceptance evidence

Use only synthetic records. For each hospital, capture the expected result and resulting backend record IDs. Check existing patients, new mappings where supported, new encounters, repeat submissions, missing fields and failed API calls. Confirm cross-hospital restrictions and normal doctor access after sharing changes. A green execution or an initial webhook acknowledgement alone does not prove the data is correct.

Record who handles failures, retries and credential rotation. Keep execution payloads, tokens and private patient data out of public screenshots and exports.

## Boundary between ingestion and consent

The workflows send hospital records to MedBridge. Patient-controlled sharing determines normal clinical reading access. Revoking a patient's hospital grant is not a reason to reset n8n or overwrite consent from an integration workflow. Restore sharing through the patient portal when the patient chooses to grant access again.

## Operational handoff

Use [OPERATIONS.md](OPERATIONS.md) for updates, backup and recovery checks. Hosting, workflow configuration and production acceptance are separate checks. A Git push does not deploy any server or workflow change.
