// PPTX com diagramas em formas nativas (caixas, faixas, setas e rótulos editáveis), a partir das coordenadas do
// motor de layout. Slides: capa, resumo executivo, uma vista por slide e mapa de riscos.
import { zip, xml, XML_HEAD, coreProps } from './ooxml.mjs';
import { wrap, clip } from './svg.mjs';

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const SW = 12192000; const SH = 6858000; const PX = 9525; const IN = 914400;
const KIND = { service: '2F6FE4', ui: '7B4DDB', db: 'C77A12', queue: 'CF3C82', job: '0F8F84', lib: '56627A', cache: 'D0453B', storage: 'A88412', gateway: '0E8AA8', function: 'DC6A1C', external: '6F7889', person: '4C55D6', system: '3B5BDB' };
const INK = '1F2A44'; const MUTED = '6B7280'; const LINE = 'D1D5DB'; const EDGE = '9AA3B5'; const BRAND = '3B5BDB';
const R = Math.round;

class Slide {
  constructor(lang) { this.lang = lang; this.items = []; this.id = 2; }
  add(s) { this.items.push(s.replace('__ID__', String(this.id++))); }
  run(t, { sz = 1400, b, i, color = INK, font } = {}) {
    return `<a:r><a:rPr lang="${this.lang}" sz="${R(sz)}"${b ? ' b="1"' : ''}${i ? ' i="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill>${font ? `<a:latin typeface="${font}"/>` : ''}</a:rPr><a:t>${xml(t)}</a:t></a:r>`;
  }
  para(runs, { algn = 'l', spcAft = 0 } = {}) { return `<a:p><a:pPr algn="${algn}">${spcAft ? `<a:spcAft><a:spcPts val="${spcAft}"/></a:spcAft>` : ''}</a:pPr>${runs}</a:p>`; }
  // caixa com texto; geom: rect|roundRect; anchor: t|ctr
  box({ x, y, w, h, paras = [], geom = 'rect', fill, line, lineW = 9525, dash, anchor = 't', inset = 45720, adj = 12000, name = 'Forma', wrap = 'square' }) {
    const g = geom === 'roundRect' ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst></a:prstGeom>` : `<a:prstGeom prst="${geom}"><a:avLst/></a:prstGeom>`;
    const f = fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>';
    const l = line ? `<a:ln w="${R(lineW)}"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill>${dash ? `<a:prstDash val="${dash}"/>` : ''}</a:ln>` : '<a:ln><a:noFill/></a:ln>';
    const body = `<p:txBody><a:bodyPr wrap="${wrap}" lIns="${R(inset)}" tIns="${R(inset)}" rIns="${R(inset)}" bIns="${R(inset)}" anchor="${anchor}"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paras.join('') || '<a:p><a:endParaRPr lang="pt-BR"/></a:p>'}</p:txBody>`;
    this.add(`<p:sp><p:nvSpPr><p:cNvPr id="__ID__" name="${xml(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${R(x)}" y="${R(y)}"/><a:ext cx="${Math.max(1, R(w))}" cy="${Math.max(1, R(h))}"/></a:xfrm>${g}${f}${l}</p:spPr>${body}</p:sp>`);
  }
  polyline(pts, { color = EDGE, w = 15240, dash, head, tail = true, name = 'Seta' }) {
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs); const y0 = Math.min(...ys);
    const W = Math.max(1, R(Math.max(...xs) - x0)); const H = Math.max(1, R(Math.max(...ys) - y0));
    const path = pts.map((p, i) => `<a:${i ? 'lnTo' : 'moveTo'}><a:pt x="${R(p[0] - x0)}" y="${R(p[1] - y0)}"/></a:${i ? 'lnTo' : 'moveTo'}>`).join('');
    this.add(`<p:sp><p:nvSpPr><p:cNvPr id="__ID__" name="${xml(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${R(x0)}" y="${R(y0)}"/><a:ext cx="${W}" cy="${H}"/></a:xfrm>` +
      `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${W}" h="${H}" fill="none">${path}</a:path></a:pathLst></a:custGeom><a:noFill/>` +
      `<a:ln w="${R(w)}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill>${dash ? `<a:prstDash val="${dash}"/>` : ''}<a:round/>${head ? '<a:headEnd type="triangle"/>' : ''}${tail ? '<a:tailEnd type="triangle"/>' : ''}</a:ln></p:spPr></p:sp>`);
  }
  title(text, sub) {
    this.box({ x: 0.45 * IN, y: 0.3 * IN, w: SW - 0.9 * IN, h: 0.6 * IN, name: 'Título', paras: [this.para(this.run(text, { sz: 2600, b: true }))] });
    if (sub) this.box({ x: 0.45 * IN, y: 0.85 * IN, w: SW - 0.9 * IN, h: 0.35 * IN, name: 'Subtítulo', paras: [this.para(this.run(sub, { sz: 1200, color: MUTED }))] });
    this.box({ x: 0.45 * IN, y: 1.22 * IN, w: 0.6 * IN, h: 0.05 * IN, fill: BRAND, name: 'Filete' });
  }
  xml() {
    return XML_HEAD + `<p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
      '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
      this.items.join('') + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
  }
}

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

function riskSlide(slide, m, t) {
  const risks = [...m.risks].sort((a, b) => b.impact * b.likelihood - a.impact * a.likelihood || (a.id < b.id ? -1 : 1));
  const num = new Map(risks.map((r, i) => [r.id, i + 1]));
  const gx = 0.9 * IN; const gy = 1.75 * IN; const cell = 1.45 * IN;
  const sev = (s) => (s >= 6 ? 'F8D7D5' : s >= 3 ? 'FCEBC7' : 'DDF2E3');
  for (let imp = 3; imp >= 1; imp--) for (let lik = 1; lik <= 3; lik++) {
    const here = risks.filter((r) => r.impact === imp && r.likelihood === lik).map((r) => num.get(r.id));
    slide.box({ x: gx + (lik - 1) * cell, y: gy + (3 - imp) * cell, w: cell - 0.06 * IN, h: cell - 0.06 * IN, geom: 'roundRect', adj: 8000, fill: sev(imp * lik), anchor: 'ctr', name: `Risco ${imp}×${lik}`,
      paras: [slide.para(slide.run(here.join(' · '), { sz: 1800, b: true }), { algn: 'ctr' })] });
  }
  const lv = [t.ui.low, t.ui.medium, t.ui.high];
  for (let i = 0; i < 3; i++) {
    slide.box({ x: gx + i * cell, y: gy + 3 * cell, w: cell, h: 0.3 * IN, name: 'Eixo', paras: [slide.para(slide.run(lv[i], { sz: 1000, color: MUTED }), { algn: 'ctr' })] });
    slide.box({ x: gx - 0.75 * IN, y: gy + (2 - i) * cell, w: 0.7 * IN, h: cell, anchor: 'ctr', name: 'Eixo', paras: [slide.para(slide.run(lv[i], { sz: 1000, color: MUTED }), { algn: 'r' })] });
  }
  slide.box({ x: gx, y: gy + 3 * cell + 0.28 * IN, w: 3 * cell, h: 0.3 * IN, name: 'Eixo', paras: [slide.para(slide.run(t.ui.likelihood, { sz: 1100, b: true, color: MUTED }), { algn: 'ctr' })] });
  slide.box({ x: 0.1 * IN, y: gy - 0.35 * IN, w: 1.5 * IN, h: 0.3 * IN, name: 'Eixo', paras: [slide.para(slide.run(t.ui.impact, { sz: 1100, b: true, color: MUTED }))] });
  const listX = gx + 3 * cell + 0.5 * IN;
  const paras = risks.slice(0, 8).map((r) => slide.para(slide.run(`${num.get(r.id)}. ${r.title}`, { sz: 1300, b: true }) + (r.recommendation ? slide.run(` — ${r.recommendation}`, { sz: 1150, color: '4B5563' }) : ''), { spcAft: 600 }));
  if (risks.length > 8) paras.push(slide.para(slide.run(`+${risks.length - 8}`, { sz: 1100, color: MUTED })));
  slide.box({ x: listX, y: gy, w: SW - listX - 0.45 * IN, h: 3 * cell, name: 'Lista de riscos', paras });
}

export function renderPptx({ m, t, views, metrics, date, labels }) {
  const lang = m.meta.language === 'en' ? 'en-US' : 'pt-BR';
  const slides = [];
  // 1. capa
  {
    const s = new Slide(lang);
    s.box({ x: 0, y: 0, w: SW, h: SH, fill: '1F2A44', name: 'Fundo' });
    s.box({ x: 0.8 * IN, y: 2.2 * IN, w: SW - 1.6 * IN, h: 1.0 * IN, name: 'Título', paras: [s.para(s.run(m.system.name, { sz: 4400, b: true, color: 'FFFFFF' }))] });
    s.box({ x: 0.8 * IN, y: 3.25 * IN, w: SW - 1.6 * IN, h: 1.2 * IN, name: 'Propósito', paras: [s.para(s.run(m.system.purpose || '', { sz: 2000, color: 'C9D1EA' }))] });
    s.box({ x: 0.8 * IN, y: 3.15 * IN, w: 0.9 * IN, h: 0.06 * IN, fill: '7B93FF', name: 'Filete' });
    const meta = [labels.cover, date.slice(0, 10), m.meta.commit ? `commit ${m.meta.commit.slice(0, 12)}` : ''].filter(Boolean).join(' · ');
    s.box({ x: 0.8 * IN, y: SH - 1.0 * IN, w: SW - 1.6 * IN, h: 0.4 * IN, name: 'Versão', paras: [s.para(s.run(meta, { sz: 1200, color: '9AA3B5' }))] });
    slides.push(s);
  }
  // 2. resumo executivo
  {
    const s = new Slide(lang);
    s.title(labels.summary);
    const containers = m.components.filter((c) => !c.parent && c.kind !== 'external').length;
    const externals = m.actors.filter((a) => a.kind === 'external-system').length;
    const high = m.risks.filter((r) => r.impact * r.likelihood >= 6).length;
    const verified = Math.round((metrics.conf.verified / Math.max(1, metrics.totalClaims)) * 100);
    const kpis = [[containers, labels.containers], [externals, labels.integrations], [high, labels.highRisks], [`${verified}%`, t.ui.verifiedShare]];
    kpis.forEach(([v, l], i) => s.box({ x: 0.45 * IN + i * 3.1 * IN, y: 1.55 * IN, w: 2.9 * IN, h: 1.05 * IN, geom: 'roundRect', adj: 10000, fill: 'F3F5FB', anchor: 'ctr', inset: 0.15 * IN, name: `Indicador ${l}`,
      paras: [s.para(s.run(String(v), { sz: 3200, b: true, color: BRAND })), s.para(s.run(l, { sz: 1200, color: MUTED }))] }));
    s.box({ x: 0.45 * IN, y: 2.85 * IN, w: 7.6 * IN, h: 3.9 * IN, name: 'Resumo', paras: [s.para(s.run(m.system.summary || m.system.purpose || '', { sz: 1500 }), { spcAft: 900 })] });
    const caps = (m.system.businessCapabilities || []).slice(0, 8).map((c) => s.para(s.run(`• ${c}`, { sz: 1300 }), { spcAft: 300 }));
    const stack = (m.system.stack || []).slice(0, 8).join(' · ');
    s.box({ x: 8.35 * IN, y: 2.85 * IN, w: SW - 8.8 * IN, h: 3.9 * IN, geom: 'roundRect', adj: 6000, fill: 'F9FAFB', inset: 0.18 * IN, name: 'Capacidades',
      paras: [s.para(s.run(t.ui.capabilities, { sz: 1200, b: true, color: MUTED }), { spcAft: 600 }), ...caps, s.para(s.run(' ', { sz: 600 })), s.para(s.run(t.ui.stack, { sz: 1200, b: true, color: MUTED }), { spcAft: 400 }), s.para(s.run(stack, { sz: 1150 }))] });
    slides.push(s);
  }
  // 3. uma vista por slide
  for (const v of views) {
    const s = new Slide(lang);
    const sub = v.kind === 'components' ? labels.componentsOf : v.kind === 'context' ? labels.contextSub : labels.containersSub;
    s.title(v.kind === 'components' ? `${t.tab.components} — ${v.title}` : v.title, sub);
    drawView(s, v, t, { x: 0.35 * IN, y: 1.4 * IN, w: SW - 0.7 * IN, h: SH - 1.6 * IN });
    slides.push(s);
  }
  // 4. riscos
  if (m.risks.length) { const s = new Slide(lang); s.title(labels.riskMap, labels.riskSub); riskSlide(s, m, t); slides.push(s); }

  const ct = ['<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
    '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>',
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
    ...slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)];
  const rel = (id, type, target) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
  const rels = (list) => XML_HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.join('')}</Relationships>`;
  const files = [
    { name: '[Content_Types].xml', data: XML_HEAD + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join('')}</Types>` },
    { name: '_rels/.rels', data: rels([rel('rId1', 'officeDocument', 'ppt/presentation.xml'), '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>']) },
    { name: 'docProps/core.xml', data: coreProps({ title: `${labels.deckTitle} — ${m.system.name}`, language: lang, date }) },
    { name: 'ppt/presentation.xml', data: XML_HEAD + `<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
      `<p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 4}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${SW}" cy="${SH}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
    { name: 'ppt/_rels/presentation.xml.rels', data: rels([rel('rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'), rel('rId2', 'theme', 'theme/theme1.xml'), rel('rId3', 'presProps', 'presProps.xml'), ...slides.map((_, i) => rel(`rId${i + 4}`, 'slide', `slides/slide${i + 1}.xml`))]) },
    { name: 'ppt/presProps.xml', data: XML_HEAD + `<p:presentationPr ${NS}/>` },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: XML_HEAD + `<p:sldMaster ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>` +
      '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
      '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>' },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: rels([rel('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'), rel('rId2', 'theme', '../theme/theme1.xml')]) },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: XML_HEAD + `<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>` },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: rels([rel('rId1', 'slideMaster', '../slideMasters/slideMaster1.xml')]) },
    { name: 'ppt/theme/theme1.xml', data: themeXml() },
    ...slides.flatMap((s, i) => [
      { name: `ppt/slides/slide${i + 1}.xml`, data: s.xml() },
      { name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, data: rels([rel('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml')]) },
    ]),
  ];
  return { buffer: zip(files, { date }), xml: slides.map((s) => s.xml()).join('\n'), slides: slides.length };
}

function themeXml() {
  const c = (n, v) => `<a:${n}><a:srgbClr val="${v}"/></a:${n}>`;
  const solid = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  const ln = (w) => `<a:ln w="${w}"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>`;
  const font = (f) => `<a:latin typeface="${f}"/><a:ea typeface=""/><a:cs typeface=""/>`;
  return XML_HEAD + '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="arqT"><a:themeElements>' +
    `<a:clrScheme name="arqT">${c('dk1', '1F2A44')}${c('lt1', 'FFFFFF')}${c('dk2', '374151')}${c('lt2', 'F3F5FB')}${c('accent1', '3B5BDB')}${c('accent2', '0F8F84')}${c('accent3', 'C77A12')}${c('accent4', 'CF3C82')}${c('accent5', '7B4DDB')}${c('accent6', 'D0453B')}${c('hlink', '2F6FE4')}${c('folHlink', '7B4DDB')}</a:clrScheme>` +
    `<a:fontScheme name="arqT"><a:majorFont>${font('Calibri')}</a:majorFont><a:minorFont>${font('Calibri')}</a:minorFont></a:fontScheme>` +
    `<a:fmtScheme name="arqT"><a:fillStyleLst>${solid}${solid}${solid}</a:fillStyleLst><a:lnStyleLst>${ln(6350)}${ln(12700)}${ln(19050)}</a:lnStyleLst>` +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    `<a:bgFillStyleLst>${solid}${solid}${solid}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
}
