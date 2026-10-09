# Fresh Oracle installation

These instructions are for a new installation. The existing MedBridge server is already hosted. Use [OPERATIONS.md](OPERATIONS.md) for an existing deployment and [DEPLOYMENT-STATUS.md](DEPLOYMENT-STATUS.md) for dated evidence.

## 1. Server and network

Use a reviewed Oracle compartment, a public subnet with an internet gateway and default internet route, and an assigned stable public IPv4 address. The recorded deployment uses Montreal, Ubuntu 24.04 x86_64 and VM.Standard.E4.Flex with 1 OCPU and 16 GB RAM. This is a paid allocation, not an Always Free guarantee. Review current pricing and workload before creating or resizing a server.

Configure both OCI security lists or network security groups and the host firewall:

| Incoming port | Source | Purpose |
| --- | --- | --- |
| TCP 22 | Administrator public IP addresses only | SSH administration |
| TCP 80 | Internet, when enabling public HTTPS | Certificate validation and HTTPS redirect |
| TCP 443 | Internet, when enabling public HTTPS | Authenticated n8n editor and configured webhooks |
| TCP 5678 | No public rule | n8n stays bound to server loopback |

Preserve required outbound DNS, HTTPS, certificate and backend access. Review existing host firewall rules before changing them so SSH remains available. OCI rules and the host firewall are separate controls. Give collaborators separate accounts rather than sharing owner credentials or private keys.

## 2. Connect and copy configuration

Keep the downloaded SSH private key outside the repository and restrict its permissions. Verify the instance's SSH fingerprint independently before accepting it.

```sh
chmod 400 /path/to/private-key.key
ssh -i /path/to/private-key.key ubuntu@SERVER_PUBLIC_IP
```

All key paths and `SERVER_PUBLIC_IP` above are placeholders. Copy the reviewed files from this repository directory to `/opt/medbridge-n8n` on the server, owned by the deployment operator. Keep the directory private. Do not copy screenshots, credentials or backups from a workstation into Git.

From that server directory, run:

```sh
bash install-docker.sh
```

This script installs Docker on Ubuntu 24.04 from Docker's official package repository. It does not configure Oracle networking. Docker administration grants broad host control.

## 3. Private initial owner setup

Review `.env.example` for the intended domain and scheduling timezone. Its pinned versions reflect the original deployment date; review supported versions before a new installation. Keep Caddy disabled until the owner account exists.

For a fresh installation, from `/opt/medbridge-n8n`:

```sh
bash start-private.sh
```

The script generates the encryption key privately if `.env` does not exist and sets file permissions to 600. It preserves any existing `.env` key. It refuses to run while this Compose project's Caddy service is running, or if the existing n8n volume is present without its `.env`. These guards do not replace checking whether the instance is already in use. Never replace the encryption key when reusing existing n8n data.

The bootstrap overrides production URLs and secure cookies for private HTTP only. On your Mac, run the helper from this repository directory:

```sh
bash connect-private.sh /path/to/private-key.key ubuntu@SERVER_PUBLIC_IP
```

Keep the terminal open. Visit `http://localhost:5678` and create the n8n owner account. Confirm sign-in. The helper only opens a tunnel; it does not change server settings. For a different local port, supply a third argument and review the bootstrap editor URL accordingly. Do not use this HTTP setup path for ordinary public access or add MedBridge application login details as n8n credentials.

## 4. DNS and public HTTPS

In the DNS provider managing the domain, create an A record named `n8n` pointing to the server's public IPv4 address. Preserve website, API and email records. Resolve conflicting records, including any AAAA record if IPv6 is not configured. A stable server IP prevents the record from becoming stale.

This template assumes Caddy is the single public reverse proxy. Use DNS-only mode if the provider offers proxying. Review proxy headers and `N8N_PROXY_HOPS` if another proxy is introduced.

When DNS, ports 80/443 and owner setup are ready, run on the server:

```sh
sudo docker compose -f compose.yaml -f compose.bootstrap.yaml stop n8n
sudo docker compose -f compose.yaml --profile public config --quiet
sudo docker compose -f compose.yaml --profile public up -d --force-recreate
```

Caddy obtains and renews the HTTPS certificate. The base configuration restores HTTPS URLs and secure cookies. `N8N_WEBHOOK_URL` sets the external webhook base address; `N8N_PROXY_HOPS=1` reflects Caddy. See [n8n reverse proxy configuration](https://docs.n8n.io/hosting/configuration/configuration-examples/webhook-url/).

Verify a valid certificate, HTTP-to-HTTPS redirect, healthy containers and owner login at the configured domain. Do not publish workflows until their own authentication and synthetic acceptance tests pass. Avoid printing full resolved Compose configuration because it includes the encryption key.

## References

- [Oracle first Linux instance](https://docs.oracle.com/en-us/iaas/Content/Compute/tutorials/first-linux-instance/overview.htm)
- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [n8n encryption key](https://docs.n8n.io/hosting/configuration/configuration-examples/encryption-key/)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
