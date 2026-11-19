# Inventário técnico — eShop (AdventureWorks)

> Loja virtual de referência onde clientes navegam pelo catálogo, montam o carrinho e fazem pedidos pela web ou pelo celular.

*Versão: 19/11/2026 · Commit `134625b29e46` · Confiança das afirmações: ✓ Verificado · ~ Inferido · ? A confirmar*

## Sumário

1. Linguagens
2. Frameworks e bibliotecas principais
3. Dependências
4. Componentes

## 1. Linguagens

| Nome | % |
| --- | --- |
| C# | 86% |
| Razor | 6% |
| CSS | 5% |
| JavaScript/TypeScript | 3% |

## 2. Frameworks e bibliotecas principais

- ASP.NET Core 11
- Blazor
- .NET MAUI
- Aspire 13.6
- EF Core 11
- MediatR 13
- Duende IdentityServer 8
- gRPC
- YARP
- FluentValidation 12
- Microsoft.Extensions.AI
- Playwright

## 3. Dependências

| Nome | Versão | Licença | Escopo | Origem |
| --- | --- | --- | --- | --- |
| **Aspire.Hosting.RabbitMQ** | 13.6.5 | Não mapeado | runtime | Directory.Packages.props |
| **Aspire.Npgsql.EntityFrameworkCore.PostgreSQL** | 13.6.5 | Não mapeado | runtime | Directory.Packages.props |
| **Aspire.StackExchange.Redis** | 13.6.5 | Não mapeado | runtime | Directory.Packages.props |
| **Aspire.Azure.AI.OpenAI** | 13.6.0-preview.1.26479.8 | Não mapeado | runtime | Directory.Packages.props |
| **Npgsql.EntityFrameworkCore.PostgreSQL** | 11.0.0-rc.3 | Não mapeado | runtime | Directory.Packages.props |
| **Pgvector.EntityFrameworkCore** | 0.3.0 | Não mapeado | runtime | Directory.Packages.props |
| **Duende.IdentityServer** | 8.0.11 | Não mapeado | runtime | Directory.Packages.props |
| **Grpc.AspNetCore** | 2.85.0 | Não mapeado | runtime | Directory.Packages.props |
| **MediatR** | 13.1.0 | Não mapeado | runtime | Directory.Packages.props |
| **FluentValidation** | 12.2.0 | Não mapeado | runtime | Directory.Packages.props |
| **Asp.Versioning.Http** | 10.2.3 | Não mapeado | runtime | Directory.Packages.props |
| **IdentityModel** | 7.0.0 | Não mapeado | runtime | Directory.Packages.props |
| **@playwright/test** | ^1.62.1 ⚠ | Não mapeado | dev | package.json |

## 4. Componentes

| Nome | Tipo | Tecnologia | Onde | Confiança das afirmações |
| --- | --- | --- | --- | --- |
| **Loja web** | Interface | Blazor Server | src/WebApp/Program.cs:30, src/eShop.AppHost/AppHost.cs:71 | ✓ |
| **App móvel** | Interface | .NET MAUI | src/ClientApp/MauiProgram.cs:22, src/HybridApp/MauiProgram.cs:30 | ✓ |
| **Cliente de webhooks** | Interface | Blazor Server | src/WebhookClient/Program.cs:29, src/eShop.AppHost/AppHost.cs:67 | ✓ |
| **BFF móvel** | Gateway | YARP | src/eShop.AppHost/AppHost.cs:62, src/eShop.AppHost/Extensions.cs:88 | ✓ |
| **Identidade** | Serviço | Duende IdentityServer 8 | src/Identity.API/Program.cs:18, src/eShop.AppHost/AppHost.cs:25 | ✓ |
| **API de catálogo** | Serviço | ASP.NET Core · EF Core | src/Catalog.API/Program.cs:26, src/eShop.AppHost/AppHost.cs:38 | ✓ |
| **Endpoints do catálogo** | Serviço |  | src/Catalog.API/Apis/CatalogApi.cs:22 | ✓ |
| **Busca semântica** | Serviço |  | src/Catalog.API/Services/CatalogAI.cs:7 | ✓ |
| **Eventos do catálogo** | Serviço |  | src/Catalog.API/IntegrationEvents/CatalogIntegrationEventService.cs:28 | ✓ |
| **Dados do catálogo** | Biblioteca |  | src/Catalog.API/Infrastructure/CatalogContext.cs:8 | ✓ |
| **API de carrinho** | Serviço | ASP.NET Core · gRPC | src/Basket.API/Program.cs:12, src/eShop.AppHost/AppHost.cs:32 | ✓ |
| **API de pedidos** | Serviço | ASP.NET Core · MediatR | src/Ordering.API/Program.cs:21, src/eShop.AppHost/AppHost.cs:42 | ✓ |
| **Endpoints de pedidos** | Serviço |  | src/Ordering.API/Apis/OrdersApi.cs:17 | ✓ |
| **Casos de uso** | Serviço |  | src/Ordering.API/Application/Commands/CreateOrderCommandHandler.cs:33, src/Ordering.API/Extensions/Extensions.cs:37 | ✓ |
| **Domínio de pedidos** | Biblioteca | Ordering.Domain | src/Ordering.Domain/AggregatesModel/OrderAggregate/Order.cs:5, src/Ordering.Domain/AggregatesModel/BuyerAggregate/Buyer.cs:5 | ✓ |
| **Persistência de pedidos** | Biblioteca | Ordering.Infrastructure | src/Ordering.Infrastructure/OrderingContext.cs:10 | ✓ |
| **Outbox de eventos** | Biblioteca | IntegrationEventLogEF | src/Ordering.API/Application/IntegrationEvents/OrderingIntegrationEventService.cs:24, src/IntegrationEventLogEF/Services/IntegrationEventLogService.cs:19 | ✓ |
| **Processador de pedidos** | Job / worker | .NET BackgroundService | src/OrderProcessor/Extensions/Extensions.cs:19, src/eShop.AppHost/AppHost.cs:48 | ✓ |
| **Processador de pagamento** | Job / worker | .NET · consumidor | src/PaymentProcessor/Program.cs:5, src/eShop.AppHost/AppHost.cs:53 | ✓ |
| **API de webhooks** | Serviço | ASP.NET Core · EF Core | src/Webhooks.API/Program.cs:20, src/eShop.AppHost/AppHost.cs:56 | ✓ |
| **PostgreSQL** | Banco de dados | PostgreSQL · pgvector | src/eShop.AppHost/AppHost.cs:12 | ✓ |
| **Redis** | Cache | Redis | src/eShop.AppHost/AppHost.cs:9 | ✓ |
| **Barramento de eventos** | Fila / mensageria | RabbitMQ | src/eShop.AppHost/AppHost.cs:10 | ✓ |

---
*Gerado pelo arqT a partir do código-fonte. Afirmações marcadas como inferidas ou a confirmar devem ser revisadas.*
