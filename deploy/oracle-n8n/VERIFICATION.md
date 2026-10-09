# Repository package verification

Checked 9 October 2026. This verification covers repository files, not a new server deployment.

- Shell syntax checks passed for the installation, private bootstrap and tunnel scripts.
- Both Compose files parsed as YAML. Structural checks confirmed the fixed project/volume names, loopback-only n8n port, public Caddy profile, HTTPS webhook URL and production secure-cookie settings.
- Every referenced Compose environment variable is present in `.env.example`; its encryption-key value is empty.
- Package files were reviewed and scanned for private-key blocks, common token formats, JWTs and populated secret assignments. No secrets were identified. Pattern checks do not replace review.
- Personal workstation paths and account screenshots were excluded.
- Local documentation links resolved, and the package contained no em dash characters.
- Ignore checks passed for private environment files, keys, databases, backups and screenshots. Public templates remained eligible for tracking.
- Tunnel helper rejected missing arguments, a nonexistent key and an invalid port without making a network connection.
- Git whitespace checks passed.

Docker is unavailable on the verification workstation. Full `docker compose config`, image startup, live Caddy validation, backup restoration and end-to-end workflow execution were not run for this change. The existing Oracle installation and root hospital workflow exports were not modified.

The `N8N_WEBHOOK_URL` setting was checked against the [official n8n reverse proxy documentation](https://docs.n8n.io/hosting/configuration/configuration-examples/webhook-url/).
