#!/usr/bin/env bash
# Empacota zip + CRX da extensão Bibliofilia com ID estável e update_url.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
BUILD="$ROOT/build/extension"
PEM="${CHROME_EXTENSION_PEM:-$ROOT/keys/extension.pem}"
IDENTITY="$ROOT/keys/extension-identity.json"
UPDATE_BASE="${CHROME_EXTENSION_UPDATE_BASE:-https://backend-goby.onrender.com/api}"
VERSION="$(node -p "JSON.parse(require('fs').readFileSync('$ROOT/manifest.json','utf8')).version")"
NAME="bibliofilia-chrome-extension"
ZIP_OUT="$DIST/${NAME}-v${VERSION}.zip"
CRX_OUT="$DIST/${NAME}-v${VERSION}.crx"

if [[ ! -f "$PEM" ]]; then
  echo "Chave PEM não encontrada: $PEM" >&2
  echo "Gere com: bash scripts/generate-key.sh" >&2
  echo "Ou defina CHROME_EXTENSION_PEM apontando para a chave privada de assinatura." >&2
  exit 1
fi

if [[ ! -f "$IDENTITY" ]]; then
  echo "Identity file missing. Run: node scripts/derive-identity.js" >&2
  exit 1
fi

PUBLIC_KEY="$(node -p "JSON.parse(require('fs').readFileSync('$IDENTITY','utf8')).publicKeyBase64")"
EXTENSION_ID="$(node -p "JSON.parse(require('fs').readFileSync('$IDENTITY','utf8')).extensionId")"
UPDATE_URL="${UPDATE_BASE%/}/chrome-extension/updates.xml"

rm -rf "$ROOT/build"
mkdir -p "$BUILD" "$DIST"

cp -a "$ROOT/manifest.json" "$BUILD/"
cp -a "$ROOT/README.md" "$BUILD/" 2>/dev/null || true
for dir in actions background content popup shared icons; do
  cp -a "$ROOT/$dir" "$BUILD/$dir"
done

# Injetar key + update_url no manifest empacotado (ID estável + auto-update)
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
manifest.key = process.argv[2];
manifest.update_url = process.argv[3];
fs.writeFileSync(process.argv[1], JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest version=', manifest.version);
console.log('update_url=', manifest.update_url);
console.log('extensionId=', process.argv[4]);
" "$BUILD/manifest.json" "$PUBLIC_KEY" "$UPDATE_URL" "$EXTENSION_ID"

rm -f "$ZIP_OUT"
(
  cd "$BUILD"
  zip -r "$ZIP_OUT" . -x '*.DS_Store' >/dev/null
)

CHROME_BIN="${CHROME_BIN:-}"
if [[ -z "$CHROME_BIN" ]]; then
  for c in google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1; then
      CHROME_BIN="$(command -v "$c")"
      break
    fi
  done
fi

rm -f "$BUILD.crx" "$CRX_OUT" "$DIST/${NAME}.crx"
if [[ -z "$CHROME_BIN" ]]; then
  echo "Chrome/Chromium não encontrado; zip gerado, CRX pulado." >&2
else
  set +e
  "$CHROME_BIN" --pack-extension="$BUILD" --pack-extension-key="$PEM" --no-message-box
  pack_rc=$?
  set -e
  if [[ -f "$BUILD.crx" ]]; then
    mv -f "$BUILD.crx" "$CRX_OUT"
  elif [[ $pack_rc -ne 0 ]]; then
    echo "WARN: Chrome pack falhou (exit $pack_rc)" >&2
  fi
fi

cp -f "$ZIP_OUT" "$DIST/${NAME}.zip"
if [[ -f "$CRX_OUT" ]]; then
  cp -f "$CRX_OUT" "$DIST/${NAME}.crx"
fi

node -e "
const fs = require('fs');
const meta = {
  name: process.argv[1],
  version: process.argv[2],
  extensionId: process.argv[3],
  updateUrl: process.argv[4],
  zip: 'dist/' + process.argv[1] + '.zip',
  crx: fs.existsSync(process.argv[5]) ? ('dist/' + process.argv[1] + '.crx') : null,
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(process.argv[6], JSON.stringify(meta, null, 2) + '\n');
console.log(JSON.stringify(meta, null, 2));
" "$NAME" "$VERSION" "$EXTENSION_ID" "$UPDATE_URL" "$CRX_OUT" "$DIST/build-meta.json"

echo "OK zip=$ZIP_OUT"
if [[ -f "$CRX_OUT" ]]; then
  echo "OK crx=$CRX_OUT ($(wc -c < "$CRX_OUT") bytes)"
else
  echo "WARN: CRX não gerado" >&2
  exit 2
fi
