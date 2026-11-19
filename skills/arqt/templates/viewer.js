(() => {
  'use strict';
  const D = JSON.parse(document.getElementById('arqt-data').textContent);
  const T = D.t;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';
  const store = {
    get(k) { try { return window.localStorage.getItem('arqt:' + k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem('arqt:' + k, v); } catch (e) { /* armazenamento indisponível */ } },
  };

  // ---------- utilidades de DOM (somente textContent para dados) ----------
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return n;
  }
  function ico(name, cls) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', cls || 'ic'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', '#i-' + name); s.append(u);
    return s;
  }
  const kindIcon = (k) => (k === 'external-system' ? 'external' : k);
  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'));
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
  }
  function copy(text) {
    const done = () => toast(T.ui.copied + ': ' + text);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove();
    }
  }

  // ---------- tema ----------
  const savedTheme = store.get('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') root.dataset.theme = savedTheme;
  else root.dataset.theme = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  function toggleTheme() { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; store.set('theme', root.dataset.theme); }

  // ---------- canvas (pan/zoom) ----------
  class Canvas {
    constructor(page) {
      this.page = page; this.el = $('[data-canvas]', page); this.stage = $('.stage', this.el);
      this.svgs = $$('.stage > svg', this.el); this.svg = this.svgs[0];
      this.x = 0; this.y = 0; this.k = 1; this.fitted = false;
      this.svgs.forEach((s, i) => { s.style.display = i === 0 ? '' : 'none'; });
      this.bind();
    }
    get viewId() { return this.svg && (this.svg.dataset.view || null); }
    setSvg(pred) {
      const target = this.svgs.find(pred);
      if (!target) return;
      this.svgs.forEach((s) => { s.style.display = s === target ? '' : 'none'; });
      this.svg = target; this.fit();
    }
    apply() {
      this.stage.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.k})`;
      const z = $('[data-zoomv]', this.page); if (z) z.textContent = Math.round(this.k * 100) + '%';
    }
    size() { return [Number(this.svg.getAttribute('width')), Number(this.svg.getAttribute('height'))]; }
    fit() {
      const r = this.el.getBoundingClientRect();
      if (!r.width) return;
      const [w, h] = this.size();
      const seq = this.svg.classList.contains('seq');
      let k = Math.max(0.12, Math.min((r.width - 64) / w, (r.height - 120) / h, 1.15));
      if (seq) k = Math.min(1.1, Math.max(k, Math.min(0.72, (r.width - 64) / w * 1.6)));
      this.k = k; this.x = Math.max(32, (r.width - w * k) / 2); this.y = seq ? 60 : Math.max(56, (r.height - h * k) / 2);
      this.fitted = true; this.apply();
    }
    zoomAt(f, cx, cy) {
      const r = this.el.getBoundingClientRect();
      if (cx == null) { cx = r.width / 2; cy = r.height / 2; }
      const nk = Math.min(4, Math.max(0.08, this.k * f));
      this.x = cx - (cx - this.x) * (nk / this.k); this.y = cy - (cy - this.y) * (nk / this.k); this.k = nk; this.apply();
    }
    center(id) {
      const v = D.views[this.viewId]; if (!v || !v.nodes[id]) return;
      const [nx, ny, nw, nh] = v.nodes[id];
      const r = this.el.getBoundingClientRect();
      this.k = Math.max(this.k, Math.min(1, (r.width - 420) / Math.max(nw * 4, 1)));
      this.x = r.width / 2 - (nx + nw / 2) * this.k - (panelOpen() ? 0 : 0);
      this.y = r.height / 2 - (ny + nh / 2) * this.k;
      this.apply();
    }
    bind() {
      const el = this.el;
      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0 && !e.shiftKey && Math.abs(e.deltaX) < 1) this.zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
        else { this.x -= e.deltaX; this.y -= e.deltaY; this.apply(); }
      }, { passive: false });
      let drag = null;
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, ox: this.x, oy: this.y, moved: false, id: e.pointerId };
      });
      el.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 4) { drag.moved = true; el.classList.add('dragging'); try { el.setPointerCapture(drag.id); } catch (err) { /* ok */ } }
        if (drag.moved) { this.x = drag.ox + dx; this.y = drag.oy + dy; this.apply(); }
      });
      const end = () => { if (drag && drag.moved) { this.suppressClick = true; setTimeout(() => { this.suppressClick = false; }, 0); } drag = null; el.classList.remove('dragging'); };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
      el.addEventListener('click', (e) => {
        if (this.suppressClick) return;
        const node = e.target.closest('.node'); const edge = e.target.closest('.edge');
        if (node && node.closest('svg.seq')) { const ref = node.dataset.ref; if (ref) openEntity(ref); return; }
        if (node) { selectNode(this, node.dataset.id); return; }
        if (edge) { selectEdge(this, edge.dataset.id); return; }
        clearSelection(this); closePanel();
      });
      el.addEventListener('dblclick', (e) => {
        const node = e.target.closest('.node');
        if (node && node.classList.contains('has-children')) { e.preventDefault(); drill(node.dataset.id); }
      });
      el.addEventListener('keydown', (e) => {
        const node = e.target.closest && e.target.closest('.node');
        if (node && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (node.closest('svg.seq')) openEntity(node.dataset.ref); else selectNode(this, node.dataset.id); }
      });
      el.addEventListener('mouseover', (e) => {
        if (!this.svg || this.svg.classList.contains('seq')) return;
        const node = e.target.closest('.node'); const edge = e.target.closest('.edge');
        if (node) highlight(this.svg, { node: node.dataset.id }); else if (edge) highlight(this.svg, { edge: edge.dataset.id });
      });
      el.addEventListener('mouseout', (e) => {
        if (!this.svg || this.svg.classList.contains('seq')) return;
        const to = e.relatedTarget;
        if (to && (to.closest && (to.closest('.node') || to.closest('.edge')))) return;
        restoreHighlight(this);
      });
      $$('.toolbar [data-act]', this.page).forEach((b) => b.addEventListener('click', () => {
        const a = b.dataset.act;
        if (a === 'zoom-in') this.zoomAt(1.25); else if (a === 'zoom-out') this.zoomAt(0.8); else if (a === 'fit') this.fit();
        else if (a === 'legend') toggleLegend(this); else if (a === 'export-svg') exportSvg(this.svg); else if (a === 'export-png') exportPng(this.svg);
      }));
    }
  }

  // ---------- destaque e seleção ----------
  function highlight(svg, { node, edge }) {
    svg.classList.add('hl');
    $$('.on', svg).forEach((x) => x.classList.remove('on'));
    const on = (sel) => $$(sel, svg).forEach((x) => x.classList.add('on'));
    if (node) {
      on(`.node[data-id="${esc(node)}"]`);
      $$('.edge', svg).forEach((e) => {
        if (e.dataset.from === node || e.dataset.to === node) {
          e.classList.add('on');
          on(`.elabel[data-for="${esc(e.dataset.id)}"]`);
          on(`.node[data-id="${esc(e.dataset.from === node ? e.dataset.to : e.dataset.from)}"]`);
        }
      });
    } else if (edge) {
      const e = $(`.edge[data-id="${esc(edge)}"]`, svg); if (!e) return;
      e.classList.add('on'); on(`.elabel[data-for="${esc(edge)}"]`);
      on(`.node[data-id="${esc(e.dataset.from)}"]`); on(`.node[data-id="${esc(e.dataset.to)}"]`);
    }
  }
  function clearHighlight(svg) { svg.classList.remove('hl'); $$('.on', svg).forEach((x) => x.classList.remove('on')); }
  function restoreHighlight(cv) {
    const svg = cv.svg; if (!svg) return;
    const sel = $('.node.sel', svg); const selE = svg.dataset.selEdge;
    if (sel) highlight(svg, { node: sel.dataset.id }); else if (selE) highlight(svg, { edge: selE }); else clearHighlight(svg);
  }
  function clearSelection(cv) {
    if (!cv.svg) return;
    $$('.node.sel', cv.svg).forEach((n) => n.classList.remove('sel'));
    delete cv.svg.dataset.selEdge; clearHighlight(cv.svg); setHash();
  }
  function selectNode(cv, id, { center = false } = {}) {
    clearSelection(cv);
    const n = $(`.node[data-id="${esc(id)}"]`, cv.svg); if (!n) return;
    n.classList.add('sel'); highlight(cv.svg, { node: id });
    if (center) cv.center(id);
    openEntity(id === '__system' ? '__system' : (n.dataset.ref || id));
    setHash(id);
  }
  function selectEdge(cv, edgeId) {
    clearSelection(cv); cv.svg.dataset.selEdge = edgeId; highlight(cv.svg, { edge: edgeId });
    openEdge(cv.viewId, edgeId);
  }

  // ---------- painel ----------
  const panel = $('#panel');
  const panelOpen = () => panel.classList.contains('open');
  function closePanel() { panel.classList.remove('open'); panel.replaceChildren(); }
  function section(title, iconName, ...content) {
    const items = content.flat().filter(Boolean);
    if (!items.length) return null;
    return el('section', null, el('h3', null, iconName ? ico(iconName) : null, title), ...items);
  }
  function confChip(c) { return el('span', { class: 'conf ' + c, title: T.confHint[c], text: T.conf[c] }); }
  function cmd(text) { return el('div', { class: 'cmd' }, el('code', { text }), el('button', { title: T.ui.copy, 'aria-label': T.ui.copy, onclick: () => copy(text) }, ico('copy'))); }
  function head(kind, name, conf, extra) {
    return el('div', { class: 'p-head k-' + kindIcon(kind) },
      el('button', { class: 'iconbtn p-close', 'aria-label': T.ui.close, title: T.ui.close + ' (Esc)', onclick: () => { closePanel(); const cv = currentCanvas(); if (cv) clearSelection(cv); } }, ico('close')),
      el('div', { class: 'p-kind' }, el('span', { class: 'tile' }, ico(kindIcon(kind))), el('div', null, el('small', { text: T.kind[kind] || kind }), el('h2', { text: name }))),
      el('div', { style: 'margin-top:10px;display:flex;gap:6px;flex-wrap:wrap' }, conf ? confChip(conf) : null, extra || null));
  }
  function relRow(otherId, r, dir) {
    const o = D.entities[otherId] || { name: otherId, kind: 'service' };
    return el('button', { class: 'rel k-' + kindIcon(o.kind), onclick: () => openEntity(otherId, { navigate: true }) },
      ico(dir === 'out' ? 'chevron' : 'back'),
      el('span', { class: 'r-main' }, el('div', { class: 'r-name', text: o.name }), r.label ? el('div', { class: 'r-lab', text: r.label }) : null),
      r.protocol || r.async ? el('span', { class: 'r-tag', text: [r.protocol, r.async ? T.ui.async : ''].filter(Boolean).join(' · ') }) : null);
  }
  function sourcesList(srcs) {
    return srcs.map((s) => {
      const ref = s.path + (s.line ? ':' + s.line : '');
      return el('div', { class: 'src' }, ico('file'), el('span', { text: ref }), el('button', { title: T.ui.copy, 'aria-label': T.ui.copy, onclick: () => copy(ref) }, ico('copy')));
    });
  }
  function openEntity(id, { navigate = false } = {}) {
    const e = D.entities[id]; if (!e) return;
    if (navigate) { goToEntity(id); return; }
    const isExec = root.dataset.aud === 'exec'; const isOps = root.dataset.aud === 'ops';
    const ids = new Set([id, ...(e.children || [])]);
    const out = D.relations.filter((r) => ids.has(r.from) && !ids.has(r.to));
    const inn = D.relations.filter((r) => ids.has(r.to) && !ids.has(r.from));
    const internal = id === '__system';
    const kids = (e.children || []).map((k) => D.entities[k]).filter(Boolean);
    const ops = e.ops || {};
    const opsKv = [];
    const kv = (label, value) => { if (value == null || value === '' || (Array.isArray(value) && !value.length)) return; opsKv.push(el('dt', { text: label }), el('dd', null, value)); };
    kv(T.ui.ports, (ops.ports || []).length ? el('span', { class: 'chips' }, ops.ports.map((p) => el('span', { class: 'chip mono', text: String(p) }))) : null);
    kv(T.ui.logs, ops.logs || null); kv(T.ui.health, ops.health ? el('code', { text: ops.health }) : null);
    kv(T.ui.schedule, ops.schedule || null);
    kv(T.ui.testsDetected, ops.tests ? ({ detected: '✓', absent: '✗', unknown: '?' }[ops.tests] + ' ' + (T.testsState[ops.tests] || ops.tests)) : null);
    const opsSec = isExec ? null : section(T.ui.operations, 'server',
      ops.start ? [el('div', { class: 'r-lab', text: T.ui.start }), cmd(ops.start)] : null,
      ops.build ? [el('div', { class: 'r-lab', style: 'margin-top:8px', text: T.ui.build }), cmd(ops.build)] : null,
      ops.test ? [el('div', { class: 'r-lab', style: 'margin-top:8px', text: T.ui.test }), cmd(ops.test)] : null,
      opsKv.length ? el('dl', { class: 'kv', style: 'margin-top:10px' }, opsKv) : null,
      (ops.config || []).length ? [el('div', { class: 'r-lab', style: 'margin:10px 0 6px', text: T.ui.config }), el('div', { class: 'chips' }, ops.config.map((c) => el('span', { class: 'chip mono', text: c })))] : null);
    const fmSec = isExec || !(ops.failureModes || []).length ? null : section(T.ui.failureModes, 'alert', ops.failureModes.map((f) => el('div', { class: 'fm' }, el('b', { text: f.symptom }), f.probableCause ? el('span', { text: f.probableCause }) : null, el('div', { text: '→ ' + f.action }))));
    const risks = (D.risksBy[id] || []).map((rid) => D.risks[rid]).filter(Boolean);
    const flows = (D.flowsBy[id] || []).map((fid) => D.flows.find((f) => f.id === fid)).filter(Boolean);
    const srcSec = isExec || internal || !(e.sources || []).length ? null : (isOps
      ? el('section', null, el('details', null, el('summary', { class: 'r-lab', text: T.ui.sources + ' (' + e.sources.length + ')' }), sourcesList(e.sources)))
      : section(T.ui.sources, 'file', sourcesList(e.sources)));
    const body = el('div', { class: 'p-body' },
      section(T.ui.responsibility, null, el('p', { text: e.text || '—' }), e.boundary ? el('p', { class: 'r-lab', style: 'margin-top:6px', text: '⌂ ' + e.boundary }) : null),
      section(T.ui.tech, null, e.tech ? el('div', { class: 'chips' }, e.tech.split(/\s*·\s*/).filter(Boolean).map((x) => el('span', { class: 'chip', text: x }))) : null, (e.tags || []).length ? el('div', { class: 'chips', style: 'margin-top:6px' }, e.tags.map((x) => el('span', { class: 'chip', text: '#' + x }))) : null),
      kids.length ? section(kids.length + ' ' + T.ui.components, 'lib',
        D.views['comp-' + id] && !isExec ? el('button', { class: 'btn primary', style: 'margin-bottom:10px', onclick: () => drill(id) }, ico('drill'), T.ui.drill) : null,
        kids.map((k) => el('button', { class: 'rel k-' + kindIcon(k.kind), onclick: () => openEntity(k.id, { navigate: true }) }, ico(kindIcon(k.kind)), el('span', { class: 'r-main' }, el('div', { class: 'r-name', text: k.name }), el('div', { class: 'r-lab', text: k.text }))))) : null,
      out.length || inn.length ? section(T.ui.relations, 'flow',
        out.length ? [el('div', { class: 'r-lab', style: 'margin-bottom:2px', text: T.ui.outgoing + ' · ' + out.length }), out.map((r) => relRow(r.to, r, 'out'))] : null,
        inn.length ? [el('div', { class: 'r-lab', style: 'margin:8px 0 2px', text: T.ui.incoming + ' · ' + inn.length }), inn.map((r) => relRow(r.from, r, 'in'))] : null) : null,
      isOps ? opsSec : null, isOps ? fmSec : null,
      risks.length ? section(T.ui.risksFor, 'alert', risks.map((r) => el('button', { class: 'rel', onclick: () => { showTab('health'); } }, ico('alert'), el('span', { class: 'r-main' }, el('div', { class: 'r-name', text: r.title }), el('div', { class: 'r-lab', text: T.ui.impact + ' ' + r.impact + ' · ' + T.ui.likelihood + ' ' + r.likelihood }))))) : null,
      flows.length && !isExec ? section(T.tab.flows, 'flow', flows.map((f) => el('button', { class: 'rel', onclick: () => { showTab('flows'); selectFlow(f.id); } }, ico('flow'), el('span', { class: 'r-main' }, el('div', { class: 'r-name', text: f.name }), el('div', { class: 'r-lab', text: f.steps.length + ' ' + T.ui.step.toLowerCase() + 's' }))))) : null,
      !isOps ? opsSec : null, !isOps ? fmSec : null,
      srcSec);
    panel.replaceChildren(head(e.kind, e.name, e.confidence, e.tech && !isExec ? null : null), body);
    panel.classList.add('open'); panel.scrollTop = 0;
  }
  function openEdge(viewId, edgeId) {
    const v = D.views[viewId]; if (!v) return;
    const rels = (v.edges[edgeId] || []).map((rid) => D.relations.find((r) => r.id === rid)).filter(Boolean);
    if (!rels.length) return;
    const isExec = root.dataset.aud === 'exec';
    const name = (id) => (D.entities[id] || { name: id }).name;
    const items = rels.map((r) => el('div', { class: 'fm' },
      el('b', { text: name(r.from) + ' → ' + name(r.to) }),
      r.label ? el('div', { text: r.label }) : null,
      el('div', { class: 'chips', style: 'margin:6px 0' }, r.protocol ? el('span', { class: 'chip', text: r.protocol }) : null, el('span', { class: 'chip', text: r.async ? T.ui.async : T.ui.sync }), confChip(r.confidence)),
      !isExec && r.sources.length ? sourcesList(r.sources) : null));
    const first = rels[0];
    panel.replaceChildren(head('flow', name(first.from) + ' ↔ ' + name(first.to), null), el('div', { class: 'p-body' }, section(T.ui.relations + ' · ' + rels.length, 'flow', items)));
    panel.classList.add('open'); panel.scrollTop = 0;
  }

  // ---------- abas, públicos e navegação ----------
  const canvases = {};
  $$('.canvas-page').forEach((p) => { canvases[p.dataset.page] = new Canvas(p); });
  let curTab = null;
  const currentCanvas = () => canvases[curTab] || null;
  function tabVisible(id) {
    const b = $(`.tabs [data-tab="${id}"]`);
    return !!b && !b.hidden;
  }
  function showTab(id, { keepHash = false } = {}) {
    if (!$(`#p-${id}`)) id = 'overview';
    if (!tabVisible(id)) id = 'overview';
    curTab = id;
    $$('.page').forEach((p) => p.classList.toggle('on', p.dataset.page === id));
    $$('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    const cv = canvases[id];
    if (cv && !cv.fitted) requestAnimationFrame(() => cv.fit());
    if (id === 'flows' && !curFlow && D.flows.length) selectFlow(D.flows[0].id);
    if (!keepHash) setHash();
  }
  function setAud(a) {
    root.dataset.aud = a;
    $$('.seg [data-aud]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.aud === a)));
    $$('.tabs [data-tab]').forEach((b) => { b.hidden = !b.dataset.audList.split(' ').includes(a); });
    if (curTab && !tabVisible(curTab)) showTab('overview');
    const sel = currentCanvas() && currentCanvas().svg && $('.node.sel', currentCanvas().svg);
    if (panelOpen() && sel) openEntity(sel.dataset.ref || sel.dataset.id);
    setHash();
  }
  function drill(containerId) {
    const viewId = 'comp-' + containerId;
    if (!D.views[viewId]) return;
    if (!tabVisible('components')) setAud('dev');
    showTab('components');
    showCompView(viewId);
  }
  function showCompView(viewId) {
    const cv = canvases.components; if (!cv) return;
    cv.setSvg((s) => s.dataset.view === viewId);
    $$('#p-components [data-compview]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.compview === viewId)));
    const t = $('#p-components [data-crumb-title]'); if (t) t.textContent = D.views[viewId].title;
    setHash();
  }
  function goToEntity(id) {
    let view = D.home[id] || 'containers';
    let target = id;
    if (view.startsWith('comp-') && !tabVisible('components')) { target = D.entities[id].parent; view = 'containers'; }
    if (view.startsWith('comp-')) { showTab('components'); showCompView(view); }
    else showTab(view);
    const cv = currentCanvas();
    if (cv) {
      if (!cv.fitted) cv.fit();
      const present = cv.svg && $(`.node[data-id="${esc(target)}"]`, cv.svg);
      if (present) selectNode(cv, target, { center: true });
      else openEntity(id);
    } else openEntity(id);
  }
  $$('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $$('.seg [data-aud]').forEach((b) => b.addEventListener('click', () => setAud(b.dataset.aud)));
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goto]'); if (g) { showTab(g.dataset.goto); return; }
    const s = e.target.closest('[data-select]'); if (s) { goToEntity(s.dataset.select); return; }
    const cvb = e.target.closest('[data-compview]'); if (cvb) { showCompView(cvb.dataset.compview); return; }
    const fb = e.target.closest('[data-flow]'); if (fb) { selectFlow(fb.dataset.flow); return; }
    const sb = e.target.closest('[data-step]'); if (sb) { step(sb.dataset.step); return; }
    const act = e.target.closest('.top [data-act]');
    if (act) { if (act.dataset.act === 'theme') toggleTheme(); else if (act.dataset.act === 'present') present(); }
  });

  // ---------- fluxos ----------
  let curFlow = null; let stepIdx = -1; let playTimer = null;
  function selectFlow(id) {
    const cv = canvases.flows; if (!cv) return;
    curFlow = id; stepIdx = -1; stopPlay();
    cv.setSvg((s) => s.dataset.flow === id);
    $$('#p-flows [data-flow]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.flow === id)));
    const f = D.flows.find((x) => x.id === id);
    const t = $('#p-flows [data-crumb-title]'); if (t) t.textContent = f.name;
    renderStep(); setHash();
  }
  function renderStep() {
    const cv = canvases.flows; if (!cv || !cv.svg) return;
    const f = D.flows.find((x) => x.id === curFlow); if (!f) return;
    const msgs = $$('.msg', cv.svg);
    cv.svg.classList.toggle('stepping', stepIdx >= 0);
    msgs.forEach((m, i) => { m.classList.toggle('cur', i === stepIdx); m.classList.toggle('done', i < stepIdx); });
    const cur = msgs[stepIdx];
    if (cur) {
      const cr = cv.el.getBoundingClientRect(); const mr = cur.getBoundingClientRect();
      const pad = 90;
      if (mr.left < cr.left + pad || mr.right > cr.right - pad) { cv.x += (cr.left + cr.width / 2) - (mr.left + mr.width / 2); }
      if (mr.top < cr.top + pad || mr.bottom > cr.bottom - pad - 60) { cv.y += (cr.top + cr.height / 2) - (mr.top + mr.height / 2); }
      cv.apply();
    }
    const st = $('#p-flows [data-steptext]');
    const name = (id) => (D.entities[id] || { name: id }).name;
    st.replaceChildren();
    if (stepIdx < 0) st.append(el('b', { text: f.name }), ' · ' + f.steps.length + ' ' + T.ui.step.toLowerCase() + 's — ▶');
    else {
      const s = f.steps[stepIdx];
      st.append(el('b', { text: `${T.ui.step} ${stepIdx + 1}/${f.steps.length}: ` }), `${name(s.from)} → ${name(s.to)} — ${s.label}`);
    }
  }
  function step(dir) {
    const f = D.flows.find((x) => x.id === curFlow); if (!f) return;
    if (dir === 'play') { if (playTimer) stopPlay(); else { if (stepIdx >= f.steps.length - 1) stepIdx = -1; playTimer = setInterval(() => { if (stepIdx >= f.steps.length - 1) { stopPlay(); return; } stepIdx++; renderStep(); }, 1300); stepIdx++; renderStep(); } return; }
    stopPlay();
    stepIdx = dir === 'next' ? Math.min(f.steps.length - 1, stepIdx + 1) : Math.max(-1, stepIdx - 1);
    renderStep();
  }
  function stopPlay() { if (playTimer) clearInterval(playTimer); playTimer = null; }

  // ---------- busca ----------
  const q = $('#q'); const results = $('#results');
  const index = [];
  for (const e of Object.values(D.entities)) index.push({ type: 'entity', id: e.id, name: e.name, kind: e.kind, sub: [T.kind[e.kind], e.tech].filter(Boolean).join(' · '), hay: [e.name, e.tech, e.text, (e.sources || []).map((s) => s.path).join(' '), (e.ops && e.ops.config || []).join(' ')].join(' ').toLowerCase() });
  for (const f of D.flows) index.push({ type: 'flow', id: f.id, name: f.name, kind: 'flow', sub: T.tab.flows, hay: (f.name + ' ' + f.description + ' ' + f.steps.map((s) => s.label).join(' ')).toLowerCase() });
  for (const r of Object.values(D.risks)) index.push({ type: 'risk', id: r.id, name: r.title, kind: 'alert', sub: T.tab.health, hay: r.title.toLowerCase() });
  for (const d of D.decisions) index.push({ type: 'decision', id: d.id, name: d.title, kind: 'doc', sub: T.tab.decisions, hay: d.title.toLowerCase() });
  for (const d of D.data) index.push({ type: 'data', id: d.id, name: d.name, kind: 'data', sub: T.tab.data, hay: d.name.toLowerCase() });
  let active = 0; let hits = [];
  function search(term) {
    const s = term.trim().toLowerCase();
    if (!s) { results.classList.remove('open'); return; }
    hits = index.map((x) => {
      const n = x.name.toLowerCase();
      const score = n === s ? 100 : n.startsWith(s) ? 80 : n.includes(s) ? 60 : x.hay.includes(s) ? 30 : 0;
      return { x, score };
    }).filter((h) => h.score).sort((a, b) => b.score - a.score || a.x.name.localeCompare(b.x.name)).slice(0, 14).map((h) => h.x);
    active = 0; renderResults();
  }
  function renderResults() {
    results.replaceChildren();
    if (!hits.length) results.append(el('div', { class: 'empty', text: T.ui.noResults }));
    hits.forEach((h, i) => results.append(el('button', { class: i === active ? 'act' : '', role: 'option', onclick: () => pick(h) },
      ico(h.type === 'entity' ? kindIcon(h.kind) : h.kind), el('span', { text: h.name }), el('span', { class: 'r-sub', text: h.sub }))));
    results.classList.add('open');
  }
  function pick(h) {
    results.classList.remove('open'); q.blur();
    if (h.type === 'entity') goToEntity(h.id);
    else if (h.type === 'flow') { showTab('flows'); selectFlow(h.id); }
    else if (h.type === 'risk') showTab('health');
    else if (h.type === 'decision') { showTab('decisions'); const a = document.getElementById('adr-' + h.id); if (a) a.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (h.type === 'data') showTab('data');
  }
  q.addEventListener('input', () => search(q.value));
  q.addEventListener('focus', () => { if (q.value) search(q.value); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { active = Math.min(hits.length - 1, active + 1); renderResults(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); renderResults(); e.preventDefault(); }
    else if (e.key === 'Enter' && hits[active]) { pick(hits[active]); }
    else if (e.key === 'Escape') { results.classList.remove('open'); q.blur(); }
  });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.search')) results.classList.remove('open'); });

  // ---------- legenda ----------
  function toggleLegend(cv) {
    const box = $('[data-legend]', cv.page);
    if (box.classList.contains('open')) { box.classList.remove('open'); return; }
    const kinds = [...new Set($$('.node', cv.svg).map((n) => [...n.classList].find((c) => c.startsWith('k-'))).filter(Boolean))];
    const line = (dash) => { const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('class', 'ln'); s.setAttribute('viewBox', '0 0 34 10'); const l = document.createElementNS(SVGNS, 'line'); l.setAttribute('x1', '1'); l.setAttribute('x2', '33'); l.setAttribute('y1', '5'); l.setAttribute('y2', '5'); l.setAttribute('stroke', 'currentColor'); l.setAttribute('stroke-width', '1.8'); if (dash) l.setAttribute('stroke-dasharray', dash); s.append(l); return s; };
    box.replaceChildren(
      el('h4', { text: T.ui.legend }),
      ...kinds.map((k) => el('div', { class: 'row ' + k }, el('span', { class: 'sw' }), T.kind[k.slice(2)] || k.slice(2))),
      el('h4', { text: T.ui.relations, style: 'margin-top:10px' }),
      el('div', { class: 'row' }, line(''), T.ui.sync), el('div', { class: 'row' }, line('7 5'), T.ui.async), el('div', { class: 'row' }, line('2 4'), T.conf.unconfirmed),
      el('h4', { text: T.ui.confidence, style: 'margin-top:10px' }),
      ...['verified', 'inferred', 'unconfirmed'].map((c) => el('div', { class: 'row', title: T.confHint[c] }, el('span', { class: 'dot', style: `background:var(--${c === 'verified' ? 'ok' : c === 'inferred' ? 'warn' : 'text-3'})` }), T.conf[c])));
    box.classList.add('open');
  }

  // ---------- exportação ----------
  function standalone(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', SVGNS);
    clone.setAttribute('data-theme', root.dataset.theme || 'light');
    clone.classList.remove('hl'); $$('.on,.sel', clone).forEach((x) => x.classList.remove('on', 'sel'));
    const w = Number(svg.getAttribute('width')); const h = Number(svg.getAttribute('height'));
    const style = document.createElementNS(SVGNS, 'style');
    style.textContent = document.getElementById('theme-css').textContent;
    const bg = document.createElementNS(SVGNS, 'rect');
    bg.setAttribute('width', w); bg.setAttribute('height', h); bg.setAttribute('fill', getComputedStyle(root).getPropertyValue('--bg').trim() || '#fff');
    const defs = document.createElementNS(SVGNS, 'defs');
    const used = new Set($$('use', clone).map((u) => u.getAttribute('href')));
    used.forEach((ref) => { const sym = document.querySelector(ref); if (sym) defs.append(sym.cloneNode(true)); });
    clone.insertBefore(defs, clone.firstChild); clone.insertBefore(bg, clone.firstChild); clone.insertBefore(style, clone.firstChild);
    return { text: '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone), w, h };
  }
  function fileBase(svg) {
    const v = svg.dataset.view || ('fluxo-' + (svg.dataset.flow || ''));
    return (document.title.split(' — ')[0] || 'arqt').toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') + '-' + v;
  }
  function download(blob, name) {
    const a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportSvg(svg) { const s = standalone(svg); download(new Blob([s.text], { type: 'image/svg+xml' }), fileBase(svg) + '.svg'); }
  function exportPng(svg) {
    const s = standalone(svg);
    const url = URL.createObjectURL(new Blob([s.text], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(2, 8000 / Math.max(s.w, s.h));
      const c = el('canvas'); c.width = Math.round(s.w * scale); c.height = Math.round(s.h * scale);
      const g = c.getContext('2d'); g.scale(scale, scale); g.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob((b) => { if (b) download(b, fileBase(svg) + '.png'); }, 'image/png');
    };
    img.src = url;
  }

  // ---------- apresentação ----------
  let slides = []; let slideIdx = 0;
  function buildSlides() {
    const s = [{ tab: 'overview', title: T.tab.overview }, { tab: 'context', title: T.tab.context }, { tab: 'containers', title: T.tab.containers }];
    for (const [id, v] of Object.entries(D.views)) if (v.kind === 'components') s.push({ tab: 'components', view: id, title: T.tab.components + ' · ' + v.title });
    for (const f of D.flows) s.push({ tab: 'flows', flow: f.id, title: T.tab.flows + ' · ' + f.name });
    s.push({ tab: 'health', title: T.tab.health });
    return s;
  }
  function present() {
    slides = buildSlides(); slideIdx = 0;
    root.classList.add('present'); closePanel();
    try { if (root.requestFullscreen) root.requestFullscreen().catch(() => {}); } catch (e) { /* ok */ }
    showSlide();
  }
  function showSlide() {
    const s = slides[slideIdx];
    const prev = root.dataset.aud; if (!tabVisible(s.tab)) setAud('dev');
    showTab(s.tab, { keepHash: true });
    if (s.view) showCompView(s.view);
    if (s.flow) selectFlow(s.flow);
    requestAnimationFrame(() => { const cv = currentCanvas(); if (cv) cv.fit(); });
    $('#slidecap').replaceChildren(el('span', { text: s.title }), el('small', { text: `${slideIdx + 1}/${slides.length} · ← → · Esc` }));
    void prev;
  }
  function endPresent() { root.classList.remove('present'); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* ok */ } const cv = currentCanvas(); if (cv) requestAnimationFrame(() => cv.fit()); }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && root.classList.contains('present')) endPresent(); });

  // ---------- teclado ----------
  document.addEventListener('keydown', (e) => {
    const typing = e.target.matches && e.target.matches('input, textarea');
    if (root.classList.contains('present')) {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); if (slideIdx < slides.length - 1) { slideIdx++; showSlide(); } return; }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); if (slideIdx > 0) { slideIdx--; showSlide(); } return; }
      if (e.key === 'Escape') { endPresent(); return; }
    }
    if (typing) return;
    const cv = currentCanvas();
    if (e.key === '/') { e.preventDefault(); q.focus(); q.select(); }
    else if (e.key === 'Escape') { results.classList.remove('open'); if (panelOpen()) { closePanel(); if (cv) clearSelection(cv); } else if (cv) clearSelection(cv); $$('[data-legend].open').forEach((l) => l.classList.remove('open')); }
    else if ((e.key === 'f' || e.key === 'F') && cv) cv.fit();
    else if ((e.key === '+' || e.key === '=') && cv) cv.zoomAt(1.2);
    else if (e.key === '-' && cv) cv.zoomAt(1 / 1.2);
    else if (e.key === 't' || e.key === 'T') toggleTheme();
    else if (e.key === 'p' || e.key === 'P') present();
    else if (curTab === 'flows' && e.key === 'ArrowRight') step('next');
    else if (curTab === 'flows' && e.key === 'ArrowLeft') step('prev');
  });
  let resizeT;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { const cv = currentCanvas(); if (cv) cv.fit(); }, 120); });

  // ---------- endereço (hash) ----------
  function setHash(sel) {
    if (!curTab) return;
    let h = '#/' + curTab;
    if (curTab === 'components' && canvases.components) h += '/' + canvases.components.viewId.replace(/^comp-/, '');
    if (curTab === 'flows' && curFlow) h += '/' + curFlow;
    const params = [];
    if (root.dataset.aud !== D.audience) params.push('aud=' + root.dataset.aud);
    if (sel) params.push('sel=' + encodeURIComponent(sel));
    if (params.length) h += '?' + params.join('&');
    try { history.replaceState(null, '', h); } catch (e) { /* file:// em alguns navegadores */ }
  }
  function route() {
    const m = /^#\/([\w-]+)(?:\/([\w-]+))?(?:\?(.*))?$/.exec(location.hash || '');
    const params = new URLSearchParams(m && m[3] ? m[3] : '');
    setAud(['exec', 'ops', 'dev'].includes(params.get('aud')) ? params.get('aud') : D.audience);
    if (!m) { showTab('overview'); return; }
    showTab(m[1], { keepHash: true });
    if (m[1] === 'components' && m[2]) showCompView('comp-' + m[2]);
    if (m[1] === 'flows' && m[2]) selectFlow(m[2]);
    const sel = params.get('sel');
    if (sel && D.entities[sel]) requestAnimationFrame(() => { const cv = currentCanvas(); if (cv) { cv.fit(); selectNode(cv, sel, { center: true }); } });
  }
  window.addEventListener('hashchange', route);
  route();
})();
