#!/usr/bin/env bash
# Bootstrap dynasty_property_os dev environment inside WSL Ubuntu
set -euo pipefail

REPO_WIN_PATH="/mnt/c/dynasty_property_os"
REPO_WSL_PATH="$HOME/dynasty_property_os"

echo "=== Dynasty Property OS — WSL Setup ==="

# 1. Update apt
sudo apt-get update -qq && sudo apt-get upgrade -y -qq

# 2. Core tools
sudo apt-get install -y -qq \
  git curl wget unzip build-essential \
  python3 python3-pip python3-venv python3-dev \
  nodejs npm \
  postgresql-client redis-tools \
  jq htop tree

# 3. Docker CLI (uses Docker Desktop's daemon via WSL integration)
if ! command -v docker &>/dev/null; then
  sudo apt-get install -y -qq docker.io
  sudo usermod -aG docker "$USER"
  echo "Docker CLI installed. You may need to re-login for group changes."
fi

# 4. Symlink project from Windows filesystem (keeps one source of truth)
if [ ! -L "$REPO_WSL_PATH" ] && [ ! -d "$REPO_WSL_PATH" ]; then
  ln -s "$REPO_WIN_PATH" "$REPO_WSL_PATH"
  echo "Symlinked $REPO_WIN_PATH -> $REPO_WSL_PATH"
fi

# 5. Python venv — stored in Linux home for native FS performance
VENV_PATH="$HOME/.venvs/dynasty"
if [ ! -d "$VENV_PATH" ]; then
  mkdir -p "$HOME/.venvs"
  python3 -m venv "$VENV_PATH"
  echo "Created Python venv at $VENV_PATH"
fi
source "$VENV_PATH/bin/activate"

cd "$REPO_WSL_PATH"
if [ -f "backend/requirements.txt" ]; then
  pip install -q -r backend/requirements.txt
  echo "Installed Python dependencies"
fi

# 6. Node deps — run from Linux for speed; node_modules stays on Linux FS
if [ -f "frontend/package.json" ]; then
  cd frontend && npm install --silent && cd ..
  echo "Installed Node dependencies"
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  cd ~/dynasty_property_os"
echo "  source .venv/bin/activate"
echo "  docker compose up -d          # start all services"
echo "  docker compose logs -f api    # tail API logs"
