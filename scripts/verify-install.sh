#!/usr/bin/env bash
# Prove the packed bundle installs into an isolated profile and imports there.
#
# A bare `link:` install never resolves the plugin's dependencies, so the Host
# cannot import it and the whole profile composition fails. This check packs the
# bundle, installs that tarball into a throwaway DSH home, and imports the
# package from the profile directory — the same resolution the Host performs.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKOUT="${DSH_CHECKOUT:-$HOME/projects/deepseek-harness}"
PACKAGE="@deepseek-ai/dsh-experimental-downloader"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

export DSH_HOME="$WORK/home"
export XDG_CACHE_HOME="$WORK/cache"
mkdir -p "$DSH_HOME"

echo "verify-install: packing $ROOT/bundle"
(cd "$ROOT/bundle" && pnpm pack --pack-destination "$WORK" >/dev/null)
TGZ="$(ls "$WORK"/*.tgz)"

echo "verify-install: installing $(basename "$TGZ") into a throwaway profile"
(cd "$CHECKOUT" && pnpm dsh plugin --profile verify add "$TGZ" >/dev/null)

PROFILE="$DSH_HOME/profiles/verify"
if grep -q '"link:' "$PROFILE/package.json"; then
  echo "verify-install: profile recorded a link: dependency; install must use the packed tarball" >&2
  exit 1
fi

echo "verify-install: importing $PACKAGE from the profile"
(cd "$PROFILE" && node -e "
import('$PACKAGE').then(
  () => console.log('IMPORT_OK'),
  error => { console.error('IMPORT_FAIL:', error.message); process.exit(1) },
)")
