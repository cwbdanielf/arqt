import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanObject, scanText } from '../../skills/arqt/scripts/lib/secrets.mjs';
import { FsGuard } from '../../skills/arqt/scripts/lib/fsguard.mjs';
import { checkSource, isForbiddenPath } from '../../skills/arqt/scripts/lib/evidence.mjs';
import { html, raw, jsonForScript, md } from '../../skills/arqt/scripts/lib/html.mjs';
import { SKILL } from '../helpers.mjs';

// Segredos falsos ("isca") montados em tempo de execução para não disparar o push protection.
const fake = {
  aws: 'AKIA' + 'Z'.repeat(4) + '7QX2MLPW4RTB',
  gh: 'ghp' + '_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8',
  pk: '-----BEGIN ' + 'RSA PRIVATE KEY-----',
  url: 'postgres://admin:' + 'S3nh4Forte' + '@db.interno:5432/app',
  assign: 'password' + '=' + 'hunter2xyz9',
  jwt: 'eyJ' + 'hbGciOiJIUzI1NiJ9' + '.eyJ' + 'zdWIiOiIxMjM0NTY3ODkwIn0' + '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV',
  entropy: 'Zx9' + 'Qm2LkP0aB7vR4tY8wE1sD6fG3hJ5nU2cX',
};

test('detecta segredos falsos (isca)', () => {
  for (const [k, v] of Object.entries(fake)) assert.ok(scanText(`config: ${v}`), `não detectou ${k}`);
});

test('não acusa textos comuns, nomes de variáveis e hashes de commit', () => {
  for (const s of ['Lê a variável DATABASE_URL e conecta ao Postgres.', 'password: obtida do cofre', 'commit 3f9a1c2b7d4e5f60718293a4b5c6d7e8f9a0b1c2', 'https://api.stripe.com/v1/charges', 'JWT_SECRET', 'src/components/UserProfileSettingsPanelContainer.tsx']) {
    assert.equal(scanText(s), null, s);
  }
});

test('scanObject informa o caminho sem devolver o valor', () => {
  const hits = scanObject({ components: [{ ops: { start: `run --token ${fake.gh}` } }] });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].path, 'components[0].ops.start');
  assert.ok(!JSON.stringify(hits).includes(fake.gh));
});

test('FsGuard recusa escrita fora das pastas autorizadas e via link simbólico', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arqt-fs-'));
  const g = new FsGuard(dir, ['.arqt']);
  g.write('.arqt/a.txt', 'ok');
  assert.equal(fs.readFileSync(path.join(dir, '.arqt', 'a.txt'), 'utf8'), 'ok');
  assert.throws(() => g.write('../fora.txt', 'x'), /recusada/);
  assert.throws(() => g.write('.arqt/../../fora.txt', 'x'), /recusada/);
  assert.throws(() => g.write('src/x.txt', 'x'), /recusada/);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'arqt-out-'));
  try { fs.symlinkSync(outside, path.join(dir, '.arqt', 'link'), 'junction'); } catch { t.skip('symlink indisponível'); return; }
  assert.throws(() => g.write('.arqt/link/x.txt', 'x'), /link simbólico/);
  assert.equal(fs.existsSync(path.join(outside, 'x.txt')), false);
});

test('evidências: caminhos proibidos, absolutos e com .. são recusados', () => {
  for (const p of ['.env', 'config/.env.production', 'certs/server.key', 'id_rsa', 'app/secrets.yaml', 'node_modules/x/index.js', '.git/config']) assert.ok(isForbiddenPath(p), p);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arqt-ev-'));
  fs.writeFileSync(path.join(root, 'a.js'), '1\n2\n3\n');
  assert.equal(checkSource(root, { path: 'a.js', line: 3 }).ok, true);
  assert.equal(checkSource(root, { path: 'a.js', line: 9 }).ok, false);
  assert.equal(checkSource(root, { path: '../a.js' }).ok, false);
  assert.equal(checkSource(root, { path: 'C:/Windows/win.ini' }).ok, false);
  assert.equal(checkSource(root, { path: 'nao-existe.js' }).ok, false);
});

test('escape: HTML, JSON em <script> e Markdown', () => {
  const evil = '</script><img src=x onerror=alert(1)>';
  assert.ok(!html`<p>${evil}</p>`.value.includes('<img'));
  assert.equal(html`${raw('<b>')}`.value, '<b>');
  const j = jsonForScript({ a: evil });
  assert.ok(!j.includes('</script>') && !j.includes('<'));
  assert.deepEqual(JSON.parse(j), { a: evil });
  assert.ok(!md(evil).includes('<'));
});

test('código do skill não usa rede, processos, eval nem innerHTML', () => {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (/\.(mjs|js)$/.test(e.name)) files.push(p);
    }
  })(SKILL);
  const banned = [/child_process/, /node:(net|http|https|dgram|worker_threads|tls)['"]/, /\bfetch\s*\(/, /\beval\s*\(/, /new Function\s*\(/, /XMLHttpRequest/, /\.innerHTML\s*=/, /insertAdjacentHTML/, /document\.write/, /WebSocket/];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const re of banned) assert.ok(!re.test(src), `${path.relative(SKILL, f)} contém ${re}`);
  }
});
