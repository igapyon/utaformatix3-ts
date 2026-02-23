#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="/tmp/utaformatix3-ts-fixture-build"

cd "$ROOT_DIR"

echo "Compiling TypeScript for fixture regeneration..."
rm -rf "$BUILD_DIR"
tsc --outDir "$BUILD_DIR" --module commonjs --moduleResolution node

echo "Regenerating UFDATA fixtures..."
node "$BUILD_DIR/scripts/regenerate-fixtures-runner.js"

echo "Fixture regeneration completed."
