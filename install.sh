#!/bin/bash
set -euo pipefail

REPO="TheFahmi/omo-suites-installer"
INSTALL_DIR="$HOME/.omocs"

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║      OMO Suites Installer     ║"
echo "  ╚═══════════════════════════════╝"
echo ""

# Check bun
if ! command -v bun &>/dev/null; then
  echo "→ Bun not found. Installing..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo ""
fi

# Clone or update
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "→ Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull --ff-only 2>/dev/null || {
    echo "→ Pull failed, re-cloning..."
    cd ..
    rm -rf "$INSTALL_DIR"
    git clone "https://github.com/$REPO.git" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  }
else
  if [ -d "$INSTALL_DIR" ]; then
    echo "→ Cleaning up old installation..."
    rm -rf "$INSTALL_DIR"
  fi
  echo "→ Cloning OMO Suites..."
  git clone "https://github.com/$REPO.git" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install deps
echo "→ Installing dependencies..."
bun install --frozen-lockfile 2>/dev/null || bun install

# Create global bin symlink
OMOCS_BIN="$INSTALL_DIR/bin/omocs.ts"
LOCAL_BIN="$HOME/.local/bin"
mkdir -p "$LOCAL_BIN"

cat > "$LOCAL_BIN/omocs" << SCRIPT
#!/bin/bash
exec bun run "$OMOCS_BIN" "\$@"
SCRIPT
chmod +x "$LOCAL_BIN/omocs"

# Ensure PATH
ADDED_PATH=false
for RC_FILE in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.config/fish/config.fish"; do
  if [ -f "$RC_FILE" ]; then
    if ! grep -q '.local/bin' "$RC_FILE" 2>/dev/null; then
      if [[ "$RC_FILE" == *"fish"* ]]; then
        echo 'set -gx PATH $HOME/.local/bin $PATH' >> "$RC_FILE"
      else
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$RC_FILE"
      fi
      ADDED_PATH=true
    fi
  fi
done

echo ""
echo "✅ OMO Suites installed!"
echo ""
echo "   Run:  omocs init"
echo "   Help: omocs --help"
if [ "$ADDED_PATH" = true ]; then
  echo ""
  echo "   ⚠ Restart your shell or run: source ~/.bashrc"
fi
echo ""
