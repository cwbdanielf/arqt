import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { anonymize, assign, buildPackages, instructions } from '../../tools/ab-pacotes.mjs';

test('A/B: assinaturas de ferramenta somem do documento', () => {
  const t = '# Arquitetura\n\nTexto útil.\n\n*Gerado pelo arqT a partir do código-fonte.*\nFeito com Claude Code.\nGenerated with a tool\nO esquema não é gerado pelo Hibernate.\n';
  const a = anonymize(t);
  assert.ok(a.includes('Texto útil.'));
  assert.ok(!/arqt|claude|generated/i.test(a), a);
  assert.ok(a.includes('gerado pelo Hibernate'), 'texto técnico comum fica');
});

test('A/B: sorteio cobre as duas ordens e a chave confere com os arquivos', () => {
  assert.deepEqual(assign(() => 0), { 'Doc 1': 'A', 'Doc 2': 'B' });
  assert.deepEqual(assign(() => 1), { 'Doc 1': 'B', 'Doc 2': 'A' });
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'arqt-ab-'));
  const A = path.join(base, 'A'); const B = path.join(base, 'B'); const out = path.join(base, 'out');
  fs.mkdirSync(A); fs.mkdirSync(B);
  for (const r of ['r1', 'r2']) { fs.writeFileSync(path.join(A, `${r}.md`), `doc A de ${r}\n`); fs.writeFileSync(path.join(B, `${r}.md`), `doc B de ${r}\n*Gerado pelo arqT*\n`); }
  let i = 0;
  const key = buildPackages(A, B, out, () => i++ % 2);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'chave.json'), 'utf8')), key);
  for (const [r, map] of Object.entries(key)) for (const [doc, src] of Object.entries(map)) {
    assert.equal(fs.readFileSync(path.join(out, r, `${doc}.md`), 'utf8'), `doc ${src} de ${r}\n`);
  }
  assert.throws(() => buildPackages(A, B, out), /não está vazia/);
});

test('A/B: instruções do avaliador não revelam a origem dos documentos', () => {
  const rubrica = fs.readFileSync(new URL('../../docs/ab/rubrica.md', import.meta.url), 'utf8');
  const t = instructions(rubrica);
  assert.ok(t.includes('Perguntas-tarefa') && t.includes('Precisão'));
  assert.ok(!/arqt|claude|doc a\b|doc b\b/i.test(t), 'sem pistas de origem');
});
