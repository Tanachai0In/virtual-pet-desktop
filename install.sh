#!/usr/bin/env bash
# Virtual Pet Desktop installer (macOS / Linux / Git Bash on Windows)
#   curl -fsSL https://raw.githubusercontent.com/Tanachai0In/virtual-pet-desktop/main/install.sh | bash
set -euo pipefail

REPO_URL="https://github.com/Tanachai0In/virtual-pet-desktop.git"
INSTALL_DIR="${VIRTUAL_PET_HOME:-$HOME/.virtual-pet-desktop}"

say() { printf '\033[1;35m[virtual-pet]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[virtual-pet]\033[0m %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || die "git not found — install it from https://git-scm.com"
command -v node >/dev/null 2>&1 || die "Node.js not found — install Node 20+ from https://nodejs.org"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js >= 20 required (found $(node --version))"

if [ -d "$INSTALL_DIR/.git" ]; then
  say "updating existing install in $INSTALL_DIR"
  git -C "$INSTALL_DIR" pull --ff-only
else
  say "cloning into $INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
say "installing dependencies (this downloads Electron, may take a minute)..."
npm install --no-audit --no-fund

say "done! start your pet with:"
say "  cd $INSTALL_DIR && npm start"
say "tip: enable 'Launch at startup' from the tray icon menu once it's running."

if [ -t 0 ]; then
  read -r -p "start it now? [Y/n] " ans
  case "${ans:-Y}" in [Yy]*) npm start ;; esac
fi
