# Changelog

## Não lançado

- Layout: em vistas com faixas em colunas, cada faixa usa só as próprias arestas para definir colunas (diagramas bem mais estreitos em microsserviços com barramento de eventos).
- Planta: diagramas largos abrem com zoom mínimo legível (60%), alinhados pelo início; "Ajustar à tela" (F) continua mostrando tudo.
- Textos: contagens no singular quando há 1 item.
- Manual de sustentação: bibliotecas sem dados de operação não aparecem mais (monorepos).
- Playbook: .NET Aspire, `.slnx`, versões centralizadas do NuGet e monorepo TypeScript (tRPC, Drizzle, catálogo do pnpm).

## 1.0.0 — 2026-11-19

Primeira versão.

- Comando único `/arqt` com roteiro de análise (subagentes acima de ~300 arquivos-fonte) e modo incremental (ids estáveis).
- Modelo JSON v1 com validação de estrutura e de consistência, mensagens acionáveis e conferência de evidências `arquivo:linha`.
- Motor de layout próprio, determinístico: camadas, fronteiras em faixas ou colunas (escolha automática pelo mais
  compacto), roteamento ortogonal sem atravessar caixas, rótulos sem sobreposição.
- Planta interativa offline: visão geral, contexto, contêineres, componentes, fluxos passo a passo, dados, implantação,
  riscos e saúde, decisões, glossário, mudanças e documentos; busca, painel de detalhes, públicos, tema claro/escuro,
  apresentação, exportação SVG/PNG, endereços com `#`.
- Documentos em HTML A4 e Markdown (com Mermaid): resumo executivo, arquitetura (arc42 enxuto), sustentação, inventário, mudanças.
- Indicadores de saúde: ciclos, pontos únicos de falha, fan-in/fan-out, lacunas operacionais, dependências sem versão fixa e copyleft.
- Histórico (últimas 20 execuções) e diff estrutural com detecção de renomeação; `publicar` para `docs/arquitetura/`.
- Segurança: zero rede, zero dependências, escrita restrita, varredura de segredos com falha fechada, CSP por hash, `CHECKSUMS.txt`.
