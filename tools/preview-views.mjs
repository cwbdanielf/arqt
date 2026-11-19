// Dev: renderiza todas as vistas de um modelo numa página simples para inspeção visual.
import fs from 'node:fs';
import path from 'node:path';
import { normalize } from '../skills/arqt/scripts/lib/model.mjs';
import { buildViews } from '../skills/arqt/scripts/lib/views.mjs';
import { renderView, renderSequence } from '../skills/arqt/scripts/lib/svg.mjs';
import { strings } from '../skills/arqt/scripts/lib/i18n.mjs';
import { sprite } from '../skills/arqt/assets/icons.mjs';
const [,, modelPath, outPath] = process.argv;
const m = normalize(JSON.parse(fs.readFileSync(modelPath, 'utf8')));
const t = strings(m.meta.language);
const views = buildViews(m, t);
const css = fs.readFileSync('skills/arqt/assets/theme.css', 'utf8');
const nm = new Map([...m.actors, ...m.components].map(x => [x.id, x]));
const kindOf = id => { const x = nm.get(id); return x.kind === 'external-system' ? 'external' : x.kind; };
let body = views.map(v => `<h2>${v.title} (${v.layout.width}×${v.layout.height})</h2>` + renderView(v, t)).join('');
body += m.flows.map(f => `<h2>${f.name}</h2>` + renderSequence(f, id => nm.get(id).name, kindOf, t)).join('');
fs.writeFileSync(outPath, `<!doctype html><meta charset=utf-8><style>${css} body{background:var(--bg);font-family:var(--font);color:var(--text);padding:20px} h2{font-size:15px} svg.diagram{max-width:100%;height:auto;display:block;margin-bottom:30px}</style>${sprite()}${body}`);
console.log('ok', views.map(v => v.id).join(', '));
