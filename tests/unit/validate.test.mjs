import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateSchema } from '../../skills/arqt/scripts/lib/validate.mjs';
import { checkSemantics, normalize } from '../../skills/arqt/scripts/lib/model.mjs';
import { SKILL, loja } from '../helpers.mjs';

const schema = JSON.parse(fs.readFileSync(path.join(SKILL, 'schema', 'model.schema.json'), 'utf8'));

test('modelo de exemplo é válido', () => {
  assert.deepEqual(validateSchema(schema, loja()), []);
  assert.deepEqual(checkSemantics(loja()).errors, []);
});

test('exemplo do guia do modelo é válido', () => {
  const g = fs.readFileSync(path.join(SKILL, 'reference', 'model-guide.md'), 'utf8');
  const blocks = [...g.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
  const ex = JSON.parse(blocks[blocks.length - 1]);
  assert.deepEqual(validateSchema(schema, ex), []);
  assert.deepEqual(checkSemantics(ex).errors, []);
});

test('campo desconhecido, id inválido e enum errado geram mensagens acionáveis', () => {
  const m = loja();
  m.system.extra = 1; m.components[0].id = 'Web'; m.components[1].kind = 'banco';
  const errs = validateSchema(schema, m).map((e) => `${e.path} ${e.message}`);
  assert.ok(errs.some((e) => e.startsWith('system.extra') && e.includes('campos aceitos')));
  assert.ok(errs.some((e) => e.startsWith('components[0].id')));
  assert.ok(errs.some((e) => e.startsWith('components[1].kind') && e.includes('service')));
});

test('referências quebradas e ids duplicados são detectados', () => {
  const m = loja();
  m.relations.push({ from: 'api', to: 'fantasma' });
  m.components.push({ ...m.components[0] });
  m.components[8].parent = 'nao-existe';
  const errs = checkSemantics(m).errors.map((e) => `${e.path} ${e.message}`);
  assert.ok(errs.some((e) => e.includes('"fantasma" não existe')));
  assert.ok(errs.some((e) => e.includes('repetido')));
  assert.ok(errs.some((e) => e.includes('nao-existe')));
});

test('hierarquia limitada a dois níveis', () => {
  const m = loja();
  m.components.push({ id: 'neto', name: 'Neto', kind: 'lib', parent: 'auth', responsibility: 'x' });
  assert.ok(checkSemantics(m).errors.some((e) => e.message.includes('no máximo 2 níveis')));
});

test('normalize aplica padrões sem alterar o original', () => {
  const m = { meta: { schemaVersion: 1 }, system: { name: 'a', purpose: 'b' }, components: [{ id: 'a', name: 'A', kind: 'service', responsibility: 'x' }] };
  const w = [];
  const n = normalize(m, w);
  assert.equal(n.components[0].confidence, 'inferred');
  assert.equal(n.meta.language, 'pt-BR');
  assert.equal(m.components[0].confidence, undefined);
  assert.equal(w.length, 1);
});

// modelos de exemplo de projetos open source (licença MIT) analisados na frente de qualidade
const exemplos = ['eshop', 'create-t3-turbo'].map((n) => [n, JSON.parse(fs.readFileSync(path.join(SKILL, '..', '..', 'tests', 'models', `${n}.json`), 'utf8'))]);

test('modelos de exemplo open source são válidos', () => {
  for (const [n, m] of exemplos) {
    assert.deepEqual(validateSchema(schema, m), [], n);
    assert.deepEqual(checkSemantics(m).errors, [], n);
  }
});
