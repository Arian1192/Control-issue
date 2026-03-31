#!/usr/bin/env bash
# enroll-mac.sh — Instala RustDesk + agente Control Issue en macOS
# Uso: sudo bash enroll-mac.sh <DEVICE_ID> <ENROLLMENT_TOKEN> <SUPABASE_URL> <SUPABASE_ANON_KEY>
set -euo pipefail

DEVICE_ID="${1:?Falta DEVICE_ID}"
ENROLLMENT_TOKEN="${2:?Falta ENROLLMENT_TOKEN}"
SUPABASE_URL="${3:?Falta SUPABASE_URL}"
SUPABASE_ANON_KEY="${4:?Falta SUPABASE_ANON_KEY}"

AGENT_VERSION="${CONTROL_ISSUE_AGENT_VERSION:-agent-bootstrap-2026-04-01}"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/control-issue-agent"
LAUNCHDAEMON_PLIST="/Library/LaunchDaemons/com.control-issue.agent.plist"
RUSTDESK_RELEASE_API="https://api.github.com/repos/rustdesk/rustdesk/releases/latest"

function resolve_rustdesk_url() {
  local arch="$1"
  local asset_suffix=""

  if [[ "$arch" == "arm64" ]]; then
    asset_suffix="-aarch64.dmg"
  else
    asset_suffix="-x86_64.dmg"
  fi

  curl -fsSL "$RUSTDESK_RELEASE_API" \
    | /usr/bin/python3 -c '
import json
import sys

suffix = sys.argv[1]
payload = json.load(sys.stdin)
assets = payload.get("assets", [])

for asset in assets:
    name = asset.get("name", "")
    if name.endswith(suffix):
        print(asset.get("browser_download_url", ""))
        sys.exit(0)

sys.exit(1)
' "$asset_suffix"
}

# Detectar arquitectura
ARCH="$(uname -m)"
RUSTDESK_URL="$(resolve_rustdesk_url "$ARCH")" || {
  echo "No se pudo resolver la URL de descarga de RustDesk para arquitectura: $ARCH"
  echo "Descargá RustDesk manualmente desde https://github.com/rustdesk/rustdesk/releases/latest y reintentá."
  exit 1
}

if [[ "$ARCH" == "arm64" ]]; then
  AGENT_BINARY_NAME="control-issue-agent-darwin-arm64"
else
  AGENT_BINARY_NAME="control-issue-agent-darwin-amd64"
fi

AGENT_BINARY_URL="https://github.com/Arian1192/Control-issue/releases/download/${AGENT_VERSION}/${AGENT_BINARY_NAME}"

echo "==> Instalando RustDesk..."
TMP_DMG="$(mktemp -t rustdesk)"
curl -fsSL -o "$TMP_DMG" "$RUSTDESK_URL"
hdiutil attach "$TMP_DMG" -nobrowse -quiet
cp -rf "/Volumes/RustDesk/RustDesk.app" /Applications/
hdiutil detach "/Volumes/RustDesk" -quiet || true
rm -f "$TMP_DMG"

echo "==> Iniciando RustDesk para generar ID..."
open -a RustDesk --background || true
sleep 5  # Dar tiempo a que genere el ID

echo "==> Instalando agente Control Issue..."
mkdir -p "$CONFIG_DIR"
if ! curl -fsSL -o "${INSTALL_DIR}/control-issue-agent" "$AGENT_BINARY_URL"; then
  echo "No se pudo descargar el agente desde: $AGENT_BINARY_URL"
  echo "Verificá que exista el release/tag '${AGENT_VERSION}' con el asset '${AGENT_BINARY_NAME}'."
  exit 1
fi
chmod +x "${INSTALL_DIR}/control-issue-agent"

# Crear configuración del agente
cat > "${CONFIG_DIR}/config.toml" << TOML
device_id = "${DEVICE_ID}"
enrollment_token = "${ENROLLMENT_TOKEN}"
supabase_url = "${SUPABASE_URL}"
supabase_anon_key = "${SUPABASE_ANON_KEY}"
TOML

chmod 600 "${CONFIG_DIR}/config.toml"

# Instalar LaunchDaemon para arranque automático
cat > "$LAUNCHDAEMON_PLIST" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.control-issue.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/control-issue-agent</string>
    <string>--config</string>
    <string>${CONFIG_DIR}/config.toml</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/var/log/control-issue-agent.log</string>
  <key>StandardErrorPath</key>
  <string>/var/log/control-issue-agent-error.log</string>
</dict>
</plist>
PLIST

launchctl unload "$LAUNCHDAEMON_PLIST" 2>/dev/null || true
launchctl load "$LAUNCHDAEMON_PLIST"

echo "==> Enrollment completado. El agente registrará el ID de RustDesk al arrancar."
