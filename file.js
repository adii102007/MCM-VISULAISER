(() => {
'use strict';

/* ------------------------------------------------------------------ helpers */

const R = 22, DX = 62, DY = 96, LIMIT = 260;
const SVGNS = 'http://www.w3.org/2000/svg';
const $ = (s) => document.querySelector(s);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(x) ? x : lo));
const keyOf = (s) => s.join(',');
const nums = (t) => String(t).split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite);
const make = (tag, attrs, parent) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};

/* ----------------------------------------------------------------- problems
   expand(state, params) returns either { base: value }
   or { slots: [{ s: childState, edge: label }], combine(values) }.            */

const PROBLEMS = {
  fib: {
    name: 'Fibonacci',
    fields: [{ id: 'n', label: 'n', value: 5, type: 'number', min: 2, max: 7 }],
    read: (v) => ({ n: clamp(Math.round(+v.n), 2, 7) }),
    start: (p) => [p.n],
    expand(s) {
      const n = s[0];
      if (n < 2) return { base: n };
      return {
        slots: [{ s: [n - 1], edge: 'n-1' }, { s: [n - 2], edge: 'n-2' }],
        combine: (v) => v[0] + v[1],
      };
    },
    text: (s) => String(s[0]),
    title: (s) => `F(${s[0]})`,
    grid: (p) => ({ rows: 1, cols: p.n + 1, rl: () => '', cl: (c) => 'F' + c, key: (r, c) => String(c) }),
    order: (p) => [...Array(p.n + 1).keys()].map((k) => [k]),
  },

  knap: {
    name: '0/1 Knapsack',
    fields: [
      { id: 'w', label: 'weights', value: '1,1,2,2', type: 'text' },
      { id: 'v', label: 'values', value: '2,3,4,5', type: 'text' },
      { id: 'cap', label: 'capacity', value: 4, type: 'number', min: 1, max: 10 },
    ],
    read(v) {
      const w = nums(v.w).map((x) => Math.max(1, Math.round(x))).slice(0, 5);
      const val = nums(v.v).slice(0, 5);
      const n = Math.min(w.length, val.length);
      if (!n) return null;
      return { w: w.slice(0, n), v: val.slice(0, n), n, cap: clamp(Math.round(+v.cap), 1, 10) };
    },
    start: (p) => [0, p.cap],
    expand(s, p) {
      const [i, room] = s;
      if (i === p.n || room === 0) return { base: 0 };
      const fits = p.w[i] <= room, slots = [];
      if (fits) slots.push({ s: [i + 1, room - p.w[i]], edge: 'take' });
      slots.push({ s: [i + 1, room], edge: 'skip' });
      return { slots, combine: (v) => (fits ? Math.max(v[0] + p.v[i], v[1]) : v[0]) };
    },
    text: (s) => s.join(','),
    title: (s) => `item ${s[0] + 1}, room ${s[1]}`,
    grid: (p) => ({ rows: p.n + 1, cols: p.cap + 1, rl: (r) => 'i' + r, cl: (c) => c, key: (r, c) => r + ',' + c }),
    order(p) {
      const o = [];
      for (let i = p.n; i >= 0; i--) for (let r = 0; r <= p.cap; r++) o.push([i, r]);
      return o;
    },
  },

  lcs: {
    name: 'Longest Common Subsequence',
    fields: [
      { id: 'x', label: 'X', value: 'ABCB', type: 'text' },
      { id: 'y', label: 'Y', value: 'BDCB', type: 'text' },
    ],
    read(v) {
      const x = String(v.x).trim().slice(0, 5), y = String(v.y).trim().slice(0, 5);
      return x && y ? { x, y } : null;
    },
    start: () => [0, 0],
    expand(s, p) {
      const [a, b] = s;
      if (a === p.x.length || b === p.y.length) return { base: 0 };
      if (p.x[a] === p.y[b]) return { slots: [{ s: [a + 1, b + 1], edge: 'match ' + p.x[a] }], combine: (v) => v[0] + 1 };
      return {
        slots: [{ s: [a + 1, b], edge: 'skip ' + p.x[a] }, { s: [a, b + 1], edge: 'skip ' + p.y[b] }],
        combine: (v) => Math.max(v[0], v[1]),
      };
    },
    text: (s) => s.join(','),
    title: (s) => `X from ${s[0]}, Y from ${s[1]}`,
    grid: (p) => ({
      rows: p.x.length + 1, cols: p.y.length + 1,
      rl: (r) => (r < p.x.length ? p.x[r] : '.'), cl: (c) => (c < p.y.length ? p.y[c] : '.'),
      key: (r, c) => r + ',' + c,
    }),
    order(p) {
      const o = [];
      for (let a = p.x.length; a >= 0; a--) for (let b = p.y.length; b >= 0; b--) o.push([a, b]);
      return o;
    },
  },
};

/* -------------------------------------------------------------------- state */

const st = {
  pid: 'fib', P: null, params: null,
  root: null, cursor: null, finished: false,
  memo: false, sel: null, hover: null,
  timer: null, auto: true,
  tab: 'tree', up: null, upTimer: null,
};
let uid = 0;
let order = [];                       // nodes in DFS order, refreshed by sync()
const dom = new Map();                // node id -> DOM pieces + displayed position
const view = { x: 0, y: 0, k: 1 };    // what is on screen
const viewT = { x: 0, y: 0, k: 1 };   // where it is heading

const svg = $('#svg'), viewG = $('#view'), nodesL = $('#nodes'), edgesL = $('#edges'), linksL = $('#links');

/* --------------------------------------------------------------- tree model */

function mkNode(s, parent, slot, edge) {
  return { id: ++uid, s, key: keyOf(s), parent, slot, edge, children: [], status: 'new',
           value: null, src: null, tx: 0, ty: 0, depth: 0, info: null };
}
function* walk(n = st.root) { yield n; for (const c of n.children) yield* walk(c); }
const info = (n) => n.info || (n.info = st.P.expand(n.s, st.params));
const count = () => { let c = 0; for (const _ of walk()) c++; return c; };

function resetTree() {
  clearInterval(st.timer); st.timer = null;
  uid = 0;
  st.root = mkNode(st.P.start(st.params), null, 0, '');
  st.cursor = st.root; st.finished = false; st.sel = null; st.hover = null;
  for (const d of dom.values()) { d.g.remove(); d.edge && d.edge.remove(); d.label && d.label.remove(); d.link && d.link.remove(); }
  dom.clear();
  $('#play').textContent = 'Play';
}

// create any children this node doesn't have yet; false if the tree is too big
function spawnMissing(n) {
  const inf = info(n);
  if (!inf.slots) return true;
  const have = new Set(n.children.map((c) => c.slot));
  const missing = inf.slots.map((sl, i) => [sl, i]).filter(([, i]) => !have.has(i));
  if (count() + missing.length > LIMIT) { say(`Limit of ${LIMIT} nodes reached. Turn on "Reuse solved states" or shrink the input.`); return false; }
  for (const [sl, i] of missing) n.children.push(mkNode(sl.s, n, i, sl.edge));
  n.children.sort((a, b) => a.slot - b.slot);
  return true;
}

// an already-solved node with the same state, if any
function twin(n) {
  for (const m of walk()) if (m !== n && m.key === n.key && m.status === 'done') return m;
  return null;
}
const pending = (c) => c.status === 'new' || c.status === 'open';
function up(n) {
  if (n.parent) st.cursor = n.parent;
  else { st.cursor = null; st.finished = true; }
}
function reopenAncestors(a) {
  for (; a; a = a.parent) if (a.status === 'done') { a.status = 'open'; a.value = null; }
}

// one move of the depth-first recursion; false when nothing more can happen
function step() {
  if (st.finished || !st.cursor) return false;
  const n = st.cursor, inf = info(n);

  if (n.status === 'new') {
    if (inf.base !== undefined) { n.value = inf.base; n.status = 'done'; up(n); return true; }
    if (st.memo) {
      const t = twin(n);
      if (t) { n.status = 'hit'; n.value = t.value; n.src = t; up(n); return true; }
    }
    if (!spawnMissing(n)) return false;
    n.status = 'open';
    st.cursor = n.children[0];
    return true;
  }

  if (!spawnMissing(n)) return false;
  const next = n.children.find(pending);
  if (next) { st.cursor = next; return true; }
  n.value = inf.combine(n.children.map((c) => c.value));
  n.status = 'done';
  up(n);
  return true;
}

/* user edits */

function insertAt(n) {
  const inf = info(n);
  if (inf.base !== undefined) return say('Base case, nothing to insert.');
  if (!spawnMissing(n)) return;
  if (n.status === 'new' || n.status === 'hit') { n.status = 'open'; n.value = null; n.src = null; }
  if (st.finished) { st.finished = false; st.cursor = n; }
  sync();
}
function removeAt(n) {
  if (!n.parent) { resetTree(); return sync(true); }
  const gone = new Set(walk(n)), p = n.parent;
  p.children = p.children.filter((c) => c !== n);
  for (const m of walk()) {
    if (m.status === 'hit' && gone.has(m.src)) { m.status = 'new'; m.value = null; m.src = null; reopenAncestors(m.parent); }
  }
  reopenAncestors(p);
  if (st.finished || gone.has(st.cursor)) { st.cursor = p; st.finished = false; }
  if (gone.has(st.sel)) st.sel = null;
  sync(true);
}

/* ------------------------------------------------------------------- layout */

function layout() {
  let leaf = 0, maxDepth = 0;
  const go = (n, d) => {
    n.depth = d; n.ty = d * DY; maxDepth = Math.max(maxDepth, d);
    if (!n.children.length) { n.tx = leaf++ * DX; return; }
    n.children.forEach((c) => go(c, d + 1));
    n.tx = (n.children[0].tx + n.children[n.children.length - 1].tx) / 2;
  };
  go(st.root, 0);
  return { w: Math.max(leaf - 1, 0) * DX, h: maxDepth * DY };
}
function fit(dims) {
  const W = svg.clientWidth, H = svg.clientHeight;
  const bw = dims.w + 2 * R + 70, bh = dims.h + 2 * R + 110;
  const k = Math.min(1.1, W / bw, H / bh);
  viewT.k = k;
  viewT.x = (W - dims.w * k) / 2;
  viewT.y = Math.max(40, (H - (dims.h + 2 * R + 40) * k) / 2 + R * k);
}

/* ------------------------------------------------------------------- render */

function ensure(n) {
  let d = dom.get(n.id);
  if (d) return d;
  const g = make('g', { class: 'node' }, nodesL);
  g.dataset.id = n.id;
  const body = make('g', { class: 'born' }, g);
  make('circle', { r: R }, body);
  const t1 = make('text', { class: 't1' }, body);
  const t2 = make('text', { class: 't2', y: 10 }, body);
  const acts = make('g', { class: 'acts' }, g);
  const ins = make('g', { class: 'act ins', transform: 'translate(-17,42)' }, acts);
  ins.dataset.act = 'ins'; make('circle', { r: 11 }, ins); make('path', { d: 'M-5 0H5M0 -5V5' }, ins);
  const del = make('g', { class: 'act del', transform: 'translate(17,42)' }, acts);
  del.dataset.act = 'del'; make('circle', { r: 11 }, del); make('path', { d: 'M-4 -4L4 4M4 -4L-4 4' }, del);
  const edge = n.parent ? make('path', { class: 'edge' }, edgesL) : null;
  const label = n.parent ? make('text', { class: 'elab' }, edgesL) : null;
  if (label) label.textContent = n.edge;
  const from = n.parent ? dom.get(n.parent.id) : null;       // grow out of the parent
  d = { g, t1, t2, edge, label, link: null, x: from ? from.x : n.tx, y: from ? from.y : n.ty };
  dom.set(n.id, d);
  return d;
}

function sync(refit) {
  order = [...walk()];
  const dims = layout();
  const live = new Set(order.map((n) => n.id));
  for (const [id, d] of dom) {
    if (!live.has(id)) { d.g.remove(); d.edge && d.edge.remove(); d.label && d.label.remove(); d.link && d.link.remove(); dom.delete(id); }
  }

  const seen = new Set(), hl = st.hover || (st.sel && st.sel.key);
  let repeated = 0;
  for (const n of order) {
    const d = ensure(n);
    const isRep = seen.has(n.key) && n.status !== 'hit';
    seen.has(n.key) ? (repeated += 1) : seen.add(n.key);
    const cls = ['node', 'st-' + n.status];
    if (n === st.cursor) cls.push('cur');
    if (isRep) cls.push('rep');
    if (n === st.sel) cls.push('sel'); else if (hl && n.key === hl) cls.push('twin');
    d.g.setAttribute('class', cls.join(' '));
    d.t1.textContent = st.P.text(n.s);
    d.t1.setAttribute('y', n.value !== null ? -6 : 0);
    d.t2.textContent = n.value !== null ? n.value : '';

    if (d.edge) {
      const c = n === st.cursor ? ' cur' : n.status === 'done' ? ' done' : '';
      d.edge.setAttribute('class', 'edge' + c);
      d.edge.setAttribute('marker-end', `url(#ah-${n === st.cursor ? 'blue' : n.status === 'done' ? 'green' : 'grey'})`);
    }
    if (n.status === 'hit' && n.src) {
      if (!d.link) { d.link = make('path', { class: 'link', 'marker-end': 'url(#ah-purple)' }, linksL); }
    } else if (d.link) { d.link.remove(); d.link = null; }
  }

  $('#sCalls').textContent = order.length;
  $('#sStates').textContent = seen.size;
  $('#sRep').textContent = order.length - seen.size;

  inspector();
  table();
  if (st.auto || refit) { fit(dims); }
  animate();
}

// glide nodes, edges and the camera toward their targets
let raf = 0;
function animate() { if (!raf) raf = requestAnimationFrame(tick); }
function tick() {
  raf = 0;
  let moving = false;
  for (const n of order) {
    const d = dom.get(n.id);
    if (!d) continue;
    const dx = n.tx - d.x, dy = n.ty - d.y;
    if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) { d.x += dx * 0.22; d.y += dy * 0.22; moving = true; }
    else { d.x = n.tx; d.y = n.ty; }
    d.g.setAttribute('transform', `translate(${d.x},${d.y})`);
  }
  for (const n of order) {
    const d = dom.get(n.id);
    if (d.edge) {
      const p = dom.get(n.parent.id);
      d.edge.setAttribute('d', `M${p.x} ${p.y + R} C${p.x} ${p.y + R + 36},${d.x} ${d.y - R - 40},${d.x} ${d.y - R - 4}`);
      const left = d.x < p.x;
      d.label.setAttribute('x', (p.x + d.x) / 2 + (left ? -8 : 8));
      d.label.setAttribute('y', (p.y + d.y) / 2 - 2);
      d.label.setAttribute('text-anchor', left ? 'end' : 'start');
    }
    if (d.link) {
      const s = dom.get(n.src.id), dir = s.x < d.x ? -1 : 1;
      const x1 = d.x + dir * R, x2 = s.x - dir * (R + 4);
      d.link.setAttribute('d', `M${x1} ${d.y} C${x1 + dir * 60} ${d.y},${x2 - dir * 60} ${s.y},${x2} ${s.y}`);
    }
  }
  for (const k of ['x', 'y', 'k']) {
    const diff = viewT[k] - view[k];
    if (Math.abs(diff) > (k === 'k' ? 0.002 : 0.4)) { view[k] += diff * 0.2; moving = true; } else view[k] = viewT[k];
  }
  viewG.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`);
  if (moving) animate();
}

/* ------------------------------------------------------------ side panel */

const STATUS_TEXT = { new: 'not visited', open: 'waiting on children', done: 'solved', hit: 'reused from solved twin' };
function inspector() {
  const n = st.sel, el = $('#inspect');
  if (!n) { el.innerHTML = '<p class="none">Click a node in the tree.</p>'; return; }
  const same = order.filter((m) => m.key === n.key).length;
  const base = info(n).base !== undefined;
  el.innerHTML = `<div class="ititle">${st.P.title(n.s)}</div>
    <dl><dt>status</dt><dd>${base && n.status === 'done' ? 'base case' : STATUS_TEXT[n.status]}</dd>
    <dt>value</dt><dd>${n.value === null ? '-' : n.value}</dd>
    <dt>in tree</dt><dd>${same} time${same === 1 ? '' : 's'}</dd></dl>
    <div class="btns"><button data-act="ins">Insert children</button><button data-act="del" class="danger">Delete</button></div>`;
}

function table() {
  const g = st.P.grid(st.params), box = $('#table');
  let vals = new Map(), latest = null;
  if (st.tab === 'up' && st.up) {
    st.up.list.slice(0, st.up.i).forEach((e) => vals.set(e.key, e));
    latest = st.up.i ? st.up.list[st.up.i - 1].key : null;
  } else {
    for (const n of order) if (n.value !== null) vals.set(n.key, { v: n.value });
    latest = st.cursor && st.cursor.key;
  }
  const hl = st.hover || (st.sel && st.sel.key);
  let h = '<table><thead><tr><th></th>';
  for (let c = 0; c < g.cols; c++) h += `<th>${g.cl(c)}</th>`;
  h += '</tr></thead><tbody>';
  for (let r = 0; r < g.rows; r++) {
    h += `<tr><th>${g.rl(r)}</th>`;
    for (let c = 0; c < g.cols; c++) {
      const k = g.key(r, c), e = vals.get(k);
      const cls = [k === latest ? 'cur' : '', k === hl ? 'sel' : '', st.tab === 'up' && e && k === latest ? 'fresh' : ''].join(' ');
      h += `<td class="${cls}">${e && e.order ? `<i>${e.order}</i>` : ''}${e ? e.v : ''}</td>`;
    }
    h += '</tr>';
  }
  box.innerHTML = h + '</tbody></table>';
}

function bottomUp() {
  clearInterval(st.upTimer);
  const vals = new Map();
  const list = st.P.order(st.params).map((s, i) => {
    const inf = st.P.expand(s, st.params);
    const v = inf.base !== undefined ? inf.base : inf.combine(inf.slots.map((sl) => vals.get(keyOf(sl.s))));
    vals.set(keyOf(s), v);
    return { key: keyOf(s), v, order: i + 1 };
  });
  st.up = { list, i: 0 };
  table();
  st.upTimer = setInterval(() => {
    if (st.up.i >= list.length) return clearInterval(st.upTimer);
    st.up.i++; table();
  }, Math.max(60, speedMs() * 0.5));
}

/* ----------------------------------------------------------------- controls */

const speedMs = () => 1100 - +$('#speed').value * 100;
let msgTimer;
function say(t) { $('#msg').textContent = t; clearTimeout(msgTimer); msgTimer = setTimeout(() => ($('#msg').textContent = ''), 3500); }

function pause() { clearInterval(st.timer); st.timer = null; $('#play').textContent = 'Play'; }
function play() {
  if (st.finished) { resetTree(); sync(true); }
  $('#play').textContent = 'Pause';
  st.timer = setInterval(() => {
    const ok = step();
    sync();
    if (!ok || st.finished) pause();
  }, speedMs());
}

function load(pid, values) {
  clearInterval(st.upTimer); st.up = null;
  st.pid = pid; st.P = PROBLEMS[pid];
  const p = st.P.read(values);
  if (!p) return say('Check the input values.');
  st.params = p; st.auto = true;
  resetTree();
  if (st.tab === 'up') bottomUp();
  sync(true);
}

function buildHeader() {
  $('#tabs').innerHTML = Object.entries(PROBLEMS)
    .map(([id, p]) => `<button data-p="${id}" class="${id === st.pid ? 'on' : ''}">${p.name}</button>`).join('');
  $('#params').innerHTML = st.P.fields
    .map((f) => `<label>${f.label}<input id="f_${f.id}" data-f="${f.id}" type="${f.type}" value="${f.value}" ${f.min !== undefined ? `min="${f.min}" max="${f.max}"` : ''}></label>`).join('');
}
const readFields = () => Object.fromEntries([...document.querySelectorAll('#params input')].map((i) => [i.dataset.f, i.value]));

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-p]');
  if (!b) return;
  st.pid = b.dataset.p; st.P = PROBLEMS[st.pid];
  buildHeader();
  load(st.pid, readFields());
});
let typing;
$('#params').addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(() => load(st.pid, readFields()), 350); });

$('#play').onclick = () => (st.timer ? pause() : play());
$('#step').onclick = () => { pause(); if (!step() && st.finished) say('Finished. Press Reset to run again.'); sync(); };
$('#reset').onclick = () => { resetTree(); st.auto = true; sync(true); };
$('#fit').onclick = () => { st.auto = true; sync(true); };
$('#memo').onchange = (e) => { st.memo = e.target.checked; say(st.memo ? 'Solved states are reused from now on.' : 'Every call recurses again.'); };
$('#speed').oninput = () => { if (st.timer) { pause(); play(); } };

document.querySelector('.seg').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  st.tab = b.dataset.tab;
  document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
  if (st.tab === 'up') bottomUp(); else { clearInterval(st.upTimer); table(); }
});

/* tree interaction */

let drag = null, moved = false;
const nodeOf = (el) => { const g = el.closest('.node'); return g ? order.find((n) => n.id === +g.dataset.id) : null; };

svg.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, vx: viewT.x, vy: viewT.y }; moved = false;
});
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!moved && Math.hypot(dx, dy) < 4) return;
  moved = true; st.auto = false; svg.classList.add('drag');
  viewT.x = view.x = drag.vx + dx; viewT.y = view.y = drag.vy + dy;
  viewG.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`);
});
window.addEventListener('pointerup', () => { drag = null; svg.classList.remove('drag'); });
svg.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const k = clamp(view.k * Math.exp(-e.deltaY * 0.0015), 0.15, 2.5), f = k / view.k;
  st.auto = false;
  viewT.x = view.x = mx - (mx - view.x) * f;
  viewT.y = view.y = my - (my - view.y) * f;
  viewT.k = view.k = k;
  viewG.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`);
}, { passive: false });

function act(kind, n) { if (!n) return; kind === 'ins' ? insertAt(n) : removeAt(n); }
svg.addEventListener('click', (e) => {
  if (moved) return;
  const n = nodeOf(e.target), a = e.target.closest('[data-act]');
  if (a && n) return act(a.dataset.act, n);
  st.sel = n; sync();
});
svg.addEventListener('pointerover', (e) => {
  const n = nodeOf(e.target), k = n ? n.key : null;
  if (k !== st.hover) { st.hover = k; sync(); }
});
svg.addEventListener('pointerleave', () => { if (st.hover) { st.hover = null; sync(); } });
$('#inspect').addEventListener('click', (e) => { const a = e.target.closest('[data-act]'); if (a) act(a.dataset.act, st.sel); });

window.addEventListener('keydown', (e) => {
  if (/input|textarea/i.test(e.target.tagName)) return;
  if (e.key === 'i' || e.key === 'I') act('ins', st.sel);
  else if (e.key === 'Delete' || e.key === 'Backspace') act('del', st.sel);
  else if (e.key === ' ') { e.preventDefault(); $('#play').click(); }
  else if (e.key === 'ArrowRight') $('#step').click();
});
window.addEventListener('resize', () => { if (st.auto) sync(true); });

/* ------------------------------------------------------------------- start */

st.P = PROBLEMS[st.pid];
buildHeader();
load(st.pid, readFields());
})();