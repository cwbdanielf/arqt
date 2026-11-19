// Template da planta interativa. Tudo que vem do modelo passa por html`` (escape por padrão).
import { html, raw, jsonForScript } from '../scripts/lib/html.mjs';
import { renderView, renderSequence } from '../scripts/lib/svg.mjs';
import { icon, sprite } from '../assets/icons.mjs';
import { countLabel } from '../scripts/lib/i18n.mjs';

const I = (name, cls) => raw(icon(name, cls));
const kindIcon = (k) => (k === 'external-system' ? 'external' : k);
const sevColor = (score) => (score >= 6 ? 'var(--bad)' : score >= 3 ? 'var(--warn)' : 'var(--ok)');

function fmtDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return lang === 'en'
    ? `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`
    : `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

export function buildClientData(ctx) {
  const { m, ix, views, t } = ctx;
  const entities = {};
  for (const c of m.components) {
    entities[c.id] = {
      id: c.id, type: 'component', name: c.name, kind: c.kind, level: c.level, tech: c.tech || '', text: c.responsibility || '',
      confidence: c.confidence, parent: c.parent || null, boundary: c.boundary ? ix.boundary.get(c.boundary)?.name || c.boundary : null,
      children: (ix.children.get(c.id) || []).map((k) => k.id), ops: c.ops, sources: c.sources, tags: c.tags,
    };
  }
  for (const a of m.actors) {
    entities[a.id] = { id: a.id, type: 'actor', name: a.name, kind: a.kind === 'person' ? 'person' : 'external', tech: a.tech || '', text: a.description || '', confidence: a.confidence, sources: a.sources, children: [], ops: {}, tags: [] };
  }
  entities.__system = { id: '__system', type: 'system', name: m.system.name, kind: 'system', tech: m.system.stack.join(' · '), text: m.system.purpose, confidence: 'verified', sources: [], children: m.components.filter((c) => !c.parent && c.kind !== 'external').map((c) => c.id), ops: {}, tags: [] };

  const vdata = {};
  for (const v of views) {
    vdata[v.id] = {
      title: v.title, kind: v.kind, parent: v.parent || null, w: v.layout.width, h: v.layout.height,
      nodes: Object.fromEntries(Object.entries(v.layout.nodes).map(([id, n]) => [id, [n.x, n.y, n.w, n.h]])),
      edges: Object.fromEntries(v.edges.map((e) => [e.id, e.relIds])),
    };
  }
  const home = {};
  for (const c of m.components) home[c.id] = c.parent ? `comp-${c.parent}` : 'containers';
  for (const a of m.actors) home[a.id] = 'containers';
  home.__system = 'context';

  const risksBy = {}; const flowsBy = {};
  for (const r of m.risks) if (r.component) (risksBy[r.component] ||= []).push(r.id);
  for (const f of m.flows) for (const id of new Set(f.steps.flatMap((s) => [s.from, s.to]))) (flowsBy[id] ||= []).push(f.id);

  return {
    lang: m.meta.language, audience: ctx.audience,
    t: { ui: t.ui, testsState: t.testsState, kind: t.kind, conf: t.conf, confHint: t.confHint, tab: t.tab, audience: t.audience },
    entities, relations: m.relations.map((r) => ({ id: r.id, from: r.from, to: r.to, label: r.label || '', protocol: r.protocol || '', async: r.async, confidence: r.confidence, sources: r.sources })),
    views: vdata, home, risksBy, flowsBy,
    risks: Object.fromEntries(m.risks.map((r) => [r.id, { id: r.id, title: r.title, impact: r.impact, likelihood: r.likelihood, component: r.component || null }])),
    flows: m.flows.map((f) => ({ id: f.id, name: f.name, description: f.description || '', steps: f.steps, confidence: f.confidence })),
    decisions: m.decisions.map((d) => ({ id: d.id, title: d.title })),
    data: m.data.map((d) => ({ id: d.id, name: d.name, store: d.store || null })),
  };
}

function tabsDef(ctx) {
  const { m, views, diff } = ctx;
  const compViews = views.filter((v) => v.kind === 'components');
  return [
    { id: 'overview', icon: 'layers', aud: 'exec ops dev' },
    { id: 'context', icon: 'external', aud: 'exec ops dev' },
    { id: 'containers', icon: 'service', aud: 'exec ops dev', count: m.components.filter((c) => !c.parent && c.kind !== 'external').length },
    compViews.length && { id: 'components', icon: 'lib', aud: 'ops dev', count: compViews.length },
    m.flows.length && { id: 'flows', icon: 'flow', aud: 'ops dev', count: m.flows.length },
    m.data.length && { id: 'data', icon: 'db', aud: 'dev' , count: m.data.length },
    m.deployment.length && { id: 'deployment', icon: 'server', aud: 'ops dev' },
    { id: 'health', icon: 'shield', aud: 'exec ops dev', count: m.risks.length || null },
    (m.decisions.length || m.glossary.length) && { id: 'decisions', icon: 'doc', aud: 'exec dev', count: m.decisions.length || null },
    diff && !diff.empty && { id: 'changes', icon: 'history', aud: 'exec ops dev' },
    { id: 'docs', icon: 'file', aud: 'exec ops dev' },
  ].filter(Boolean);
}

function canvasPage(id, svg, crumb, t, extra = '') {
  return html`<section class="page canvas-page" id="p-${id}" data-page="${id}">
    ${raw(extra)}
    <div class="canvas-wrap">
      <div class="view-head">${crumb}</div>
      <div class="canvas" data-canvas><div class="stage">${raw(svg)}</div></div>
      <div class="legend" data-legend></div>
      <div class="hint">${t.ui.hint}</div>
      <div class="toolbar">
        <button data-act="zoom-out" title="${t.ui.zoomOut}" aria-label="${t.ui.zoomOut}">${I('minus')}</button>
        <span class="zoomv" data-zoomv>100%</span>
        <button data-act="zoom-in" title="${t.ui.zoomIn}" aria-label="${t.ui.zoomIn}">${I('plus')}</button>
        <button data-act="fit" title="${t.ui.fit} (F)" aria-label="${t.ui.fit}">${I('fit')}</button>
        <span class="sep"></span>
        <button data-act="legend" title="${t.ui.legend}" aria-label="${t.ui.legend}">${I('help')}</button>
        <button data-act="export-svg" title="${t.ui.exportSvg}" aria-label="${t.ui.exportSvg}">${I('download')}</button>
        <button data-act="export-png" title="${t.ui.exportPng}" aria-label="${t.ui.exportPng}">${I('copy')}</button>
      </div>
    </div>
  </section>`;
}

function overview(ctx) {
  const { m, t, metrics, views, ix, diff } = ctx;
  const containers = m.components.filter((c) => !c.parent && c.kind !== 'external');
  const comps = m.components.filter((c) => c.parent);
  const externals = [...m.actors.filter((a) => a.kind === 'external-system'), ...m.components.filter((c) => !c.parent && c.kind === 'external')];
  const persons = m.actors.filter((a) => a.kind === 'person');
  const high = m.risks.filter((r) => r.impact * r.likelihood >= 6).length;
  const total = metrics.totalClaims || 1;
  const pct = (n) => Math.round((n / total) * 100);
  const ctxView = views.find((v) => v.id === 'context');
  const todo = [
    ...m.components.filter((c) => c.confidence === 'unconfirmed').map((c) => ({ id: c.id, text: c.name, sub: t.kind[c.kind] })),
    ...m.actors.filter((a) => a.confidence === 'unconfirmed').map((a) => ({ id: a.id, text: a.name, sub: t.kind[a.kind] })),
    ...m.relations.filter((r) => r.confidence === 'unconfirmed').map((r) => ({ id: r.from, text: `${ix.node(r.from)?.name} → ${ix.node(r.to)?.name}`, sub: r.label || '' })),
    ...m.openQuestions.map((q) => ({ id: null, text: q, sub: '' })),
  ];
  const meta = m.meta;
  return html`<section class="page doc-page" id="p-overview" data-page="overview">
    <div class="hero">
      <div>
        <div class="eyebrow">${t.ui.exec}</div>
        <h2>${m.system.name}</h2>
        <p class="lede">${m.system.purpose}</p>
        ${m.system.summary ? html`<p class="summary">${m.system.summary}</p>` : ''}
        <div class="meta">
          <span>${t.ui.generated} <b>${fmtDate(meta.generatedAt, meta.language)}</b></span>
          ${meta.commit ? html`<span>${t.ui.commit} <b class="mono">${meta.commit}</b></span>` : ''}
          ${meta.branch ? html`<span>${t.ui.branch} <b>${meta.branch}</b></span>` : ''}
          ${meta.analyzedFiles ? html`<span><b>${meta.analyzedFiles}</b> ${t.ui.files}</span>` : ''}
        </div>
      </div>
      <button class="card thumb" data-goto="context" aria-label="${t.tab.context}">
        <span class="t-cap"><span>${t.tab.context}</span><span>${I('chevron', 'ic')}</span></span>
        ${raw(renderView(ctxView, t, { idPrefix: 'ov-' }))}
      </button>
    </div>
    <div class="kpis">
      <div class="card kpi"><div class="v">${containers.length}</div><div class="l">${countLabel(t, 'containersCount', containers.length)}</div></div>
      <div class="card kpi"><div class="v">${comps.length}</div><div class="l">${countLabel(t, 'componentsCount', comps.length)}</div></div>
      <div class="card kpi"><div class="v">${externals.length}</div><div class="l">${countLabel(t, 'integrationsCount', externals.length)}</div></div>
      <div class="card kpi"><div class="v">${m.relations.length}</div><div class="l">${countLabel(t, 'relationsCount', m.relations.length)}</div></div>
      <div class="card kpi${high ? ' bad' : ''}"><div class="v">${high}</div><div class="l">${countLabel(t, 'highRisks', high)}</div></div>
      <div class="card kpi"><div class="v">${pct(metrics.conf.verified)}%</div><div class="l">${t.ui.verifiedShare}</div>
        <div class="bar" title="${t.conf.verified} ${metrics.conf.verified} · ${t.conf.inferred} ${metrics.conf.inferred} · ${t.conf.unconfirmed} ${metrics.conf.unconfirmed}"><i style="width:${pct(metrics.conf.verified)}%;background:var(--ok)"></i><i style="width:${pct(metrics.conf.inferred)}%;background:var(--warn)"></i><i style="width:${pct(metrics.conf.unconfirmed)}%;background:var(--text-3)"></i></div></div>
    </div>
    <div class="grid3">
      <div class="card box"><h3>${I('layers')}${t.ui.capabilities}</h3>${m.system.businessCapabilities.length ? html`<div class="chips">${m.system.businessCapabilities.map((c) => html`<span class="chip">${c}</span>`)}</div>` : html`<p class="empty-note">${t.ui.none}</p>`}</div>
      <div class="card box"><h3>${I('lib')}${t.ui.stack}</h3>${m.system.stack.length ? html`<div class="chips">${m.system.stack.map((c) => html`<span class="chip">${c}</span>`)}</div>` : html`<p class="empty-note">${t.ui.none}</p>`}</div>
      <div class="card box"><h3>${I('person')}${t.ui.people} · ${t.ui.integrations}</h3>
        <div class="chips">${persons.map((p) => html`<button class="chip" data-select="${p.id}">${I('person')} ${p.name}</button>`)}${externals.map((x) => html`<button class="chip" data-select="${x.id}">${I('external')} ${x.name}</button>`)}</div>
      </div>
    </div>
    ${diff && !diff.empty ? html`<div class="card box" style="margin-bottom:16px"><h3>${I('history')}${t.ui.changesSince}</h3><p class="empty-note">${t.ui.added}: <b>${diff.added.length}</b> · ${t.ui.removed}: <b>${diff.removed.length}</b> · ${t.ui.changed}: <b>${diff.changed.length + diff.relAdded.length + diff.relRemoved.length}</b> — <button class="linklike" data-goto="changes">${t.tab.changes}</button></p></div>` : ''}
    <div class="grid2">
      ${m.system.qualityGoals.length ? html`<div class="card box"><h3>${I('shield')}${t.ui.qualityGoals}</h3><ul class="todo">${m.system.qualityGoals.map((q) => html`<li>${I('check')}<div><b>${q.name}</b><small>${q.description}</small></div></li>`)}</ul></div>` : ''}
      <div class="card box"><h3>${I('alert')}${t.ui.toConfirm} <span class="chip">${todo.length}</span></h3>
        ${todo.length ? html`<ul class="todo">${todo.slice(0, 8).map((x) => html`<li>${I('help')}<div>${x.id ? html`<button class="linklike" data-select="${x.id}">${x.text}</button>` : x.text}${x.sub ? html`<small>${x.sub}</small>` : ''}</div></li>`)}</ul>${todo.length > 8 ? html`<p class="empty-note">+${todo.length - 8}</p>` : ''}` : html`<p class="empty-note">${t.ui.noneFound}</p>`}
      </div>
    </div>
    <h3 class="sec-title">${I('service')}${t.tab.containers} <small>${containers.length}</small></h3>
    <div class="cgrid">${containers.map((c) => html`<button class="ccard k-${c.kind}" data-select="${c.id}">
      <span class="c-top"><span class="tile">${I(kindIcon(c.kind))}</span><span><b>${c.name}</b><small>${t.kind[c.kind]}${c.tech ? ' · ' + c.tech : ''}</small></span></span>
      <p>${c.responsibility}</p>
      <span class="c-foot"><span class="conf ${c.confidence}">${t.conf[c.confidence]}</span>${(ix.children.get(c.id) || []).length ? html`<span class="chip">${(ix.children.get(c.id) || []).length} ${t.ui.components}</span>` : ''}</span>
    </button>`)}</div>
  </section>`;
}

function componentsPage(ctx) {
  const { views, t, ix } = ctx;
  const compViews = views.filter((v) => v.kind === 'components');
  if (!compViews.length) return '';
  const side = html`<aside class="side"><h3>${t.ui.selectContainer}</h3>${compViews.map((v, i) => {
    const c = ix.comp.get(v.parent);
    return html`<button class="item" data-compview="${v.id}"${i === 0 ? raw(' aria-current="true"') : ''}><b>${c.name}</b><small>${(ix.children.get(c.id) || []).length} ${t.ui.components}${c.tech ? ' · ' + c.tech : ''}</small></button>`;
  })}</aside>`;
  const svgs = compViews.map((v) => renderView(v, t, { marks: ctx.marks })).join('');
  const crumb = html`<div class="crumb"><button data-goto="containers">${t.tab.containers}</button>${I('chevron')}<b data-crumb-title>${compViews[0].title}</b></div>`;
  return canvasPage('components', svgs, crumb, t, side.value);
}

function flowsPage(ctx) {
  const { m, t, ix } = ctx;
  if (!m.flows.length) return '';
  const nameOf = (id) => ix.node(id)?.name || id;
  const kindOf = (id) => { const n = ix.node(id); return !n ? 'service' : n.kind === 'external-system' ? 'external' : n.kind; };
  const side = html`<aside class="side"><h3>${t.tab.flows}</h3>${m.flows.map((f, i) => html`<button class="item" data-flow="${f.id}"${i === 0 ? raw(' aria-current="true"') : ''}><b>${f.name}</b><small>${f.steps.length} ${t.ui.step.toLowerCase()}s · ${t.conf[f.confidence]}</small>${f.description ? html`<small style="display:block;margin-top:4px">${f.description}</small>` : ''}</button>`)}</aside>`;
  const svgs = m.flows.map((f) => renderSequence(f, nameOf, kindOf, t)).join('');
  const crumb = html`<div class="crumb">${I('flow')}<b data-crumb-title>${m.flows[0].name}</b></div>`;
  const stepbar = `<div class="stepbar" data-stepbar><button data-step="prev" aria-label="${t.ui.prev}">${icon('back')}</button><span class="st" data-steptext></span><button data-step="next" aria-label="${t.ui.next}">${icon('chevron')}</button><button data-step="play" aria-label="${t.ui.play}">${icon('present')}</button></div>`;
  return canvasPage('flows', svgs, crumb, t, side.value).value.replace('<div class="hint">', stepbar + '<div class="hint">');
}

function healthPage(ctx) {
  const { m, t, metrics, ix } = ctx;
  const cellCount = (imp, lik) => m.risks.filter((r) => r.impact === imp && r.likelihood === lik).length;
  const heatColor = (imp, lik) => {
    const s = imp * lik;
    const c = s >= 6 ? 'var(--bad)' : s >= 3 ? 'var(--warn)' : 'var(--ok)';
    return `background:color-mix(in srgb, ${c} ${cellCount(imp, lik) ? 26 : 8}%, var(--surface))`;
  };
  const lvl = [t.ui.low, t.ui.medium, t.ui.high];
  const risks = [...m.risks].sort((a, b) => b.impact * b.likelihood - a.impact * a.likelihood || (a.id < b.id ? -1 : 1));
  const max = Math.max(1, ...metrics.fanIn.map((x) => x.n), ...metrics.fanOut.map((x) => x.n));
  const bars = (list) => (list.length ? html`<ul class="metric-list">${list.map((x) => html`<li><button class="linklike" data-select="${x.id}" style="min-width:140px">${x.name}</button><span class="barw"><i style="width:${Math.round((x.n / max) * 100)}%"></i></span><span class="n">${x.n}</span></li>`)}</ul>` : html`<p class="empty-note">${t.ui.noneFound}</p>`);
  return html`<section class="page doc-page" id="p-health" data-page="health">
    <div class="grid2">
      <div class="card box"><h3>${I('alert')}${t.ui.impact} × ${t.ui.likelihood}</h3>
        <div class="heat">
          ${[3, 2, 1].map((imp, i) => html`${i === 1 ? html`<div class="ax y" style="grid-row:1/4;grid-column:1">${t.ui.impact} →</div>` : ''}${[1, 2, 3].map((lik) => html`<div class="cell${cellCount(imp, lik) ? '' : ' z0'}" style="grid-row:${i + 1};grid-column:${lik + 1};${heatColor(imp, lik)}" title="${t.ui.impact}: ${lvl[imp - 1]} · ${t.ui.likelihood}: ${lvl[lik - 1]}">${cellCount(imp, lik) || '·'}</div>`)}`)}
          <div class="ax" style="grid-row:4;grid-column:2/5">${t.ui.likelihood} →</div>
        </div>
      </div>
      <div class="card box"><h3>${I('shield')}${t.ui.metrics}</h3>
        <ul class="metric-list">
          <li>${t.ui.cycles}<span class="barw" style="background:none"></span><b>${metrics.cycles.length}</b></li>
          <li>${t.ui.spof}<span class="barw" style="background:none"></span><b>${metrics.spof.length}</b></li>
          <li>${t.ui.opsGaps}<span class="barw" style="background:none"></span><b>${metrics.opsGaps.length}</b></li>
          <li>${t.ui.deps} ${t.ui.unpinned}<span class="barw" style="background:none"></span><b>${metrics.unpinned.length}</b></li>
          <li>${t.ui.deps} · ${t.ui.copyleft}<span class="barw" style="background:none"></span><b>${metrics.copyleft.length}</b></li>
          <li>${t.ui.confidence}<span class="barw" style="background:none"></span><b>${metrics.conf.verified}/${metrics.totalClaims}</b>&nbsp;<small class="empty-note">${t.ui.verifiedShare}</small></li>
        </ul>
      </div>
    </div>
    ${risks.length ? html`<h3 class="sec-title">${I('alert')}${t.tab.health} <small>${risks.length}</small></h3>
    <div class="grid2">${risks.map((r) => html`<div class="card risk" style="--sev:${sevColor(r.impact * r.likelihood)}">
      <h4><span>${r.title}</span><span class="score">${t.ui.impact} ${lvl[r.impact - 1]} · ${t.ui.likelihood} ${lvl[r.likelihood - 1]}</span></h4>
      ${r.component ? html`<p><span class="lbl">${t.ui.where}:</span> <button class="linklike" data-select="${r.component}">${ix.node(r.component)?.name || r.component}</button></p>` : ''}
      ${r.evidence ? html`<p><span class="lbl">${t.ui.evidence}:</span> ${r.evidence}</p>` : ''}
      ${r.recommendation ? html`<p><span class="lbl">${t.ui.recommendation}:</span> ${r.recommendation}</p>` : ''}
      <p><span class="conf ${r.confidence}">${t.conf[r.confidence]}</span></p>
    </div>`)}</div>` : ''}
    <div class="grid3">
      <div class="card box"><h3>${t.ui.fanIn}</h3>${bars(metrics.fanIn)}</div>
      <div class="card box"><h3>${t.ui.fanOut}</h3>${bars(metrics.fanOut)}</div>
      <div class="card box"><h3>${t.ui.spof}</h3>${metrics.spof.length ? html`<ul class="metric-list">${metrics.spof.map((s) => html`<li><button class="linklike" data-select="${s.id}">${s.name}</button></li>`)}</ul>` : html`<p class="empty-note">${t.ui.noneFound}</p>`}
        ${metrics.cycles.length ? html`<h3 style="margin-top:14px">${t.ui.cycles}</h3><ul class="metric-list">${metrics.cycles.map((c) => html`<li>${c.map((x) => x.name).join(' ⇄ ')}</li>`)}</ul>` : ''}</div>
    </div>
    ${metrics.opsGaps.length ? html`<div class="card box"><h3>${I('server')}${t.ui.opsGaps}</h3><ul class="metric-list">${metrics.opsGaps.map((g) => html`<li><button class="linklike" data-select="${g.id}" style="min-width:180px">${g.name}</button><span class="chips">${g.gaps.map((x) => html`<span class="chip">${t.ui[x]}</span>`)}</span></li>`)}</ul></div>` : ''}
  </section>`;
}

function decisionsPage(ctx) {
  const { m, t } = ctx;
  if (!m.decisions.length && !m.glossary.length) return '';
  return html`<section class="page doc-page" id="p-decisions" data-page="decisions">
    ${m.decisions.length ? html`<h3 class="sec-title" style="margin-top:0">${I('doc')}${t.tab.decisions} <small>${m.decisions.length}</small></h3>
    ${m.decisions.map((d) => html`<article class="card adr" id="adr-${d.id}"><header><h4><span class="id">${d.id.toUpperCase()}</span>${d.title}</h4><span class="conf ${d.confidence}">${t.conf[d.confidence]}</span></header>
      <dl>${d.context ? html`<dt>${t.ui.context}</dt><dd>${d.context}</dd>` : ''}<dt>${t.ui.decision}</dt><dd>${d.decision}</dd>${d.consequences ? html`<dt>${t.ui.consequences}</dt><dd>${d.consequences}</dd>` : ''}${d.evidence ? html`<dt>${t.ui.evidence}</dt><dd>${d.evidence}</dd>` : ''}${d.sources.length ? html`<dt>${t.ui.sources}</dt><dd>${d.sources.map((s) => html`<code>${s.path}${s.line ? ':' + s.line : ''}</code> `)}</dd>` : ''}</dl></article>`)}` : ''}
    ${m.glossary.length ? html`<h3 class="sec-title">${I('help')}${t.tab.glossary} <small>${m.glossary.length}</small></h3><div class="card box"><div class="gloss">${m.glossary.map((g) => html`<div class="term">${g.term}</div><div class="def">${g.definition}</div>`)}</div></div>` : ''}
  </section>`;
}

function dataPage(ctx) {
  const { m, t, ix } = ctx;
  if (!m.data.length) return '';
  return html`<section class="page doc-page" id="p-data" data-page="data">
    <h3 class="sec-title" style="margin-top:0">${I('db')}${t.tab.data} <small>${m.data.length}</small></h3>
    <div class="cgrid">${m.data.map((d) => html`<div class="card box entity"><h4>${I('data')}${d.name}</h4>
      ${d.store ? html`<p class="empty-note">${t.ui.store}: <button class="linklike" data-select="${d.store}">${ix.node(d.store)?.name || d.store}</button></p>` : ''}
      ${d.description ? html`<p style="color:var(--text-2);margin:6px 0">${d.description}</p>` : ''}
      ${d.fields?.length ? html`<div class="chips" style="margin-top:8px">${d.fields.map((f) => html`<span class="chip mono">${f}</span>`)}</div>` : ''}
    </div>`)}</div>
  </section>`;
}

function deploymentPage(ctx) {
  const { m, t, ix } = ctx;
  if (!m.deployment.length) return '';
  return html`<section class="page doc-page" id="p-deployment" data-page="deployment">
    ${m.deployment.map((d) => html`<div class="card env"><h4>${I('server')}${d.environment} <span class="conf ${d.confidence}">${t.conf[d.confidence]}</span></h4>
      ${d.description ? html`<p class="empty-note">${d.description}</p>` : ''}
      <div class="nodes">${d.nodes.map((n) => html`<div class="dnode"><b>${I('server')}${n.name}</b>${n.kind ? html`<small>${n.kind}</small>` : ''}
        <div class="chips" style="margin-top:8px">${(n.hosts || []).map((h) => html`<button class="chip" data-select="${h}">${ix.node(h)?.name || h}</button>`)}</div></div>`)}</div>
    </div>`)}
  </section>`;
}

function changesPage(ctx) {
  const { diff, t } = ctx;
  if (!diff || diff.empty) return '';
  const list = (arr, f) => (arr.length ? html`<ul>${arr.map((x) => html`<li>${f(x)}</li>`)}</ul>` : html`<p class="empty-note">${t.ui.none}</p>`);
  return html`<section class="page doc-page" id="p-changes" data-page="changes">
    <h3 class="sec-title" style="margin-top:0">${I('history')}${t.ui.changesSince}</h3>
    <div class="chg">
      <div class="card box"><h3>${t.ui.added}</h3><b>${diff.added.length + diff.relAdded.length}</b>${list(diff.added, (x) => html`<button class="linklike" data-select="${x.id}">${x.name}</button>`)}${list(diff.relAdded, (r) => `${r.fromName} → ${r.toName}`)}</div>
      <div class="card box"><h3>${t.ui.removed}</h3><b>${diff.removed.length + diff.relRemoved.length}</b>${list(diff.removed, (x) => x.name)}${list(diff.relRemoved, (r) => `${r.fromName} → ${r.toName}`)}</div>
      <div class="card box"><h3>${t.ui.changed}</h3><b>${diff.changed.length + diff.relChanged.length}</b>${list(diff.changed, (x) => html`<button class="linklike" data-select="${x.id}">${x.name}</button> <small class="empty-note">(${x.fields.join(', ')})</small>`)}${list(diff.relChanged, (r) => `${r.fromName} → ${r.toName}`)}</div>
      <div class="card box"><h3>${t.ui.renamed}</h3><b>${diff.renamed.length}</b>${list(diff.renamed, (x) => `${x.from} → ${x.name}`)}</div>
    </div>
  </section>`;
}

function docsPage(ctx) {
  const { t, docs } = ctx;
  return html`<section class="page doc-page" id="p-docs" data-page="docs">
    <h3 class="sec-title" style="margin-top:0">${I('file')}${t.tab.docs}</h3>
    <p class="empty-note" style="margin-bottom:16px">${t.ui.print}</p>
    <div class="docs-grid">${docs.map((d) => html`<div class="card doccard">${I('doc', 'ic big')}<b>${d.title}</b><p>${d.description}</p>
      <div class="acts"><a class="btn primary" href="${d.html}" target="_blank" rel="noopener">${I('file')}${t.ui.openDoc}</a><a class="btn" href="${d.md}" target="_blank" rel="noopener">${t.ui.mdVersion}</a></div></div>`)}</div>
  </section>`;
}

export function renderPlanta(ctx) {
  const { m, t, views, css, viewerJs } = ctx;
  const tabs = tabsDef(ctx);
  const ctxView = views.find((v) => v.id === 'context');
  const contView = views.find((v) => v.id === 'containers');
  const data = buildClientData(ctx);
  const aud = ctx.audience;
  const body = html`
${raw(sprite())}
<div class="app">
  <header class="top">
    <div class="brand"><div class="logo">${I('layers')}</div><div><h1>${m.system.name}</h1><p>${m.system.purpose}</p></div></div>
    <div class="search" role="search">${I('search')}<input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="${t.ui.search}" aria-label="${t.ui.search}"><kbd>/</kbd><div class="results" id="results" role="listbox"></div></div>
    <div class="seg" role="group" aria-label="Público">${['exec', 'ops', 'dev'].map((a) => html`<button data-aud="${a}" aria-pressed="${a === aud ? 'true' : 'false'}">${t.audience[a]}</button>`)}</div>
    <button class="iconbtn" data-act="present" title="${t.ui.present} (P)" aria-label="${t.ui.present}">${I('present')}</button>
    <button class="iconbtn" data-act="theme" title="${t.ui.theme} (T)" aria-label="${t.ui.theme}">${I('moon', 'ic i-moon')}${I('sun', 'ic i-sun')}</button>
  </header>
  <nav class="tabs" role="tablist">${tabs.map((tb) => html`<button role="tab" data-tab="${tb.id}" data-aud-list="${tb.aud}" aria-selected="false">${I(tb.icon)}${t.tab[tb.id]}${tb.count ? html`<span class="count">${tb.count}</span>` : ''}</button>`)}</nav>
  <div class="body">
    <div class="pages">
      ${overview(ctx)}
      ${canvasPage('context', renderView(ctxView, t, { marks: ctx.marks }), html`<div class="crumb">${I('external')}<b>${t.tab.context}</b></div>`, t)}
      ${canvasPage('containers', renderView(contView, t, { marks: ctx.marks }), html`<div class="crumb">${I('service')}<b>${t.tab.containers}</b></div>`, t)}
      ${raw(componentsPage(ctx).value || '')}
      ${raw(flowsPage(ctx) || '')}
      ${dataPage(ctx)}
      ${deploymentPage(ctx)}
      ${healthPage(ctx)}
      ${decisionsPage(ctx)}
      ${changesPage(ctx)}
      ${docsPage(ctx)}
    </div>
    <aside class="panel" id="panel" aria-live="polite"></aside>
  </div>
</div>
<div class="slide-cap" id="slidecap"></div>
<div class="toast" id="toast"></div>
<script type="application/json" id="arqt-data">${raw(jsonForScript(data))}</script>`;

  const scriptHash = ctx.hash(viewerJs);
  const csp = `default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; img-src data: blob:; base-uri 'none'; form-action 'none'`;
  const page = `<!doctype html>
<html lang="${m.meta.language === 'en' ? 'en' : 'pt-BR'}" data-aud="${aud}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="arqT ${ctx.version}">
<title>${html`${m.system.name}`.value} — arqT</title>
<style id="theme-css">${css.theme}</style>
<style>${css.viewer}</style>
</head>
<body>${body.value}
<script>${viewerJs}</script>
</body>
</html>
`;
  return page;
}
