# arqT — Backlog

Estado atual, como desenvolver e o que vem a seguir. Atualizar este arquivo a cada item concluído.

## Estado atual — 1.0.0

- `/arqt` analisa o repositório, escreve um modelo JSON validado (com evidências `arquivo:linha`) e gera a planta
  interativa offline (`planta.html`) e os documentos em HTML A4 e Markdown.
- Princípios que não mudam: **zero rede**, **zero dependências npm** (runtime e dev), escrita restrita ao diretório de
  saída, varredura de segredos com falha fechada, saída determinística, integridade por `CHECKSUMS.txt`.
- Layout próprio (camadas, fronteiras, roteamento ortogonal), fontes do sistema, templates JS com escape por padrão.
- Node ≥ 20 para usar o skill; ≥ 22 para rodar os testes (padrão `*` no `--test`). CI em 22/24/26.

## Como desenvolver

- `npm test` (ou `node --test "tests/**/*.test.mjs"`) — suíte completa.
- `node tools/checksums.mjs` — **rodar após qualquer mudança em `skills/arqt/`** (o build recusa arquivos alterados).
- `sh tools/rebuild-preview.sh [projeto]` — checksums + build + cópia para `.preview/` (projeto padrão: `tests/projects/loja`).
- Prévia no navegador: configuração `preview` em `.claude/launch.json` (porta 4321).
- Modelos de projetos privados usados em teste **não** são versionados; só as correções que eles motivarem.

## Regras do repositório

- Público e anônimo: autor `cwbdanielf`, e-mail noreply do GitHub. Nada de nome real, cargo, empresa, caminhos locais
  ou nomes de projetos privados em código, docs, mensagens de commit ou modelos de exemplo.
- Não citar outras ferramentas como origem ou inspiração.

## Backlog priorizado

Ordem de execução: **1 → 2 → 3 → 4**. Cada frente termina com testes passando, checksums atualizados, CHANGELOG e um commit.

### 1. Publicação (v1.0.0)

Publicado em https://github.com/cwbdanielf/arqt. Pendentes: 1.2 (assinatura), 1.5 (teste em máquina limpa) e compartilhar com os colegas.

| # | Item | Pronto quando |
|---|---|---|
| 1.1 | ~~E-mail noreply com id no autor dos commits~~ (feito) | autor do commit = noreply com id |
| 1.2 | Gerar chave SSH de assinatura, autorizar o escopo `admin:ssh_signing_key` no `gh` (aprovação no navegador), configurar de assinatura no git (`gpg.format ssh`, `user.signingkey`) e registrá-la como *signing key*; assinar as próximas tags | `git tag -v` verifica |
| 1.3 | ~~Repositório público e primeiro push~~ (feito) | repositório visível |
| 1.4 | ~~Tag `v1.0.0` (sem assinatura) e release com o CHANGELOG~~ (feito) | release publicada; CI verde |
| 1.5 | ~~README com a URL real~~ (feito); testar `/plugin marketplace add cwbdanielf/arqt` numa máquina limpa | instalação em 2 passos funciona |
| 1.7 | Atualizar as actions do CI (checkout, setup-node) para versões que não usam Node 20, fixando o novo SHA | CI sem aviso de obsolescência |
| 1.6 | ~~Modelo de issue para feedback~~ (feito: `.github/ISSUE_TEMPLATE/feedback.md`); compartilhar com colegas após o push | colegas com acesso |

### 2. Qualidade da planta (v1.1)

Rodar o `/arqt` em 5 repositórios open source de stacks diferentes e corrigir o que aparecer em análise, layout e textos.

| # | Item | Pronto quando |
|---|---|---|
| 2.1 | Escolher os 5 repositórios (ex.: Python/Django, Go, Java/Spring, .NET, monorepo TypeScript), fixando o commit de cada um | lista com URL + SHA neste arquivo |
| 2.2 | Rodar a análise em cada um seguindo o `SKILL.md`; registrar problemas por categoria (análise, layout, texto, desempenho) | lista de problemas por repo |
| 2.3 | Corrigir os problemas, com teste de regressão para cada defeito de layout/validação | testes novos passando |
| 2.4 | Ampliar o playbook por stack no `SKILL.md`/`reference/` com o que faltou | stacks cobertas no guia |
| 2.5 | Versionar 1–2 modelos de exemplo (licença permissiva) em `tests/models/` e gerar uma planta de demonstração | demo citada no README |
| 2.6 | Incorporar o feedback dos colegas (issues da 1.6) | issues triadas e fechadas ou adiadas |

### 3. Teste A/B formal — rúbrica cega (v1.2)

| # | Item | Pronto quando |
|---|---|---|
| 3.1 | Definir a rúbrica (precisão, clareza, utilidade, tempo de leitura; escala 1–5) e o roteiro do avaliador | `docs/ab/rubrica.md` |
| 3.2 | Escolher 3 repositórios (pequeno, médio, monorepo) entre os da frente 2 | lista fechada |
| 3.3 | Produzir, para cada repo, a doc **A** (Claude sem o skill, mesmo pedido) e a **B** (arqT), anonimizadas como "Doc 1/Doc 2" em ordem aleatória | 6 pacotes prontos |
| 3.4 | Colegas avaliam sem saber qual é qual (mínimo 3 avaliadores por repo) | planilha de notas |
| 3.5 | Consolidar resultados e transformar os pontos fracos do arqT em itens deste backlog | `docs/ab/resultado.md` |

### 4. Formatos formais — DOCX e PPTX (v1.3)

Gerados por OOXML próprio (XML + zip via `node:zlib`), sem dependências e sem instalação.

| # | Item | Pronto quando |
|---|---|---|
| 4.1 | `scripts/lib/ooxml.mjs`: escritor de zip (store/deflate) e partes OOXML mínimas | teste de zip válido |
| 4.2 | `/arqt docx`: resumo executivo, arquitetura e sustentação, com tabelas e títulos navegáveis | abre sem aviso no Word e no LibreOffice |
| 4.3 | `/arqt pptx`: resumo executivo, 1 slide por vista (contexto, contêineres, componentes) e mapa de riscos; diagramas como formas nativas a partir das coordenadas do motor de layout | abre sem aviso no PowerPoint e no LibreOffice |
| 4.4 | Testes de determinismo (bytes idênticos com `--now` fixo) e de segurança (escape de texto do modelo em XML) | testes passando |
| 4.5 | Documentar no README e no `SKILL.md` | comandos documentados |

## Fora de escopo

Dashboards, monitoramento em tempo real, edição visual do diagrama, PDF sem o navegador do usuário e qualquer
funcionalidade que exija rede.
