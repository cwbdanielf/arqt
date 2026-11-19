// Documentos padronizados: HTML pronto para imprimir (A4) + Markdown espelhado.
import { html, raw, md, mermaidLabel } from '../scripts/lib/html.mjs';
import { renderView, renderSequence } from '../scripts/lib/svg.mjs';
import { icon, sprite } from '../assets/icons.mjs';
import { countLabel } from '../scripts/lib/i18n.mjs';

const I = (n) => raw(icon(n));
const LVL = { pt: ['Baixo', 'Médio', 'Alto'], en: ['Low', 'Medium', 'High'] };
const sev = (s) => (s >= 6 ? 'var(--bad)' : s >= 3 ? 'var(--warn)' : 'var(--ok)');
const confMd = { verified: '✓', inferred: '~', unconfirmed: '?' };
const cssString = (s) => String(s).replace(/["\\<>\n\r]/g, ' ').slice(0, 80);

function fmtDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso); const p = (n) => String(n).padStart(2, '0');
  return lang === 'en' ? `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` : `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

// ---------- montagem comum ----------
function page(ctx, { slug, title, sections }) {
  const { m, t, css, version } = ctx;
  const lang = m.meta.language;
  const toc = sections.filter((s) => s.title);
  const body = html`
${raw(sprite())}
<p class="print-hint">${t.ui.print}</p>
<div class="sheet">
  <header class="cover">
    <div class="eyebrow">${I('layers')} arqT · ${title}</div>
    <h1>${title}</h1>
    <p class="sys">${m.system.name}</p>
    <p class="purpose">${m.system.purpose}</p>
    <table class="meta">
      <tr><td>${t.doc.version}</td><td>${fmtDate(m.meta.generatedAt, lang)}${m.meta.commit ? ` · ${t.ui.commit} ${m.meta.commit}` : ''}${m.meta.branch ? ` · ${m.meta.branch}` : ''}</td></tr>
      <tr><td>${t.ui.confidence}</td><td><span class="c verified">${t.conf.verified}</span> <span class="c inferred">${t.conf.inferred}</span> <span class="c unconfirmed">${t.conf.unconfirmed}</span></td></tr>
    </table>
  </header>
  <nav class="toc"><h2>${t.doc.toc}</h2><ol>${toc.map((s, i) => html`<li><a href="#s${i + 1}">${s.title}</a></li>`)}</ol></nav>
  <main>${toc.map((s, i) => html`<section id="s${i + 1}"><h2><span class="num">${i + 1}</span>${s.title}</h2>${s.html}</section>`)}</main>
  <footer class="foot"><span>${t.doc.generatedBy}</span><span>arqT ${version}</span></footer>
</div>`;
  const pageCss = `@page { @top-left { content: "${cssString(m.system.name)} · ${cssString(title)}"; font: 9pt sans-serif; color: #6b7280; } @bottom-right { content: counter(page) " / " counter(pages); font: 9pt sans-serif; color: #6b7280; } }`;
  const htmlOut = `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'pt-BR'}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="arqT ${version}">
<title>${html`${title} — ${m.system.name}`.value}</title>
<style>${css.theme}</style>
<style>${css.doc}
${pageCss}</style>
</head>
<body>${body.value}
</body>
</html>
`;
  const mdOut = [
    `# ${md(title)} — ${md(m.system.name)}`, '',
    `> ${md(m.system.purpose)}`, '',
    `*${t.doc.version}: ${fmtDate(m.meta.generatedAt, lang)}${m.meta.commit ? ` · ${t.ui.commit} \`${m.meta.commit}\`` : ''} · ${t.ui.confidence}: ✓ ${t.conf.verified} · ~ ${t.conf.inferred} · ? ${t.conf.unconfirmed}*`, '',
    `## ${t.doc.toc}`, '',
    ...toc.map((s, i) => `${i + 1}. ${md(s.title)}`), '',
    ...toc.flatMap((s, i) => [`## ${i + 1}. ${md(s.title)}`, '', s.md.trim(), '']),
    '---', `*${t.doc.generatedBy}*`, '',
  ].join('\n');
  return { slug, title, html: htmlOut, md: mdOut };
}

const figure = (svg, caption) => html`<figure class="figure">${raw(svg)}${caption ? html`<figcaption>${caption}</figcaption>` : ''}</figure>`;
const conf = (t, c) => html`<span class="c ${c}">${t.conf[c]}</span>`;
const mdTable = (headers, rows) => (rows.length ? [`| ${headers.map(md).join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map((c) => (c == null ? '' : String(c))).join(' | ')} |`)].join('\n') : '');
const srcText = (s) => s.map((x) => `${x.path}${x.line ? ':' + x.line : ''}`).join(', ');

function mermaidFlowchart(view) {
  const lines = ['```mermaid', 'flowchart LR'];
  const id = (x) => 'n_' + x.replace(/[^a-zA-Z0-9_]/g, '_');
  const shape = (n) => {
    const l = mermaidLabel(n.name);
    if (n.kind === 'person') return `${id(n.id)}(["${l}"])`;
    if (n.kind === 'db') return `${id(n.id)}[("${l}")]`;
    if (n.kind === 'queue') return `${id(n.id)}>"${l}"]`;
    if (n.kind === 'external') return `${id(n.id)}["${l}"]:::ext`;
    return `${id(n.id)}["${l}"]`;
  };
  const banded = new Map();
  for (const n of view.nodes) { const b = n.band || ''; if (!banded.has(b)) banded.set(b, []); banded.get(b).push(n); }
  for (const [b, nodes] of banded) {
    if (b) { const meta = view.bands.find((x) => x.id === b); lines.push(`  subgraph ${id('b_' + b)}["${mermaidLabel(meta?.label || b)}"]`); }
    for (const n of nodes) lines.push(`${b ? '    ' : '  '}${shape(n)}`);
    if (b) lines.push('  end');
  }
  for (const e of view.edges) {
    const arrow = e.bidir ? (e.async ? '<-.->' : '<-->') : e.async ? '-.->' : '-->';
    lines.push(`  ${id(e.from)} ${arrow}${e.label ? `|"${mermaidLabel(e.label)}"|` : ''} ${id(e.to)}`);
  }
  lines.push('  classDef ext fill:#f1f3f6,stroke:#9aa3b5,color:#374151', '```');
  return lines.join('\n');
}

function mermaidSequence(flow, nameOf) {
  const lines = ['```mermaid', 'sequenceDiagram'];
  const ids = [];
  for (const s of flow.steps) for (const p of [s.from, s.to]) if (!ids.includes(p)) ids.push(p);
  const pid = (x) => 'p_' + x.replace(/[^a-zA-Z0-9_]/g, '_');
  for (const p of ids) lines.push(`  participant ${pid(p)} as ${mermaidLabel(nameOf(p))}`);
  flow.steps.forEach((s) => lines.push(`  ${pid(s.from)}${s.reply ? '-->>' : s.async ? '-)' : '->>'}${pid(s.to)}: ${mermaidLabel(s.label)}`));
  lines.push('```');
  return lines.join('\n');
}

function todoItems(ctx) {
  const { m, ix } = ctx;
  return [
    ...m.components.filter((c) => c.confidence === 'unconfirmed').map((c) => c.name),
    ...m.actors.filter((a) => a.confidence === 'unconfirmed').map((a) => a.name),
    ...m.relations.filter((r) => r.confidence === 'unconfirmed').map((r) => `${ix.node(r.from)?.name} → ${ix.node(r.to)?.name}${r.label ? ' (' + r.label + ')' : ''}`),
    ...m.flows.filter((x) => x.confidence === 'unconfirmed').map((x) => x.name),
    ...m.decisions.filter((x) => x.confidence !== 'verified').map((x) => `${x.id.toUpperCase()}: ${x.title}`),
    ...m.risks.filter((x) => x.confidence === 'unconfirmed').map((x) => x.title),
    ...m.openQuestions,
  ];
}
function todoSection(ctx) {
  const { t } = ctx;
  const items = todoItems(ctx);
  return {
    title: t.ui.toConfirm,
    html: items.length ? html`<div class="callout warn">${t.doc.generatedBy}</div><ul>${items.map((x) => html`<li>${x}</li>`)}</ul>` : html`<p>${t.ui.noneFound}</p>`,
    md: items.length ? items.map((x) => `- [ ] ${md(x)}`).join('\n') : t.ui.noneFound,
  };
}
function riskHeat(ctx) {
  const { m, t } = ctx;
  const lvl = LVL[m.meta.language === 'en' ? 'en' : 'pt'];
  const count = (i, l) => m.risks.filter((r) => r.impact === i && r.likelihood === l).length;
  return html`<table class="heat"><tr><th></th>${[1, 2, 3].map((l) => html`<th>${t.ui.likelihood}: ${lvl[l - 1]}</th>`)}</tr>
    ${[3, 2, 1].map((i) => html`<tr><th>${t.ui.impact}: ${lvl[i - 1]}</th>${[1, 2, 3].map((l) => html`<td style="background:color-mix(in srgb, ${sev(i * l)} ${count(i, l) ? 28 : 8}%, #fff)">${count(i, l) || '·'}</td>`)}</tr>`)}</table>`;
}
function riskCards(ctx, risks) {
  const { t, ix, m } = ctx;
  const lvl = LVL[m.meta.language === 'en' ? 'en' : 'pt'];
  return html`${risks.map((r) => html`<div class="risk-card" style="--sev:${sev(r.impact * r.likelihood)}"><b>${r.title}</b> ${conf(t, r.confidence)}
    <p>${t.ui.impact}: ${lvl[r.impact - 1]} · ${t.ui.likelihood}: ${lvl[r.likelihood - 1]}${r.component ? html` · ${t.doc.where}: ${ix.node(r.component)?.name || r.component}` : ''}</p>
    ${r.evidence ? html`<p>${t.ui.evidence}: ${r.evidence}</p>` : ''}${r.recommendation ? html`<p><b>${t.ui.recommendation}:</b> ${r.recommendation}</p>` : ''}</div>`)}`;
}
const sortedRisks = (m) => [...m.risks].sort((a, b) => b.impact * b.likelihood - a.impact * a.likelihood || (a.id < b.id ? -1 : 1));

// ---------- documentos ----------
function executivo(ctx) {
  const { m, t, views, ix, metrics } = ctx;
  const lvl = LVL[m.meta.language === 'en' ? 'en' : 'pt'];
  const containers = m.components.filter((c) => !c.parent && c.kind !== 'external');
  const externals = [...m.actors.filter((a) => a.kind === 'external-system'), ...m.components.filter((c) => !c.parent && c.kind === 'external')];
  const extRel = (id) => [...new Set(m.relations.filter((r) => r.from === id || r.to === id).map((r) => r.label).filter(Boolean))].slice(0, 3).join('; ');
  const ctxView = views.find((v) => v.id === 'context');
  const risks = sortedRisks(m);
  const recs = risks.filter((r) => r.recommendation);
  return page(ctx, {
    slug: 'executivo', title: t.doc.executivo,
    sections: [
      { title: t.doc.purpose,
        html: html`<p class="lead">${m.system.purpose}</p>${m.system.summary ? html`<p>${m.system.summary}</p>` : ''}
          <div class="kpis"><div class="kpi"><b>${containers.length}</b><span>${countLabel(t, 'containersCount', containers.length)}</span></div><div class="kpi"><b>${externals.length}</b><span>${countLabel(t, 'integrationsCount', externals.length)}</span></div><div class="kpi"><b>${m.risks.filter((r) => r.impact * r.likelihood >= 6).length}</b><span>${countLabel(t, 'highRisks', m.risks.filter((r) => r.impact * r.likelihood >= 6).length)}</span></div><div class="kpi"><b>${Math.round((metrics.conf.verified / Math.max(1, metrics.totalClaims)) * 100)}%</b><span>${t.ui.verifiedShare}</span></div></div>
          ${m.system.businessCapabilities.length ? html`<h3>${t.ui.capabilities}</h3><div class="chips">${m.system.businessCapabilities.map((c) => html`<span class="chip">${c}</span>`)}</div>` : ''}
          ${m.system.stack.length ? html`<h3>${t.ui.stack}</h3><div class="chips">${m.system.stack.map((c) => html`<span class="chip">${c}</span>`)}</div>` : ''}`,
        md: [md(m.system.purpose), '', m.system.summary ? md(m.system.summary) : '', '',
          `**${containers.length}** ${countLabel(t, 'containersCount', containers.length)} · **${externals.length}** ${countLabel(t, 'integrationsCount', externals.length)} · **${m.risks.filter((r) => r.impact * r.likelihood >= 6).length}** ${countLabel(t, 'highRisks', m.risks.filter((r) => r.impact * r.likelihood >= 6).length)}`, '',
          m.system.businessCapabilities.length ? `**${t.ui.capabilities}:** ${m.system.businessCapabilities.map(md).join(', ')}` : '', '',
          m.system.stack.length ? `**${t.ui.stack}:** ${m.system.stack.map(md).join(', ')}` : ''].join('\n') },
      { title: t.doc.contextScope,
        html: html`${figure(renderView(ctxView, t, { idPrefix: 'd-' }), t.tab.context)}
          ${externals.length ? html`<h3>${t.ui.integrations}</h3><table class="t"><tr><th>${t.doc.name}</th><th>${t.ui.whatIs}</th><th>${t.doc.label}</th><th></th></tr>${externals.map((x) => html`<tr><td><b>${x.name}</b></td><td>${x.description || x.responsibility || ''}</td><td>${extRel(x.id)}</td><td>${conf(t, x.confidence)}</td></tr>`)}</table>` : ''}`,
        md: [mermaidFlowchart(ctxView), '', externals.length ? mdTable([t.doc.name, t.ui.whatIs, t.doc.label, t.ui.confidence], externals.map((x) => [`**${md(x.name)}**`, md(x.description || x.responsibility || ''), md(extRel(x.id)), confMd[x.confidence]])) : ''].join('\n') },
      { title: t.doc.riskMap,
        html: m.risks.length ? html`${riskHeat(ctx)}${riskCards(ctx, risks.slice(0, 6))}` : html`<p>${t.ui.noneFound}</p>`,
        md: m.risks.length ? mdTable([t.doc.name, t.ui.impact, t.ui.likelihood, t.doc.where, t.ui.confidence], risks.map((r) => [md(r.title), lvl[r.impact - 1], lvl[r.likelihood - 1], md(ix.node(r.component)?.name || ''), confMd[r.confidence]])) : t.ui.noneFound },
      { title: t.doc.recommendations,
        html: recs.length ? html`<ol>${recs.map((r) => html`<li><b>${r.recommendation}</b> <span style="color:var(--text-3)">(${r.title})</span></li>`)}</ol>` : html`<p>${t.ui.noneFound}</p>`,
        md: recs.length ? recs.map((r, i) => `${i + 1}. **${md(r.recommendation)}** (${md(r.title)})`).join('\n') : t.ui.noneFound },
      todoSection(ctx),
    ],
  });
}

function arquitetura(ctx) {
  const { m, t, views, ix, metrics } = ctx;
  const lvl = LVL[m.meta.language === 'en' ? 'en' : 'pt'];
  const ctxView = views.find((v) => v.id === 'context');
  const contView = views.find((v) => v.id === 'containers');
  const compViews = views.filter((v) => v.kind === 'components');
  const containers = m.components.filter((c) => !c.parent && c.kind !== 'external');
  const nameOf = (id) => ix.node(id)?.name || id;
  const kindOf = (id) => { const n = ix.node(id); return !n ? 'service' : n.kind === 'external-system' ? 'external' : n.kind; };
  const compTable = (list) => html`<table class="t"><tr><th>${t.doc.name}</th><th>${t.doc.kind}</th><th>${t.ui.tech}</th><th>${t.ui.responsibility}</th><th></th></tr>${list.map((c) => html`<tr><td><b>${c.name}</b>${c.sources.length ? html`<br><code>${srcText(c.sources.slice(0, 2))}</code>` : ''}</td><td>${t.kind[c.kind]}</td><td>${c.tech || ''}</td><td>${c.responsibility}</td><td>${conf(t, c.confidence)}</td></tr>`)}</table>`;
  const compMd = (list) => mdTable([t.doc.name, t.doc.kind, t.ui.tech, t.ui.responsibility, t.ui.confidence], list.map((c) => [`**${md(c.name)}**`, t.kind[c.kind], md(c.tech || ''), md(c.responsibility), confMd[c.confidence]]));
  const sections = [
    { title: t.doc.intro,
      html: html`<p class="lead">${m.system.purpose}</p>${m.system.summary ? html`<p>${m.system.summary}</p>` : ''}
        ${m.system.businessCapabilities.length ? html`<h3>${t.ui.capabilities}</h3><ul>${m.system.businessCapabilities.map((c) => html`<li>${c}</li>`)}</ul>` : ''}
        ${m.system.qualityGoals.length ? html`<h3>${t.ui.qualityGoals}</h3><table class="t"><tr><th>${t.doc.name}</th><th>${t.doc.label}</th><th></th></tr>${m.system.qualityGoals.map((q) => html`<tr><td><b>${q.name}</b></td><td>${q.description}</td><td>${conf(t, q.confidence)}</td></tr>`)}</table>` : ''}`,
      md: [md(m.system.purpose), '', md(m.system.summary || ''), '', ...m.system.businessCapabilities.map((c) => `- ${md(c)}`), '', m.system.qualityGoals.length ? mdTable([t.doc.name, t.doc.label, t.ui.confidence], m.system.qualityGoals.map((q) => [`**${md(q.name)}**`, md(q.description), confMd[q.confidence]])) : ''].join('\n') },
    m.constraints.length && { title: t.doc.constraints,
      html: html`<table class="t"><tr><th>${t.doc.kind}</th><th>${t.doc.label}</th><th></th></tr>${m.constraints.map((c) => html`<tr><td>${c.kind || ''}</td><td>${c.text}</td><td>${conf(t, c.confidence)}</td></tr>`)}</table>`,
      md: mdTable([t.doc.kind, t.doc.label, t.ui.confidence], m.constraints.map((c) => [c.kind || '', md(c.text), confMd[c.confidence]])) },
    { title: t.doc.contextScope,
      html: html`${figure(renderView(ctxView, t, { idPrefix: 'd-' }), t.tab.context)}
        <table class="t"><tr><th>${t.doc.name}</th><th>${t.doc.kind}</th><th>${t.ui.whatIs}</th><th></th></tr>${m.actors.map((a) => html`<tr><td><b>${a.name}</b></td><td>${t.kind[a.kind]}</td><td>${a.description || ''}</td><td>${conf(t, a.confidence)}</td></tr>`)}</table>`,
      md: [mermaidFlowchart(ctxView), '', mdTable([t.doc.name, t.doc.kind, t.ui.whatIs, t.ui.confidence], m.actors.map((a) => [`**${md(a.name)}**`, t.kind[a.kind], md(a.description || ''), confMd[a.confidence]]))].join('\n') },
    { title: t.doc.blocks,
      html: html`${figure(renderView(contView, t, { idPrefix: 'd-' }), t.tab.containers)}${compTable(containers)}
        ${compViews.map((v) => { const c = ix.comp.get(v.parent); return html`<h3>${c.name}</h3><p>${c.responsibility}</p>${figure(renderView(v, t, { idPrefix: 'd-' }), c.name)}${compTable(ix.children.get(c.id))}`; })}`,
      md: [mermaidFlowchart(contView), '', compMd(containers), '', ...compViews.flatMap((v) => { const c = ix.comp.get(v.parent); return [`### ${md(c.name)}`, '', md(c.responsibility), '', mermaidFlowchart(v), '', compMd(ix.children.get(c.id)), '']; })].join('\n') },
    m.flows.length && { title: t.doc.runtime,
      html: html`${m.flows.map((f) => html`<h3>${f.name} ${conf(t, f.confidence)}</h3>${f.description ? html`<p>${f.description}</p>` : ''}${figure(renderSequence(f, nameOf, kindOf, t, { idPrefix: 'd-' }), f.name)}<ol>${f.steps.map((s) => html`<li><b>${nameOf(s.from)} → ${nameOf(s.to)}</b>: ${s.label}${s.note ? html` <i>(${s.note})</i>` : ''}</li>`)}</ol>`)}`,
      md: m.flows.map((f) => [`### ${md(f.name)} (${confMd[f.confidence]})`, '', md(f.description || ''), '', mermaidSequence(f, nameOf), ''].join('\n')).join('\n') },
    m.deployment.length && { title: t.doc.deploymentView,
      html: html`${m.deployment.map((d) => html`<h3>${d.environment} ${conf(t, d.confidence)}</h3>${d.description ? html`<p>${d.description}</p>` : ''}<table class="t"><tr><th>${t.doc.name}</th><th>${t.doc.kind}</th><th>${t.ui.hosts}</th></tr>${d.nodes.map((n) => html`<tr><td><b>${n.name}</b></td><td>${n.kind || ''}</td><td>${(n.hosts || []).map(nameOf).join(', ')}</td></tr>`)}</table>`)}`,
      md: m.deployment.map((d) => [`### ${md(d.environment)} (${confMd[d.confidence]})`, '', md(d.description || ''), '', mdTable([t.doc.name, t.doc.kind, t.ui.hosts], d.nodes.map((n) => [`**${md(n.name)}**`, md(n.kind || ''), md((n.hosts || []).map(nameOf).join(', '))]))].join('\n')).join('\n\n') },
    m.data.length && { title: t.doc.crosscutting,
      html: html`<table class="t"><tr><th>${t.doc.name}</th><th>${t.ui.store}</th><th>${t.ui.fields}</th><th></th></tr>${m.data.map((d) => html`<tr><td><b>${d.name}</b>${d.description ? html`<br>${d.description}` : ''}</td><td>${d.store ? nameOf(d.store) : ''}</td><td><code>${(d.fields || []).join(', ')}</code></td><td>${conf(t, d.confidence)}</td></tr>`)}</table>`,
      md: mdTable([t.doc.name, t.ui.store, t.ui.fields, t.ui.confidence], m.data.map((d) => [`**${md(d.name)}**`, md(d.store ? nameOf(d.store) : ''), md((d.fields || []).join(', ')), confMd[d.confidence]])) },
    m.decisions.length && { title: t.doc.decisions,
      html: html`<div class="callout">${t.doc.adrNote}</div>${m.decisions.map((d) => html`<h3>${d.id.toUpperCase()} · ${d.title} ${conf(t, d.confidence)}</h3><table class="t">${d.context ? html`<tr><td style="width:150px"><b>${t.ui.context}</b></td><td>${d.context}</td></tr>` : ''}<tr><td style="width:150px"><b>${t.ui.decision}</b></td><td>${d.decision}</td></tr>${d.consequences ? html`<tr><td><b>${t.ui.consequences}</b></td><td>${d.consequences}</td></tr>` : ''}${d.evidence ? html`<tr><td><b>${t.ui.evidence}</b></td><td>${d.evidence}</td></tr>` : ''}</table>`)}`,
      md: [`> ${md(t.doc.adrNote)}`, '', ...m.decisions.map((d) => [`### ${d.id.toUpperCase()} · ${md(d.title)} (${confMd[d.confidence]})`, '', d.context ? `- **${t.ui.context}:** ${md(d.context)}` : '', `- **${t.ui.decision}:** ${md(d.decision)}`, d.consequences ? `- **${t.ui.consequences}:** ${md(d.consequences)}` : '', ''].filter((x) => x !== '').join('\n'))].join('\n\n') },
    { title: t.doc.quality,
      html: html`<table class="t"><tr><th>${t.ui.metrics}</th><th></th></tr>
        <tr><td>${t.ui.cycles}</td><td>${metrics.cycles.length ? metrics.cycles.map((c) => c.map((x) => x.name).join(' ⇄ ')).join('; ') : t.ui.noneFound}</td></tr>
        <tr><td>${t.ui.spof}</td><td>${metrics.spof.length ? metrics.spof.map((s) => s.name).join(', ') : t.ui.noneFound}</td></tr>
        <tr><td>${t.ui.fanIn}</td><td>${metrics.fanIn.map((x) => `${x.name} (${x.n})`).join(', ') || t.ui.noneFound}</td></tr>
        <tr><td>${t.ui.opsGaps}</td><td>${metrics.opsGaps.length ? metrics.opsGaps.map((g) => `${g.name}: ${g.gaps.map((x) => t.ui[x]).join(', ')}`).join('; ') : t.ui.noneFound}</td></tr>
        <tr><td>${t.ui.confidence}</td><td>${metrics.conf.verified} ${t.conf.verified} · ${metrics.conf.inferred} ${t.conf.inferred} · ${metrics.conf.unconfirmed} ${t.conf.unconfirmed}</td></tr></table>`,
      md: mdTable([t.ui.metrics, ''], [
        [t.ui.cycles, md(metrics.cycles.map((c) => c.map((x) => x.name).join(' ⇄ ')).join('; ') || t.ui.noneFound)],
        [t.ui.spof, md(metrics.spof.map((s) => s.name).join(', ') || t.ui.noneFound)],
        [t.ui.fanIn, md(metrics.fanIn.map((x) => `${x.name} (${x.n})`).join(', ') || t.ui.noneFound)],
        [t.ui.opsGaps, md(metrics.opsGaps.map((g) => `${g.name}: ${g.gaps.map((x) => t.ui[x]).join(', ')}`).join('; ') || t.ui.noneFound)],
        [t.ui.confidence, `${metrics.conf.verified} ✓ · ${metrics.conf.inferred} ~ · ${metrics.conf.unconfirmed} ?`]]) },
    { title: t.doc.risks,
      html: m.risks.length ? html`${riskHeat(ctx)}${riskCards(ctx, sortedRisks(m))}` : html`<p>${t.ui.noneFound}</p>`,
      md: m.risks.length ? sortedRisks(m).map((r) => `- **${md(r.title)}** (${t.ui.impact} ${lvl[r.impact - 1]}, ${t.ui.likelihood} ${lvl[r.likelihood - 1]}, ${confMd[r.confidence]})${r.recommendation ? ' — ' + md(r.recommendation) : ''}`).join('\n') : t.ui.noneFound },
    m.glossary.length && { title: t.doc.glossary,
      html: html`<table class="t">${m.glossary.map((g) => html`<tr><td style="width:200px"><b>${g.term}</b></td><td>${g.definition}</td></tr>`)}</table>`,
      md: mdTable([t.doc.name, t.doc.label], m.glossary.map((g) => [`**${md(g.term)}**`, md(g.definition)])) },
    todoSection(ctx),
  ].filter(Boolean);
  return page(ctx, { slug: 'arquitetura', title: t.doc.arquitetura, sections });
}

function sustentacao(ctx) {
  const { m, t, ix, metrics } = ctx;
  const nameOf = (id) => ix.node(id)?.name || id;
  // bibliotecas sem nada de operação (monorepos: ui, validators…) não sobem sozinhas: ficam fora do manual
  const hasOps = (c) => ['start', 'build', 'test', 'logs', 'health', 'schedule'].some((k) => c.ops[k]) || (c.ops.config || []).length || (c.ops.ports || []).length || (c.ops.failureModes || []).length;
  const ops = m.components.filter((c) => !c.parent && c.kind !== 'external' && (c.kind !== 'lib' || hasOps(c)));
  const envAll = [...new Set(ops.flatMap((c) => c.ops.config || []))].sort();
  const usedBy = (v) => ops.filter((c) => (c.ops.config || []).includes(v)).map((c) => c.name).join(', ');
  const deps = (c) => {
    const ids = new Set([c.id, ...(ix.children.get(c.id) || []).map((k) => k.id)]);
    return [...new Set(m.relations.filter((r) => ids.has(r.from) && !ids.has(r.to)).map((r) => ix.containerOf(r.to)))].map(nameOf);
  };
  const fms = ops.flatMap((c) => (c.ops.failureModes || []).map((f) => ({ c, f })));
  const sections = [
    { title: t.doc.componentsTable,
      html: html`<table class="t"><tr><th>${t.doc.component}</th><th>${t.ui.tech}</th><th>${t.ui.start}</th><th>${t.ui.ports}</th><th>${t.ui.health}</th></tr>${ops.map((c) => html`<tr><td><b>${c.name}</b><br><span style="color:var(--text-3)">${t.kind[c.kind]}</span></td><td>${c.tech || ''}</td><td>${c.ops.start ? html`<span class="cmdline">${c.ops.start}</span>` : '—'}</td><td>${(c.ops.ports || []).join(', ') || '—'}</td><td>${c.ops.health || '—'}</td></tr>`)}</table>`,
      md: mdTable([t.doc.component, t.ui.tech, t.ui.start, t.ui.ports, t.ui.health], ops.map((c) => [`**${md(c.name)}**`, md(c.tech || ''), c.ops.start ? '`' + c.ops.start.replace(/`/g, "'") + '`' : '—', (c.ops.ports || []).join(', ') || '—', md(c.ops.health || '—')])) },
    { title: t.doc.howToRun,
      html: html`${ops.map((c) => html`<h3>${c.name} ${conf(t, c.confidence)}</h3><p>${c.responsibility}</p><table class="t">
        ${c.ops.start ? html`<tr><td style="width:180px">${t.ui.start}</td><td><span class="cmdline">${c.ops.start}</span></td></tr>` : ''}
        ${c.ops.build ? html`<tr><td>${t.ui.build}</td><td><span class="cmdline">${c.ops.build}</span></td></tr>` : ''}
        ${c.ops.test ? html`<tr><td>${t.ui.test}</td><td><span class="cmdline">${c.ops.test}</span></td></tr>` : ''}
        ${(c.ops.config || []).length ? html`<tr><td>${t.ui.config}</td><td><code>${c.ops.config.join(', ')}</code></td></tr>` : ''}
        ${(c.ops.ports || []).length ? html`<tr><td>${t.ui.ports}</td><td>${c.ops.ports.join(', ')}</td></tr>` : ''}
        ${c.ops.logs ? html`<tr><td>${t.ui.logs}</td><td>${c.ops.logs}</td></tr>` : ''}
        ${c.ops.health ? html`<tr><td>${t.ui.health}</td><td>${c.ops.health}</td></tr>` : ''}
        ${c.ops.schedule ? html`<tr><td>${t.ui.schedule}</td><td>${c.ops.schedule}</td></tr>` : ''}
        ${c.ops.tests ? html`<tr><td>${t.ui.testsDetected}</td><td>${t.testsState[c.ops.tests] || c.ops.tests}</td></tr>` : ''}
        <tr><td>${t.ui.outgoing}</td><td>${deps(c).join(', ') || '—'}</td></tr>
        ${c.sources.length ? html`<tr><td>${t.ui.sources}</td><td><code>${srcText(c.sources)}</code></td></tr>` : ''}
      </table>`)}`,
      md: ops.map((c) => [`### ${md(c.name)} (${confMd[c.confidence]})`, '', md(c.responsibility), '',
        c.ops.start ? `- **${t.ui.start}:** \`${c.ops.start.replace(/`/g, "'")}\`` : '', c.ops.build ? `- **${t.ui.build}:** \`${c.ops.build.replace(/`/g, "'")}\`` : '', c.ops.test ? `- **${t.ui.test}:** \`${c.ops.test.replace(/`/g, "'")}\`` : '',
        (c.ops.config || []).length ? `- **${t.ui.config}:** ${c.ops.config.map((x) => '`' + x + '`').join(', ')}` : '', (c.ops.ports || []).length ? `- **${t.ui.ports}:** ${c.ops.ports.join(', ')}` : '',
        c.ops.logs ? `- **${t.ui.logs}:** ${md(c.ops.logs)}` : '', c.ops.health ? `- **${t.ui.health}:** ${md(c.ops.health)}` : '', c.ops.schedule ? `- **${t.ui.schedule}:** ${md(c.ops.schedule)}` : '',
        `- **${t.ui.outgoing}:** ${md(deps(c).join(', ') || '—')}`].filter(Boolean).join('\n')).join('\n\n') },
    { title: t.doc.envVars,
      html: envAll.length ? html`<div class="callout">${t.doc.envVars}</div><table class="t"><tr><th>${t.doc.name}</th><th>${t.doc.component}</th></tr>${envAll.map((v) => html`<tr><td><code>${v}</code></td><td>${usedBy(v)}</td></tr>`)}</table>` : html`<p>${t.ui.noneFound}</p>`,
      md: envAll.length ? mdTable([t.doc.name, t.doc.component], envAll.map((v) => ['`' + v + '`', md(usedBy(v))])) : t.ui.noneFound },
    { title: t.doc.troubleshooting,
      html: html`${fms.length ? html`<table class="t"><tr><th>${t.doc.component}</th><th>${t.doc.symptom}</th><th>${t.doc.cause}</th><th>${t.doc.action}</th></tr>${fms.map(({ c, f }) => html`<tr><td><b>${c.name}</b></td><td>${f.symptom}</td><td>${f.probableCause || ''}</td><td>${f.action}</td></tr>`)}</table>` : html`<p>${t.ui.noneFound}</p>`}
        ${metrics.opsGaps.length ? html`<h3>${t.ui.opsGaps}</h3><ul>${metrics.opsGaps.map((g) => html`<li><b>${g.name}</b>: ${g.gaps.map((x) => t.ui[x]).join(', ')}</li>`)}</ul>` : ''}
        ${metrics.spof.length ? html`<h3>${t.ui.spof}</h3><ul>${metrics.spof.map((s) => html`<li>${s.name}</li>`)}</ul>` : ''}`,
      md: [fms.length ? mdTable([t.doc.component, t.doc.symptom, t.doc.cause, t.doc.action], fms.map(({ c, f }) => [`**${md(c.name)}**`, md(f.symptom), md(f.probableCause || ''), md(f.action)])) : t.ui.noneFound, '',
        metrics.opsGaps.length ? `**${t.ui.opsGaps}:**\n\n` + metrics.opsGaps.map((g) => `- **${md(g.name)}**: ${g.gaps.map((x) => t.ui[x]).join(', ')}`).join('\n') : ''].join('\n') },
    todoSection(ctx),
  ];
  return page(ctx, { slug: 'sustentacao', title: t.doc.sustentacao, sections });
}

function inventario(ctx) {
  const { m, t, metrics } = ctx;
  const inv = m.inventory;
  const all = m.components;
  const sections = [
    { title: t.doc.languages,
      html: inv.languages.length ? html`<table class="t"><tr><th>${t.doc.name}</th><th>%</th><th></th></tr>${inv.languages.map((l) => html`<tr><td><b>${l.name}</b></td><td>${l.share != null ? l.share + '%' : ''}</td><td style="width:50%">${l.share != null ? html`<div style="height:8px;border-radius:4px;background:var(--bg-2)"><div style="height:8px;border-radius:4px;background:var(--brand);width:${Math.max(1, Math.min(100, l.share))}%"></div></div>` : ''}</td></tr>`)}</table>` : html`<p>${t.ui.noneFound}</p>`,
      md: inv.languages.length ? mdTable([t.doc.name, '%'], inv.languages.map((l) => [md(l.name), l.share != null ? l.share + '%' : ''])) : t.ui.noneFound },
    { title: t.doc.frameworks,
      html: inv.frameworks.length ? html`<div class="chips">${inv.frameworks.map((f) => html`<span class="chip">${f}</span>`)}</div>` : html`<p>${t.ui.noneFound}</p>`,
      md: inv.frameworks.length ? inv.frameworks.map((f) => `- ${md(f)}`).join('\n') : t.ui.noneFound },
    { title: t.doc.dependencies,
      html: inv.dependencies.length ? html`<p>${metrics.depsTotal} · ${metrics.unpinned.length} ${t.ui.unpinned} · ${metrics.copyleft.length} ${t.ui.copyleft}</p><table class="t"><tr><th>${t.doc.name}</th><th>${t.doc.version2}</th><th>${t.doc.license}</th><th>${t.doc.scope2}</th><th>${t.doc.origin}</th></tr>${inv.dependencies.map((d) => html`<tr><td><b>${d.name}</b></td><td><code>${d.version || ''}</code>${d.pinned === false ? html` <span class="c inferred">${t.ui.unpinned}</span>` : ''}</td><td>${d.license || t.doc.notMapped}</td><td>${d.scope || ''}</td><td><code>${d.source || ''}</code></td></tr>`)}</table>` : html`<p>${t.ui.noneFound}</p>`,
      md: inv.dependencies.length ? mdTable([t.doc.name, t.doc.version2, t.doc.license, t.doc.scope2, t.doc.origin], inv.dependencies.map((d) => [`**${md(d.name)}**`, md(d.version || '') + (d.pinned === false ? ' ⚠' : ''), md(d.license || t.doc.notMapped), d.scope || '', md(d.source || '')])) : t.ui.noneFound },
    { title: t.doc.componentsTable,
      html: html`<table class="t"><tr><th>${t.doc.name}</th><th>${t.doc.kind}</th><th>${t.ui.tech}</th><th>${t.doc.where}</th><th></th></tr>${all.map((c) => html`<tr><td><b>${c.name}</b>${c.parent ? html`<br><span style="color:var(--text-3)">⌂ ${ctx.ix.node(c.parent)?.name}</span>` : ''}</td><td>${t.kind[c.kind]}</td><td>${c.tech || ''}</td><td><code>${srcText(c.sources)}</code></td><td>${conf(t, c.confidence)}</td></tr>`)}</table>`,
      md: mdTable([t.doc.name, t.doc.kind, t.ui.tech, t.doc.where, t.ui.confidence], all.map((c) => [`**${md(c.name)}**`, t.kind[c.kind], md(c.tech || ''), md(srcText(c.sources)), confMd[c.confidence]])) },
  ];
  return page(ctx, { slug: 'inventario', title: t.doc.inventario, sections });
}

function mudancas(ctx) {
  const { t, diff } = ctx;
  const items = (arr, f) => (arr.length ? html`<ul>${arr.map((x) => html`<li>${f(x)}</li>`)}</ul>` : html`<p>${t.ui.none}</p>`);
  const mdItems = (arr, f) => (arr.length ? arr.map((x) => `- ${md(f(x))}`).join('\n') : t.ui.none);
  if (!diff) {
    return page(ctx, { slug: 'mudancas', title: t.doc.mudancas, sections: [{ title: t.ui.changesSince, html: html`<p>${t.ui.firstVersion}</p>`, md: t.ui.firstVersion }] });
  }
  if (diff.empty) {
    return page(ctx, { slug: 'mudancas', title: t.doc.mudancas, sections: [{ title: t.ui.changesSince, html: html`<p>${t.ui.noChanges}</p>${diff.reworded.length ? html`<p>(${diff.reworded.length} texto(s) revisado(s))</p>` : ''}`, md: t.ui.noChanges }] });
  }
  const rel = (r) => `${r.fromName} → ${r.toName}${r.label ? ' (' + r.label + ')' : ''}`;
  return page(ctx, {
    slug: 'mudancas', title: t.doc.mudancas,
    sections: [
      { title: t.ui.added, html: html`${items(diff.added, (x) => x.name)}${items(diff.relAdded, rel)}`, md: [mdItems(diff.added, (x) => x.name), mdItems(diff.relAdded, rel)].join('\n\n') },
      { title: t.ui.removed, html: html`${items(diff.removed, (x) => x.name)}${items(diff.relRemoved, rel)}`, md: [mdItems(diff.removed, (x) => x.name), mdItems(diff.relRemoved, rel)].join('\n\n') },
      { title: t.ui.changed, html: html`${items(diff.changed, (x) => `${x.name}: ${x.fields.map((f) => `${f} ${x.before[f] ?? '∅'} → ${x.after[f] ?? '∅'}`).join('; ')}`)}${items(diff.relChanged, rel)}`, md: [mdItems(diff.changed, (x) => `${x.name}: ${x.fields.join(', ')}`), mdItems(diff.relChanged, rel)].join('\n\n') },
      { title: t.ui.renamed, html: items(diff.renamed, (x) => `${x.from} → ${x.name}`), md: mdItems(diff.renamed, (x) => `${x.from} → ${x.name}`) },
    ],
  });
}

export function renderDocs(ctx) {
  const t = ctx.t;
  const list = [executivo(ctx), arquitetura(ctx), sustentacao(ctx), inventario(ctx), mudancas(ctx)];
  const desc = {
    executivo: { pt: 'Propósito, escopo, integrações, mapa de riscos e recomendações em 1–2 páginas.', en: 'Purpose, scope, integrations, risk map and recommendations in 1–2 pages.' },
    arquitetura: { pt: 'arc42 enxuto: contexto, blocos, execução, implantação, decisões, riscos e glossário.', en: 'Lean arc42: context, building blocks, runtime, deployment, decisions, risks and glossary.' },
    sustentacao: { pt: 'Como subir cada componente, variáveis (só nomes), portas, logs, health checks e diagnóstico.', en: 'How to run each component, variables (names only), ports, logs, health checks and troubleshooting.' },
    inventario: { pt: 'Linguagens, frameworks, dependências, versões, licenças e onde está cada componente.', en: 'Languages, frameworks, dependencies, versions, licenses and where each component lives.' },
    mudancas: { pt: 'O que mudou na arquitetura desde a execução anterior.', en: 'What changed in the architecture since the previous run.' },
  };
  const lang = ctx.m.meta.language === 'en' ? 'en' : 'pt';
  return list.map((d) => ({ ...d, description: desc[d.slug][lang], title: d.title || t.doc[d.slug] }));
}
