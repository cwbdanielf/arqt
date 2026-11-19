// Varredura de segredos (falha fechada). Nunca devolve o valor encontrado.

const PATTERNS = [
  ['chave privada', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/],
  ['AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ['GitLab token', /\bglpat-[A-Za-z0-9_-]{20,}\b/],
  ['Slack token', /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/],
  ['Slack webhook', /hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Stripe key', /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b/],
  ['OpenAI/Anthropic key', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['URL com credenciais', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]{3,}@[^\s/]+/i],
  ['atribuição de segredo', /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)\b\s*[:=]\s*["']?(?=[^\s"',;]*[0-9])(?=[^\s"',;]*[A-Za-z])[^\s"',;]{8,}/i],
];

function entropy(s) {
  const freq = new Map();
  for (const ch of s) freq.set(ch, (freq.get(ch) || 0) + 1);
  let h = 0;
  for (const n of freq.values()) { const p = n / s.length; h -= p * Math.log2(p); }
  return h;
}

function highEntropyToken(str) {
  for (const tok of str.split(/[\s"'`,;()<>{}\[\]]+/)) {
    if (tok.length < 32 || tok.length > 200) continue;
    if (!/^[A-Za-z0-9+/=_-]+$/.test(tok)) continue;
    if (!(/[a-z]/.test(tok) && /[A-Z]/.test(tok) && /[0-9]/.test(tok))) continue;
    if (/^[0-9a-f]+$/i.test(tok)) continue; // hashes hex (commits, checksums)
    if (entropy(tok) >= 4.5) return true;
  }
  return false;
}

const SKIP_KEYS = new Set(['path', 'commit', 'generatedAt']);

// Varre todos os textos de um objeto JSON. Retorna [{ path, kind }].
export function scanObject(obj) {
  const hits = [];
  const walk = (v, p, key) => {
    if (typeof v === 'string') {
      if (SKIP_KEYS.has(key)) return;
      const kind = scanText(v);
      if (kind) hits.push({ path: p, kind });
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k, k);
  };
  walk(obj, '', '');
  return hits;
}

export function scanText(text) {
  for (const [kind, re] of PATTERNS) if (re.test(text)) return kind;
  if (highEntropyToken(text)) return 'texto de alta entropia (possível chave)';
  return null;
}

// Varre uma saída já renderizada (sem a parte de scripts/estilos próprios do arqT).
export function scanOutput(text) {
  for (const [kind, re] of PATTERNS) {
    const m = re.exec(text);
    if (m) return { kind, offset: m.index };
  }
  return null;
}
