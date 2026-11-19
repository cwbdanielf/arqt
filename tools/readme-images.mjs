// Dev: gera as imagens da página inicial (README) com o próprio arqT, a partir dos modelos de tests/models/.
// Uso: node tools/readme-images.mjs [saída]   (padrão: docs/img)
// Cada vista vira um SVG autocontido (estilos e ícones embutidos), em tema claro e escuro.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize } from '../skills/arqt/scripts/lib/model.mjs';
import { buildViews } from '../skills/arqt/scripts/lib/views.mjs';
import { renderView, renderSequence } from '../skills/arqt/scripts/lib/svg.mjs';
import { strings } from '../skills/arqt/scripts/lib/i18n.mjs';
import { ICONS } from '../skills/arqt/assets/icons.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// [arquivo, modelo, vista | fluxo]
export const IMAGES = [
  ['eshop-conteineres', 'eshop', { view: 'containers' }],
  ['eshop-contexto', 'eshop', { view: 'context' }],
  ['eshop-pedidos', 'eshop', { view: 'comp-ordering-api' }],
  ['eshop-checkout', 'eshop', { flow: 'checkout' }],
  ['t3-conteineres', 'create-t3-turbo', { view: 'containers' }],
  ['petclinic-componentes', 'spring-petclinic', { view: 'comp-petclinic' }],
];

// estilos de diagrama ficam todos no tema do skill (o visualizador só acrescenta interação)
const css = () => fs.readFileSync(path.join(REPO, 'skills', 'arqt', 'assets', 'theme.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');

function standalone(svg, theme, styles) {
  const symbols = Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
  return svg.replace(/^<svg /, `<svg xmlns="http://www.w3.org/2000/svg" data-theme="${theme}" `)
    .replace(/(<svg [^>]*>)/, `$1<style>${styles}</style><defs>${symbols}</defs><rect width="100%" height="100%" rx="18" fill="var(--bg)"/>`) + '\n';
}

export function renderImages() {
  const styles = css();
  const out = {};
  const cache = new Map();
  for (const [name, model, sel] of IMAGES) {
    if (!cache.has(model)) {
      const m = normalize(JSON.parse(fs.readFileSync(path.join(REPO, 'tests', 'models', `${model}.json`), 'utf8')));
      const t = strings(m.meta.language);
      cache.set(model, { m, t, views: buildViews(m, t) });
    }
    const { m, t, views } = cache.get(model);
    let svg;
    if (sel.view) {
      const v = views.find((x) => x.id === sel.view);
      if (!v) throw new Error(`${model}: vista ${sel.view} não existe`);
      svg = renderView(v, t, { idPrefix: name + '-' });
    } else {
      const f = m.flows.find((x) => x.id === sel.flow);
      const node = (id) => m.actors.find((a) => a.id === id) || m.components.find((c) => c.id === id);
      svg = renderSequence(f, (id) => node(id)?.name || id, (id) => { const n = node(id); return n.kind === 'external-system' ? 'external' : n.kind; }, t, { idPrefix: name + '-' });
    }
    for (const theme of ['light', 'dark']) out[`${name}-${theme}.svg`] = standalone(svg, theme, styles);
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(process.argv[2] || path.join(REPO, 'docs', 'img'));
  fs.mkdirSync(dir, { recursive: true });
  const files = renderImages();
  for (const [f, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), content);
  console.log(`✓ ${Object.keys(files).length} imagens em ${path.relative(REPO, dir) || '.'}`);
}
