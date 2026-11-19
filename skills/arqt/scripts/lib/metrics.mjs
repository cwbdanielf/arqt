// Indicadores de saúde explicáveis, calculados só a partir do modelo.
import { claimEntities } from './model.mjs';

const COPYLEFT = /\b(AGPL|GPL|LGPL|EUPL|SSPL|OSL|MPL|CDDL|EPL)\b/i;

export function computeMetrics(m, ix) {
  const internal = m.components.filter((c) => !c.parent && c.kind !== 'external');
  const internalIds = new Set(internal.map((c) => c.id));
  const out = new Map(); const inn = new Map();
  const add = (map, k, v) => { if (!map.has(k)) map.set(k, new Set()); map.get(k).add(v); };
  for (const r of m.relations) {
    const a = ix.containerOf(r.from); const b = ix.containerOf(r.to);
    if (a === b) continue;
    add(out, a, b); add(inn, b, a);
  }
  const name = (id) => ix.node(id)?.name || id;
  const fanIn = internal.map((c) => ({ id: c.id, name: c.name, n: inn.get(c.id)?.size || 0 })).filter((x) => x.n).sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1)).slice(0, 6);
  const fanOut = internal.map((c) => ({ id: c.id, name: c.name, n: out.get(c.id)?.size || 0 })).filter((x) => x.n).sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1)).slice(0, 6);

  // Ciclos (Tarjan) entre contêineres internos
  let idx = 0; const stack = []; const on = new Set(); const index = new Map(); const low = new Map(); const sccs = [];
  const strong = (v) => {
    index.set(v, idx); low.set(v, idx); idx++; stack.push(v); on.add(v);
    for (const w of out.get(v) || []) {
      if (!internalIds.has(w)) continue;
      if (!index.has(w)) { strong(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) {
      const comp = []; let w;
      do { w = stack.pop(); on.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1) sccs.push(comp.sort().map((id) => ({ id, name: name(id) })));
    }
  };
  for (const c of internal) if (!index.has(c.id)) strong(c.id);

  // Pontos de articulação (grafo não dirigido de todos os nós do nível de contêiner)
  const und = new Map();
  for (const [a, bs] of out) for (const b of bs) { add(und, a, b); add(und, b, a); }
  const disc = new Map(); const lowU = new Map(); const ap = new Set(); let time = 0;
  const dfs = (u, parent) => {
    disc.set(u, time); lowU.set(u, time); time++;
    let children = 0;
    for (const v of [...(und.get(u) || [])].sort()) {
      if (!disc.has(v)) {
        children++; dfs(v, u);
        lowU.set(u, Math.min(lowU.get(u), lowU.get(v)));
        if (parent !== null && lowU.get(v) >= disc.get(u)) ap.add(u);
      } else if (v !== parent) lowU.set(u, Math.min(lowU.get(u), disc.get(v)));
    }
    if (parent === null && children > 1) ap.add(u);
  };
  for (const u of [...und.keys()].sort()) if (!disc.has(u)) dfs(u, null);
  const spof = [];
  for (const id of [...ap].sort()) if (internalIds.has(id)) spof.push({ id, name: name(id), reason: 'articulation' });
  for (const c of internal) {
    if (['db', 'queue', 'cache', 'storage'].includes(c.kind) && (inn.get(c.id)?.size || 0) >= 3 && !ap.has(c.id)) spof.push({ id: c.id, name: c.name, reason: 'shared' });
  }

  const opsGaps = [];
  for (const c of internal) {
    const gaps = [];
    if (['service', 'gateway'].includes(c.kind) && !c.ops.health) gaps.push('noHealth');
    if (['service', 'job', 'function', 'gateway'].includes(c.kind) && !c.ops.logs) gaps.push('noLogs');
    if (['service', 'job', 'ui', 'function', 'lib'].includes(c.kind) && c.ops.tests === 'absent') gaps.push('noTests');
    if (gaps.length) opsGaps.push({ id: c.id, name: c.name, gaps });
  }

  const deps = m.inventory.dependencies || [];
  const unpinned = deps.filter((d) => d.pinned === false || (d.version && /^[\^~*>]|x/.test(d.version)));
  const copyleft = deps.filter((d) => d.license && COPYLEFT.test(d.license));

  const claims = claimEntities(m);
  const conf = { verified: 0, inferred: 0, unconfirmed: 0 };
  for (const c of claims) conf[c.confidence]++;

  return { fanIn, fanOut, cycles: sccs, spof, opsGaps, unpinned, copyleft, conf, totalClaims: claims.length, depsTotal: deps.length };
}
