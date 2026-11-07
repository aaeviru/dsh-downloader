#!/usr/bin/env bash
# Produce the installable tarball from the committed bundle directory.
#
# Install that tarball (`dsh plugin add <tgz>`). Installing the bundle directory
# directly records a `link:` dependency, which never resolves the plugin's
# runtime dependencies and leaves the Host unable to import it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/dist}"
mkdir -p "$OUT"
rm -f "$OUT"/*.tgz
(cd "$ROOT/bundle" && pnpm pack --pack-destination "$OUT" >/dev/null)
ls -1 "$OUT"/*.tgz
