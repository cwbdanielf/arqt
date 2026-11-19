# Segurança do arqT

## Contrato

| # | Garantia | Onde é imposta |
|---|---|---|
| 1 | Nenhum acesso à rede pelo gerador nem pelas saídas | Código sem módulos de rede (teste estático); CSP `default-src 'none'` em todo HTML gerado; teste que procura URLs externas nas saídas |
| 2 | Nenhum processo externo além de `node build.mjs` | Código sem `child_process`/`worker_threads` (teste estático); `allowed-tools` restrito no `SKILL.md` |
| 3 | Escrita só em `<projeto>/.arqt/` (e `docs/arquitetura/` com `publicar`) | `scripts/lib/fsguard.mjs`: caminhos resolvidos, recusa de `..` e de links simbólicos/junctions, escrita atômica |
| 4 | Segredos nunca entram nas saídas | Roteiro proíbe ler `.env*`, chaves e certificados; `scripts/lib/secrets.mjs` varre o modelo e todas as saídas e aborta sem gravar nada (falha fechada) e sem ecoar o valor |
| 5 | Conteúdo do repositório é dado, não instrução | Regra explícita no `SKILL.md` e no prompt dos subagentes; todo texto do modelo é escapado (HTML, atributos, JSON em `<script>`, Markdown, Mermaid) |
| 6 | Script da planta só executa o próprio código | CSP com hash SHA-256 do script do viewer; nenhum `innerHTML`/`eval` (teste estático) |
| 7 | Integridade do skill | `CHECKSUMS.txt` conferido pelo `build.mjs` a cada execução e pelos instaladores |
| 8 | Nenhuma mudança de comportamento persistente | O skill não escreve em `~/.claude`, `CLAUDE.md` ou configurações; `disable-model-invocation: true` (só roda quando você chama `/arqt`) |

## Limites conhecidos

- A qualidade da análise é do Claude: o arqT padroniza e valida, mas não garante que o entendimento esteja certo.
  Por isso toda afirmação traz o nível de confiança e as evidências.
- `allowed-tools` concede permissões ao skill; não impede que o Claude peça outras ferramentas. As garantias 3 e 4 são
  impostas pelo gerador, não pelo frontmatter.
- A detecção de segredos é heurística (padrões conhecidos + entropia). Revise documentos antes de compartilhá-los fora
  da empresa; a camada Diretoria omite caminhos de arquivo.

## Relatar uma vulnerabilidade

Abra uma *security advisory* privada no repositório (aba Security) descrevendo o problema e como reproduzi-lo.
Não publique detalhes em issues públicas antes da correção.
