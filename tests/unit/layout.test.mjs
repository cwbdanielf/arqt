import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutGraph, placeLabels } from '../../skills/arqt/scripts/lib/layout.mjs';
import { buildViews } from '../../skills/arqt/scripts/lib/views.mjs';
import { normalize } from '../../skills/arqt/scripts/lib/model.mjs';
import { strings } from '../../skills/arqt/scripts/lib/i18n.mjs';
import { loja } from '../helpers.mjs';

const overlap = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

// Verifica as garantias do layout: caixas não se sobrepõem, arestas ortogonais não atravessam caixas.
function assertInvariants(lay, label) {
  const nodes = Object.entries(lay.nodes);
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    assert.ok(!overlap(nodes[i][1], nodes[j][1]), `${label}: ${nodes[i][0]} sobrepõe ${nodes[j][0]}`);
  }
  for (let i = 0; i < lay.bands.length; i++) for (let j = i + 1; j < lay.bands.length; j++) {
    assert.ok(!overlap(lay.bands[i], lay.bands[j]), `${label}: faixas ${lay.bands[i].id} e ${lay.bands[j].id} se sobrepõem`);
  }
  for (const e of lay.edges) {
    for (let k = 0; k < e.points.length - 1; k++) {
      const [x1, y1] = e.points[k]; const [x2, y2] = e.points[k + 1];
      assert.ok(x1 === x2 || y1 === y2, `${label}: aresta ${e.id} não é ortogonal`);
      const seg = { x: Math.min(x1, x2) + 0.5, y: Math.min(y1, y2) + 0.5, w: Math.max(0.01, Math.abs(x2 - x1) - 1), h: Math.max(0.01, Math.abs(y2 - y1) - 1) };
      for (const [id, n] of nodes) {
        assert.ok(!overlap(seg, { x: n.x + 1, y: n.y + 1, w: n.w - 2, h: n.h - 2 }), `${label}: aresta ${e.id} atravessa ${id}`);
      }
    }
  }
}

function randomGraph(seed, n, m, bands) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${i}`, band: bands && rnd() < 0.7 ? `b${Math.floor(rnd() * bands)}` : null, rank: i === 0 ? 0 : 1 }));
  const edges = [];
  for (let k = 0; k < m; k++) {
    const a = Math.floor(rnd() * n); const b = Math.floor(rnd() * n);
    if (a !== b && !edges.some((e) => (e.from === `n${a}` && e.to === `n${b}`) || (e.from === `n${b}` && e.to === `n${a}`))) edges.push({ id: `e${k}`, from: `n${a}`, to: `n${b}` });
  }
  return { nodes, edges, bands: Array.from({ length: bands || 0 }, (_, i) => ({ id: `b${i}`, label: `B${i}` })) };
}

test('vistas do modelo de exemplo respeitam as garantias de layout', () => {
  const m = normalize(loja());
  for (const v of buildViews(m, strings('pt-BR'))) assertInvariants(v.layout, v.id);
});

test('grafos aleatórios (com ciclos, faixas e nós isolados) respeitam as garantias', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = randomGraph(seed, 4 + (seed % 22), 3 + (seed * 7) % 40, seed % 4);
    for (const mode of ['rows', 'columns']) assertInvariants(layoutGraph(g, { mode }), `seed ${seed} ${mode}`);
  }
});

test('layout é determinístico', () => {
  const g = randomGraph(7, 18, 30, 3);
  assert.equal(JSON.stringify(layoutGraph(g)), JSON.stringify(layoutGraph(g)));
});

test('grafo sem arestas vira grade compacta', () => {
  const g = { nodes: Array.from({ length: 9 }, (_, i) => ({ id: `n${i}` })), edges: [] };
  const lay = layoutGraph(g);
  assert.ok(lay.cols >= 3 && lay.cols <= 5, `colunas: ${lay.cols}`);
});

test('rótulos de até ~20 caracteres cabem inteiros entre colunas vizinhas', async () => {
  const { placeLabels } = await import('../../skills/arqt/scripts/lib/layout.mjs');
  const nodes = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  const edges = [
    { id: 'e1', from: 'a', to: 'c', label: 'Cadastra tutores (+2)' },
    { id: 'e2', from: 'b', to: 'c', label: 'Consulta saúde do app' },
    { id: 'e3', from: 'c', to: 'd', label: 'Grava tutores (+3)' },
  ];
  const lay = layoutGraph({ nodes, edges });
  assertInvariants(lay, 'rótulos');
  const placed = placeLabels(lay, Object.fromEntries(edges.map((e) => [e.id, e.label])));
  for (const e of edges) {
    assert.ok(placed[e.id], `${e.id}: rótulo não posicionado`);
    assert.equal(placed[e.id].truncated, false, `${e.id}: rótulo abreviado`);
  }
});

test('faixa sem arestas internas ocupa uma coluna só, mesmo com cadeia longa em outra faixa', () => {
  // serviços em cadeia (s0 → s1 → s2 → s3), cada um usando um recurso diferente da faixa de dados;
  // a fila conversa nos dois sentidos com os serviços (ciclos), como num barramento de eventos.
  const nodes = [
    { id: 'p', rank: 0 },
    ...[0, 1, 2, 3].map((i) => ({ id: `s${i}`, band: 'app' })),
    ...['db', 'cache', 'fila'].map((id) => ({ id, band: 'dados' })),
  ];
  const edges = [
    { id: 'e0', from: 'p', to: 's0' }, { id: 'e1', from: 's0', to: 's1' }, { id: 'e2', from: 's1', to: 's2' }, { id: 'e3', from: 's2', to: 's3' },
    { id: 'e4', from: 's0', to: 'db' }, { id: 'e5', from: 's3', to: 'cache' }, { id: 'e6', from: 's1', to: 'fila' }, { id: 'e7', from: 'fila', to: 's2' },
  ];
  const lay = layoutGraph({ nodes, edges, bands: [{ id: 'app', label: 'App' }, { id: 'dados', label: 'Dados' }] }, { mode: 'columns' });
  assertInvariants(lay, 'faixas');
  const col = (id) => lay.nodes[id].col;
  assert.equal(new Set(['db', 'cache', 'fila'].map(col)).size, 1, 'recursos sem relação entre si ficam na mesma coluna');
  assert.equal(lay.cols, 1 + 4 + 1, 'pessoa + cadeia de 4 serviços + 1 coluna de dados');
});

test('modelos de exemplo open source: garantias de layout, rótulos inteiros e largura contida', async () => {
  const fs = await import('node:fs');
  const { REPO } = await import('../helpers.mjs');
  for (const n of ['eshop', 'create-t3-turbo']) {
    const m = normalize(JSON.parse(fs.readFileSync(`${REPO}/tests/models/${n}.json`, 'utf8')));
    for (const v of buildViews(m, strings('pt-BR'))) {
      assertInvariants(v.layout, `${n} ${v.id}`);
      for (const e of v.edges.filter((x) => x.label)) {
        const p = v.layout.labels[e.id];
        assert.ok(p && !p.truncated, `${n} ${v.id}: rótulo "${e.label}" sem lugar ou abreviado`);
      }
      assert.ok(v.layout.cols <= 8, `${n} ${v.id}: ${v.layout.cols} colunas`);
    }
  }
});

test('rótulos de até 24 caracteres não são abreviados (300 grafos aleatórios)', () => {
  const words = ['Consulta saldo', 'Publica pedido criado', 'Grava carrinho', 'Entrega status do pedido', 'Lê catálogo', 'Valida tokens', 'Envia webhook', 'Busca pedidos em carência'];
  const bad = [];
  for (let seed = 1; seed <= 300; seed++) {
    const g = randomGraph(seed, 5 + (seed % 16), 4 + (seed * 7) % 30, seed % 4);
    g.edges.forEach((e, i) => { e.label = words[(i + seed) % words.length]; });
    const lay = layoutGraph(g);
    const placed = placeLabels(lay, Object.fromEntries(g.edges.map((e) => [e.id, e.label])));
    for (const e of g.edges) if (e.label.length <= 24 && (!placed[e.id] || placed[e.id].truncated)) bad.push(`seed ${seed} ${e.id} "${e.label}"`);
  }
  assert.deepEqual(bad, []);
});
