# Teste A/B cego — rúbrica e roteiro do avaliador

Objetivo: saber se a documentação gerada pelo arqT ajuda mais do que a que o Claude escreve **sem o skill**, com o mesmo
pedido, e descobrir os pontos fracos do arqT. O avaliador não sabe qual documento veio de onde.

## Repositórios (3.2)

| Porte | Repositório | Commit | Stack |
|---|---|---|---|
| Pequeno | [spring-projects/spring-petclinic](https://github.com/spring-projects/spring-petclinic) | `500158f7` | Java/Spring, monólito |
| Médio | [dotnet/eShop](https://github.com/dotnet/eShop) | `134625b2` | .NET/Aspire, microsserviços |
| Monorepo | [t3-oss/create-t3-turbo](https://github.com/t3-oss/create-t3-turbo) | `8f945b7b` | TypeScript, Turborepo |

Os três têm licença permissiva, stacks diferentes e foram analisados na frente 2.

## Como os documentos são produzidos (3.3)

- **Mesmo pedido** para os dois lados, na raiz do repositório, numa sessão nova:
  > Analise este repositório inteiro e escreva a documentação de arquitetura em um único arquivo Markdown, útil para
  > diretoria, sustentação e desenvolvimento.
- **Doc A:** Claude sem o skill instalado, com o pedido acima. Diagramas em Mermaid são permitidos.
- **Doc B:** `/arqt` e o arquivo `.arqt/docs/arquitetura.md` gerado.
- Compara-se **o documento de arquitetura em Markdown** dos dois lados, para o formato não denunciar a origem.
  A planta interativa fica fora do teste cego (é avaliada à parte, sem anonimato).
- `node tools/ab-pacotes.mjs <pasta-A> <pasta-B> <saída>` remove assinaturas de ferramenta, sorteia a ordem e grava
  `Doc 1.md`/`Doc 2.md` por repositório. A chave do sorteio (`chave.json`) fica só com quem organiza o teste.
- Limitação conhecida: o estilo do arqT (marcas ✓ ~ ?, "Itens a confirmar") pode ser reconhecido por quem já o conhece.
  Prefira avaliadores que não usaram o arqT; registre na ficha se o avaliador acha que sabe qual é qual.

## Roteiro do avaliador (≈ 35 min por repositório)

1. **Contexto (2 min):** abra o repositório no commit indicado e leia só o primeiro parágrafo do README.
2. **Tarefas com tempo (10 min por documento):** para cada documento, responda às três perguntas do repositório
   (abaixo) usando **só** o documento. Anote a resposta e quantos minutos levou. Comece pelo documento indicado na ficha
   (metade dos avaliadores começa pelo Doc 1, metade pelo Doc 2).
3. **Conferência (5 min):** escolha 3 afirmações de cada documento e confira no código. Anote quantas estavam certas.
4. **Notas (5 min):** dê as notas da rúbrica para cada documento e responda às perguntas finais.

### Perguntas-tarefa

| Repositório | Perguntas |
|---|---|
| spring-petclinic | 1. Quais são as partes principais e como se comunicam? 2. Como subir localmente e com qual banco? 3. Qual o maior risco técnico? |
| eShop | 1. O que acontece, passo a passo, depois que o cliente finaliza a compra? 2. Que variáveis/recursos a API de pedidos precisa para subir? 3. Qual o maior risco técnico? |
| create-t3-turbo | 1. Onde fica a API e quem a hospeda? 2. Como o app móvel faz login? 3. Qual o maior risco técnico? |

## Rúbrica (escala 1–5)

| Critério | 1 | 3 | 5 |
|---|---|---|---|
| **Precisão** — as afirmações batem com o código | erros que levariam a decisão errada | alguns erros menores | tudo que conferi estava certo e era verificável |
| **Clareza** — dá para entender sem conhecer o projeto | confuso, jargão sem explicação | entende-se com esforço | claro de primeira, bem organizado |
| **Utilidade** — ajuda a decidir, operar ou mudar o sistema | não respondi às tarefas | respondi parte | respondi tudo e aprendi algo que o README não diz |
| **Tempo para entender** — rapidez para responder às tarefas | mais de 10 min ou não consegui | 5–10 min | menos de 5 min |

**Perguntas finais (por repositório):**
- Qual documento você entregaria a um colega novo no projeto? (Doc 1 / Doc 2 / tanto faz)
- Qual você levaria a uma reunião de diretoria? E para quem cuida da operação?
- O que faltou ou sobrou em cada um? (texto livre)
- Você acha que sabe de onde veio cada documento? (não / sim: qual)

## Planilha

Uma linha por avaliador × repositório × documento em [`notas.csv`](notas.csv). Nome do avaliador vira um código (A1, A2…);
não registre nomes. Consolidação (3.5): médias por critério e por repositório, taxa de preferência, acertos na conferência,
tempo mediano e os comentários agrupados por tema → `docs/ab/resultado.md` e novos itens no backlog.
