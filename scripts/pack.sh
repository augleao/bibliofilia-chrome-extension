#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
NAME="bibliofilia-chrome-extension"
VERSION="$(node -p "require('$ROOT/manifest.json').version" 2>/dev/null || echo '1.0.0')"
OUT="$DIST/${NAME}-v${VERSION}.zip"

mkdir -p "$DIST"
rm -f "$OUT"

cd "$ROOT"
zip -r "$OUT" \
  manifest.json \
  README.md \
  actions \
  background \
  content \
  popup \
  shared \
  icons \
  -x "*.DS_Store" -x "**/.git/**" -x "**/node_modules/**" -x "dist/**"

echo "Created $OUT"
ls -lh "$OUT"
