// Validador mínimo de JSON Schema (subconjunto) — sem dependências.
// Suporta: type, required, properties, additionalProperties(false), enum, const,
// pattern, items, minItems, maxItems, minimum, maximum, minLength, maxLength, $ref local.

const typeOf = (v) => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
};

const typeMatches = (want, v) => {
  const t = typeOf(v);
  if (want === t) return true;
  if (want === 'number' && t === 'integer') return true;
  return false;
};

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`$ref não suportado: ${ref}`);
  return ref.slice(2).split('/').reduce((node, key) => node?.[key], root);
}

const fmtPath = (p) => p || '(raiz)';
const preview = (v) => {
  const s = JSON.stringify(v);
  return s && s.length > 60 ? s.slice(0, 57) + '...' : s;
};

export function validateSchema(schema, value, { maxErrors = 50 } = {}) {
  const errors = [];
  const push = (path, msg) => { if (errors.length < maxErrors) errors.push({ path: fmtPath(path), message: msg }); };

  function walk(node, v, path) {
    if (errors.length >= maxErrors) return;
    if (node.$ref) return walk(resolveRef(schema, node.$ref), v, path);

    if ('const' in node && v !== node.const) return push(path, `deve ser ${JSON.stringify(node.const)}`);
    if (node.enum && !node.enum.includes(v)) return push(path, `valor ${preview(v)} inválido; use um de: ${node.enum.join(', ')}`);

    if (node.type) {
      const types = Array.isArray(node.type) ? node.type : [node.type];
      if (!types.some((t) => typeMatches(t, v))) return push(path, `tipo esperado ${types.join('|')}, recebido ${typeOf(v)}`);
    }

    const t = typeOf(v);
    if (t === 'string') {
      if (node.minLength != null && v.length < node.minLength) push(path, `texto vazio ou curto demais (mín. ${node.minLength})`);
      if (node.maxLength != null && v.length > node.maxLength) push(path, `texto longo demais (${v.length} > ${node.maxLength}); resuma`);
      if (node.pattern && !new RegExp(node.pattern).test(v)) push(path, `valor ${preview(v)} não segue o padrão ${node.pattern}`);
    }
    if (t === 'integer' || t === 'number') {
      if (node.minimum != null && v < node.minimum) push(path, `mínimo ${node.minimum}`);
      if (node.maximum != null && v > node.maximum) push(path, `máximo ${node.maximum}`);
    }
    if (t === 'array') {
      if (node.minItems != null && v.length < node.minItems) push(path, `precisa de pelo menos ${node.minItems} item(ns)`);
      if (node.maxItems != null && v.length > node.maxItems) push(path, `itens demais (${v.length} > ${node.maxItems}); agrupe ou resuma`);
      if (node.items) v.forEach((item, i) => walk(node.items, item, `${path}[${i}]`));
    }
    if (t === 'object') {
      for (const key of node.required || []) {
        if (!(key in v)) push(path, `campo obrigatório ausente: "${key}"`);
      }
      const props = node.properties || {};
      for (const [key, val] of Object.entries(v)) {
        const sub = path ? `${path}.${key}` : key;
        if (props[key]) walk(props[key], val, sub);
        else if (node.additionalProperties === false) {
          const known = Object.keys(props);
          push(sub, `campo desconhecido "${key}"; campos aceitos: ${known.join(', ')}`);
        }
      }
    }
  }

  walk(schema, value, '');
  return errors;
}
