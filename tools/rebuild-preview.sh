#!/bin/sh
# Dev: regenera checksums, reconstrói o projeto de exemplo e copia para .preview/
set -e
cd "$(dirname "$0")/.."
node tools/checksums.mjs >/dev/null
for p in ${@:-loja}; do
  (cd tests/projects/$p && node ../../../skills/arqt/scripts/build.mjs --now 2026-11-19T12:00:00Z --no-history | head -3)
  rm -rf .preview/$p && cp -r tests/projects/$p/.arqt .preview/$p
done
