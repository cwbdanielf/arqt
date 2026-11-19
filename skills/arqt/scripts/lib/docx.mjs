// DOCX a partir do Markdown que o próprio arqT gera (subconjunto conhecido: títulos, parágrafos, listas,
// citações, tabelas, blocos de código e Mermaid). Títulos usam os estilos nativos "Heading N" do Word, então
// o painel de navegação e o sumário automático funcionam.
import { zip, xml, XML_HEAD, coreProps } from './ooxml.mjs';

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

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

export function markdownToDocumentXml(mdText, { diagramNote }) {
  const lines = mdText.replace(/\r\n/g, '\n').split('\n');
  const body = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const lang = l.slice(3).trim();
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      if (lang === 'mermaid') body.push(para(run(diagramNote, { i: true, color: '6B7280' }), null));
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
  return XML_HEAD + `<w:document ${NS}><w:body>${body.join('')}${sect}</w:body></w:document>`;
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

export function renderDocx({ markdown, title, language, date, diagramNote }) {
  const doc = markdownToDocumentXml(markdown, { diagramNote });
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
