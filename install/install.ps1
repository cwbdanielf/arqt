# arqT — instalador manual (Windows / PowerShell 5.1+ ou 7+)
# Apenas copia a pasta do skill e confere a integridade. Não baixa nada e não altera configurações.
#
# Uso:
#   .\install\install.ps1                      # global: ~/.claude/skills/arqt  → comando /arqt em qualquer projeto
#   .\install\install.ps1 -Projeto C:\meu\app  # só nesse projeto: C:\meu\app\.claude\skills\arqt
[CmdletBinding()]
param([string]$Projeto)

$ErrorActionPreference = 'Stop'
$Origem = Join-Path (Split-Path -Parent $PSScriptRoot) 'skills\arqt'
if (-not (Test-Path (Join-Path $Origem 'SKILL.md'))) { throw "Pasta do skill não encontrada em $Origem" }

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js não encontrado. Instale o Node 20 ou superior (https://nodejs.org) e rode de novo.' }
$versao = [int]((& node -p 'process.versions.node.split(".")[0]').Trim())
if ($versao -lt 20) { throw "Node $versao é antigo; instale o Node 20 ou superior." }

if ($Projeto) {
  $Base = (Resolve-Path $Projeto).Path
  $Destino = Join-Path $Base '.claude\skills\arqt'
} else {
  $Destino = Join-Path $HOME '.claude\skills\arqt'
}

# 1. confere a origem antes de copiar
& node (Join-Path $Origem 'scripts\build.mjs') --check --root $env:TEMP | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'A cópia local do arqT não passou na verificação de integridade (CHECKSUMS.txt). Não instalei nada.' }

# 2. copia (substitui uma instalação anterior do arqT)
if (Test-Path $Destino) {
  if (-not (Test-Path (Join-Path $Destino 'SKILL.md'))) { throw "$Destino existe e não parece ser o arqT; remova-o manualmente." }
  Remove-Item -Recurse -Force $Destino
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destino) | Out-Null
Copy-Item -Recurse -Path $Origem -Destination $Destino

# 3. confere o destino
& node (Join-Path $Destino 'scripts\build.mjs') --check --root $env:TEMP | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Falha na verificação após copiar para $Destino." }

Write-Host "OK  arqT instalado em $Destino"
Write-Host '    Abra o Claude Code na pasta de um projeto e digite: /arqt'
