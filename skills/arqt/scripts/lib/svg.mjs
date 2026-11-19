// Renderização SVG (string) de vistas e diagramas de sequência. Todo texto passa por escapeHtml.
import { escapeHtml as e } from './html.mjs';

const r1 = (n) => Math.round(n * 10) / 10;

export function wrap(text, max, lines = 2) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    const head = out.slice(0, lines);
    head[lines - 1] = clip(out.slice(lines - 1).join(' '), max);
    return head;
  }
  return out.map((l) => clip(l, max));
}
export const clip = (s, max) => (String(s).length > max ? String(s).slice(0, Math.max(1, max - 1)).trimEnd() + '…' : String(s));

export function roundedPath(pts, rad = 9) {
  if (pts.length < 2) return '';
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; const [x2, y2] = pts[i + 1];
    const d1 = Math.hypot(x1 - x0, y1 - y0); const d2 = Math.hypot(x2 - x1, y2 - y1);
    const r = Math.min(rad, d1 / 2, d2 / 2);
    const ax = x1 - ((x1 - x0) / d1) * r; const ay = y1 - ((y1 - y0) / d1) * r;
    const bx = x1 + ((x2 - x1) / d2) * r; const by = y1 + ((y2 - y1) / d2) * r;
    d += ` L${r1(ax)},${r1(ay)} Q${r1(x1)},${r1(y1)} ${r1(bx)},${r1(by)}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${r1(last[0])},${r1(last[1])}`;
}

const BADGE = {
  verified: '<path d="M-3.2 0.2 -0.9 2.5 3.4 -2.2"/>',
  inferred: '<path d="M-3.4 0.9c1.1-1.6 2.3-1.6 3.4 0s2.3 1.6 3.4 0"/>',
  unconfirmed: '<path d="M-2 -1.6a2 2 0 1 1 2.6 1.9c-.5.2-.6.6-.6 1.1M0 3.4h.01"/>',
};

function markers(id) {
  return `<defs><marker id="ah-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1.2 L9,5 L1,8.8 z" fill="context-stroke"/></marker></defs>`;
}

function nodeSvg(n, pos, t, mark) {
  const { w, h } = pos;
  const person = n.kind === 'person';
  const rx = person ? 22 : 12;
  const nameLines = wrap(n.name, 21, 2);
  const kindLabel = (t.kind[n.kind] || n.kind).toUpperCase();
  const cls = ['node', `k-${n.kind}`, `c-${n.confidence}`];
  if (n.ghost) cls.push('ghost');
  if (n.children) cls.push('has-children');
  if (mark) cls.push(`chg-${mark}`);
  const nameY = nameLines.length === 2 ? [46, 63] : [52];
  const aria = `${n.name} — ${t.kind[n.kind] || n.kind}${n.tech ? ', ' + n.tech : ''} (${t.conf[n.confidence]})`;
  return `<g class="${cls.join(' ')}" data-id="${e(n.id)}"${n.ref ? ` data-ref="${e(n.ref)}"` : ''} transform="translate(${r1(pos.x)},${r1(pos.y)})" tabindex="0" role="button" aria-label="${e(aria)}">`
    + (n.children ? `<rect class="stack" x="6" y="6" width="${w}" height="${h}" rx="${rx}"/>` : '')
    + `<rect class="card" width="${w}" height="${h}" rx="${rx}"/>`
    + `<rect class="accent" x="0" y="${person ? 24 : 14}" width="4" height="${h - (person ? 48 : 28)}" rx="2"/>`
    + `<rect class="tile" x="16" y="${h / 2 - 20}" width="40" height="40" rx="${person ? 20 : 11}"/>`
    + `<svg class="ic" x="24" y="${h / 2 - 12}" width="24" height="24" viewBox="0 0 24 24"><use href="#i-${e(n.kind)}"/></svg>`
    + `<text class="kind" x="68" y="${nameLines.length === 2 ? 27 : 31}">${e(kindLabel)}${n.children ? ` · ${n.children}` : ''}</text>`
    + nameLines.map((l, i) => `<text class="name" x="68" y="${nameY[i]}">${e(l)}</text>`).join('')
    + (n.tech ? `<text class="tech" x="68" y="${nameLines.length === 2 ? 80 : 72}">${e(clip(n.tech, 26))}</text>` : '')
    + `<g class="badge" transform="translate(${w - 16},16)"><circle r="8"/>${BADGE[n.confidence] || ''}</g>`
    + (n.children ? `<g class="drill" transform="translate(${w - 38},8)"><rect width="14" height="16" rx="3" opacity="0"/><path d="M2 4h7M2 8h5M2 12h3M9 9l3 3-3 3"/></g>` : '')
    + `<title>${e(aria)}</title></g>`;
}

export function renderView(view, t, { idPrefix = '', marks = {} } = {}) {
  const lay = view.layout;
  const id = idPrefix + view.id;
  const parts = [];
  parts.push(`<svg class="diagram" data-view="${e(view.id)}" viewBox="0 0 ${lay.width} ${lay.height}" width="${lay.width}" height="${lay.height}" role="img" aria-label="${e(view.title)}">`);
  parts.push(markers(id));
  parts.push('<g class="bands">');
  for (const b of lay.bands) {
    parts.push(`<g class="band${b.kind ? ' b-' + e(b.kind) : ''}" data-band="${e(b.id)}"><rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="18"/>`
      + `<text class="band-label" x="${r1(b.x + 18)}" y="${r1(b.y + 24)}">${e(clip(b.label, Math.max(12, Math.floor((b.w - 36) / 7.4))))}</text></g>`);
  }
  parts.push('</g><g class="edges">');
  const byId = new Map(view.edges.map((x) => [x.id, x]));
  for (const le of lay.edges) {
    const ed = byId.get(le.id);
    const d = roundedPath(le.points);
    const cls = ['edge', `c-${ed.confidence}`];
    if (ed.async) cls.push('async');
    if (ed.bidir) cls.push('bidir');
    const title = `${ed.labels.join(' · ') || ''}${ed.protocols.length ? ` [${ed.protocols.join(', ')}]` : ''}`;
    parts.push(`<g class="${cls.join(' ')}" data-id="${e(ed.id)}" data-from="${e(ed.from)}" data-to="${e(ed.to)}">`
      + `<path class="hit" d="${d}"/>`
      + `<path class="line" d="${d}" marker-end="url(#ah-${e(id)})"${ed.bidir ? ` marker-start="url(#ah-${e(id)})"` : ''}/>`
      + (title ? `<title>${e(title)}</title>` : '') + '</g>');
  }
  parts.push('</g><g class="labels">');
  for (const le of lay.edges) {
    const ed = byId.get(le.id);
    const p = lay.labels[le.id];
    if (!p || !ed.label) continue;
    const max = Math.floor((p.w - 14) / 6.4);
    parts.push(`<g class="elabel" data-for="${e(ed.id)}" transform="translate(${r1(p.x)},${r1(p.y)})"><rect x="${r1(-p.w / 2)}" y="-9.5" width="${r1(p.w)}" height="19" rx="9.5"/><text y="4">${e(clip(ed.label, max))}</text></g>`);
  }
  parts.push('</g><g class="nodes">');
  for (const n of view.nodes) parts.push(nodeSvg(n, lay.nodes[n.id], t, marks[n.id]));
  parts.push('</g></svg>');
  return parts.join('');
}

// ---------- Diagrama de sequência ----------
export function renderSequence(flow, nameOf, kindOf, t, { idPrefix = '' } = {}) {
  const parts = [];
  for (const s of flow.steps) for (const p of [s.from, s.to]) if (!parts.includes(p)) parts.push(p);
  const widths = flow.steps.filter((s) => s.from !== s.to).map((s) => (s.label.length + 4) * 6.4 / Math.max(1, Math.abs(parts.indexOf(s.to) - parts.indexOf(s.from)))).sort((a, b) => a - b);
  const p75 = widths.length ? widths[Math.floor(widths.length * 0.75)] : 160;
  const colW = Math.round(Math.max(150, Math.min(230, p75 + 20)));
  const left = 40; const top = 24; const headH = 58; const stepH = 46;
  const x = (id) => left + parts.indexOf(id) * colW + colW / 2;
  const width = left * 2 + parts.length * colW;
  const height = top + headH + 24 + flow.steps.length * stepH + 40;
  const id = `${idPrefix}seq-${flow.id}`;
  const out = [`<svg class="diagram seq" data-flow="${e(flow.id)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${e(flow.name)}">`, markers(id)];
  for (const p of parts) {
    const cx = x(p);
    out.push(`<line class="lifeline" x1="${cx}" y1="${top + headH}" x2="${cx}" y2="${height - 16}"/>`);
  }
  for (const p of parts) {
    const cx = x(p); const k = kindOf(p);
    const bw = colW - 28;
    out.push(`<g class="node seq-head k-${e(k)}" data-ref="${e(p)}" transform="translate(${r1(cx - bw / 2)},${top})"><rect class="card" width="${bw}" height="${headH - 8}" rx="${k === 'person' ? 25 : 10}"/>`
      + `<svg class="ic" x="12" y="${(headH - 8) / 2 - 10}" width="20" height="20" viewBox="0 0 24 24"><use href="#i-${e(k)}"/></svg>`
      + (() => { const lines = wrap(nameOf(p), Math.floor((bw - 48) / 7), 2); const y0 = (headH - 8) / 2 + (lines.length === 2 ? -2 : 5);
        return lines.map((l, i) => `<text class="name" x="38" y="${y0 + i * 15}">${e(l)}</text>`).join(''); })()
      + `<title>${e(nameOf(p))}</title></g>`);
  }
  flow.steps.forEach((s, i) => {
    const y = top + headH + 34 + i * stepH;
    const x1 = x(s.from); const x2 = x(s.to);
    const cls = ['msg'];
    if (s.async) cls.push('async');
    if (s.reply) cls.push('reply');
    let d; let lx; let anchor = 'middle';
    if (s.from === s.to) {
      d = `M${x1},${y - 8} h44 v18 h-40`;
      lx = x1 + 52; anchor = 'start';
    } else {
      const dir = x2 > x1 ? 1 : -1;
      d = `M${x1 + dir * 4},${y} L${x2 - dir * 6},${y}`;
      lx = (x1 + x2) / 2;
    }
    const label = `${i + 1}. ${s.label}`;
    out.push(`<g class="${cls.join(' ')}" data-step="${i}"><path class="line" d="${d}" marker-end="url(#ah-${e(id)})"/>`
      + `<text class="msg-label" x="${r1(lx)}" y="${y - 8}" text-anchor="${anchor}">${e(clip(label, Math.floor((Math.abs(x2 - x1) || 240) / 6.6)))}</text>`
      + `<title>${e(label + (s.note ? ' — ' + s.note : ''))}</title></g>`);
  });
  out.push('</svg>');
  return out.join('');
}
