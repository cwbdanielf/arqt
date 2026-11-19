// Desenho de diagramas como formas nativas, independente do formato (PowerPoint ou Word).
// O "sink" recebe caixas e linhas em EMU: box({x,y,w,h,paras,…}), polyline(pts,{…}), para(runs,o), run(t,o).
import { wrap, clip } from './svg.mjs';

export const PX = 9525;
export const KIND = { service: '2F6FE4', ui: '7B4DDB', db: 'C77A12', queue: 'CF3C82', job: '0F8F84', lib: '56627A', cache: 'D0453B', storage: 'A88412', gateway: '0E8AA8', function: 'DC6A1C', external: '6F7889', person: '4C55D6', system: '3B5BDB' };
export const INK = '1F2A44'; export const MUTED = '6B7280'; export const LINE = 'D1D5DB'; export const EDGE = '9AA3B5'; export const BRAND = '3B5BDB';

// Desenha uma vista (já com layout) dentro da área dada, preservando a proporção.
export function drawView(slide, view, t, area) {
  const lay = view.layout;
  const s = Math.min(area.w / (lay.width * PX), area.h / (lay.height * PX));
  const ox = area.x + (area.w - lay.width * PX * s) / 2; const oy = area.y + (area.h - lay.height * PX * s) / 2;
  const X = (px) => ox + px * PX * s; const Y = (py) => oy + py * PX * s; const L = (px) => px * PX * s;
  const pt = (px) => Math.max(300, px * 75 * s); // px → centésimos de ponto, proporcional ao desenho (mínimo 3 pt)
  for (const b of lay.bands) {
    slide.box({ x: X(b.x), y: Y(b.y), w: L(b.w), h: L(b.h), geom: 'roundRect', adj: 4000, fill: 'F7F8FD', line: 'C9D1EA', dash: 'dash', lineW: L(1.2), inset: L(10), name: `Fronteira ${b.label}`,
      paras: [slide.para(slide.run(clip(b.label, Math.max(12, Math.floor((b.w - 36) / 7.4))), { sz: pt(12), b: true, color: '4B5563' }))] });
  }
  const byId = new Map(view.edges.map((e) => [e.id, e]));
  for (const le of lay.edges) {
    const ed = byId.get(le.id);
    slide.polyline(le.points.map(([x, y]) => [X(x), Y(y)]), { w: L(1.6), dash: ed.async ? 'dash' : null, head: ed.bidir, name: `Relação ${ed.label || ''}`.trim() });
  }
  for (const le of lay.edges) {
    const ed = byId.get(le.id); const p = lay.labels[le.id];
    if (!p || !ed.label) continue;
    slide.box({ x: X(p.x - p.w / 2), y: Y(p.y - 9.5), w: L(p.w), h: L(19), geom: 'roundRect', adj: 50000, fill: 'FFFFFF', line: LINE, lineW: L(1), inset: 0, anchor: 'ctr', wrap: 'none', name: `Rótulo ${ed.label}`,
      paras: [slide.para(slide.run(clip(ed.label, Math.floor((p.w - 14) / 6.4)), { sz: pt(10.5), color: '4B5563' }), { algn: 'ctr' })] });
  }
  for (const n of view.nodes) {
    const pos = lay.nodes[n.id]; const k = KIND[n.kind] || KIND.lib;
    const paras = [slide.para(slide.run(`${(t.kind[n.kind] || n.kind).toUpperCase()}${n.children ? ` · ${n.children}` : ''}`, { sz: pt(9.5), b: true, color: k }))];
    for (const l of wrap(n.name, 21, 2)) paras.push(slide.para(slide.run(l, { sz: pt(13.5), b: true })));
    if (n.tech) paras.push(slide.para(slide.run(clip(n.tech, 26), { sz: pt(10.5), color: MUTED })));
    slide.box({ x: X(pos.x), y: Y(pos.y), w: L(pos.w), h: L(pos.h), geom: 'roundRect', adj: n.kind === 'person' ? 30000 : 12000, fill: n.ghost ? 'F9FAFB' : 'FFFFFF', line: k, lineW: L(n.ghost ? 1 : 1.6), dash: n.ghost ? 'dash' : null, inset: L(12), anchor: 'ctr', name: n.name, paras });
  }
}


// Geometria do diagrama de sequência (mesmos números da versão SVG da planta).
export function sequenceGeometry(flow) {
  const parts = [];
  for (const s of flow.steps) for (const p of [s.from, s.to]) if (!parts.includes(p)) parts.push(p);
  const widths = flow.steps.filter((s) => s.from !== s.to).map((s) => (s.label.length + 4) * 6.4 / Math.max(1, Math.abs(parts.indexOf(s.to) - parts.indexOf(s.from)))).sort((a, b) => a - b);
  const p75 = widths.length ? widths[Math.floor(widths.length * 0.75)] : 160;
  const colW = Math.round(Math.max(150, Math.min(230, p75 + 20)));
  const left = 40; const top = 24; const headH = 58; const stepH = 46;
  return { parts, colW, left, top, headH, stepH, width: left * 2 + parts.length * colW, height: top + headH + 24 + flow.steps.length * stepH + 40 };
}

export function drawSequence(sink, flow, nameOf, kindOf, area) {
  const g = sequenceGeometry(flow);
  const s = Math.min(area.w / (g.width * PX), area.h / (g.height * PX));
  const ox = area.x + (area.w - g.width * PX * s) / 2; const oy = area.y + (area.h - g.height * PX * s) / 2;
  const X = (px) => ox + px * PX * s; const Y = (py) => oy + py * PX * s; const L = (px) => px * PX * s;
  const pt = (px) => Math.max(300, px * 75 * s);
  const cx = (id) => g.left + g.parts.indexOf(id) * g.colW + g.colW / 2;
  for (const p of g.parts) sink.polyline([[X(cx(p)), Y(g.top + g.headH)], [X(cx(p)), Y(g.height - 16)]], { color: LINE, w: L(1.2), dash: 'dash', tail: false, name: 'Linha de vida' });
  const bw = g.colW - 28;
  for (const p of g.parts) {
    const k = KIND[kindOf(p)] || KIND.lib;
    sink.box({ x: X(cx(p) - bw / 2), y: Y(g.top), w: L(bw), h: L(g.headH - 8), geom: 'roundRect', adj: kindOf(p) === 'person' ? 40000 : 15000, fill: 'FFFFFF', line: k, lineW: L(1.6), inset: L(8), anchor: 'ctr', name: nameOf(p),
      paras: wrap(nameOf(p), Math.floor((bw - 20) / 7), 2).map((l) => sink.para(sink.run(l, { sz: pt(12.5), b: true }), { algn: 'ctr' })) });
  }
  flow.steps.forEach((st, i) => {
    const y = g.top + g.headH + 34 + i * g.stepH;
    const x1 = cx(st.from); const x2 = cx(st.to);
    const dash = st.async || st.reply ? 'dash' : null;
    const label = `${i + 1}. ${st.label}`;
    if (st.from === st.to) {
      sink.polyline([[X(x1), Y(y - 8)], [X(x1 + 44), Y(y - 8)], [X(x1 + 44), Y(y + 10)], [X(x1 + 4), Y(y + 10)]], { w: L(1.6), dash, name: label });
      sink.box({ x: X(x1 + 52), y: Y(y - 22), w: L(g.colW * 1.6), h: L(16), inset: 0, wrap: 'none', name: label, paras: [sink.para(sink.run(clip(label, 60), { sz: pt(11), color: INK }))] });
      return;
    }
    const dir = x2 > x1 ? 1 : -1;
    sink.polyline([[X(x1 + dir * 4), Y(y)], [X(x2 - dir * 6), Y(y)]], { w: L(1.6), dash, color: st.reply ? MUTED : EDGE, name: label });
    const maxChars = Math.floor((Math.max(Math.abs(x2 - x1), g.colW) + g.colW * 0.7) / 6.6);
    const shown = clip(label, maxChars); const half = shown.length * 3.3 + 6;
    const lx = Math.min(Math.max((x1 + x2) / 2, half + 8), g.width - half - 8);
    sink.box({ x: X(lx - half), y: Y(y - 21), w: L(half * 2), h: L(16), inset: 0, wrap: 'none', anchor: 'ctr', name: label, paras: [sink.para(sink.run(shown, { sz: pt(11), color: INK }), { algn: 'ctr' })] });
  });
  return g;
}
