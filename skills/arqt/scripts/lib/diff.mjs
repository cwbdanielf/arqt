// Diff estrutural entre dois modelos normalizados. Mudanças só de redação ficam à parte.

const STRUCT = { component: ['kind', 'parent', 'boundary', 'tech'], actor: ['kind'] };

function entities(m) {
  const map = new Map();
  for (const c of m.components || []) map.set(c.id, { type: 'component', x: c });
  for (const a of m.actors || []) map.set(a.id, { type: 'actor', x: a });
  return map;
}
const relKey = (r) => `${r.from}>${r.to}`;
const paths = (x) => new Set((x.sources || []).map((s) => String(s.path).replace(/\\/g, '/')));

export function diffModels(prev, cur) {
  const A = entities(prev); const B = entities(cur);
  let added = [...B.keys()].filter((k) => !A.has(k));
  let removed = [...A.keys()].filter((k) => !B.has(k));
  const renamed = [];
  // renomeações: mesma evidência, id diferente
  for (const r of [...removed]) {
    const pr = paths(A.get(r).x);
    if (!pr.size) continue;
    const hit = added.find((a) => A.get(r).type === B.get(a).type && [...paths(B.get(a).x)].some((p) => pr.has(p)));
    if (hit) {
      renamed.push({ from: r, to: hit, name: B.get(hit).x.name });
      added = added.filter((x) => x !== hit);
      removed = removed.filter((x) => x !== r);
    }
  }
  const changed = []; const reworded = [];
  for (const [k, b] of B) {
    const a = A.get(k);
    if (!a) continue;
    const fields = (STRUCT[b.type] || []).filter((f) => (a.x[f] ?? null) !== (b.x[f] ?? null));
    if (fields.length) changed.push({ id: k, name: b.x.name, fields, before: Object.fromEntries(fields.map((f) => [f, a.x[f] ?? null])), after: Object.fromEntries(fields.map((f) => [f, b.x[f] ?? null])) });
    else if (a.x.name !== b.x.name || (a.x.responsibility || a.x.description) !== (b.x.responsibility || b.x.description)) reworded.push(k);
  }
  const renameMap = new Map(renamed.map((r) => [r.from, r.to]));
  const norm = (r) => ({ ...r, from: renameMap.get(r.from) || r.from, to: renameMap.get(r.to) || r.to });
  const RA = new Map((prev.relations || []).map(norm).map((r) => [relKey(r), r]));
  const RB = new Map((cur.relations || []).map((r) => [relKey(r), r]));
  const relAdded = [...RB.keys()].filter((k) => !RA.has(k)).map((k) => RB.get(k));
  const relRemoved = [...RA.keys()].filter((k) => !RB.has(k)).map((k) => RA.get(k));
  const relChanged = [...RB.keys()].filter((k) => RA.has(k) && (!!RA.get(k).async !== !!RB.get(k).async || (RA.get(k).protocol || '') !== (RB.get(k).protocol || ''))).map((k) => RB.get(k));

  const nameOf = (map, id) => map.get(id)?.x.name || id;
  return {
    empty: !added.length && !removed.length && !renamed.length && !changed.length && !relAdded.length && !relRemoved.length && !relChanged.length,
    added: added.map((id) => ({ id, name: nameOf(B, id), type: B.get(id).type })),
    removed: removed.map((id) => ({ id, name: nameOf(A, id), type: A.get(id).type })),
    renamed, changed, reworded,
    relAdded: relAdded.map((r) => ({ from: r.from, to: r.to, fromName: nameOf(B, r.from), toName: nameOf(B, r.to), label: r.label || '' })),
    relRemoved: relRemoved.map((r) => ({ from: r.from, to: r.to, fromName: nameOf(A, r.from) || r.from, toName: nameOf(A, r.to) || r.to, label: r.label || '' })),
    relChanged: relChanged.map((r) => ({ from: r.from, to: r.to, fromName: nameOf(B, r.from), toName: nameOf(B, r.to), label: r.label || '' })),
    previousGeneratedAt: prev.meta?.generatedAt || null,
  };
}
