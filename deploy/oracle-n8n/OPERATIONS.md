# Operations and recovery

Run server commands from `/opt/medbridge-n8n` using the production `compose.yaml`. The HTTP bootstrap override is for deliberate private setup only. Publishing repository files does not apply them to Oracle.

## Configuration and updates

1. Review the proposed version changes and release notes. Schedule any interruption with the workflow owner.
2. Back up the current data and configuration, including the existing encryption key, before changing versions.
3. Copy reviewed deployment files to the existing server directory without overwriting its private `.env`. Preserve the Compose project name `medbridge-n8n` and existing named volumes.
4. Update intended values privately in `.env`. Keep mode 600. Do not print credentials, full environment settings or resolved Compose configuration in shared logs.
5. Validate and recreate services:

```sh
sudo docker compose -f compose.yaml --profile public config --quiet
sudo docker compose -f compose.yaml --profile public pull
sudo docker compose -f compose.yaml --profile public up -d
sudo docker compose -f compose.yaml --profile public ps
```

6. Check HTTPS, owner sign-in, workflow publication, credential usability and synthetic end-to-end results. Record the deployed versions and dated outcome. A healthy container alone does not establish that a hospital workflow works.

The templates pin n8n 2.42.4 and Caddy 2.11.7, matching the October 2026 deployment record. This change does not upgrade the live services. SQLite is used for this small single-instance capstone, with n8n data stored in `medbridge-n8n_n8n_data`.

## Backup

A workflow export is not a complete backup. It does not restore the full database, user accounts, encrypted credentials and execution state.

1. Coordinate downtime and stop incoming sends. Stop n8n before copying its SQLite data for a consistent backup.
2. Back up the full n8n data volume, private `.env`, Compose files and Caddyfile. Include Caddy's persistent volumes if preserving proxy state is required. Record exact image versions and backup time.
3. Restrict backup directory and file permissions. Encrypt an off-server copy and keep it outside Git. The encryption key and database together allow recovery of stored credentials, so treat the entire backup as sensitive.
4. Restart the production services and verify normal operation. Check archive integrity separately from restore testing.

## Restore test

Restore first into an isolated environment with compatible versions and the original n8n encryption key. Disable external incoming sends and ensure restored schedules or webhooks cannot create duplicate live ingestion. Restore the data and configuration with correct ownership and permissions, then verify owner sign-in, workflow presence and private credential decryption. Run synthetic acceptance checks. Record the result before treating the backup as recoverable.

Do not restore over newer live writes without a recovery plan. Do not use `docker compose down -v` for routine updates or troubleshooting. A version downgrade may require a compatible database restore; changing an image tag alone is not a guaranteed rollback.

## Verification checklist

- HTTPS certificate is valid; HTTP redirects to HTTPS.
- Only Caddy is public on 80/443; n8n port 5678 stays on loopback.
- SSH ingress is restricted to administrators, with OCI and host rules reviewed.
- Owner and collaborator use their own accounts.
- Each hospital's incoming webhook has the agreed authentication.
- Published workflow production URLs use the correct HTTPS domain.
- Integration credentials and patient/provider mappings are correct.
- Synthetic submissions produce expected backend record IDs and category data.
- Repeated submissions do not create unintended duplicates; failures have an owner.
- Normal doctor reads still follow patient category, expiry and revocation choices.
- Container restart and an arranged instance reboot preserve accounts, workflows and credentials.
- Encrypted off-server backup and an isolated restore test are recorded.

## Retention and recovery email

The templates prune execution data after 72 hours with a 1000-execution cap. Execution payloads may contain sensitive information. Review access and retention before any use beyond synthetic demonstrations.

SMTP was not configured at the last recorded check on 8 October 2026. Configure delivery privately if invitations or password recovery by email are required, and test them without exposing tokens. See [n8n user management configuration](https://docs.n8n.io/hosting/configuration/user-management-self-hosted/).
