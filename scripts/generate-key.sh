#!/usr/bin/env bash
# Gera keys/extension.pem e keys/extension-identity.json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/keys"
PEM="$ROOT/keys/extension.pem"
if [[ -f "$PEM" ]]; then
  echo "Já existe $PEM — mantendo."
else
  openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out "$PEM"
  chmod 600 "$PEM"
  echo "Gerado $PEM"
fi
node "$ROOT/scripts/derive-identity.js"
