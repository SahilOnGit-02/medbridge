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
| Hospital A Login | `n8n-nodes-base.httpRequest` |

## hospital-b.json

| Node | Type |
|---|---|
| Normalize Hospital B Payload | `n8n-nodes-base.set` |
| Resolve Patient Identity | `n8n-nodes-base.httpRequest` |
| Create MedBridge Patient | `n8n-nodes-base.httpRequest` |
| Create Patient mapping | `n8n-nodes-base.httpRequest` |
| Create Encounter | `n8n-nodes-base.httpRequest` |
| Patient Found? | `n8n-nodes-base.if` |
| Receive Hospital B Data | `n8n-nodes-base.webhook` |
| Create Condition | `n8n-nodes-base.httpRequest` |
| Create Allergy | `n8n-nodes-base.httpRequest` |
| Create Medication | `n8n-nodes-base.httpRequest` |
| Create Prescription | `n8n-nodes-base.httpRequest` |
| Create Observation | `n8n-nodes-base.httpRequest` |
| Hospital B Login | `n8n-nodes-base.httpRequest` |
