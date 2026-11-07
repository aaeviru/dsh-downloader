#!/usr/bin/env bash
# Build the distributable bundle and copy its artifacts back into this repository.
#
# Transitional build path (issue #11): Typert generation only recognizes the
# protocol package when it is a workspace member, so the build runs inside a DSH
# checkout. This script syncs the source into $DSH_CHECKOUT, builds there, and
# copies lib/ into bundle/lib so the committed artifact matches the source.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKOUT="${DSH_CHECKOUT:-$HOME/projects/deepseek-harness}"
TARGET="$CHECKOUT/packages/experimental/dsh-downloader"
PACKAGE="@deepseek-ai/dsh-experimental-downloader"

if [[ ! -d "$CHECKOUT/packages/typert/protocol" ]]; then
  echo "build-bundle: DSH_CHECKOUT ($CHECKOUT) is not a DSH checkout" >&2
  exit 1
fi

echo "build-bundle: syncing source to $TARGET"
rsync -a --delete \
  --exclude .git --exclude node_modules --exclude lib --exclude bundle \
  --exclude coverage --exclude .env --exclude 'worktree-*' \
  "$ROOT/" "$TARGET/"

echo "build-bundle: compiling, generating Typert artifacts, and bundling in $CHECKOUT"
(cd "$CHECKOUT" && pnpm --filter "$PACKAGE" run bundle)

echo "build-bundle: copying artifacts into bundle/lib"
rm -rf "$ROOT/bundle/lib"
rsync -a --exclude "tsconfig.*.tsbuildinfo" "$TARGET/lib/" "$ROOT/bundle/lib/"

echo "build-bundle: bundle working-tree changes"
git -C "$ROOT" status --porcelain bundle/
