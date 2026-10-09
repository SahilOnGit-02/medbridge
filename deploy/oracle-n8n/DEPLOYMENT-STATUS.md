# Oracle n8n deployment status

Updated 9 October 2026. This note separates prior deployment checks from the owner's latest report. The server was not reconfigured or tested by this repository change.

## Recorded checks on 7 and 8 October 2026

- Oracle Montreal instance: VM.Standard.E4.Flex, 1 OCPU, 16 GB RAM, Ubuntu 24.04 x86_64.
- Docker Engine 29.8.2 and Compose 5.6.0 installed from Docker's Ubuntu repository.
- n8n 2.42.4 and Caddy 2.11.7 deployed under `/opt/medbridge-n8n`.
- n8n health check passed, restart policy was `unless-stopped`, and Docker was enabled at boot.
- Persistent n8n data volume was retained across container recreation.
- The encryption key remained in a private server `.env`; it was not copied to the repository.
- DNS resolved the n8n domain to the instance. Public HTTPS returned 200 with certificate verification, and HTTP redirected with 308.
- n8n port 5678 was bound to server loopback; Caddy exposed ports 80 and 443.
- The owner confirmed successful public sign-in using the existing account.
- A private pre-HTTPS backup was created and its archive readability checked. Restoration was not tested.

## Owner update on 9 October 2026

The owner reports that the n8n workflow setup is complete. Previous notes describing missing credentials, unauthenticated triggers or unpublished workflows are historical observations from 8 October, not assertions about the current server.

Fresh configured workflow exports, dated executions and acceptance results were not provided for this repository change. No workflow or credential was read from the server, modified or executed to prepare this commit. The existing repository exports are preserved without claiming they match the hosted versions.

## Checks to confirm with the owner and collaborator

- Current workflow versions, publication state, production URLs and webhook authentication.
- Correct integration credentials, provider IDs and patient identity mappings.
- Synthetic ingestion, duplicate handling, failure behavior and consent isolation.
- SMTP invitations/password recovery if needed. SMTP was absent at the last check.
- Encrypted off-server backup, isolated restoration and instance reboot verification.
- Current OCI SSH restrictions and host firewall rules. External HTTPS connectivity does not prove SSH is restricted.

Normal access: <https://n8n.med-bridge.in/>. No local n8n installation or SSH tunnel is needed for ordinary use.
