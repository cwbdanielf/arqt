// Templates com escape por padrão. Interpolações são escapadas, exceto valores
// criados por raw() ou por outra chamada de html``. Arrays são concatenados.

const RAW = Symbol('raw');

export const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const raw = (s) => ({ [RAW]: true, value: String(s ?? '') });
export const isRaw = (v) => v != null && v[RAW] === true;

function part(v) {
  if (v == null || v === false || v === true) return '';
  if (isRaw(v)) return v.value;
  if (Array.isArray(v)) return v.map(part).join('');
  return escapeHtml(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return raw(out);
}

export const render = (v) => part(v);

// JSON seguro para <script type="application/json">: impede </script> e quebras U+2028/9.
const UNSAFE_JSON = new RegExp('[<>&' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');
const BACKSLASH = String.fromCharCode(92);
export const jsonForScript = (obj) => JSON.stringify(obj)
  .replace(UNSAFE_JSON, (c) => BACKSLASH + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

// Markdown: neutraliza HTML e caracteres de tabela/estrutura em texto do modelo.
export const md = (s) => String(s ?? '')
  .replace(/\r?\n+/g, ' ')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\|/g, '\\|')
  .replace(/([*_`\[\]])/g, '\\$1');

// Rótulo seguro para Mermaid (entre aspas).
export const mermaidLabel = (s) => String(s ?? '')
  .replace(/["`]/g, "'")
  .replace(/[<>]/g, ' ')
  .replace(/[\r\n]+/g, ' ')
  .replace(/[#;]/g, ' ')
  .trim()
  .slice(0, 80);
