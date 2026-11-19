// Monta as vistas (contexto, contêineres, componentes por contêiner) e calcula o layout.
import { index } from './model.mjs';
import { layoutGraph, placeLabels } from './layout.mjs';

const CONF_RANK = { verified: 0, inferred: 1, unconfirmed: 2 };
const weakest = (list) => list.reduce((w, c) => (CONF_RANK[c] > CONF_RANK[w] ? c : w), 'verified');

function nodeFrom(ix, id, extra = {}) {
  const a = ix.actor.get(id);
  if (a) return { id, ref: id, name: a.name, kind: a.kind === 'person' ? 'person' : 'external', tech: a.tech || '', confidence: a.confidence, rank: a.kind === 'person' ? 0 : 1, zone: a.kind === 'person' ? 'lead' : 'tail', ...extra };
  const c = ix.comp.get(id);
  return { id, ref: id, name: c.name, kind: c.kind, tech: c.tech || '', confidence: c.confidence, rank: 1, zone: c.kind === 'external' ? 'tail' : null, children: (ix.children.get(id) || []).length, ...extra };
}

// Rótulo de uma aresta agregada: 1 relação → seu rótulo; 2 curtas → as duas; mais → quantidade + protocolo.
function edgeLabel(labels, protocols, t) {
  if (!labels.length) return protocols[0] || '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2 && labels.join(' · ').length <= 26) return labels.join(' · ');
  return `${labels.length} ${t.ui.relationsCount}${protocols.length === 1 ? ' · ' + protocols[0] : ''}`;
}

// Agrega relações (já "elevadas") em arestas únicas por par de nós, detectando bidirecionais.
function mergeEdges(pairs, t) {
  const map = new Map();
  for (const p of pairs) {
    if (p.from === p.to) continue;
    const [a, b] = p.from < p.to ? [p.from, p.to] : [p.to, p.from];
    const key = `${a}~${b}`;
    if (!map.has(key)) map.set(key, { key, first: p, rels: [], dirs: new Set() });
    const m = map.get(key);
    m.rels.push(p.rel);
    m.dirs.add(p.from === a ? 'ab' : 'ba');
  }
  return [...map.values()].map((m) => {
    const rels = m.rels;
    const labels = [...new Set(rels.map((r) => r.label).filter(Boolean))];
    const protocols = [...new Set(rels.map((r) => r.protocol).filter(Boolean))];
    return {
      id: 'e-' + m.key.replace('~', '--'),
      from: m.first.from, to: m.first.to,
      bidir: m.dirs.size > 1,
      async: rels.every((r) => r.async),
      confidence: weakest(rels.map((r) => r.confidence)),
      relIds: rels.map((r) => r.id),
      label: edgeLabel(labels, protocols, t),
      labels, protocols,
    };
  });
}

function finish(view, layoutOpts) {
  const lay = layoutGraph({ nodes: view.nodes, edges: view.edges, bands: view.bands }, layoutOpts);
  const labelText = Object.fromEntries(view.edges.map((e) => [e.id, e.label]));
  lay.labels = placeLabels(lay, labelText);
  view.layout = lay;
  return view;
}

export function buildViews(m, t) {
  const ix = index(m);
  const views = [];
  const internalContainers = m.components.filter((c) => !c.parent && c.kind !== 'external');
  const externalsOf = () => [
    ...m.actors.filter((a) => a.kind === 'external-system').map((a) => a.id),
    ...m.components.filter((c) => !c.parent && c.kind === 'external').map((c) => c.id),
  ];
  const persons = m.actors.filter((a) => a.kind === 'person').map((a) => a.id);

  // ---- Contexto ----
  {
    const SYS = '__system';
    const lift = (id) => (ix.isPerson(id) || ix.isExternal(id) ? id : SYS);
    const pairs = m.relations.map((r) => ({ from: lift(r.from), to: lift(r.to), rel: r })).filter((p) => p.from !== p.to);
    const used = new Set(pairs.flatMap((p) => [p.from, p.to]));
    const ids = [...persons, ...externalsOf()].filter((id) => used.has(id) || true);
    const nodes = [
      ...persons.map((id) => nodeFrom(ix, id)),
      { id: SYS, ref: null, name: m.system.name, kind: 'system', tech: (m.system.stack || []).slice(0, 3).join(' · '), confidence: 'verified', rank: 1, children: internalContainers.length },
      ...externalsOf().map((id) => nodeFrom(ix, id)),
    ].filter((n) => n.id === SYS || ids.includes(n.id));
    views.push(finish({ id: 'context', kind: 'context', title: t.tab.context, nodes, edges: mergeEdges(pairs, t), bands: [] }));
  }

  // ---- Contêineres ----
  {
    const lift = (id) => ix.containerOf(id);
    const pairs = m.relations.map((r) => ({ from: lift(r.from), to: lift(r.to), rel: r }));
    const nodes = [
      ...persons.map((id) => nodeFrom(ix, id)),
      ...internalContainers.map((c) => nodeFrom(ix, c.id, { band: c.boundary || null })),
      ...externalsOf().map((id) => nodeFrom(ix, id)),
    ];
    const usedBands = new Set(internalContainers.map((c) => c.boundary).filter(Boolean));
    const bands = m.boundaries.filter((b) => usedBands.has(b.id)).map((b) => ({ id: b.id, label: b.name, kind: b.kind }));
    views.push(finish({ id: 'containers', kind: 'containers', title: t.tab.containers, nodes, edges: mergeEdges(pairs, t), bands }));
  }

  // ---- Componentes de cada contêiner ----
  for (const c of m.components.filter((x) => !x.parent && (ix.children.get(x.id) || []).length)) {
    const kids = ix.children.get(c.id);
    const kidSet = new Set(kids.map((k) => k.id));
    const lift = (id) => (kidSet.has(id) ? id : ix.containerOf(id));
    const pairs = m.relations
      .filter((r) => kidSet.has(r.from) || kidSet.has(r.to))
      .map((r) => ({ from: lift(r.from), to: lift(r.to), rel: r }))
      .filter((p) => p.from !== c.id && p.to !== c.id);
    const neighbours = [...new Set(pairs.flatMap((p) => [p.from, p.to]).filter((id) => !kidSet.has(id)))];
    const callsIn = (id) => pairs.some((p) => p.from === id) && !pairs.some((p) => p.to === id);
    const lead = neighbours.filter((id) => ix.isPerson(id) || callsIn(id));
    const tail = neighbours.filter((id) => !lead.includes(id));
    const nodes = [
      ...lead.map((id) => nodeFrom(ix, id, { ghost: true, zone: 'lead' })),
      ...kids.map((k) => nodeFrom(ix, k.id, { band: c.id, zone: null })),
      ...tail.map((id) => nodeFrom(ix, id, { ghost: true, zone: 'tail' })),
    ];
    views.push(finish({
      id: `comp-${c.id}`, kind: 'components', parent: c.id, title: c.name, nodes, edges: mergeEdges(pairs, t),
      bands: [{ id: c.id, label: `${c.name}${c.tech ? ' · ' + c.tech : ''}`, kind: 'container' }],
    }));
  }
  return views;
}
