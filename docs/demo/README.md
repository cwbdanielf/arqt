# Demonstração

Planta e documentos gerados pelo arqT para o projeto open source
[dotnet/eShop](https://github.com/dotnet/eShop) (licença MIT), no commit `134625b2`.

- `eshop/planta.html` — planta interativa (abre offline no navegador).
- `eshop/docs/` — resumo executivo, arquitetura, sustentação, inventário e mudanças (HTML A4 e Markdown), versões Word
  (`.docx`) e a apresentação `apresentacao.pptx`.

Para ver: baixe a pasta `eshop/` (ou clone o repositório) e abra `planta.html` no navegador.
O GitHub mostra os arquivos `.md` direto na página.

O modelo que originou a demonstração está em [`tests/models/eshop.json`](../../tests/models/eshop.json).
Ele descreve a arquitetura do eShop com evidências `arquivo:linha` daquele commit; nenhum código do eShop foi copiado.
Também há o modelo de um monorepo TypeScript em [`tests/models/create-t3-turbo.json`](../../tests/models/create-t3-turbo.json)
([t3-oss/create-t3-turbo](https://github.com/t3-oss/create-t3-turbo), MIT, commit `8f945b7b`).
