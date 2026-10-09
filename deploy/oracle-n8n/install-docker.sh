#!/usr/bin/env bash
set -euo pipefail

# Install from Docker's official Ubuntu repository on a fresh server.
. /etc/os-release
test "$ID" = ubuntu
test "$VERSION_ID" = 24.04
if command -v docker >/dev/null 2>&1; then
    sudo docker version
    sudo docker compose version
    exit 0
fi
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -q
sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
TASK_ARCH=$(dpkg --print-architecture)
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $TASK_ARCH
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt-get update -q
sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker version --format '{{.Server.Version}}'
sudo docker compose version
