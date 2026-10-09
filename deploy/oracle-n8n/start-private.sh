#!/usr/bin/env bash
set -euo pipefail
cd /opt/medbridge-n8n

# Bootstrap is for a fresh private installation, never the public deployment.
TASK_CADDY=$(sudo docker ps \
    --filter label=com.docker.compose.project=medbridge-n8n \
    --filter label=com.docker.compose.service=caddy --format '{{.ID}}')
if [[ -n "$TASK_CADDY" ]]; then
    printf 'Caddy is running. Refusing to apply insecure bootstrap settings to a public deployment.\n' >&2
    exit 1
fi
if [[ ! -f .env ]] && sudo docker volume inspect medbridge-n8n_n8n_data >/dev/null 2>&1; then
    printf 'Existing n8n data found without .env. Restore its original encryption key before continuing.\n' >&2
    exit 1
fi

# Keep the credentials on the server; never print the encryption key.
python3 - <<'PY'
import os
import secrets
from pathlib import Path

target = Path('.env')
if not target.exists():
    content = Path('.env.example').read_text()
    content = content.replace('N8N_ENCRYPTION_KEY=\n', 'N8N_ENCRYPTION_KEY=' + secrets.token_hex(32) + '\n')
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        output.write(content)
else:
    os.chmod(target, 0o600)
PY

sudo docker compose -f compose.yaml -f compose.bootstrap.yaml config --quiet
sudo docker compose -f compose.yaml -f compose.bootstrap.yaml up -d n8n
sudo docker compose -f compose.yaml -f compose.bootstrap.yaml ps
