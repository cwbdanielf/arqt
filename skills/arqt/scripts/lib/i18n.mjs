// Textos fixos da interface e dos documentos (pt-BR e en).
const pt = {
  one: { containersCount: 'contêiner', componentsCount: 'componente', integrationsCount: 'integração', relationsCount: 'relação', highRisks: 'risco alto' },
  kind: { service: 'Serviço', ui: 'Interface', db: 'Banco de dados', queue: 'Fila / mensageria', job: 'Job / worker', lib: 'Biblioteca', cache: 'Cache', storage: 'Armazenamento', gateway: 'Gateway', function: 'Função', external: 'Sistema externo', person: 'Pessoa', system: 'Sistema', 'external-system': 'Sistema externo' },
  conf: { verified: 'Verificado', inferred: 'Inferido', unconfirmed: 'A confirmar' },
  confHint: { verified: 'Confirmado por evidência no código (arquivo:linha).', inferred: 'Deduzido a partir de indícios no código; revisar.', unconfirmed: 'Sem evidência direta; precisa de confirmação humana.' },
  audience: { exec: 'Diretoria', ops: 'Sustentação', dev: 'Desenvolvimento' },
  tab: { overview: 'Visão geral', context: 'Contexto', containers: 'Contêineres', components: 'Componentes', flows: 'Fluxos', data: 'Dados', deployment: 'Implantação', health: 'Riscos e saúde', decisions: 'Decisões', changes: 'Mudanças', docs: 'Documentos', glossary: 'Glossário' },
  testsState: { detected: 'detectados', absent: 'ausentes', unknown: 'não identificado' },
  ui: {
    search: 'Buscar componente, tecnologia, arquivo…', fit: 'Ajustar à tela', zoomIn: 'Aproximar', zoomOut: 'Afastar', theme: 'Alternar tema', present: 'Modo apresentação', exportSvg: 'Exportar SVG', exportPng: 'Exportar PNG',
    responsibility: 'Responsabilidade', tech: 'Tecnologia', sources: 'Evidências no código', relations: 'Relações', outgoing: 'Saídas', incoming: 'Entradas', operations: 'Operação', start: 'Como iniciar', build: 'Build', test: 'Testes', config: 'Variáveis de configuração', ports: 'Portas', logs: 'Logs', health: 'Health check', schedule: 'Agendamento', testsDetected: 'Testes automatizados', failureModes: 'Falhas conhecidas e ações',
    drill: 'Abrir componentes internos', components: 'componentes', risksFor: 'Riscos associados', none: 'Nenhum', legend: 'Legenda', async: 'assíncrono', sync: 'síncrono', bidir: 'bidirecional', notes: 'Observação',
    hint: 'Clique para detalhes · duplo clique abre o interior · arraste para mover · roda do mouse para zoom', copy: 'Copiar', copied: 'Copiado', close: 'Fechar', back: 'Voltar', step: 'Passo', play: 'Reproduzir', prev: 'Anterior', next: 'Próximo',
    impact: 'Impacto', likelihood: 'Probabilidade', low: 'Baixo', medium: 'Médio', high: 'Alto', recommendation: 'Recomendação', evidence: 'Evidência', context: 'Contexto', decision: 'Decisão', consequences: 'Consequências', toConfirm: 'Itens a confirmar', all: 'Todos', selectContainer: 'Escolha um contêiner', noChildren: 'Nenhum contêiner tem componentes internos mapeados.',
    generated: 'Gerado em', commit: 'Commit', branch: 'Branch', files: 'arquivos analisados', capabilities: 'Capacidades de negócio', stack: 'Stack', qualityGoals: 'Objetivos de qualidade', confidence: 'Confiança das afirmações', verifiedShare: 'verificadas', integrations: 'Integrações externas', people: 'Pessoas e papéis', highRisks: 'riscos altos', relationsCount: 'relações', containersCount: 'contêineres', componentsCount: 'componentes', integrationsCount: 'integrações',
    metrics: 'Indicadores de saúde', fanIn: 'Mais dependidos (fan-in)', fanOut: 'Mais dependentes (fan-out)', cycles: 'Ciclos de dependência', spof: 'Pontos únicos de falha', opsGaps: 'Lacunas operacionais', deps: 'Dependências', unpinned: 'sem versão fixada', copyleft: 'licença copyleft', noHealth: 'sem health check', noLogs: 'sem logs definidos', noTests: 'sem testes detectados', noneFound: 'Nada encontrado',
    changesSince: 'Mudanças desde a versão anterior', added: 'Adicionados', removed: 'Removidos', changed: 'Alterados', renamed: 'Renomeados', firstVersion: 'Primeira versão: não há histórico anterior para comparar.', noChanges: 'Nenhuma mudança estrutural.',
    openDoc: 'Abrir', mdVersion: 'Markdown', print: 'Para PDF: abra o documento e use Imprimir → Salvar como PDF (A4).', environment: 'Ambiente', hosts: 'Hospeda', store: 'Armazenado em', fields: 'Campos', participants: 'Participantes', keyboard: 'Atalhos: / busca · F ajustar · + − zoom · T tema · P apresentação · Esc fecha',
    whatIs: 'O que é', where: 'Onde está', exec: 'Resumo para decisão', results: 'resultados', noResults: 'Nenhum resultado', open: 'Abrir', view: 'Ver na planta',
  },
  doc: {
    executivo: 'Resumo executivo', arquitetura: 'Documento de arquitetura', sustentacao: 'Manual de sustentação', inventario: 'Inventário técnico', mudancas: 'Mudanças arquiteturais', toc: 'Sumário', version: 'Versão',
    purpose: 'Propósito', scope: 'Escopo', recommendations: 'Recomendações', riskMap: 'Mapa de riscos', intro: 'Introdução e objetivos', constraints: 'Restrições', contextScope: 'Contexto e escopo', blocks: 'Visão de blocos', runtime: 'Visão de execução', deploymentView: 'Visão de implantação', crosscutting: 'Dados', decisions: 'Decisões arquiteturais', quality: 'Qualidade e indicadores', risks: 'Riscos e dívidas técnicas', glossary: 'Glossário',
    componentsTable: 'Componentes', howToRun: 'Como subir', envVars: 'Variáveis de ambiente (somente nomes)', troubleshooting: 'Diagnóstico de problemas', languages: 'Linguagens', frameworks: 'Frameworks e bibliotecas principais', dependencies: 'Dependências', name: 'Nome', version2: 'Versão', license: 'Licença', scope2: 'Escopo', origin: 'Origem', kind: 'Tipo', component: 'Componente', protocol: 'Protocolo', from: 'De', to: 'Para', label: 'Descrição', symptom: 'Sintoma', cause: 'Causa provável', action: 'Ação', generatedBy: 'Gerado pelo arqT a partir do código-fonte. Afirmações marcadas como inferidas ou a confirmar devem ser revisadas.', adrNote: 'ADRs inferidos a partir do código — confirme com o time antes de tratá-los como oficiais.', where: 'Onde', notMapped: 'Não mapeado',
  },
};

const en = {
  one: { containersCount: 'container', componentsCount: 'component', integrationsCount: 'integration', relationsCount: 'relation', highRisks: 'high risk' },
  kind: { service: 'Service', ui: 'User interface', db: 'Database', queue: 'Queue / messaging', job: 'Job / worker', lib: 'Library', cache: 'Cache', storage: 'Storage', gateway: 'Gateway', function: 'Function', external: 'External system', person: 'Person', system: 'System', 'external-system': 'External system' },
  conf: { verified: 'Verified', inferred: 'Inferred', unconfirmed: 'To confirm' },
  confHint: { verified: 'Confirmed by evidence in the code (file:line).', inferred: 'Deduced from hints in the code; review.', unconfirmed: 'No direct evidence; needs human confirmation.' },
  audience: { exec: 'Executive', ops: 'Operations', dev: 'Development' },
  tab: { overview: 'Overview', context: 'Context', containers: 'Containers', components: 'Components', flows: 'Flows', data: 'Data', deployment: 'Deployment', health: 'Risks & health', decisions: 'Decisions', changes: 'Changes', docs: 'Documents', glossary: 'Glossary' },
  testsState: { detected: 'detected', absent: 'absent', unknown: 'unknown' },
  ui: {
    search: 'Search component, technology, file…', fit: 'Fit to screen', zoomIn: 'Zoom in', zoomOut: 'Zoom out', theme: 'Toggle theme', present: 'Presentation mode', exportSvg: 'Export SVG', exportPng: 'Export PNG',
    responsibility: 'Responsibility', tech: 'Technology', sources: 'Evidence in code', relations: 'Relations', outgoing: 'Outgoing', incoming: 'Incoming', operations: 'Operations', start: 'How to start', build: 'Build', test: 'Tests', config: 'Configuration variables', ports: 'Ports', logs: 'Logs', health: 'Health check', schedule: 'Schedule', testsDetected: 'Automated tests', failureModes: 'Known failures and actions',
    drill: 'Open internal components', components: 'components', risksFor: 'Related risks', none: 'None', legend: 'Legend', async: 'async', sync: 'sync', bidir: 'bidirectional', notes: 'Note',
    hint: 'Click for details · double-click opens the inside · drag to pan · wheel to zoom', copy: 'Copy', copied: 'Copied', close: 'Close', back: 'Back', step: 'Step', play: 'Play', prev: 'Previous', next: 'Next',
    impact: 'Impact', likelihood: 'Likelihood', low: 'Low', medium: 'Medium', high: 'High', recommendation: 'Recommendation', evidence: 'Evidence', context: 'Context', decision: 'Decision', consequences: 'Consequences', toConfirm: 'Items to confirm', all: 'All', selectContainer: 'Pick a container', noChildren: 'No container has mapped internal components.',
    generated: 'Generated at', commit: 'Commit', branch: 'Branch', files: 'files analyzed', capabilities: 'Business capabilities', stack: 'Stack', qualityGoals: 'Quality goals', confidence: 'Confidence of statements', verifiedShare: 'verified', integrations: 'External integrations', people: 'People and roles', highRisks: 'high risks', relationsCount: 'relations', containersCount: 'containers', componentsCount: 'components', integrationsCount: 'integrations',
    metrics: 'Health indicators', fanIn: 'Most depended on (fan-in)', fanOut: 'Most dependent (fan-out)', cycles: 'Dependency cycles', spof: 'Single points of failure', opsGaps: 'Operational gaps', deps: 'Dependencies', unpinned: 'not pinned', copyleft: 'copyleft license', noHealth: 'no health check', noLogs: 'no logs defined', noTests: 'no tests detected', noneFound: 'Nothing found',
    changesSince: 'Changes since previous version', added: 'Added', removed: 'Removed', changed: 'Changed', renamed: 'Renamed', firstVersion: 'First version: no previous history to compare.', noChanges: 'No structural changes.',
    openDoc: 'Open', mdVersion: 'Markdown', print: 'For PDF: open the document and use Print → Save as PDF (A4).', environment: 'Environment', hosts: 'Hosts', store: 'Stored in', fields: 'Fields', participants: 'Participants', keyboard: 'Shortcuts: / search · F fit · + − zoom · T theme · P present · Esc close',
    whatIs: 'What it is', where: 'Where it is', exec: 'Decision summary', results: 'results', noResults: 'No results', open: 'Open', view: 'View on map',
  },
  doc: {
    executivo: 'Executive summary', arquitetura: 'Architecture document', sustentacao: 'Operations manual', inventario: 'Technical inventory', mudancas: 'Architecture changes', toc: 'Contents', version: 'Version',
    purpose: 'Purpose', scope: 'Scope', recommendations: 'Recommendations', riskMap: 'Risk map', intro: 'Introduction and goals', constraints: 'Constraints', contextScope: 'Context and scope', blocks: 'Building block view', runtime: 'Runtime view', deploymentView: 'Deployment view', crosscutting: 'Data', decisions: 'Architecture decisions', quality: 'Quality and indicators', risks: 'Risks and technical debt', glossary: 'Glossary',
    componentsTable: 'Components', howToRun: 'How to run', envVars: 'Environment variables (names only)', troubleshooting: 'Troubleshooting', languages: 'Languages', frameworks: 'Main frameworks and libraries', dependencies: 'Dependencies', name: 'Name', version2: 'Version', license: 'License', scope2: 'Scope', origin: 'Source', kind: 'Kind', component: 'Component', protocol: 'Protocol', from: 'From', to: 'To', label: 'Description', symptom: 'Symptom', cause: 'Probable cause', action: 'Action', generatedBy: 'Generated by arqT from the source code. Statements marked inferred or to confirm must be reviewed.', adrNote: 'ADRs inferred from the code — confirm with the team before treating them as official.', where: 'Where', notMapped: 'Not mapped',
  },
};

export const strings = (lang) => (lang === 'en' ? en : pt);

// rótulo de contagem no singular quando n === 1 ("1 integração", não "1 integrações")
export const countLabel = (t, key, n) => (n === 1 && t.one[key]) || t.ui[key];
