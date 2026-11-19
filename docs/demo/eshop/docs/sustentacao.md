# Manual de sustentação — eShop (AdventureWorks)

> Loja virtual de referência onde clientes navegam pelo catálogo, montam o carrinho e fazem pedidos pela web ou pelo celular.

*Versão: 19/11/2026 · Commit `134625b29e46` · Confiança das afirmações: ✓ Verificado · ~ Inferido · ? A confirmar*

## Sumário

1. Componentes
2. Como subir
3. Variáveis de ambiente (somente nomes)
4. Diagnóstico de problemas
5. Itens a confirmar

## 1. Componentes

| Componente | Tecnologia | Como iniciar | Portas | Health check |
| --- | --- | --- | --- | --- |
| **Loja web** | Blazor Server | `aspire run` | — | /health |
| **App móvel** | .NET MAUI | — | — | — |
| **Cliente de webhooks** | Blazor Server | `aspire run` | — | — |
| **BFF móvel** | YARP | `aspire run` | — | — |
| **Identidade** | Duende IdentityServer 8 | `aspire run` | — | /health |
| **API de catálogo** | ASP.NET Core · EF Core | `aspire run` | — | /health |
| **API de carrinho** | ASP.NET Core · gRPC | `aspire run` | — | — |
| **API de pedidos** | ASP.NET Core · MediatR | `aspire run` | — | /health |
| **Processador de pedidos** | .NET BackgroundService | `aspire run` | — | — |
| **Processador de pagamento** | .NET · consumidor | `aspire run` | — | — |
| **API de webhooks** | ASP.NET Core · EF Core | `aspire run` | — | /health |
| **PostgreSQL** | PostgreSQL · pgvector | — | — | — |
| **Redis** | Redis | — | — | — |
| **Barramento de eventos** | RabbitMQ | — | — | — |

## 2. Como subir

### Loja web (✓)
Vitrine, carrinho, checkout, histórico de pedidos e assistente de compras para o cliente.
- **Como iniciar:** `aspire run`
- **Variáveis de configuração:** `IdentityUrl`, `CallBackUrl`
- **Logs:** OpenTelemetry (ServiceDefaults)
- **Health check:** /health
- **Saídas:** API de carrinho, API de catálogo, API de pedidos, Identidade, Provedor de IA (Foundry/OpenAI)

### App móvel (✓)
Apps Android, iOS e desktop (nativo e híbrido) que consultam catálogo e pedidos pelo BFF.
- **Saídas:** BFF móvel

### Cliente de webhooks (✓)
App de exemplo para parceiros cadastrarem webhooks e receberem notificações.
- **Como iniciar:** `aspire run`
- **Variáveis de configuração:** `IdentityUrl`, `CallBackUrl`
- **Saídas:** API de webhooks, Identidade

### BFF móvel (✓)
Proxy reverso que expõe ao app móvel só as rotas de catálogo, pedidos e identidade.
- **Como iniciar:** `aspire run`
- **Saídas:** API de catálogo, API de pedidos

### Identidade (✓)
Login, cadastro de usuários e emissão de tokens OpenID Connect para apps e APIs.
- **Como iniciar:** `aspire run`
- **Variáveis de configuração:** `ConnectionStrings.identitydb`, `BasketApiClient`, `OrderingApiClient`, `WebAppClient`
- **Health check:** /health
- **Saídas:** PostgreSQL

### API de catálogo (✓)
Produtos, marcas, tipos, fotos e busca semântica; valida estoque dos pedidos.
- **Como iniciar:** `aspire run`
- **Variáveis de configuração:** `ConnectionStrings.catalogdb`, `ConnectionStrings.eventbus`
- **Health check:** /health
- **Saídas:** Provedor de IA (Foundry/OpenAI), PostgreSQL, Barramento de eventos

### API de carrinho (✓)
Guarda o carrinho de cada cliente e o apaga quando o pedido começa.
- **Como iniciar:** `aspire run`
- **Variáveis de configuração:** `ConnectionStrings.redis`, `ConnectionStrings.eventbus`, `Identity__Url`
- **Saídas:** Identidade, Redis

### API de pedidos (✓)
Cria, cancela e envia pedidos; mantém o ciclo de vida do pedido (DDD + CQRS).
- **Como iniciar:** `aspire run`
- **Variáveis de configuração:** `ConnectionStrings.orderingdb`, `ConnectionStrings.eventbus`, `Identity__Url`
- **Health check:** /health
- **Saídas:** Identidade, PostgreSQL, Barramento de eventos

### Processador de pedidos (✓)
Encerra o período de carência dos pedidos novos e avisa que podem seguir.
- **Como iniciar:** `aspire run`
- **Variáveis de configuração:** `ConnectionStrings.orderingdb`, `BackgroundTaskOptions.GracePeriodTime`, `BackgroundTaskOptions.CheckUpdateTime`
- **Agendamento:** a cada CheckUpdateTime segundos
- **Saídas:** PostgreSQL, Barramento de eventos

### Processador de pagamento (✓)
Simula o pagamento dos pedidos com estoque confirmado e publica o resultado.
- **Como iniciar:** `aspire run`
- **Variáveis de configuração:** `PaymentOptions.PaymentSucceeded`
- **Agendamento:** contínuo (fila)
- **Saídas:** Barramento de eventos

### API de webhooks (✓)
Cadastra assinaturas de webhooks e notifica parceiros sobre preço, pagamento e envio.
- **Como iniciar:** `aspire run`
- **Variáveis de configuração:** `ConnectionStrings.webhooksdb`, `ConnectionStrings.eventbus`, `Identity__Url`
- **Health check:** /health
- **Saídas:** Cliente de webhooks, PostgreSQL

### PostgreSQL (✓)
Quatro bancos: catálogo (com vetores), identidade, pedidos e webhooks.
- **Saídas:** —

### Redis (✓)
Armazena os carrinhos dos clientes como JSON por comprador.
- **Saídas:** —

### Barramento de eventos (✓)
Distribui eventos de integração entre os serviços (pedido iniciado, estoque, pagamento…).
- **Saídas:** API de catálogo, API de pedidos, Processador de pagamento, API de carrinho, API de webhooks, Loja web

## 3. Variáveis de ambiente (somente nomes)

| Nome | Componente |
| --- | --- |
| `BackgroundTaskOptions.CheckUpdateTime` | Processador de pedidos |
| `BackgroundTaskOptions.GracePeriodTime` | Processador de pedidos |
| `BasketApiClient` | Identidade |
| `CallBackUrl` | Loja web, Cliente de webhooks |
| `ConnectionStrings.catalogdb` | API de catálogo |
| `ConnectionStrings.eventbus` | API de catálogo, API de carrinho, API de pedidos, API de webhooks |
| `ConnectionStrings.identitydb` | Identidade |
| `ConnectionStrings.orderingdb` | API de pedidos, Processador de pedidos |
| `ConnectionStrings.redis` | API de carrinho |
| `ConnectionStrings.webhooksdb` | API de webhooks |
| `IdentityUrl` | Loja web, Cliente de webhooks |
| `Identity__Url` | API de carrinho, API de pedidos, API de webhooks |
| `OrderingApiClient` | Identidade |
| `PaymentOptions.PaymentSucceeded` | Processador de pagamento |
| `WebAppClient` | Identidade |

## 4. Diagnóstico de problemas

| Componente | Sintoma | Causa provável | Ação |
| --- | --- | --- | --- |
| **Identidade** | Ninguém consegue entrar | Identidade fora do ar ou banco identitydb indisponível | Ver o health /health da identity-api e o Postgres |
| **API de carrinho** | Carrinhos somem | Redis reiniciado sem persistência | Ver o contêiner redis |
| **API de pedidos** | Pedidos parados em um status | RabbitMQ indisponível ou evento não publicado do outbox | Ver a tabela de log de eventos e o contêiner eventbus |

**Lacunas operacionais:**

- **Cliente de webhooks**: sem testes detectados
- **BFF móvel**: sem health check, sem logs definidos
- **Identidade**: sem logs definidos, sem testes detectados
- **API de catálogo**: sem logs definidos
- **API de carrinho**: sem health check, sem logs definidos
- **API de pedidos**: sem logs definidos
- **Processador de pedidos**: sem logs definidos, sem testes detectados
- **Processador de pagamento**: sem logs definidos, sem testes detectados
- **API de webhooks**: sem logs definidos

## 5. Itens a confirmar

- [ ] ADR-4: Carrinho em Redis via gRPC
- [ ] Existe um provedor de pagamento real previsto ou o processador sempre simula?
- [ ] Qual ambiente de produção é usado além do Azure Container Apps?
- [ ] Há política de retenção para a tabela de log de eventos de integração?

---
*Gerado pelo arqT a partir do código-fonte. Afirmações marcadas como inferidas ou a confirmar devem ser revisadas.*
