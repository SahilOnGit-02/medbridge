#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
    printf 'Usage: %s /path/to/private-key ubuntu@SERVER_PUBLIC_IP [local-port]\n' "$0" >&2
    exit 1
fi

TASK_KEY=$1
TASK_HOST=$2
TASK_PORT=${3:-5678}
if [[ ! -f "$TASK_KEY" ]]; then
    printf 'SSH key file was not found.\n' >&2
    exit 1
fi
if [[ ! "$TASK_PORT" =~ ^[0-9]+$ ]] || (( TASK_PORT < 1024 || TASK_PORT > 65535 )); then
    printf 'Choose a local port between 1024 and 65535.\n' >&2
    exit 1
fi

printf 'Keep this terminal open. Forwarding localhost:%s to n8n on the server.\n' "$TASK_PORT"
# Confirm the server fingerprint independently before accepting a new host key.
# A tunnel does not change n8n production HTTPS or cookie settings.
ssh -N -i "$TASK_KEY" \
    -o IdentitiesOnly=yes -o StrictHostKeyChecking=ask \
    -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
    -L "127.0.0.1:${TASK_PORT}:127.0.0.1:5678" "$TASK_HOST"
