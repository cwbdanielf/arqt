# Guia do modelo arqT (`.arqt/model.json`)

O schema completo está em `../schema/model.schema.json`. Campos desconhecidos são rejeitados. Este guia diz **o que pôr em cada
campo** para a planta ficar legível e útil. O build valida tudo e devolve mensagens exatas se algo estiver errado.

## Estrutura mínima

```json
{
  "meta": { "schemaVersion": 1, "language": "pt-BR", "scope": ".", "analyzedFiles": 214 },
  "system": { "name": "…", "purpose": "…", "summary": "…", "businessCapabilities": [], "stack": [], "qualityGoals": [] },
  "actors": [], "boundaries": [], "components": [], "relations": [],
  "flows": [], "deployment": [], "data": [], "constraints": [], "decisions": [], "risks": [],
  "inventory": { "languages": [], "frameworks": [], "dependencies": [] },
  "glossary": [], "openQuestions": []
}
```
Não preencha `generatedAt`, `commit`, `branch` nem `arqtVersion`: o build faz isso.

## Granularidade (o que mais influencia a qualidade)

| Nível | O que é | Quantidade-alvo |
|---|---|---|
| **Contêiner** (`components` sem `parent`) | Unidade executável ou implantável: app web/SPA, API, worker, função serverless, CLI, banco, fila, cache, bucket, gateway. Num repositório só de biblioteca/CLI, os contêineres são os **pacotes/módulos principais** (kind `lib`/`service`) | 3–15 (ideal 5–10) |
| **Componente** (`parent` = id do contêiner) | Módulo interno relevante de um contêiner: domínio, camada, controlador agrupado, adaptador | 3–12 por contêiner, só para os **1–4 contêineres mais importantes** |
| **Ator** | Pessoas/papéis que usam o sistema e **sistemas externos** (SaaS, APIs de terceiros, sistemas legados) | o que o código evidenciar |
| **Fronteira** | Agrupamento visual útil: camadas (`layer`: Front-end, Back-end, Dados) **ou** domínios (`domain`) **ou** redes/ambientes | 0 ou 2–5 |

- Não transforme cada arquivo em componente. Agrupe por responsabilidade.
- Bancos, filas e caches **do próprio sistema** são contêineres (`db`, `queue`, `cache`, `storage`). Serviços gerenciados de terceiros
  usados como produto (Stripe, SendGrid, Auth0, OpenAI) são **atores** `external-system`.
- Se usar fronteiras, atribua `boundary` a **todos** os contêineres internos. Componentes filhos não usam `boundary`.
- Todo contêiner deve ter pelo menos uma relação; um nó solto quase sempre indica relação esquecida.

## ids

- `^[a-z0-9][a-z0-9-]{0,63}$`, únicos entre `actors`, `components` e `boundaries`.
- Derive do caminho ou do nome estável: `apps/api` → `api`; `services/billing-worker` → `billing-worker`; Postgres do compose → `postgres`.
- Em execução incremental, **mantenha os ids do modelo anterior** para o que ainda existe.

## Campos de cada entidade

### system
- `name`: nome do produto (do README/manifesto), não do repositório se forem diferentes.
- `purpose`: 1 frase em linguagem de negócio — quem usa e para quê. Sem jargão técnico.
- `summary`: 2–4 frases com o estilo arquitetural (monólito modular, microsserviços, serverless, SPA + API, CLI…) e o fluxo principal.
- `businessCapabilities`: 3–8 capacidades ("Faturamento", "Catálogo"…).
- `stack`: 4–10 itens principais com versão quando o manifesto informar ("Node.js 22", "PostgreSQL 16").
- `qualityGoals`: 0–4 objetos `{ "name", "description", "confidence" }`, só se houver indício (SLA, cache, filas, testes de
  carga, requisitos no README). Ex.: `{ "name": "Desempenho", "description": "Catálogo servido de cache Redis." }`.

### actors
`{ "id", "name", "kind": "person" | "external-system", "description", "tech", "sources", "confidence" }`
- Pessoas: papéis ("Cliente", "Operador", "Administrador"), deduzidos de rotas, telas, perfis de acesso.
- Externos: encontrados por SDKs (`stripe`, `@aws-sdk/*`, `twilio`), URLs base, nomes de variáveis (`SENDGRID_API_KEY` → SendGrid).
  `tech` = forma de integração ("API REST", "SOAP", "Webhook").

### components
`{ "id", "name", "kind", "parent"?, "boundary"?, "responsibility", "tech", "sources", "ops"?, "tags"?, "confidence" }`
- `kind`: `service` (API/backend), `ui` (web/mobile/desktop), `db`, `queue`, `job` (worker, cron, consumer), `lib` (pacote/módulo),
  `cache`, `storage` (bucket, arquivos), `gateway` (proxy, BFF, API gateway), `function` (serverless), `external` (evite; prefira ator).
- `tech`: curto, até ~26 caracteres visíveis no card ("Node.js 22 · Express", "Next.js 15", "PostgreSQL 16").
- `responsibility`: o quê + para quê, até ~160 caracteres. Ex.: "Expõe a API REST de pedidos e publica eventos de pagamento."
- `sources`: 1–3 evidências fortes (ponto de entrada, `listen()`, registro de rotas, serviço no compose, `Dockerfile`).
- `ops` (só contêineres executáveis):
  - `start`/`build`/`test`: comandos reais de `package.json` scripts, Makefile, README, Dockerfile, compose (`docker compose up api`).
  - `config`: **só nomes** de variáveis/propriedades lidas no código (`process.env.X`, `os.environ["X"]`, `@Value("${x}")`,
    `config.get("x")`). Cada item casa com `^[A-Za-z_][A-Za-z0-9_.]*$`: sem espaços, parênteses ou valores possíveis.
  - `ports`: do código ou do compose/Dockerfile (`EXPOSE`).
  - `logs`: como/onde loga ("stdout JSON via pino", "arquivo logs/app.log").
  - `health`: endpoint ou comando de health check, se existir.
  - `schedule`: para jobs/cron ("a cada 5 min", expressão cron).
  - `tests`: `detected` (há testes para ele), `absent` (procurou e não há) ou `unknown`.
  - `failureModes`: 0–4 objetos `{ "symptom", "probableCause", "action" }` — falhas plausíveis **com base no código**
    (dependência crítica, timeout, fila parada). Ex.: `{ "symptom": "Pedidos não saem", "probableCause": "Fila parada", "action": "Ver o contêiner rabbitmq" }`.

### relations
`{ "from", "to", "label", "protocol", "async", "sources", "confidence" }`
- Pode ligar componentes de contêineres diferentes; o build agrega automaticamente na vista de contêineres.
- Direção = quem inicia a chamada/envio. Webhook do Stripe para a API: `from: "stripe"`, `to: "api"`.
- `label`: verbo + objeto, 2–4 palavras ("Consulta saldo", "Publica pedido.criado").
- `protocol`: "HTTPS/REST", "gRPC", "SQL", "AMQP", "Kafka", "Redis", "S3", "WebSocket", "chamada local"…
- `async: true` para filas, eventos, webhooks, jobs agendados.
- Inclua pessoas → interfaces (ex.: Cliente → Web).

### flows (1–3)
`{ "id", "name", "description", "steps": [{ "from", "to", "label", "async"?, "reply"?, "note"? }], "sources", "confidence" }`
- `sources`: 1–3 arquivos que comprovam o fluxo (rota de entrada, serviço que orquestra); sem eles o fluxo fica `inferred`.
- Os fluxos mais importantes do negócio (checkout, login, importação…), 4–12 passos, `from`/`to` são ids existentes.

### deployment (se houver evidência)
`{ "id", "environment", "description", "nodes": [{ "id", "name", "kind", "hosts": ["id-de-componente"] }], "sources", "confidence" }`
- De docker-compose, k8s/helm, terraform, serverless, Procfile, workflows de deploy.

### data (0–15)
`{ "id", "name", "store", "fields": [], "description", "sources", "confidence" }` — entidades principais (migrations, ORM, schemas).

### constraints (0–8)
`{ "kind": "technical" | "organizational" | "regulatory", "text", "confidence" }` — versão de runtime, LGPD, plataforma obrigatória…

### decisions (2–6)
`{ "id": "adr-1", "title", "context", "decision", "consequences", "evidence", "confidence" }` — decisões **inferidas** do código
(escolha de banco, mensageria, monorepo, framework, autenticação). Raramente `verified`, a menos que exista ADR escrito no repo.

### risks (3–8)
`{ "id", "title", "component", "impact": 1-3, "likelihood": 1-3, "evidence", "recommendation", "confidence" }`
- Baseados em evidência: ponto único de falha, ausência de testes/health/retry, segredos em código, dependências sem versão,
  acoplamento circular, versão de runtime fora de suporte, ausência de backup, endpoint sem autenticação.
- `impact`: 1 baixo (incômodo), 2 médio (degrada função), 3 alto (indisponibilidade, perda de dados, incidente de segurança).
- `likelihood`: 1 improvável, 2 possível, 3 provável/já evidente.
- `recommendation`: ação concreta e curta.

### inventory
- `languages`: `[{ "name": "TypeScript", "share": 78 }]` — `share` = % aproximado de arquivos-fonte (some ~100).
- `frameworks`: principais frameworks/bibliotecas (até ~15).
- `dependencies`: dependências **diretas** de runtime dos manifestos (até ~60), com `version` como escrita, `pinned` (true se versão
  exata/lockfile), `license` só se o manifesto/lockfile disser, `scope`, `source` (manifesto).

### glossary (5–15) e openQuestions (0–10)
- Termos do domínio que aparecem no código/README.
- Perguntas objetivas que só o time sabe responder ("A emissão de NF-e é síncrona?").

## Confiança
- `verified`: você leu a evidência citada em `sources` e ela comprova a afirmação.
- `inferred`: dedução razoável a partir de indícios (nomes, convenções, configuração).
- `unconfirmed`: suposição plausível sem evidência; aparecerá em "Itens a confirmar".
O build rebaixa `verified` sem `sources` válidos para `inferred`.

## Exemplo compacto

```json
{
  "meta": { "schemaVersion": 1, "language": "pt-BR", "scope": ".", "analyzedFiles": 128 },
  "system": {
    "name": "Agenda Fácil", "purpose": "Permite que clínicas agendem consultas e enviem lembretes aos pacientes.",
    "summary": "SPA React consome uma API Node.js; lembretes são enviados por um worker que lê uma fila Redis.",
    "businessCapabilities": ["Agendamento", "Lembretes", "Gestão de agenda"], "stack": ["TypeScript", "React 18", "Node.js 20", "PostgreSQL 15", "Redis 7"]
  },
  "actors": [
    { "id": "paciente", "name": "Paciente", "kind": "person", "description": "Agenda e confirma consultas.", "confidence": "inferred" },
    { "id": "twilio", "name": "Twilio", "kind": "external-system", "tech": "API REST", "description": "Envio de SMS.", "sources": [{ "path": "api/src/sms.ts", "line": 3 }], "confidence": "verified" }
  ],
  "boundaries": [{ "id": "app", "name": "Aplicação", "kind": "layer" }, { "id": "dados", "name": "Dados", "kind": "layer" }],
  "components": [
    { "id": "web", "name": "Portal web", "kind": "ui", "boundary": "app", "tech": "React 18 · Vite", "responsibility": "Telas de agendamento para pacientes e recepção.", "sources": [{ "path": "web/src/main.tsx", "line": 1 }], "ops": { "start": "npm run dev --prefix web", "config": ["VITE_API_URL"], "ports": [5173], "tests": "absent" }, "confidence": "verified" },
    { "id": "api", "name": "API de agenda", "kind": "service", "boundary": "app", "tech": "Node.js 20 · Fastify", "responsibility": "Regras de agendamento e publicação de lembretes.", "sources": [{ "path": "api/src/server.ts", "line": 18 }], "ops": { "start": "npm start --prefix api", "config": ["DATABASE_URL", "REDIS_URL"], "ports": [3000], "health": "GET /health", "logs": "stdout (pino)", "tests": "detected" }, "confidence": "verified" },
    { "id": "agenda", "name": "Agenda", "parent": "api", "kind": "service", "responsibility": "Disponibilidade e marcação de horários.", "sources": [{ "path": "api/src/agenda/routes.ts", "line": 5 }], "confidence": "verified" },
    { "id": "worker", "name": "Worker de lembretes", "kind": "job", "boundary": "app", "tech": "Node.js 20 · BullMQ", "responsibility": "Envia lembretes 24h antes da consulta.", "sources": [{ "path": "worker/index.ts", "line": 9 }], "ops": { "schedule": "contínuo (fila)", "config": ["REDIS_URL", "TWILIO_TOKEN"] }, "confidence": "verified" },
    { "id": "postgres", "name": "Banco da agenda", "kind": "db", "boundary": "dados", "tech": "PostgreSQL 15", "responsibility": "Pacientes, profissionais e consultas.", "sources": [{ "path": "docker-compose.yml", "line": 4 }], "confidence": "verified" },
    { "id": "redis", "name": "Fila de lembretes", "kind": "queue", "boundary": "dados", "tech": "Redis 7", "responsibility": "Jobs de lembrete agendados.", "sources": [{ "path": "docker-compose.yml", "line": 12 }], "confidence": "verified" }
  ],
  "relations": [
    { "from": "paciente", "to": "web", "label": "Agenda consultas", "protocol": "HTTPS", "confidence": "inferred" },
    { "from": "web", "to": "agenda", "label": "Marca horários", "protocol": "HTTPS/REST", "sources": [{ "path": "web/src/api.ts", "line": 7 }], "confidence": "verified" },
    { "from": "agenda", "to": "postgres", "label": "Grava consultas", "protocol": "SQL", "sources": [{ "path": "api/src/agenda/repo.ts", "line": 2 }], "confidence": "verified" },
    { "from": "agenda", "to": "redis", "label": "Agenda lembrete", "protocol": "Redis", "async": true, "sources": [{ "path": "api/src/agenda/service.ts", "line": 40 }], "confidence": "verified" },
    { "from": "redis", "to": "worker", "label": "Entrega jobs", "protocol": "Redis", "async": true, "confidence": "inferred" },
    { "from": "worker", "to": "twilio", "label": "Envia SMS", "protocol": "HTTPS", "sources": [{ "path": "worker/index.ts", "line": 22 }], "confidence": "verified" }
  ],
  "risks": [
    { "id": "r-retry", "title": "Envio de SMS sem retentativa", "component": "worker", "impact": 2, "likelihood": 2, "evidence": "worker/index.ts não trata falha do Twilio.", "recommendation": "Configurar attempts/backoff no BullMQ.", "confidence": "verified" }
  ],
  "inventory": { "languages": [{ "name": "TypeScript", "share": 92 }, { "name": "SQL", "share": 8 }], "frameworks": ["React 18", "Fastify 4", "BullMQ 5"], "dependencies": [{ "name": "fastify", "version": "4.28.1", "pinned": true, "license": "MIT", "scope": "runtime", "source": "api/package.json" }] },
  "glossary": [{ "term": "Encaixe", "definition": "Consulta marcada fora da grade regular do profissional." }],
  "openQuestions": ["Lembretes também são enviados por e-mail?"]
}
```
