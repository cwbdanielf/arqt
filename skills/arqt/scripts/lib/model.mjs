// Regras semânticas, normalização e consultas sobre o modelo.

const CONF = new Set(['verified', 'inferred', 'unconfirmed']);

export function checkSemantics(m) {
  const errors = [];
  const warnings = [];
  const err = (path, message) => errors.push({ path, message });

  const nodeIds = new Map(); // id -> path
  const claim = (id, path) => {
    if (nodeIds.has(id)) err(path, `id "${id}" repetido (já usado em ${nodeIds.get(id)}); ids devem ser únicos entre actors, components e boundaries`);
    else nodeIds.set(id, path);
  };
  (m.actors || []).forEach((a, i) => claim(a.id, `actors[${i}].id`));
  (m.components || []).forEach((c, i) => claim(c.id, `components[${i}].id`));
  (m.boundaries || []).forEach((b, i) => claim(b.id, `boundaries[${i}].id`));

  const comp = new Map((m.components || []).map((c) => [c.id, c]));
  const actor = new Map((m.actors || []).map((a) => [a.id, a]));
  const bnd = new Set((m.boundaries || []).map((b) => b.id));
  const isNode = (id) => comp.has(id) || actor.has(id);
  const list = (ids) => {
    const arr = [...ids];
    return arr.length > 12 ? arr.slice(0, 12).join(', ') + ', ...' : arr.join(', ');
  };
  const nodeList = () => list([...actor.keys(), ...comp.keys()]);

  (m.components || []).forEach((c, i) => {
    const p = `components[${i}]`;
    if (c.parent != null) {
      const parent = comp.get(c.parent);
      if (!parent) err(`${p}.parent`, `"${c.parent}" não é um componente existente`);
      else if (parent.parent) err(`${p}.parent`, `"${c.parent}" já é filho de "${parent.parent}"; use no máximo 2 níveis (container → component)`);
      else if (c.parent === c.id) err(`${p}.parent`, 'um componente não pode ser pai de si mesmo');
      if (c.level === 'container') err(`${p}.level`, 'componente com "parent" deve ter level "component"');
    } else if (c.level === 'component') {
      err(`${p}.level`, 'level "component" exige "parent" (o container que o contém)');
    }
    if (c.boundary != null && !bnd.has(c.boundary)) err(`${p}.boundary`, `fronteira "${c.boundary}" não existe; fronteiras: ${list(bnd) || '(nenhuma)'}`);
    if (c.boundary != null && c.parent != null) warnings.push(`${p}.boundary ignorado: componentes filhos herdam a posição do container "${c.parent}"`);
  });

  (m.relations || []).forEach((r, i) => {
    const p = `relations[${i}]`;
    if (!isNode(r.from)) err(`${p}.from`, `"${r.from}" não existe; ids válidos: ${nodeList()}`);
    if (!isNode(r.to)) err(`${p}.to`, `"${r.to}" não existe; ids válidos: ${nodeList()}`);
    if (r.from === r.to) err(p, 'relação de um nó com ele mesmo; remova');
  });

  const uniqueIn = (arr, name) => {
    const seen = new Set();
    (arr || []).forEach((x, i) => {
      if (x.id == null) return;
      if (seen.has(x.id)) err(`${name}[${i}].id`, `id "${x.id}" repetido em ${name}`);
      seen.add(x.id);
    });
  };
  ['flows', 'deployment', 'data', 'decisions', 'risks', 'constraints', 'relations'].forEach((k) => uniqueIn(m[k], k));

  (m.flows || []).forEach((f, i) => f.steps.forEach((s, j) => {
    const p = `flows[${i}].steps[${j}]`;
    if (!isNode(s.from)) err(`${p}.from`, `"${s.from}" não existe; ids válidos: ${nodeList()}`);
    if (!isNode(s.to)) err(`${p}.to`, `"${s.to}" não existe; ids válidos: ${nodeList()}`);
  }));
  (m.deployment || []).forEach((d, i) => d.nodes.forEach((n, j) => (n.hosts || []).forEach((h, k) => {
    if (!comp.has(h)) err(`deployment[${i}].nodes[${j}].hosts[${k}]`, `"${h}" não é um componente existente`);
  })));
  (m.data || []).forEach((d, i) => {
    if (d.store != null && !comp.has(d.store)) err(`data[${i}].store`, `"${d.store}" não é um componente existente`);
  });
  (m.risks || []).forEach((r, i) => {
    if (r.component != null && !isNode(r.component)) err(`risks[${i}].component`, `"${r.component}" não existe`);
  });

  const containers = (m.components || []).filter((c) => !c.parent && c.kind !== 'external');
  if (containers.length === 0) err('components', 'é preciso ao menos um container interno (componente sem "parent" e kind diferente de "external")');

  return { errors, warnings };
}

// Aplica padrões e devolve um modelo pronto para renderizar (não altera o original).
export function normalize(input, warnings = []) {
  const m = structuredClone(input);
  m.meta = { language: 'pt-BR', scope: '.', ...m.meta };
  m.system = { businessCapabilities: [], stack: [], qualityGoals: [], ...m.system };
  for (const k of ['actors', 'boundaries', 'components', 'relations', 'flows', 'deployment', 'data', 'constraints', 'decisions', 'risks', 'glossary', 'openQuestions']) m[k] = m[k] || [];
  m.inventory = { languages: [], frameworks: [], dependencies: [], ...m.inventory };
  m.inventory.languages = m.inventory.languages.map((l) => (typeof l === 'string' ? { name: l } : l));

  const fixConf = (x, path) => {
    if (!CONF.has(x.confidence)) {
      if (x.confidence == null) warnings.push(`${path}: sem "confidence"; assumido "inferred"`);
      x.confidence = 'inferred';
    }
  };
  m.actors.forEach((a, i) => { fixConf(a, `actors[${i}]`); a.sources = a.sources || []; });
  m.components.forEach((c, i) => {
    c.level = c.parent ? 'component' : 'container';
    c.sources = c.sources || [];
    c.ops = c.ops || {};
    c.tags = c.tags || [];
    fixConf(c, `components[${i}]`);
  });
  m.relations.forEach((r, i) => {
    r.id = r.id || `r${i + 1}`;
    r.sources = r.sources || [];
    r.async = !!r.async;
    fixConf(r, `relations[${i}]`);
  });
  for (const k of ['flows', 'deployment', 'data', 'constraints', 'decisions', 'risks']) {
    m[k].forEach((x, i) => {
      if (!x.id) x.id = `${k.slice(0, 3)}${i + 1}`;
      x.sources = x.sources || [];
      fixConf(x, `${k}[${i}]`);
    });
  }
  m.system.qualityGoals.forEach((q, i) => fixConf(q, `system.qualityGoals[${i}]`));
  return m;
}

// ---------- Consultas ----------

export function index(m) {
  const comp = new Map(m.components.map((c) => [c.id, c]));
  const actor = new Map(m.actors.map((a) => [a.id, a]));
  const boundary = new Map(m.boundaries.map((b) => [b.id, b]));
  const children = new Map();
  for (const c of m.components) if (c.parent) {
    if (!children.has(c.parent)) children.set(c.parent, []);
    children.get(c.parent).push(c);
  }
  const node = (id) => comp.get(id) || actor.get(id);
  const isExternal = (id) => {
    const a = actor.get(id);
    if (a) return a.kind === 'external-system';
    const c = comp.get(id);
    return !!c && c.kind === 'external' && !c.parent;
  };
  const isPerson = (id) => actor.get(id)?.kind === 'person';
  const containerOf = (id) => {
    const c = comp.get(id);
    return c && c.parent ? c.parent : id;
  };
  return { comp, actor, boundary, children, node, isExternal, isPerson, containerOf };
}

export function claimEntities(m) {
  // Todas as entidades que carregam confiança, para estatísticas e "itens a confirmar".
  const out = [];
  const add = (type, x, label) => out.push({ type, id: x.id, label, confidence: x.confidence, ref: x });
  m.actors.forEach((x) => add('actor', x, x.name));
  m.components.forEach((x) => add('component', x, x.name));
  m.relations.forEach((x) => add('relation', x, `${x.from} → ${x.to}${x.label ? ': ' + x.label : ''}`));
  m.flows.forEach((x) => add('flow', x, x.name));
  m.deployment.forEach((x) => add('deployment', x, x.environment));
  m.data.forEach((x) => add('data', x, x.name));
  m.constraints.forEach((x) => add('constraint', x, x.text));
  m.decisions.forEach((x) => add('decision', x, x.title));
  m.risks.forEach((x) => add('risk', x, x.title));
  return out;
}
