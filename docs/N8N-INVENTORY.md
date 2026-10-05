# n8n export inventory

Generated from the committed JSON exports. This inventories nodes, not execution evidence.

## hospital-a.json

| Node | Type |
|---|---|
| Hospital A Webhook | `n8n-nodes-base.webhook` |
| Normalize Hospital A | `n8n-nodes-base.set` |
| Create Patient | `n8n-nodes-base.httpRequest` |
| Create Patient Mapping | `n8n-nodes-base.httpRequest` |
| Create Encounter | `n8n-nodes-base.httpRequest` |
| Create Condition | `n8n-nodes-base.httpRequest` |
| Create Allergy | `n8n-nodes-base.httpRequest` |
| Create Medication | `n8n-nodes-base.httpRequest` |
| Create Prescription | `n8n-nodes-base.httpRequest` |
| Create Observation | `n8n-nodes-base.httpRequest` |
| Resolve Patient Identity | `n8n-nodes-base.httpRequest` |
| Patient Found? | `n8n-nodes-base.if` |
| Get Existing Patient Record | `n8n-nodes-base.httpRequest` |
| Check Existing Encounter | `n8n-nodes-base.httpRequest` |
| Duplicate Check | `n8n-nodes-base.if` |
| Get Unified Clinical Record | `n8n-nodes-base.httpRequest` |

## hospital-b.json

| Node | Type |
|---|---|
| Normalize Hospital B Payload | `n8n-nodes-base.set` |
| Resolve Patient Identity | `n8n-nodes-base.httpRequest` |
| Create MedBridge Patient | `n8n-nodes-base.httpRequest` |
| Create Patient mapping | `n8n-nodes-base.httpRequest` |
| Create Encounter | `n8n-nodes-base.httpRequest` |
| Get Unified Clinical Record | `n8n-nodes-base.httpRequest` |
| Get Existing Patient Record | `n8n-nodes-base.httpRequest` |
| Patient Found? | `n8n-nodes-base.if` |
| Find Hospital B | `n8n-nodes-base.httpRequest` |
| Receive Hospital B Data | `n8n-nodes-base.webhook` |
| Create Condition | `n8n-nodes-base.httpRequest` |
| Create Allergy | `n8n-nodes-base.httpRequest` |
| Create Medication | `n8n-nodes-base.httpRequest` |
| Create Prescription | `n8n-nodes-base.httpRequest` |
| Create Observation | `n8n-nodes-base.httpRequest` |
| Check Existing Encounter | `n8n-nodes-base.httpRequest` |
| Duplicate Check | `n8n-nodes-base.if` |
