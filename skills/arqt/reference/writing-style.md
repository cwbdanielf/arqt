# Tom e escrita

A mesma planta atende três públicos; o viewer filtra o que cada um vê. Escreva cada campo pensando em quem o lê primeiro.

| Campo | Público principal | Como escrever |
|---|---|---|
| `system.purpose`, `businessCapabilities`, `actors.description` | Diretoria | Linguagem de negócio, sem siglas técnicas. "Permite que clínicas agendem consultas." |
| `responsibility` | Todos | O quê + para quê, ≤ 160 caracteres, verbo no presente. "Calcula frete e prazo de entrega por CEP." |
| `relations.label` | Todos | Verbo + objeto, 2–4 palavras. "Publica pedido pago", "Lê catálogo". Evite "usa", "chama" sozinhos |
| `ops.*`, `failureModes` | Sustentação | Concreto e acionável: comando exato, nome da variável, endpoint. "Verificar REDIS_URL e o contêiner redis" |
| `risks.recommendation` | Diretoria + Desenvolvimento | Ação objetiva e verificável. "Adicionar retentativa com backoff no envio de SMS" |
| `decisions` | Desenvolvimento | Contexto → decisão → consequência, cada um em 1–2 frases |

Regras gerais:
- Nomes curtos (≤ 24 caracteres quando possível) — aparecem em cards de diagrama.
- Sem adjetivos vagos ("robusto", "moderno", "escalável") sem evidência.
- Não invente: se não sabe, marque `inferred`/`unconfirmed` e/ou registre em `openQuestions`.
- Use o vocabulário do domínio encontrado no código e no README, e defina-o no glossário.
- Em `pt-BR`, acentuação correta; termos técnicos consagrados podem ficar em inglês (API, cache, worker, webhook).
