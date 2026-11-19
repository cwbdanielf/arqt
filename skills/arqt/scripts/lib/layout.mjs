// Layout determinístico em camadas (esquerda → direita) com faixas por fronteira
// e roteamento ortogonal por canais (colunas) e corredores (entre linhas).
// Garantias: caixas nunca se sobrepõem; arestas nunca atravessam caixas.

const BIG = 1000; // unidade abstrata de linha/coluna para ordenar intervalos

const DEFAULTS = {
  nodeW: 248, nodeH: 92,
  minGap: 132, outerGap: 28, laneSp: 12, laneMargin: 18,
  rowGap: 34, bandPadTop: 38, bandPadBottom: 18, bandPadX: 18, bandGap: 30,
  margin: 24,
  labelMax: 172, labelCharW: 6.4, labelPad: 16, portSp: 22,
};

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

function assignRows(desired, R) {
  const n = desired.length;
  const pos = desired.map((d) => Math.min(R - 1, Math.max(0, Math.round(d))));
  for (let i = 1; i < n; i++) pos[i] = Math.max(pos[i], pos[i - 1] + 1);
  if (n && pos[n - 1] > R - 1) {
    pos[n - 1] = R - 1;
    for (let i = n - 2; i >= 0; i--) pos[i] = Math.min(pos[i], pos[i + 1] - 1);
  }
  return pos;
}

function colorIntervals(items) {
  // items: {lo, hi, key} → atribui lane mínima sem sobreposição (gulosa, determinística)
  const sorted = [...items].sort((a, b) => a.lo - b.lo || a.hi - b.hi || (a.key < b.key ? -1 : 1));
  const laneEnds = [];
  for (const it of sorted) {
    let lane = laneEnds.findIndex((end) => end < it.lo - 1);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.hi); } else laneEnds[lane] = it.hi;
    it.lane = lane;
  }
  return laneEnds.length;
}

export function layoutGraph(graph, options = {}) {
  if (options.mode) return layoutCore(graph, options);
  const score = (l) => l.width * l.height * (1 + 0.06 * l.stats.corridor) * (1 + 0.5 * l.stats.emptyRatio);
  const a = layoutCore(graph, { ...options, mode: 'columns' });
  const b = layoutCore(graph, { ...options, mode: 'rows' });
  return score(b) < score(a) * 0.92 ? b : a;
}

function layoutCore(graph, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const columns = o.mode === 'columns';
  const W = o.nodeW; const H = o.nodeH;
  const order = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const edges = graph.edges.filter((e) => byId.has(e.from) && byId.has(e.to) && e.from !== e.to);
  const ids = graph.nodes.map((n) => n.id);
  const out = new Map(ids.map((id) => [id, []]));
  const inn = new Map(ids.map((id) => [id, []]));
  for (const e of edges) { out.get(e.from).push(e.to); inn.get(e.to).push(e.from); }
  const nb = (id) => [...out.get(id), ...inn.get(id)];
  const connected = ids.filter((id) => nb(id).length > 0);
  const isolated = ids.filter((id) => nb(id).length === 0);
  const hint = (id) => byId.get(id).rank ?? 1; // 0 = início (pessoas), 1 = normal

  // ---- 1. quebra de ciclos (DFS determinística) ----
  const dagOut = new Map(ids.map((id) => [id, []]));
  const state = new Map();
  const roots = [...connected].sort((a, b) => hint(a) - hint(b) || inn.get(a).length - inn.get(b).length || order.get(a) - order.get(b));
  for (const r of roots) {
    if (state.has(r)) continue;
    const stack = [[r, 0]];
    state.set(r, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const [v, i] = top;
      const succ = out.get(v);
      if (i < succ.length) {
        top[1]++;
        const w = succ[i];
        if (!state.has(w)) { dagOut.get(v).push(w); state.set(w, 1); stack.push([w, 0]); }
        else if (state.get(w) === 2) dagOut.get(v).push(w);
        // state 1 = aresta de retorno: ignorada no ranking
      } else { state.set(v, 2); stack.pop(); }
    }
  }
  const dagIn = new Map(ids.map((id) => [id, []]));
  for (const [v, ws] of dagOut) for (const w of ws) dagIn.get(w).push(v);

  // ---- 2. ranking por caminho mais longo + aperto das fontes ----
  const rank = new Map();
  const indeg = new Map(connected.map((id) => [id, dagIn.get(id).length]));
  const queue = connected.filter((id) => indeg.get(id) === 0).sort((a, b) => order.get(a) - order.get(b));
  const topo = [];
  while (queue.length) {
    const v = queue.shift();
    topo.push(v);
    if (!rank.has(v)) rank.set(v, 0);
    for (const w of dagOut.get(v)) {
      rank.set(w, Math.max(rank.get(w) ?? 0, rank.get(v) + 1));
      indeg.set(w, indeg.get(w) - 1);
      if (indeg.get(w) === 0) queue.push(w);
    }
  }
  for (const v of [...topo].reverse()) {
    if (dagIn.get(v).length === 0 && dagOut.get(v).length && hint(v) !== 0) {
      rank.set(v, Math.max(0, Math.min(...dagOut.get(v).map((w) => rank.get(w))) - 1));
    }
  }
  // pessoas sempre na primeira coluna quando possível
  for (const v of connected) if (hint(v) === 0 && dagIn.get(v).length === 0) rank.set(v, 0);

  let C = connected.length ? Math.max(...connected.map((v) => rank.get(v))) + 1 : 0;

  // ---- 3. faixas ----
  const bandOf = (id) => byId.get(id).band || '_free';
  const bandMeta = new Map((graph.bands || []).map((b) => [b.id, b]));
  let bands = ['_free', ...(graph.bands || []).map((b) => b.id)].filter((b) => ids.some((id) => bandOf(id) === b));

  // nós isolados: grade (se nada conectado) ou coluna menos ocupada da faixa
  if (C === 0) {
    const perBand = new Map();
    for (const id of isolated) { const b = bandOf(id); if (!perBand.has(b)) perBand.set(b, []); perBand.get(b).push(id); }
    const maxN = Math.max(...[...perBand.values()].map((a) => a.length));
    C = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(maxN * 1.6))));
    for (const list of perBand.values()) list.forEach((id, i) => rank.set(id, i % C));
  } else {
    const load = new Map();
    const key = (b, r) => `${b}|${r}`;
    for (const v of connected) load.set(key(bandOf(v), rank.get(v)), (load.get(key(bandOf(v), rank.get(v))) || 0) + 1);
    for (const id of isolated) {
      const b = bandOf(id);
      let best = 0; let bestLoad = Infinity;
      const prefs = [...Array(C).keys()];
      if (hint(id) === 0) prefs.sort((x, y) => x - y);
      for (const r of prefs) {
        const l = load.get(key(b, r)) || 0;
        if (l < bestLoad) { best = r; bestLoad = l; }
      }
      rank.set(id, best);
      load.set(key(b, best), bestLoad + 1);
    }
  }

  // compacta colunas vazias
  const usedRanks = [...new Set(ids.map((id) => rank.get(id)))].sort((a, b) => a - b);
  const remap = new Map(usedRanks.map((r, i) => [r, i]));
  for (const id of ids) rank.set(id, remap.get(rank.get(id)));
  C = usedRanks.length;

  if (columns) {
    const groupOf = (id) => {
      const n = byId.get(id);
      if (n.band) return n.band;
      return n.zone === 'lead' || hint(id) === 0 ? '_lead' : n.zone === 'tail' ? '_tail' : '_mid';
    };
    const groups = new Map();
    for (const id of ids) { const g = groupOf(id); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(id); }
    const pri = (g) => (g === '_lead' ? 0 : g === '_tail' ? 2 : 1);
    const mr = (g) => { const c = groups.get(g).filter((id) => nb(id).length); return c.length ? mean(c.map((id) => rank.get(id))) : C; };
    const first = (g) => Math.min(...groups.get(g).map((id) => order.get(id)));
    const gOrder = [...groups.keys()].sort((x, y) => pri(x) - pri(y) || mr(x) - mr(y) || first(x) - first(y));
    let start = 0;
    for (const g of gOrder) {
      const mem = groups.get(g);
      const squash = g === '_lead' || g === '_tail';
      const con = mem.filter((id) => nb(id).length);
      const iso = mem.filter((id) => !nb(id).length);
      const distinct = [...new Set(con.map((id) => rank.get(id)))].sort((x, y) => x - y);
      const loc = new Map(distinct.map((r, i) => [r, i]));
      let span = squash ? Math.max(1, Math.ceil(mem.length / 8)) : distinct.length || Math.min(5, Math.max(1, Math.ceil(Math.sqrt(iso.length * 1.6))));
      const loadc = new Array(span).fill(0);
      const put = (id, lr) => { loadc[lr]++; rank.set(id, start + lr); };
      if (squash) mem.forEach((id, i) => put(id, Math.min(span - 1, Math.floor(i / 8))));
      else {
        con.forEach((id) => put(id, loc.get(rank.get(id))));
        iso.forEach((id) => { let best = 0; for (let i = 1; i < span; i++) if (loadc[i] < loadc[best]) best = i; put(id, best); });
      }
      start += span;
    }
    C = start;
  }

  // ---- 4. ordenação e linhas dentro das faixas ----
  const drawnBandOf = bandOf;
  if (columns) bands = ['_all'];
  const rowKey = columns ? () => '_all' : bandOf;
  const cells = new Map(); // band -> array[C] of ids
  for (const b of bands) cells.set(b, Array.from({ length: C }, () => []));
  for (const id of ids) cells.get(rowKey(id))[rank.get(id)].push(id);
  for (const b of bands) for (const col of cells.get(b)) col.sort((x, y) => order.get(x) - order.get(y));
  const bandRows = new Map(bands.map((b) => [b, Math.max(1, ...cells.get(b).map((c) => c.length))]));
  const local = new Map();
  for (const b of bands) for (const col of cells.get(b)) col.forEach((id, i) => local.set(id, i));

  let offset = new Map();
  const computeOffsets = () => {
    offset = new Map();
    let acc = 0;
    for (const b of bands) { offset.set(b, acc); acc += bandRows.get(b); }
  };
  computeOffsets();
  const grow = (id) => offset.get(rowKey(id)) + local.get(id);

  for (let iter = 0; iter < 14; iter++) {
    const ranks = [...Array(C).keys()];
    if (iter % 2) ranks.reverse();
    for (const r of ranks) {
      for (const b of bands) {
        const col = cells.get(b)[r];
        if (!col.length) continue;
        const desired = col.map((id) => {
          const ns = nb(id);
          return { id, d: ns.length ? mean(ns.map(grow)) - offset.get(b) : local.get(id), cur: local.get(id) };
        });
        desired.sort((a, c) => a.d - c.d || a.cur - c.cur || order.get(a.id) - order.get(c.id));
        const rows = assignRows(desired.map((x) => x.d), bandRows.get(b));
        desired.forEach((x, i) => local.set(x.id, rows[i]));
        cells.get(b)[r] = desired.map((x) => x.id);
      }
    }
    if (iter < 8 && bands.length > 2) {
      const centre = (b) => offset.get(b) + bandRows.get(b) / 2;
      const keyOf = new Map(bands.map((b) => {
        const outside = [];
        for (const id of ids) if (rowKey(id) === b) for (const n of nb(id)) if (rowKey(n) !== b) outside.push(grow(n));
        return [b, outside.length ? (mean(outside) + centre(b)) / 2 : centre(b)];
      }));
      const prev = bands.join();
      bands = [...bands].sort((x, y) => keyOf.get(x) - keyOf.get(y) || bands.indexOf(x) - bands.indexOf(y));
      if (bands.join() !== prev) computeOffsets();
    }
  }

  // ---- 5. grade global ----
  const G = bands.reduce((s, b) => s + bandRows.get(b), 0);
  const rowBand = [];
  for (const b of bands) for (let i = 0; i < bandRows.get(b); i++) rowBand.push(b);
  const occ = Array.from({ length: C }, () => new Array(G).fill(null));
  const cell = new Map();
  for (const id of ids) {
    const c = rank.get(id); const g = grow(id);
    occ[c][g] = id;
    cell.set(id, { c, g });
  }
  const rowClear = (g, c1, c2) => {
    for (let c = c1; c <= c2; c++) if (occ[c][g]) return false;
    return true;
  };

  // ---- 6. rotas abstratas ----
  const corridorLoad = new Array(G + 1).fill(0);
  const gapLoad = new Array(C + 1).fill(0);
  // uso horizontal por linha (meia-coluna: canal g → 2g, coluna c → 2c+1) evita trechos colineares
  const rowUse = Array.from({ length: G }, () => []);
  const free = (g, a, b, own) => rowUse[g].every(([x, y, w]) => b <= x || a >= y || own.includes(w));
  const take = (g, a, b, w) => rowUse[g].push([a, b, w]);
  const sorted = [...edges].sort((a, b) => {
    const sa = cell.get(a.from); const ta = cell.get(a.to); const sb = cell.get(b.from); const tb = cell.get(b.to);
    return Math.abs(ta.c - sa.c) - Math.abs(tb.c - sb.c) || (a.id < b.id ? -1 : 1);
  });
  const routes = sorted.map((e) => {
    const s = cell.get(e.from); const t = cell.get(e.to);
    const r = { e, s, t };
    const F = e.from; const T = e.to;
    if (t.c > s.c) {
      if (s.g === t.g && rowClear(s.g, s.c + 1, t.c - 1) && free(s.g, 2 * s.c + 1, 2 * t.c + 1, [F, T])) { r.type = 'straight'; take(s.g, 2 * s.c + 1, 2 * t.c + 1, F); }
      else if (rowClear(t.g, s.c + 1, t.c - 1) && free(t.g, 2 * (s.c + 1), 2 * t.c + 1, [T]) && free(s.g, 2 * s.c + 1, 2 * (s.c + 1), [F])) {
        r.type = 'lin'; take(t.g, 2 * (s.c + 1), 2 * t.c + 1, T); take(s.g, 2 * s.c + 1, 2 * (s.c + 1), F);
      } else if (rowClear(s.g, s.c + 1, t.c - 1) && free(s.g, 2 * s.c + 1, 2 * t.c, [F]) && free(t.g, 2 * t.c, 2 * t.c + 1, [T])) {
        r.type = 'lout'; take(s.g, 2 * s.c + 1, 2 * t.c, F); take(t.g, 2 * t.c, 2 * t.c + 1, T);
      } else r.type = 'corr';
    } else r.type = 'corr';
    if (r.type === 'corr') { take(s.g, 2 * s.c + 1, 2 * (s.c + 1), F); take(t.g, 2 * t.c, 2 * t.c + 1, T); }
    if (r.type === 'corr') {
      let cands;
      if (s.g !== t.g) {
        const lo = Math.min(s.g, t.g) + 1; const hi = Math.max(s.g, t.g);
        cands = []; for (let k = lo; k <= hi; k++) cands.push(k);
      } else cands = [s.g + 1, s.g];
      const mid = (s.g + t.g + 1) / 2;
      cands.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || corridorLoad[a] - corridorLoad[b] || b - a);
      r.k = cands[0];
      corridorLoad[r.k]++;
    }
    return r;
  });

  // ---- 7. portas (distribuição nas laterais) ----
  const outPorts = new Map(ids.map((id) => [id, []]));
  const inPorts = new Map(ids.map((id) => [id, []]));
  for (const r of routes) {
    const kOut = r.type === 'corr' ? r.k - 0.5 : r.type === 'lin' ? r.t.g : r.s.g + (r.t.g - r.s.g) * 0.001;
    const kIn = r.type === 'corr' ? r.k - 0.5 : r.type === 'lout' ? r.s.g : r.type === 'lin' ? r.s.g : r.t.g;
    outPorts.get(r.e.from).push({ r, key: kOut, tie: r.t.c });
    inPorts.get(r.e.to).push({ r, key: kIn, tie: -r.s.c });
  }
  const spread = (list, side) => {
    list.sort((a, b) => a.key - b.key || a.tie - b.tie || (a.r.e.id < b.r.e.id ? -1 : 1));
    const n = list.length;
    const step = n > 1 ? Math.min(o.portSp, (H * 0.68) / (n - 1)) : 0;
    list.forEach((p, i) => { p.r[side] = (i - (n - 1) / 2) * step; });
  };
  for (const id of ids) { spread(outPorts.get(id), 'po'); spread(inPorts.get(id), 'pi'); }

  // ---- 8. segmentos verticais (canais) e horizontais (corredores) ----
  const ay = (g, off) => g * BIG + BIG / 2 + off; // y abstrato no centro da linha
  const vSegs = Array.from({ length: C + 1 }, () => []);
  const hSegs = Array.from({ length: G + 1 }, () => []);
  for (const r of routes) {
    const ys = ay(r.s.g, r.po); const yt = ay(r.t.g, r.pi);
    r.segs = [];
    if (r.type === 'straight' && Math.abs(ys - yt) < 0.5) continue;
    if (r.type === 'straight' || r.type === 'lout') {
      r.vgap = r.t.c; r.type = 'lout';
      const seg = { lo: Math.min(ys, yt), hi: Math.max(ys, yt), key: r.e.id, r, role: 'v' };
      vSegs[r.vgap].push(seg); r.segs.push(seg);
    } else if (r.type === 'lin') {
      r.vgap = r.s.c + 1;
      const seg = { lo: Math.min(ys, yt), hi: Math.max(ys, yt), key: r.e.id, r, role: 'v' };
      vSegs[r.vgap].push(seg); r.segs.push(seg);
    } else {
      r.gOut = r.s.c + 1; r.gIn = r.t.c;
      const yk = r.k * BIG;
      const a = { lo: Math.min(ys, yk), hi: Math.max(ys, yk), key: r.e.id + '|o', r, role: 'vo' };
      const b = { lo: Math.min(yt, yk), hi: Math.max(yt, yk), key: r.e.id + '|i', r, role: 'vi' };
      vSegs[r.gOut].push(a); vSegs[r.gIn].push(b);
      const h = { lo: Math.min(r.gOut, r.gIn) * BIG, hi: Math.max(r.gOut, r.gIn) * BIG, key: r.e.id, r, role: 'h' };
      hSegs[r.k].push(h);
      r.segs.push(a, b, h);
    }
  }
  const gapLanes = vSegs.map((list) => colorIntervals(list));
  const corrLanes = hSegs.map((list) => colorIntervals(list));
  gapLoad.forEach((_, i) => { gapLoad[i] = gapLanes[i]; });

  // ---- 9. coordenadas ----
  const laneSpan = (L) => (L > 0 ? 2 * o.laneMargin + (L - 1) * o.laneSp : 0);
  // espaço para rótulos: num vão com rótulos, os canais verticais vão para a direita e o trecho horizontal
  // que sai da origem fica livre para o maior rótulo (limitado a o.labelMax; acima disso o texto é abreviado
  // e aparece inteiro no painel/tooltip). Arestas entre colunas distantes já têm trechos longos.
  const labelNeed = new Array(C + 1).fill(0);
  const lw = (r) => (r.e.label ? Math.min(o.labelMax, o.labelCharW * r.e.label.length + o.labelPad) : 0);
  // muitas setas rotuladas saindo do mesmo nó pelo mesmo vão ficam a menos de um rótulo de distância:
  // nesse caso o vão comporta dois rótulos lado a lado, alternando esquerda/direita.
  const fan = new Map();
  for (const r of routes) {
    if (!lw(r) || !(r.type === 'lout' || r.type === 'lin' || !r.segs.length)) continue;
    const g = r.segs.length ? r.vgap : r.t.c;
    const k = g + '|' + r.e.from;
    fan.set(k, (fan.get(k) || 0) + 1);
  }
  for (const r of routes) {
    const w = lw(r);
    if (!w) continue;
    const g = r.segs.length ? r.vgap : r.t.c;
    const nf = fan.get(g + '|' + r.e.from) || 0;
    const two = nf > 1 && (H * 0.68) / (nf - 1) < 20; // portas próximas demais: rótulos empilhados colidiriam
    if (!r.segs.length) { if (r.t.c === r.s.c + 1) labelNeed[r.t.c] = Math.max(labelNeed[r.t.c], two ? 2 * w + 40 : w + 28); }
    else if (r.type === 'lout' || r.type === 'lin') {
      labelNeed[r.vgap] = Math.max(labelNeed[r.vgap], two ? 2 * w + 46 : w + 34);
    }
  }
  const gapW = gapLanes.map((L, g) => (g === 0 || g === C
    ? Math.max(o.outerGap, laneSpan(L))
    : Math.max(o.minGap, laneSpan(L) + labelNeed[g])));
  const colX = [];
  let x = o.margin;
  for (let c = 0; c < C; c++) { x += gapW[c]; colX.push(x); x += W; }
  x += gapW[C] + o.margin;
  const totalW = x;
  const gapRegion = (g) => {
    const left = g === 0 ? o.margin : colX[g - 1] + W;
    const right = g === C ? totalW - o.margin : colX[g];
    return [left, right];
  };

  const drawn = (b) => b !== '_free' && b !== '_all';
  const colBands = columns ? [...new Set(ids.map(drawnBandOf))].filter((b) => b !== '_free') : [];
  const firstRowOf = new Map(); const lastRowOf = new Map();
  rowBand.forEach((b, g) => { if (!firstRowOf.has(b)) firstRowOf.set(b, g); lastRowOf.set(b, g); });
  const rowY = [];
  const corrRegion = [];
  let y = o.margin;
  for (let k = 0; k <= G; k++) {
    const above = k > 0 ? rowBand[k - 1] : null;
    const below = k < G ? rowBand[k] : null;
    let padA = above && above !== below && drawn(above) ? o.bandPadBottom : 0;
    let padB = below && below !== above && drawn(below) ? o.bandPadTop : 0;
    if (colBands.length && k === 0) padB = o.bandPadTop;
    if (colBands.length && k === G) padA = o.bandPadBottom;
    const between = above && below && above !== below;
    const base = k === 0 || k === G ? 6 : between ? o.bandGap : o.rowGap;
    const lanesH = laneSpan(corrLanes[k]);
    const regionH = Math.max(base, lanesH);
    const regionTop = y + padA;
    corrRegion.push([regionTop, regionTop + regionH]);
    y = regionTop + regionH + padB;
    if (k < G) { rowY.push(y); y += H; }
  }
  const totalH = y + o.margin;

  const laneX = (g, lane) => {
    const [l, r] = gapRegion(g);
    const L = gapLanes[g];
    const span = (L - 1) * o.laneSp;
    if (labelNeed[g]) return r - o.laneMargin - span + lane * o.laneSp;
    return (l + r) / 2 + (lane - (L - 1) / 2) * o.laneSp;
  };
  const laneY = (k, lane) => {
    const [t, b] = corrRegion[k];
    const L = corrLanes[k];
    return (t + b) / 2 + (lane - (L - 1) / 2) * o.laneSp;
  };

  const nodes = {};
  for (const id of ids) {
    const { c, g } = cell.get(id);
    nodes[id] = { x: colX[c], y: rowY[g], w: W, h: H, col: c, row: g };
  }

  const bandRects = columns ? colBands.map((b) => {
    const cols = ids.filter((id) => drawnBandOf(id) === b).map((id) => cell.get(id).c);
    const c1 = Math.min(...cols); const c2 = Math.max(...cols);
    const y1 = rowY[0] - o.bandPadTop; const y2 = rowY[G - 1] + H + o.bandPadBottom;
    return { id: b, label: bandMeta.get(b)?.label ?? b, kind: bandMeta.get(b)?.kind, x: colX[c1] - o.bandPadX, y: y1, w: colX[c2] + W - colX[c1] + 2 * o.bandPadX, h: y2 - y1 };
  }) : bands.filter(drawn).map((b) => {
    const members = ids.filter((id) => bandOf(id) === b);
    const cols = members.map((id) => cell.get(id).c);
    const c1 = Math.min(...cols); const c2 = Math.max(...cols);
    const y1 = rowY[firstRowOf.get(b)] - o.bandPadTop;
    const y2 = rowY[lastRowOf.get(b)] + H + o.bandPadBottom;
    return { id: b, label: bandMeta.get(b)?.label ?? b, kind: bandMeta.get(b)?.kind, x: colX[c1] - o.bandPadX, y: y1, w: colX[c2] + W - colX[c1] + 2 * o.bandPadX, h: y2 - y1 };
  });

  const edgeOut = routes.map((r) => {
    const S = [colX[r.s.c] + W, rowY[r.s.g] + H / 2 + r.po];
    const T = [colX[r.t.c], rowY[r.t.g] + H / 2 + r.pi];
    let pts;
    if (!r.segs.length) pts = [S, T];
    else if (r.type === 'lout' || r.type === 'lin') {
      const xl = laneX(r.vgap, r.segs[0].lane);
      pts = [S, [xl, S[1]], [xl, T[1]], T];
    } else {
      const [a, b, h] = r.segs;
      const xo = laneX(r.gOut, a.lane); const xi = laneX(r.gIn, b.lane); const yk = laneY(r.k, h.lane);
      pts = [S, [xo, S[1]], [xo, yk], [xi, yk], [xi, T[1]], T];
    }
    return { id: r.e.id, from: r.e.from, to: r.e.to, points: simplify(pts) };
  });

  const stats = { corridor: routes.filter((r) => r.type === 'corr').length, emptyRatio: 1 - (ids.length * W * H) / (totalW * totalH) };
  return { width: Math.round(totalW), height: Math.round(totalH), nodes, bands: bandRects, edges: edgeOut, cols: C, rows: G, mode: o.mode, stats };
}

function simplify(pts) {
  const r = pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  const outp = [r[0]];
  for (let i = 1; i < r.length; i++) {
    const p = r[i]; const q = outp[outp.length - 1];
    if (p[0] === q[0] && p[1] === q[1]) continue;
    if (outp.length >= 2) {
      const z = outp[outp.length - 2];
      if ((z[0] === q[0] && q[0] === p[0]) || (z[1] === q[1] && q[1] === p[1])) { outp[outp.length - 1] = p; continue; }
    }
    outp.push(p);
  }
  return outp;
}

// ---- rótulos: posiciona no maior segmento horizontal livre ----
export function placeLabels(lay, labels, { charW = 6.4, padX = 8, h = 18 } = {}) {
  const boxes = Object.values(lay.nodes).map((n) => [n.x - 4, n.y - 4, n.x + n.w + 4, n.y + n.h + 4]);
  const hit = (b) => boxes.some((a) => !(b[2] <= a[0] || b[0] >= a[2] || b[3] <= a[1] || b[1] >= a[3]));
  const result = {};
  const sorted = [...lay.edges].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const e of sorted) {
    const text = labels[e.id];
    if (!text) continue;
    const full = charW * text.length + 2 * padX;
    const segs = [];
    for (let i = 0; i < e.points.length - 1; i++) {
      const [x1, y1] = e.points[i]; const [x2, y2] = e.points[i + 1];
      if (y1 === y2) segs.push({ x1: Math.min(x1, x2), x2: Math.max(x1, x2), y: y1, len: Math.abs(x2 - x1) });
    }
    segs.sort((a, b) => b.len - a.len);
    let placed = null;
    for (const s of segs) {
      const w = Math.min(full, s.len - 14);
      if (w < 46) continue;
      const left = s.x1 + 8 + w / 2; const right = s.x2 - 8 - w / 2;
      const cands = [left, right, s.x1 + s.len * 0.5, s.x1 + s.len * 0.32, s.x1 + s.len * 0.68];
      for (const cx of cands) {
        const b = [cx - w / 2, s.y - h / 2, cx + w / 2, s.y + h / 2];
        if (b[0] < s.x1 + 6 || b[2] > s.x2 - 6) continue;
        if (!hit(b)) { placed = { x: cx, y: s.y, w, truncated: w < full }; boxes.push(b); break; }
      }
      if (placed) break;
    }
    if (!placed) {
      // tenta o meio de um segmento vertical longo
      for (let i = 0; i < e.points.length - 1 && !placed; i++) {
        const [x1, y1] = e.points[i]; const [x2, y2] = e.points[i + 1];
        if (x1 !== x2 || Math.abs(y2 - y1) < 60) continue;
        const w = Math.min(full, 150);
        const cy = (y1 + y2) / 2;
        const b = [x1 - w / 2, cy - h / 2, x1 + w / 2, cy + h / 2];
        if (!hit(b)) { placed = { x: x1, y: cy, w, truncated: w < full }; boxes.push(b); }
      }
    }
    result[e.id] = placed;
  }
  return result;
}
