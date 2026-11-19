// Confere evidências path:line sem ler arquivos sensíveis.
import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN = [
  /(^|\/)\.env(\.|$)/i, /\.(pem|key|pfx|p12|jks|keystore|tfstate)$/i, /(^|\/)id_[a-z0-9]+(\.pub)?$/i,
  /(^|\/)[^/]*secret[^/]*$/i, /(^|\/)\.git(\/|$)/, /(^|\/)node_modules(\/|$)/, /(^|\/)\.npmrc$/i, /(^|\/)\.netrc$/i,
];

export const isForbiddenPath = (p) => FORBIDDEN.some((re) => re.test(p));

export function normalizeSourcePath(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

const lineCache = new Map();
function lineCount(abs, size) {
  if (lineCache.has(abs)) return lineCache.get(abs);
  let n = null;
  if (size <= 4 * 1024 * 1024) {
    const buf = fs.readFileSync(abs);
    n = 1;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 10) n++;
    if (buf.length && buf[buf.length - 1] === 10) n--;
  }
  lineCache.set(abs, n);
  return n;
}

// Retorna { ok, reason } para uma evidência.
export function checkSource(root, src) {
  const p = normalizeSourcePath(src.path);
  if (!p || path.isAbsolute(p) || /^[a-zA-Z]:/.test(p) || p.split('/').includes('..')) return { ok: false, path: p, reason: 'caminho deve ser relativo à raiz, sem ".."' };
  if (isForbiddenPath(p)) return { ok: false, path: p, reason: 'caminho proibido (segredos/artefatos)' };
  const abs = path.join(root, ...p.split('/'));
  let st;
  try { st = fs.statSync(abs); } catch { return { ok: false, path: p, reason: 'arquivo não encontrado' }; }
  if (st.isDirectory()) return src.line ? { ok: false, path: p, reason: 'linha informada para um diretório' } : { ok: true, path: p, dir: true };
  if (src.line) {
    const n = lineCount(abs, st.size);
    if (n != null && src.line > n) return { ok: false, path: p, reason: `linha ${src.line} além do fim do arquivo (${n} linhas)` };
  }
  return { ok: true, path: p };
}

// Valida as evidências de todo o modelo. Remove as inválidas e rebaixa "verified" sem evidência.
export function verifyEvidence(root, m) {
  const warnings = [];
  const downgraded = [];
  let total = 0; let valid = 0;
  const groups = [
    ['actors', m.actors], ['components', m.components], ['relations', m.relations], ['flows', m.flows],
    ['deployment', m.deployment], ['data', m.data], ['constraints', m.constraints], ['decisions', m.decisions], ['risks', m.risks],
  ];
  for (const [name, arr] of groups) {
    arr.forEach((x, i) => {
      const kept = [];
      for (const s of x.sources || []) {
        total++;
        const r = checkSource(root, s);
        if (r.ok) { valid++; kept.push({ path: r.path, ...(s.line ? { line: s.line } : {}) }); }
        else warnings.push(`${name}[${i}] (${x.id}): evidência "${r.path}${s.line ? ':' + s.line : ''}" descartada — ${r.reason}`);
      }
      x.sources = kept;
      if (x.confidence === 'verified' && kept.length === 0 && ['components', 'relations', 'actors', 'flows', 'data'].includes(name)) {
        x.confidence = 'inferred';
        downgraded.push(name === 'relations' ? `${x.from}→${x.to}` : x.id);
      }
    });
  }
  if (downgraded.length) {
    const list = downgraded.length > 12 ? downgraded.slice(0, 12).join(', ') + ', …' : downgraded.join(', ');
    warnings.push(`${downgraded.length} afirmação(ões) "verified" sem evidência (sources com path:line) foram rebaixadas para "inferred": ${list}. Adicione "sources" para mantê-las como verificadas.`);
  }
  return { warnings, total, valid, downgraded: downgraded.length };
}
