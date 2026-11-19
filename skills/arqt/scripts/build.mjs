#!/usr/bin/env node
// arqT — ponto de entrada único. Sem dependências, sem rede, sem processos filhos.
//
// Uso (a partir da raiz do projeto analisado):
//   node <skill>/scripts/build.mjs --check            verifica Node, integridade e ambiente
//   node <skill>/scripts/build.mjs [publico]          valida .arqt/model.json e gera a planta e os documentos
//   node <skill>/scripts/build.mjs publicar           copia documentos e modelo para docs/arquitetura/
// Opções: --root <dir> (padrão: diretório atual) · --now <ISO> (data fixa, para testes) · --no-history
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateSchema } from './lib/validate.mjs';
import { checkSemantics, normalize, index } from './lib/model.mjs';
import { verifyEvidence } from './lib/evidence.mjs';
import { scanObject, scanOutput } from './lib/secrets.mjs';
import { FsGuard } from './lib/fsguard.mjs';
import { gitMeta } from './lib/gitmeta.mjs';
import { verifyChecksums } from './lib/integrity.mjs';
import { strings } from './lib/i18n.mjs';
import { buildViews } from './lib/views.mjs';
import { computeMetrics } from './lib/metrics.mjs';
import { diffModels } from './lib/diff.mjs';
import { renderPlanta } from '../templates/planta.mjs';
import { renderDocs } from '../templates/docs.mjs';

const VERSION = '1.0.0';
const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = '.arqt';
const HISTORY_KEEP = 20;

const EXIT = { ok: 0, invalid: 1, env: 2, secret: 3, usage: 4 };

function parseArgs(argv) {
  const a = { positional: [], root: process.cwd(), now: null, history: true, check: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--root') a.root = argv[++i];
    else if (v === '--now') a.now = argv[++i];
    else if (v === '--no-history') a.history = false;
    else if (v === '--check') a.check = true;
    else if (v === '--skip-integrity') a.skipIntegrity = true;
    else if (v.startsWith('--')) a.unknown = (a.unknown || []).concat(v);
    else a.positional.push(v.toLowerCase());
  }
  return a;
}

const AUD = { diretoria: 'exec', executivo: 'exec', exec: 'exec', sustentacao: 'ops', 'sustentação': 'ops', ops: 'ops', operacao: 'ops', desenvolvimento: 'dev', dev: 'dev' };

function line(s = '') { process.stdout.write(s + '\n'); }
function fail(code, title, items = [], hint) {
  line(`✗ ${title}`);
  for (const it of items.slice(0, 60)) line(`  - ${it}`);
  if (items.length > 60) line(`  … e mais ${items.length - 60}`);
  if (hint) line(`\n${hint}`);
  process.exit(code);
}

function nodeOk() {
  const [maj] = process.versions.node.split('.').map(Number);
  return maj >= 20;
}

function checkEnv(args) {
  const problems = [];
  if (!nodeOk()) problems.push(`Node ${process.versions.node} é antigo; instale Node 20 ou superior (https://nodejs.org).`);
  if (!args.skipIntegrity) {
    const ic = verifyChecksums(SKILL_DIR);
    if (!ic.ok) problems.push(...ic.problems.map((p) => `integridade do skill: ${p}`));
  }
  return problems;
}

function readJson(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  try { return JSON.parse(text); } catch (e) {
    const pos = /position (\d+)/.exec(e.message)?.[1];
    let where = '';
    if (pos) { const before = text.slice(0, Number(pos)); where = ` (linha ${before.split('\n').length})`; }
    throw new Error(`JSON inválido em ${path.basename(file)}${where}: ${e.message}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root);
  const envProblems = checkEnv(args);

  if (args.check) {
    if (envProblems.length) fail(EXIT.env, 'Ambiente não está pronto', envProblems);
    const prev = fs.existsSync(path.join(root, OUT, 'model.json'));
    line(`✓ arqT ${VERSION} pronto (Node ${process.versions.node}).`);
    line(`  projeto: ${root}`);
    line(`  modelo anterior: ${prev ? '.arqt/model.json (modo incremental: reaproveite os ids)' : 'nenhum (primeira execução)'}`);
    const g = gitMeta(root);
    if (g.commit) line(`  git: ${g.branch || '(detached)'} @ ${g.commit}`);
    return;
  }
  if (envProblems.length) fail(EXIT.env, 'Ambiente não está pronto', envProblems);

  const guard = new FsGuard(root, [OUT, 'docs/arquitetura']);
  const outDir = path.join(root, OUT);
  guard.mkdir(OUT);
  if (!fs.existsSync(path.join(outDir, '.gitignore'))) guard.write(`${OUT}/.gitignore`, '# gerado pelo arqT — saída local, não versionar\n*\n');

  if (args.positional[0] === 'publicar' || args.positional[0] === 'publish') return publish(root, guard);

  const warnings = [];
  const unknownArgs = args.positional.filter((p) => !AUD[p]);
  if (unknownArgs.length || args.unknown) warnings.push(`argumento(s) ignorado(s): ${[...unknownArgs, ...(args.unknown || [])].join(' ')} (aceitos: diretoria, sustentacao, desenvolvimento, publicar)`);
  const audience = AUD[args.positional.find((p) => AUD[p])] || 'dev';

  const modelFile = path.join(outDir, 'model.json');
  if (!fs.existsSync(modelFile)) fail(EXIT.usage, 'Modelo não encontrado', [`esperado em ${path.relative(root, modelFile)}`], 'Escreva o modelo (veja reference/model-guide.md) e rode novamente.');

  // 1. leitura e validação
  let input;
  try { input = readJson(modelFile); } catch (e) { fail(EXIT.invalid, 'Modelo ilegível', [e.message]); }
  const schema = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'schema', 'model.schema.json'), 'utf8'));
  const schemaErrors = validateSchema(schema, input);
  if (schemaErrors.length) fail(EXIT.invalid, `Modelo inválido (${schemaErrors.length} erro(s) de estrutura)`, schemaErrors.map((e) => `${e.path}: ${e.message}`), 'Corrija .arqt/model.json e rode o build novamente.');
  const sem = checkSemantics(input);
  warnings.push(...sem.warnings);
  if (sem.errors.length) fail(EXIT.invalid, `Modelo inválido (${sem.errors.length} erro(s) de consistência)`, sem.errors.map((e) => `${e.path}: ${e.message}`), 'Corrija .arqt/model.json e rode o build novamente.');

  // 2. segredos no modelo (falha fechada, sem ecoar valores)
  const secretHits = scanObject(input);
  if (secretHits.length) fail(EXIT.secret, 'Possível segredo no modelo — nada foi gerado', secretHits.map((h) => `${h.path}: ${h.kind}`), 'Remova o valor (use só o NOME da variável) e rode novamente. Nunca copie valores de .env, chaves ou tokens.');

  // 3. normalização, evidências e metadados
  const m = normalize(input, warnings);
  const ev = verifyEvidence(root, m);
  warnings.push(...ev.warnings);
  const g = gitMeta(root);
  m.meta.generatedAt = args.now || new Date().toISOString();
  m.meta.arqtVersion = VERSION;
  if (g.commit) m.meta.commit = g.commit; else delete m.meta.commit;
  if (g.branch) m.meta.branch = g.branch; else delete m.meta.branch;

  // 4. histórico e diff
  const histDir = `${OUT}/history`;
  let prev = null;
  const histFiles = guard.list(histDir).filter((f) => /^\d{8}T\d{6}Z?\.json$/.test(f)).sort();
  if (histFiles.length) {
    try { prev = readJson(path.join(root, histDir, histFiles[histFiles.length - 1])); } catch { prev = null; }
  } else if (fs.existsSync(path.join(root, 'docs', 'arquitetura', 'model.json'))) {
    try { prev = normalize(readJson(path.join(root, 'docs', 'arquitetura', 'model.json'))); } catch { prev = null; }
  }
  const diff = prev ? diffModels(prev, m) : null;
  const marks = {};
  if (diff && !diff.empty) {
    for (const a of diff.added) marks[a.id] = 'added';
    for (const r of diff.renamed) marks[r.to] = 'added';
    for (const c of diff.changed) marks[c.id] = 'changed';
  }

  // 5. renderização
  const t = strings(m.meta.language);
  const ix = index(m);
  const views = buildViews(m, t);
  const metrics = computeMetrics(m, ix);
  const css = {
    theme: fs.readFileSync(path.join(SKILL_DIR, 'assets', 'theme.css'), 'utf8'),
    viewer: fs.readFileSync(path.join(SKILL_DIR, 'templates', 'viewer.css'), 'utf8'),
    doc: fs.readFileSync(path.join(SKILL_DIR, 'templates', 'doc.css'), 'utf8'),
  };
  const viewerJs = fs.readFileSync(path.join(SKILL_DIR, 'templates', 'viewer.js'), 'utf8').replace(/\r\n/g, '\n');
  const hash = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('base64');
  const ctx = { m, t, ix, views, metrics, diff, marks, css, version: VERSION, audience, hash };
  const docs = renderDocs(ctx);
  ctx.docs = docs.map((d) => ({ title: d.title, description: d.description, html: `docs/${d.slug}.html`, md: `docs/${d.slug}.md` }));
  const planta = renderPlanta({ ...ctx, viewerJs });

  const outputs = [[`${OUT}/planta.html`, planta]];
  for (const d of docs) { outputs.push([`${OUT}/docs/${d.slug}.html`, d.html]); outputs.push([`${OUT}/docs/${d.slug}.md`, d.md]); }

  // 6. varredura das saídas (falha fechada)
  const outHits = [];
  for (const [file, content] of outputs) {
    const hit = scanOutput(content);
    if (hit) outHits.push(`${file}: ${hit.kind}`);
  }
  if (outHits.length) fail(EXIT.secret, 'Possível segredo nas saídas — nada foi gravado', outHits);

  // 7. gravação atômica
  for (const [file, content] of outputs) guard.write(file, content.replace(/\r\n/g, '\n'));
  if (args.history) {
    const stamp = m.meta.generatedAt.replace(/[-:]/g, '').replace(/\.\d+/, '').slice(0, 16);
    guard.write(`${histDir}/${stamp}.json`, JSON.stringify(m, null, 2) + '\n');
    const all = guard.list(histDir).filter((f) => /^\d{8}T\d{6}Z?\.json$/.test(f)).sort();
    for (const f of all.slice(0, Math.max(0, all.length - HISTORY_KEEP))) guard.remove(`${histDir}/${f}`);
  }

  // 8. resumo para o agente/usuário
  const containers = m.components.filter((c) => !c.parent && c.kind !== 'external').length;
  const unconfirmed = Object.values(metrics.conf).reduce((a, b) => a + b, 0) - metrics.conf.verified - metrics.conf.inferred;
  line(`✓ arqT ${VERSION}: planta e documentos gerados para "${m.system.name}"`);
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  line(`  ${n(containers, 'contêiner', 'contêineres')} · ${n(m.components.length - containers, 'outro componente', 'outros componentes')} · ${n(m.relations.length, 'relação', 'relações')} · ${n(m.flows.length, 'fluxo', 'fluxos')} · ${n(m.risks.length, 'risco', 'riscos')}`);
  line(`  confiança: ${metrics.conf.verified} verificadas · ${metrics.conf.inferred} inferidas · ${unconfirmed} a confirmar · evidências válidas ${ev.valid}/${ev.total}`);
  line(`  layout: ${views.map((v) => `${v.id} ${v.layout.width}×${v.layout.height}`).join(' · ')}`);
  if (diff) line(`  mudanças desde a última execução: ${diff.empty ? 'nenhuma estrutural' : `+${diff.added.length + diff.relAdded.length} −${diff.removed.length + diff.relRemoved.length} ~${diff.changed.length + diff.relChanged.length}`}`);
  line('');
  line(`  planta:      ${path.join(OUT, 'planta.html')}`);
  for (const d of docs) line(`  documento:   ${path.join(OUT, 'docs', d.slug + '.html')}  (+ .md)`);
  if (warnings.length) {
    line(`\n⚠ ${warnings.length} aviso(s):`);
    for (const w of warnings.slice(0, 40)) line(`  - ${w}`);
    if (warnings.length > 40) line(`  … e mais ${warnings.length - 40}`);
  }
}

function publish(root, guard) {
  const src = path.join(root, OUT);
  const files = ['model.json', ...['executivo', 'arquitetura', 'sustentacao', 'inventario', 'mudancas'].flatMap((s) => [`docs/${s}.html`, `docs/${s}.md`])];
  const missing = files.filter((f) => !fs.existsSync(path.join(src, f)));
  if (missing.length) fail(EXIT.usage, 'Nada para publicar ainda', missing.map((f) => `${OUT}/${f} ausente`), 'Rode /arqt antes de publicar.');
  for (const f of files) guard.write(`docs/arquitetura/${f}`, fs.readFileSync(path.join(src, f)));
  guard.write('docs/arquitetura/planta.html', fs.readFileSync(path.join(src, 'planta.html')));
  line(`✓ ${files.length + 1} arquivos publicados em docs/arquitetura/ (versione-os junto com o código).`);
}

try { main(); } catch (e) {
  line(`✗ erro inesperado: ${e && e.message ? e.message : e}`);
  process.exit(EXIT.invalid);
}
