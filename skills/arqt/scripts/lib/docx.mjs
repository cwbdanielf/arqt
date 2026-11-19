// DOCX a partir do Markdown que o próprio arqT gera (subconjunto conhecido: títulos, parágrafos, listas,
// citações, tabelas, blocos de código e Mermaid). Títulos usam os estilos nativos "Heading N" do Word, então
// o painel de navegação e o sumário automático funcionam.
import { zip, xml, XML_HEAD, coreProps } from './ooxml.mjs';
import { drawView, drawSequence, sequenceGeometry, INK, PX } from './shapes.mjs';

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const NS_DRAW = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"';
const TEXT_W = 9638 * 635; // largura útil da página A4 (margens de 2 cm) em EMU
const MAX_H = 8.4 * 914400;
const Rn = Math.round;

// Grupo de formas do Word (wpg/wps) com a mesma interface do slide: box(), polyline(), para(), run().
class WordGroup {
  constructor(firstId = 1) { this.shapes = []; this.id = firstId; }
  run(t, o = {}) { return { t, ...o }; }
  para(runs, o = {}) { return { runs: [].concat(runs), ...o }; }
  pXml({ runs, algn = 'l' }) {
    const jc = algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : 'left';
    return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${jc}"/></w:pPr>` +
      runs.map(({ t, sz = 1400, b, i, color = INK }) => `<w:r><w:rPr>${b ? '<w:b/>' : ''}${i ? '<w:i/>' : ''}<w:color w:val="${color}"/><w:sz w:val="${Math.max(2, Rn(sz / 50))}"/></w:rPr><w:t xml:space="preserve">${xml(t)}</w:t></w:r>`).join('') + '</w:p>';
  }
  sp(name, x, y, w, h, geom, fill, ln, txbx, bodyPr) {
    this.shapes.push(`<wps:wsp><wps:cNvPr id="${this.id++}" name="${xml(name)}"/><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="${Rn(x)}" y="${Rn(y)}"/><a:ext cx="${Math.max(1, Rn(w))}" cy="${Math.max(1, Rn(h))}"/></a:xfrm>${geom}${fill}${ln}</wps:spPr>${txbx}${bodyPr}</wps:wsp>`);
  }
  box({ x, y, w, h, paras = [], geom = 'rect', fill, line, lineW = 9525, dash, anchor = 't', inset = 45720, adj = 12000, name = 'Forma', wrap = 'square' }) {
    const g = geom === 'roundRect' ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst></a:prstGeom>` : `<a:prstGeom prst="${geom}"><a:avLst/></a:prstGeom>`;
    const f = fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>';
    const l = line ? `<a:ln w="${Rn(lineW)}"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill>${dash ? `<a:prstDash val="${dash}"/>` : ''}</a:ln>` : '<a:ln><a:noFill/></a:ln>';
    const txbx = paras.length ? `<wps:txbx><w:txbxContent>${paras.map((p) => this.pXml(p)).join('')}</w:txbxContent></wps:txbx>` : '';
    const ins = Rn(inset);
    this.sp(name, x, y, w, h, g, f, l, txbx, `<wps:bodyPr rot="0" vert="horz" wrap="${wrap}" lIns="${ins}" tIns="${ins}" rIns="${ins}" bIns="${ins}" anchor="${anchor}" anchorCtr="0"><a:noAutofit/></wps:bodyPr>`);
  }
  polyline(pts, { color = '9AA3B5', w = 15240, dash, head, tail = true, name = 'Seta' }) {
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs); const y0 = Math.min(...ys);
    const W = Math.max(1, Rn(Math.max(...xs) - x0)); const H = Math.max(1, Rn(Math.max(...ys) - y0));
    const path = pts.map((p, i) => `<a:${i ? 'lnTo' : 'moveTo'}><a:pt x="${Rn(p[0] - x0)}" y="${Rn(p[1] - y0)}"/></a:${i ? 'lnTo' : 'moveTo'}>`).join('');
    const g = `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${W}" h="${H}" fill="none">${path}</a:path></a:pathLst></a:custGeom>`;
    const l = `<a:ln w="${Rn(w)}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill>${dash ? `<a:prstDash val="${dash}"/>` : ''}<a:round/>${head ? '<a:headEnd type="triangle"/>' : ''}${tail ? '<a:tailEnd type="triangle"/>' : ''}</a:ln>`;
    this.sp(name, x0, y0, W, H, g, '<a:noFill/>', l, '', '<wps:bodyPr/>');
  }
  xml(cx, cy, docId, title) {
    cx = Rn(cx); cy = Rn(cy);
    return `<w:p><w:pPr><w:spacing w:before="120" w:after="120"/><w:jc w:val="center"/></w:pPr><w:r><mc:AlternateContent><mc:Choice Requires="wpg"><w:drawing>` +
      `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docId}" name="${xml(title)}"/><wp:cNvGraphicFramePr/>` +
      `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"><wpg:wgp><wpg:cNvGrpSpPr/><wpg:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/><a:chOff x="0" y="0"/><a:chExt cx="${cx}" cy="${cy}"/></a:xfrm></wpg:grpSpPr>` +
      this.shapes.join('') + '</wpg:wgp></a:graphicData></a:graphic></wp:inline></w:drawing></mc:Choice><mc:Fallback/></mc:AlternateContent></w:r></w:p>';
  }
}

// Desenha a vista ou o fluxo marcado no bloco Mermaid (comentário "%% arqt:view=…" / "%% arqt:flow=…").
function drawing(code, diagrams, docId) {
  if (!diagrams) return null;
  const src = code.join('\n');
  const mv = /%% arqt:view=([a-z0-9-]+)/.exec(src); const mf = /%% arqt:flow=([a-z0-9-]+)/.exec(src);
  const g = new WordGroup(docId * 1000 + 1); // ids únicos no documento (o docPr usa docId)
  if (mv && diagrams.views.has(mv[1])) {
    const v = diagrams.views.get(mv[1]);
    const h = Math.min(MAX_H, TEXT_W * v.layout.height / v.layout.width); const w = Math.min(TEXT_W, h * v.layout.width / v.layout.height);
    drawView(g, v, diagrams.t, { x: 0, y: 0, w, h });
    return g.xml(w, h, docId, v.title);
  }
  if (mf && diagrams.flows.has(mf[1])) {
    const f = diagrams.flows.get(mf[1]); const geo = sequenceGeometry(f);
    const w0 = Math.min(TEXT_W, geo.width * PX); const h = Math.min(MAX_H, w0 * geo.height / geo.width); const w = h * geo.width / geo.height;
    drawSequence(g, f, diagrams.nameOf, diagrams.kindOf, { x: 0, y: 0, w, h });
    return g.xml(w, h, docId, f.name);
  }
  return null;
}


// Desfaz o escape de Markdown/HTML do gerador: \* \| \_ … e &amp; &lt; &gt;
const plain = (s) => s.replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function runs(text, base = {}) {
  // **negrito**, *itálico*, `código`, [texto](link) → runs; o resto é texto simples
  const out = [];
  const re = /(\*\*(?:\\.|[^*])+\*\*)|(`[^`]+`)|(\*(?:\\.|[^*])+\*)|(\[(?:\\.|[^\]])+\]\([^)]*\))/g;
  let last = 0; let m;
  const push = (t, f) => { if (t) out.push(run(plain(t), { ...base, ...f })); };
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index), {});
    const s = m[0];
    if (m[1]) out.push(runs(s.slice(2, -2), { ...base, b: true }));
    else if (m[2]) out.push(run(plain(s.slice(1, -1)), { ...base, code: true }));
    else if (m[3]) out.push(runs(s.slice(1, -1), { ...base, i: true }));
    else push(s.slice(1, s.indexOf('](')), {});
    last = m.index + s.length;
  }
  push(text.slice(last), {});
  return out.join('');
}

function run(t, f = {}) {
  const pr = [f.b ? '<w:b/>' : '', f.i ? '<w:i/>' : '', f.code ? '<w:rStyle w:val="CodeChar"/>' : '', f.color ? `<w:color w:val="${f.color}"/>` : ''].join('');
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(t)}</w:t></w:r>`;
}

const para = (content, style, extra = '') => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extra}</w:pPr>${content}</w:p>`;

function table(rows) {
  const cells = rows.map((r) => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split(/(?<!\\)\|/).map((c) => c.trim()));
  const [head, , ...body] = cells;
  const n = head.length;
  const tc = (txt, header) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${header ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF1F6"/>' : ''}</w:tcPr>` +
    para(runs(txt, header ? { b: true } : {}), 'TableText') + '</w:tc>';
  const tr = (r, header) => `<w:tr>${header ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${Array.from({ length: n }, (_, i) => tc(r[i] ?? '', header)).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblStyle w:val="ArqtTable"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr>` +
    `<w:tblGrid>${'<w:gridCol/>'.repeat(n)}</w:tblGrid>${tr(head, true)}${body.map((r) => tr(r, false)).join('')}</w:tbl>` + para('', null);
}

export function markdownToDocumentXml(mdText, { diagramNote, diagrams }) {
  let docId = 1;
  const lines = mdText.replace(/\r\n/g, '\n').split('\n');
  const body = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const lang = l.slice(3).trim();
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      if (lang === 'mermaid') body.push(drawing(code, diagrams, docId++) || para(run(diagramNote, { i: true, color: '6B7280' }), null));
      else for (const c of code) body.push(para(run(c || ' '), 'Code'));
      continue;
    }
    if (/^\s*\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      i--;
      if (rows.length >= 2) body.push(table(rows));
      continue;
    }
    let m;
    if ((m = /^(#{1,4})\s+(.*)$/.exec(l))) { body.push(para(runs(m[2]), m[1].length === 1 ? 'Title' : `Heading${m[1].length - 1}`)); continue; }
    if ((m = /^\s*- \[[ x]\]\s+(.*)$/.exec(l))) { body.push(para(run('☐ ') + runs(m[1]), 'ListParagraph')); continue; }
    if ((m = /^(\s*)[-*]\s+(.*)$/.exec(l))) { body.push(para(run('• ') + runs(m[2]), 'ListParagraph', m[1].length ? '<w:ind w:left="1080" w:hanging="270"/>' : '')); continue; }
    if ((m = /^\s*(\d+)\.\s+(.*)$/.exec(l))) { body.push(para(run(`${m[1]}. `) + runs(m[2]), 'ListParagraph')); continue; }
    if ((m = /^>\s?(.*)$/.exec(l))) { body.push(para(runs(m[1]), 'Quote')); continue; }
    if (!l.trim()) continue;
    body.push(para(runs(l), null));
  }
  const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
  return XML_HEAD + `<w:document ${NS} ${NS_DRAW}><w:body>${body.join('')}${sect}</w:body></w:document>`;
}

const heading = (id, name, size, lvl, color = '1F2A44') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>` +
  `<w:pPr><w:keepNext/><w:spacing w:before="${lvl === null ? 0 : 280}" w:after="120"/>${lvl === null ? '' : `<w:outlineLvl w:val="${lvl}"/>`}</w:pPr><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${size}"/></w:rPr></w:style>`;

function stylesXml() {
  return XML_HEAD + `<w:styles ${NS}>` +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    heading('Title', 'Title', 40, null) + heading('Heading1', 'heading 1', 30, 0) + heading('Heading2', 'heading 2', 25, 1) + heading('Heading3', 'heading 3', 22, 2, '374151') +
    '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="4F6BED"/></w:pBdr></w:pPr><w:rPr><w:i/><w:color w:val="374151"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40"/><w:ind w:left="540" w:hanging="270"/></w:pPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>' +
    '<w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code Char"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/></w:rPr></w:style>' +
    '<w:style w:type="table" w:styleId="ArqtTable"><w:name w:val="arqT Table"/><w:tblPr><w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>`).join('') +
    '</w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
    '</w:styles>';
}

export function renderDocx({ markdown, title, language, date, diagramNote, diagrams }) {
  const doc = markdownToDocumentXml(markdown, { diagramNote, diagrams });
  const files = [
    { name: '[Content_Types].xml', data: XML_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>' },
    { name: '_rels/.rels', data: XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
    { name: 'word/_rels/document.xml.rels', data: XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'word/document.xml', data: doc },
    { name: 'word/styles.xml', data: stylesXml().replace('w:val="pt-BR"', `w:val="${language === 'en' ? 'en-US' : 'pt-BR'}"`) },
    { name: 'docProps/core.xml', data: coreProps({ title, language, date }) },
  ];
  return { buffer: zip(files, { date }), xml: doc };
}
