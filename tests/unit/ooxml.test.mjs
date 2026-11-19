import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { zip, unzip, crc32 } from '../../skills/arqt/scripts/lib/ooxml.mjs';
import { renderDocx, markdownToDocumentXml } from '../../skills/arqt/scripts/lib/docx.mjs';
import { BUILD, loja, lojaProject } from '../helpers.mjs';

const NOW = '2026-11-19T12:00:00Z';

test('zip: ida e volta com CRC conferido, deflate e store, nomes UTF-8', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  const files = [{ name: 'a.txt', data: 'x'.repeat(5000) }, { name: 'pasta/ação.xml', data: '<a/>', store: true }];
  const z = zip(files, { date: NOW });
  assert.equal(z.readUInt32LE(0), 0x04034b50);
  const back = unzip(z);
  assert.deepEqual(Object.keys(back), ['a.txt', 'pasta/ação.xml']);
  assert.equal(back['a.txt'].toString(), 'x'.repeat(5000));
  assert.ok(z.length < 5000, 'conteúdo repetitivo é comprimido');
  assert.deepEqual(zip(files, { date: NOW }), z, 'determinístico');
});

test('docx: partes mínimas, títulos navegáveis, tabelas e Mermaid substituído por aviso', () => {
  const mdText = '# Título\n\n## 1. Seção\n\nTexto com **negrito** e `código`.\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```mermaid\nflowchart LR\n```\n\n- item\n';
  const { buffer, xml } = renderDocx({ markdown: mdText, title: 'T', language: 'pt-BR', date: NOW, diagramNote: 'Veja a planta.' });
  const parts = unzip(buffer);
  for (const p of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'docProps/core.xml']) assert.ok(parts[p], p);
  assert.match(xml, /w:pStyle w:val="Title"/);
  assert.match(xml, /w:pStyle w:val="Heading1"/);
  assert.match(parts['word/styles.xml'].toString(), /w:styleId="Heading1".*w:outlineLvl w:val="0"/s);
  assert.match(xml, /<w:tbl>/);
  assert.ok(xml.includes('Veja a planta.') && !xml.includes('flowchart'));
});

test('docx: texto do modelo é escapado no XML', () => {
  const xml = markdownToDocumentXml('Texto &lt;script&gt; & "aspas" \u0001 fim', { diagramNote: '' });
  assert.ok(!xml.includes('<script>'));
  assert.ok(xml.includes('&lt;script&gt; &amp; &quot;aspas&quot;  fim'));
});

test('/arqt docx: gera 3 .docx determinísticos e escapa texto malicioso do modelo', () => {
  const m = loja();
  m.components[0].responsibility = '</w:t></w:r><w:r><w:t>injeção <script>';
  const a = lojaProject(m); const b = lojaProject(m);
  for (const dir of [a, b]) {
    const out = execFileSync(process.execPath, [BUILD, 'docx', '--now', NOW, '--no-history'], { cwd: dir, encoding: 'utf8' });
    assert.match(out, /\+ \.docx/);
  }
  for (const s of ['executivo', 'arquitetura', 'sustentacao']) {
    const fa = fs.readFileSync(path.join(a, '.arqt', 'docs', `${s}.docx`));
    assert.deepEqual(fa, fs.readFileSync(path.join(b, '.arqt', 'docs', `${s}.docx`)), `${s}: bytes idênticos`);
    const doc = unzip(fa)['word/document.xml'].toString();
    assert.ok(!doc.includes('</w:t></w:r><w:r><w:t>injeção'), `${s}: XML injetado`);
  }
  assert.ok(!fs.existsSync(path.join(a, '.arqt', 'docs', 'inventario.docx')));
});
