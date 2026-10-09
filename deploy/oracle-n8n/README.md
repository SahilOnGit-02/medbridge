# n8n on Oracle Cloud

Deployment templates and operating instructions for the MedBridge capstone's single Oracle server. These files are separate from the application development `docker-compose.yml` at the repository root.

Normal editor address: <https://n8n.med-bridge.in/>. The server runs independently of GitHub and Vercel. A Git push does not deploy, restart or update it.

## Contents

| File | Purpose |
| --- | --- |
| `compose.yaml` | Persistent n8n service and optional public Caddy HTTPS proxy |
| `compose.bootstrap.yaml` | Temporary private HTTP settings for initial owner setup |
| `Caddyfile` | Domain-based HTTPS reverse proxy |
| `.env.example` | Public configuration template with an empty encryption-key value |
| `install-docker.sh` | Installs Docker Engine and Compose on Ubuntu 24.04 |
| `start-private.sh` | Creates a private environment file if absent and starts initial setup |
| `connect-private.sh` | SSH tunnel helper taking your own key path and server address |
| [START-HERE.md](START-HERE.md) | Fresh installation, DNS, firewall and HTTPS steps |
| [OPERATIONS.md](OPERATIONS.md) | Updates, backups, restoration and acceptance checks |
| [DEPLOYMENT-STATUS.md](DEPLOYMENT-STATUS.md) | Dated evidence and outstanding verification |
| [COLLABORATOR-HANDOFF.md](COLLABORATOR-HANDOFF.md) | Workflow ownership and configuration handoff |
| [VERIFICATION.md](VERIFICATION.md) | Local package checks and their limits |

## Existing deployment

Use the public HTTPS address. Do not repeat initial owner setup or apply the HTTP bootstrap override to the existing public instance. This commit changes repository files only. It does not copy configuration to Oracle, inspect private credentials or execute hospital workflows.

The owner reported on 9 October 2026 that workflow setup is complete. Fresh exports of those configured workflows have not been supplied for this change. The root `hospital-a.json` and `hospital-b.json` remain unchanged and are not asserted to match the hosted versions.

## Public repository boundary

Commit templates, instructions and manually reviewed workflow exports only. Keep `.env`, private keys, encryption keys, credentials, database volumes, backups, execution payloads and account screenshots outside Git. Ignore rules reduce accidental additions; they do not sanitize tracked files or override `git add -f`.

Before sharing a workflow JSON, remove embedded authentication values, sensitive credential names, pinned patient payloads and other private sample data. Recreate credentials privately after importing. See [n8n export guidance](https://docs.n8n.io/workflows/export-import/).

The Compose project name and volume names must stay stable when updating this deployment. Never run `docker compose down -v` against the existing installation unless intentionally deleting all data with the owner's approval.
