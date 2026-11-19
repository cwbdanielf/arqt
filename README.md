# arqT

**Planta arquitetural interativa e documentação padronizada do seu projeto, com um único comando: `/arqt`.**

O arqT é um skill para o Claude Code. Ele lê o projeto aberto, descreve a arquitetura num modelo estruturado e gera, em
`.arqt/`, uma **planta interativa em HTML que abre offline** e um **pacote de documentos** prontos para imprimir em PDF.

- **Planta interativa** (`.arqt/planta.html`): visão geral para decisão, diagramas de contexto, contêineres e componentes
  (com duplo clique para entrar), fluxos passo a passo, dados, implantação, riscos e saúde, decisões, glossário. Busca,
  painel de detalhes com evidências `arquivo:linha`, camadas por público (**Diretoria · Sustentação · Desenvolvimento**),
  tema claro/escuro, modo apresentação e exportação SVG/PNG.
- **Documentos** (`.arqt/docs/`, HTML A4 + Markdown com diagramas Mermaid): resumo executivo, documento de arquitetura
  (arc42 enxuto), manual de sustentação, inventário técnico e mudanças desde a execução anterior.
- **Transparência:** cada afirmação é marcada como *verificada* (com evidência no código), *inferida* ou *a confirmar*.
- **Documentação viva:** cada execução guarda um histórico e mostra o que mudou estruturalmente.

## Instalação (2 passos)

Pré-requisito: [Node.js](https://nodejs.org) 20 ou superior.

1. Baixe ou clone este repositório: `git clone https://github.com/cwbdanielf/arqt.git`.
2. Rode o instalador (apenas copia a pasta do skill e confere a integridade):

```powershell
.\install\install.ps1
```

```bash
sh install/install.sh
```

Isso instala para todos os projetos (`~/.claude/skills/arqt`). Para instalar só num projeto, passe o caminho dele:
`.\install\install.ps1 -Projeto C:\caminho\do\projeto` ou `sh install/install.sh /caminho/do/projeto`.

> Alternativa: como plugin. No Claude Code, `/plugin marketplace add cwbdanielf/arqt` e
> `/plugin install arqt@arqt`. Instalado como plugin, o comando pode aparecer como `/arqt:arqt`.

## Uso

Abra o Claude Code na pasta de qualquer projeto e digite:

```
/arqt
```

Sem perguntas: o Claude analisa o projeto (usando subagentes em projetos grandes), escreve `.arqt/model.json`, roda o
gerador e responde com os caminhos. Abra `.arqt/planta.html` no navegador.

| Comando | Efeito |
|---|---|
| `/arqt` | Análise completa; planta abre na camada Desenvolvimento |
| `/arqt diretoria` · `/arqt sustentacao` | Mesmo resultado, abrindo na camada escolhida |
| `/arqt publicar` | Copia planta, documentos e modelo para `docs/arquitetura/` (para versionar com o código) |

PDF: abra um documento e use **Imprimir → Salvar como PDF** (A4).

## Segurança

O arqT foi criado do zero com um contrato de segurança explícito (detalhes em [SECURITY.md](SECURITY.md)):

- **Zero rede:** o gerador não acessa a internet; a saída não carrega nada externo (CSP `default-src 'none'`).
- **Nenhum processo externo:** só `node build.mjs`; nada de `git`, navegadores, `npx` ou instaladores remotos.
- **Escrita só em `.arqt/`** (e em `docs/arquitetura/` ao publicar), com proteção contra `..` e links simbólicos.
- **Sem segredos:** o skill não lê `.env`, chaves ou certificados; registra só nomes de variáveis; o gerador recusa o
  modelo e as saídas se detectar algo parecido com segredo (falha fechada).
- **Conteúdo do repositório é dado, nunca instrução** (proteção contra prompt injection em READMEs e comentários).
- **Zero dependências npm**, código legível, integridade conferida por `CHECKSUMS.txt`.
- Nunca altera `CLAUDE.md`, configurações do Claude Code ou arquivos do seu projeto.

`.arqt/` recebe um `.gitignore` próprio: nada é versionado por acidente.

## Desenvolvimento

```bash
node --test tests/
```

```bash
node tools/checksums.mjs
```

- `skills/arqt/` — o skill (SKILL.md, schema, gerador, templates, ícones).
- `tests/` — testes `node:test` e o projeto de exemplo `tests/projects/loja`.
- `tools/` — utilitários de desenvolvimento (checksums, prévia local).
- `docs/BACKLOG.md` — estado atual, como desenvolver e backlog priorizado.

Depois de alterar qualquer arquivo em `skills/arqt/`, regenere o `CHECKSUMS.txt` (o gerador recusa arquivos alterados).

## Licença

[Apache-2.0](LICENSE).
