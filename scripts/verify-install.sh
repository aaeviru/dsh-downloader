#!/usr/bin/env bash
# Prove the packed bundle installs cleanly into an isolated profile.
#
# Two properties matter and neither is visible to unit tests:
#   1. the install must not be a `link:` dependency, which never resolves deps;
#   2. it must not pull Host core packages into the profile, which would
#      materialize a second copy of Host singletons (persona, tools, ...).
# The Host supplies `@deepseek-ai/cordis`; every other import is inlined in lib.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKOUT="${DSH_CHECKOUT:-$HOME/projects/deepseek-harness}"
PACKAGE="@deepseek-ai/dsh-experimental-downloader"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

export DSH_HOME="$WORK/home"
export XDG_CACHE_HOME="$WORK/cache"
mkdir -p "$DSH_HOME"

echo "verify-install: checking the manifest keeps Host packages out of dependencies"
node -e "
const manifest = require('$ROOT/bundle/package.json')
const host = Object.keys(manifest.dependencies ?? {}).filter(name => name.startsWith('@deepseek-ai/dsh-') || name === '@deepseek-ai/cordis')
if (host.length > 0) {
  console.error('verify-install: Host packages must be peer/inlined, found dependencies: ' + host.join(', '))
  process.exit(1)
}
"

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

POLLUTION="$(node -e "
const manifest = require('$PROFILE/package.json')
const host = Object.keys(manifest.dependencies ?? {})
  .filter(name => name.startsWith('@deepseek-ai/') && name !== '$PACKAGE')
console.log(host.join(' '))
")"
if [[ -n "$POLLUTION" ]]; then
  echo "verify-install: the install pulled Host packages into the profile: $POLLUTION" >&2
  exit 1
fi

echo "verify-install: providing the Host peer @deepseek-ai/cordis"
(cd "$CHECKOUT" && pnpm dsh plugin --profile verify add @deepseek-ai/cordis@~4.1.0 >/dev/null)

echo "verify-install: importing $PACKAGE from the profile"
(cd "$PROFILE" && node -e "
import('$PACKAGE').then(
  () => console.log('IMPORT_OK'),
  error => { console.error('IMPORT_FAIL:', error.message); process.exit(1) },
)")
