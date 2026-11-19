#!/bin/sh
# arqT — instalador manual (macOS / Linux / Git Bash)
# Apenas copia a pasta do skill e confere a integridade. Não baixa nada e não altera configurações.
#
# Uso:
#   sh install/install.sh                 # global: ~/.claude/skills/arqt  → comando /arqt em qualquer projeto
#   sh install/install.sh /caminho/app    # só nesse projeto: /caminho/app/.claude/skills/arqt
set -eu

ORIGEM="$(cd "$(dirname "$0")/.." && pwd)/skills/arqt"
[ -f "$ORIGEM/SKILL.md" ] || { echo "Pasta do skill não encontrada em $ORIGEM" >&2; exit 1; }

command -v node >/dev/null 2>&1 || { echo "Node.js não encontrado. Instale o Node 20 ou superior (https://nodejs.org)." >&2; exit 1; }
VERSAO="$(node -p 'process.versions.node.split(".")[0]')"
[ "$VERSAO" -ge 20 ] || { echo "Node $VERSAO é antigo; instale o Node 20 ou superior." >&2; exit 1; }

if [ "${1:-}" ]; then
  [ -d "$1" ] || { echo "Pasta do projeto não encontrada: '$1'. Confira o caminho ou rode na pasta do projeto com: sh install/install.sh ." >&2; exit 1; }
  DESTINO="$(cd "$1" && pwd)/.claude/skills/arqt"
else
  DESTINO="$HOME/.claude/skills/arqt"
fi

TMP="${TMPDIR:-/tmp}"
node "$ORIGEM/scripts/build.mjs" --check --root "$TMP" >/dev/null || { echo "A cópia local não passou na verificação de integridade. Nada foi instalado." >&2; exit 1; }

if [ -e "$DESTINO" ]; then
  [ -f "$DESTINO/SKILL.md" ] || { echo "$DESTINO existe e não parece ser o arqT; remova-o manualmente." >&2; exit 1; }
  rm -rf "$DESTINO"
fi
mkdir -p "$(dirname "$DESTINO")"
cp -R "$ORIGEM" "$DESTINO"

node "$DESTINO/scripts/build.mjs" --check --root "$TMP" >/dev/null || { echo "Falha na verificação após copiar para $DESTINO." >&2; exit 1; }

echo "OK  arqT instalado em $DESTINO"
echo "    Abra o Claude Code na pasta de um projeto e digite: /arqt"
