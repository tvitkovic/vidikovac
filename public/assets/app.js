// Vidikovac — klijent. Bez okvira i bez ovisnosti.
import { WORLD } from './world.js';
import { FACTS, FACT_CATEGORIES } from './facts.js';
import * as SIG from './signals.js';

// ————————————————————————————————————————— pomoćne funkcije
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
const svgEl = (tag, attrs = {}) => { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };

function safeUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null; } catch { return null; }
}
function link(url, text, cls) {
  const href = safeUrl(url);
  return href ? h('a', { href, class: cls, target: '_blank', rel: 'noopener noreferrer' }, text) : h('span', { class: cls }, text);
}
function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(val)); } catch { return null; } return val; }

const nfCache = new Map();
function nf(dec) { if (!nfCache.has(dec)) nfCache.set(dec, new Intl.NumberFormat('hr-HR', { minimumFractionDigits: dec, maximumFractionDigits: dec })); return nfCache.get(dec); }
const fmt = (v, dec = 2) => (v == null || !Number.isFinite(v) ? '—' : nf(dec).format(v));
const NBSP = ' ';
function fmtPct(p, dec = 2) { if (p == null || !Number.isFinite(p)) return '—'; const s = p > 0 ? '+' : p < 0 ? '−' : '±'; return `${s}${fmt(Math.abs(p), dec)}${NBSP}%`; }
const dirClass = (p) => (p == null || Math.abs(p) < 0.005 ? 'flat' : p > 0 ? 'up' : 'down');
function plural(n, [one, few, many]) { const a = Math.abs(n) % 10, b = Math.abs(n) % 100; if (a === 1 && b !== 11) return one; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few; return many; }
const count = (n, forms) => `${fmt(n, 0)} ${plural(n, forms)}`;
const F_RED = ['redakcija', 'redakcije', 'redakcija'];
const F_PRICA = ['priča', 'priče', 'priča'];
const F_CLANAK = ['članak', 'članka', 'članaka'];
const F_IZVOR = ['izvor', 'izvora', 'izvora'];
const F_PREGLED = ['pregled', 'pregleda', 'pregleda'];

const tf = new Intl.DateTimeFormat('hr-HR', { hour: '2-digit', minute: '2-digit' });
const df = new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'long' });
const wdf = new Intl.DateTimeFormat('hr-HR', { weekday: 'long' });
const hhmm = (iso) => tf.format(new Date(iso));
function relTime(iso, now = Date.now()) {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return '';
  const m = Math.round((now - t) / 60000);
  if (m < 2) return 'upravo';
  if (m < 60) return `prije ${m} min`;
  const hrs = Math.round(m / 60);
  if (hrs < 24) return `prije ${hrs} h`;
  const d = Math.round(hrs / 24);
  return d === 1 ? 'jučer' : `prije ${d} dana`;
}
function translateUrl(u) {
  const href = safeUrl(u);
  if (!href || /news\.google\.com/.test(href)) return null;
  return `https://translate.google.com/translate?sl=auto&tl=hr&u=${encodeURIComponent(href)}`;
}
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function setStatus(t) { $('#status').textContent = t; }

// ————————————————————————————————————————— stanje
const state = { data: null, archive: null, factCat: 'Sve', factPage: 0, wiki: 'hr', reliefSig: '', reliefMode: 'danas', watch: store('vk-watch') || [],
  my: normMy(store('vk-my')), qf: null, showHidden: false, more: {} };

// ————————————————————————————————————————— učitavanje
async function load({ refresh = false } = {}) {
  const btn = $('#refresh');
  if (!state.data) {
    const note = h('p', { class: 'loading-note', text: 'Sastavljam izdanje iz izvora. Prvi put nakon postavljanja to traje do pola minute.' });
    $('#hr-list').replaceChildren(note, h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }));
    $('#world-list').replaceChildren(h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }));
  }
  btn.classList.add('busy'); btn.disabled = true;
  setStatus(refresh ? 'Osvježavam izvore…' : 'Učitavam…');
  try {
    const res = await fetch(`/api/briefing${refresh ? '?refresh=1' : ''}`, { cache: refresh ? 'no-store' : 'default' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Poslužitelj je vratio ${res.status}.`);
    store('vk-last', body);
    state.archive = null;
    render(body);
  } catch (e) {
    const cached = state.data || store('vk-last');
    if (cached) { if (!state.data) render(cached); setStatus('Nema veze. Prikazano je zadnje spremljeno izdanje.'); }
    else showFatal(e.message);
  } finally {
    btn.classList.remove('busy'); btn.disabled = false;
  }
}

function showFatal(msg) {
  setStatus('Izdanje nije dostupno');
  const box = h('div', { class: 'error-box' },
    h('p', { text: `Izdanje se nije učitalo: ${msg}` }),
    h('p', { text: 'Ako je stranica tek postavljena, prvo izdanje sastavlja se pri prvom posjetu i traje do pola minute. Osvježi stranicu za trenutak.' }));
  $('#hr-list').replaceChildren(box);
}

function statusLine(d) {
  const t = hhmm(d.builtAt);
  if (state.archive) return `Arhiv: ${d.dateLong}`;
  const age = (Date.now() - Date.parse(d.builtAt)) / 60000;
  return age > 90 ? `Zadnje osvježenje ${relTime(d.builtAt)}` : `Osvježeno u ${t}`;
}

// ————————————————————————————————————————— iscrtavanje
function render(d) {
  state.data = d;
  setStatus(statusLine(d));
  // sažetak se iscrtava zadnji jer povezuje priče koje ostale rubrike tek trebaju prikazati
  const tasks = [renderHero, renderTape, renderHr, renderWorld, renderGeo, renderMarkets, renderScience, renderExtras, renderSources, renderDigest];
  for (const fn of tasks) { try { fn(d); } catch (e) { console.error(fn.name, e); } }
  if (location.hash && !render.scrolled) { render.scrolled = true; const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) setTimeout(() => t.scrollIntoView(), 50); }
}

// — zaglavlje
function renderHero(d) {
  const [y, m, dd] = d.date.split('-').map(Number);
  const dt = new Date(y, m - 1, dd, 12);
  $('#hero-day').textContent = wdf.format(dt);
  $('#hero-date').replaceChildren(`${dd}. ${df.format(dt).split(' ').slice(1).join(' ')} `, h('span', { class: 'hero-year', text: `${y}.` }));
  const c = d.counts || {};
  const meta = $('#hero-meta');
  meta.replaceChildren(
    'Pregledano ', h('b', { text: count(c.news || 0, ['vijest', 'vijesti', 'vijesti']) }), ' iz ', h('b', { text: count(c.outlets || 0, F_RED) }), '. ',
    state.archive ? `Jutarnje izdanje složeno u ${hhmm(d.builtAt)}.` : `Osvježava se svaki sat; zadnje u ${hhmm(d.builtAt)}.`,
    SIG.moodLine(d.mood) ? h('span', { class: 'mood', text: ` ${SIG.moodLine(d.mood)}.` }) : null);
  const lead = (d.world || [])[0];
  const leadEl = $('#hero-lead');
  if (lead) {
    const tr = d.digest?.translations?.[lead.id];
    leadEl.hidden = false;
    leadEl.href = `#p-${lead.id}`;
    leadEl.replaceChildren(h('small', { text: `Najviši vrh danas, ${count(lead.n, F_RED)}` }), h('strong', { text: tr || lead.title }));
  } else leadEl.hidden = true;
  mountReliefMode(d);
  const sig = JSON.stringify([d.builtAt, d.relief, state.reliefMode]);
  if (sig !== state.reliefSig) { state.reliefSig = sig; paintRelief(d, !REDUCED); }
}

// Reljef ima dva prikaza na istom platnu: današnji profil i greben zadnjih sedam dana.
// Jedna kontrola, nijedna nova rubrika i nijedna nova postavka.
function paintRelief(d, animate) {
  const week = state.reliefMode === 'tjedan' && (d.ridge || []).length > 1;
  $('#peaks').hidden = week;
  if (week) SIG.drawRidge($('#relief'), d.ridge);
  else drawRelief(d.relief || [], d.date, animate);
}
function mountReliefMode(d) {
  const host = $('#peaks')?.parentElement;
  if (!host) return;
  const has = (d.ridge || []).length > 1;
  let seg = $('#relief-mode');
  if (!has) { seg?.remove(); state.reliefMode = 'danas'; return; }
  if (seg) return;
  seg = SIG.reliefToggle((mode) => {
    state.reliefMode = mode;
    state.reliefSig = '';
    if (state.data) { state.reliefSig = JSON.stringify([state.data.builtAt, state.data.relief, mode]); paintRelief(state.data, !REDUCED); }
  }, state.reliefMode);
  seg.id = 'relief-mode';
  host.append(seg);
}

// — reljef: polje visina iz vrhova + blagi šum, izohipse metodom "marching squares"
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seedOf(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function valueNoise(rand) {
  const perm = new Uint8Array(512), vals = new Float32Array(256);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) vals[i] = rand();
  const fade = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const at = (i, j) => vals[perm[(perm[i & 255] + j) & 255]];
    const u = fade(xf), v = fade(yf);
    return (at(xi, yi) * (1 - u) + at(xi + 1, yi) * u) * (1 - v) + (at(xi, yi + 1) * (1 - u) + at(xi + 1, yi + 1) * u) * v;
  };
  return (x, y) => n(x, y) * 0.55 + n(x * 2.1, y * 2.1) * 0.28 + n(x * 4.3, y * 4.3) * 0.17;
}

let reliefTimer = 0;
function drawRelief(peaks, seedStr, animate) {
  const canvas = $('#relief');
  const box = canvas.getBoundingClientRect();
  const W = Math.round(box.width), H = Math.round(box.height);
  if (!W || !H) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  cancelAnimationFrame(reliefTimer);

  const rand = mulberry32(seedOf(seedStr || 'vidikovac'));
  const noise = valueNoise(rand);
  const mobile = W < 720;
  const S = Math.max(W, H);
  // raspored vrhova: najviši bliže sredini desne polovice; tekst je dolje lijevo
  const region = mobile ? { x0: 0.14, x1: 0.86, y0: 0.12, y1: 0.36 } : { x0: 0.42, x1: 0.94, y0: 0.14, y1: 0.7 };
  const sorted = [...peaks].sort((a, b) => b.h - a.h).slice(0, mobile ? 5 : 7);
  const placed = [];
  // izbjegni područje teksta u zaglavlju (s rezervom za oznaku vrha)
  const cBox = canvas.getBoundingClientRect();
  const blocks = $$('.hero-inner > *').filter((el) => !el.hidden && el.offsetParent).map((el) => el.getBoundingClientRect())
    .map((r) => ({ x0: r.left - cBox.left - 70, x1: r.right - cBox.left + 70, y0: r.top - cBox.top - 20, y1: r.bottom - cBox.top + 50 }));
  const blocked = (x, y) => blocks.some((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);
  const minD = (mobile ? 0.24 : 0.13) * W;
  for (const p of sorted) {
    let best = null, bestScore = -Infinity;
    for (let k = 0; k < 60; k++) {
      const x = W * (region.x0 + rand() * (region.x1 - region.x0));
      const y = H * (region.y0 + rand() * (region.y1 - region.y0));
      if (blocked(x, y) && k < 55) continue;
      let dmin = Infinity;
      for (const q of placed) dmin = Math.min(dmin, Math.hypot(q.x - x, (q.y - y) * 1.6));
      const centerPull = placed.length === 0 ? -Math.hypot(x - W * (mobile ? 0.5 : 0.69), y - H * (mobile ? 0.25 : 0.4)) * 0.02 : 0;
      const score = Math.min(dmin, minD * 1.4) + centerPull;
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    placed.push({ ...p, ...best, s: S * (0.03 + 0.048 * Math.max(0.15, p.h)) });
  }
  // polje visina
  const cell = mobile ? 6 : 5;
  const nx = Math.ceil(W / cell) + 1, ny = Math.ceil(H / cell) + 1;
  const g = new Float32Array(nx * ny);
  let max = 0;
  const fs = 4.2 / S;
  for (let j = 0; j < ny; j++) {
    const y = j * cell;
    for (let i = 0; i < nx; i++) {
      const x = i * cell;
      let v = noise(x * fs + 3.1, y * fs + 7.7) * 0.36 + (mobile ? 0 : (x / W) * 0.05);
      for (const p of placed) { const dx = x - p.x, dy = y - p.y; v += Math.max(0.2, p.h) * Math.exp(-(dx * dx + dy * dy) / (2 * p.s * p.s)); }
      g[j * nx + i] = v;
      if (v > max) max = v;
    }
  }
  const L = mobile ? 16 : 22;
  const lo = 0.16 * max, hi = 0.985 * max;
  const levels = Array.from({ length: L }, (_, k) => lo + ((hi - lo) * k) / (L - 1));
  const paths = levels.map((lv) => contourPath(g, nx, ny, cell, lv));
  const cBase = cssVar('--contour'), c1 = cssVar('--glow-1'), c2 = cssVar('--glow-2');
  const dark = getComputedStyle(document.documentElement).colorScheme === 'dark';
  // alpenglow iza najvišeg vrha
  if (placed[0]) {
    const p = placed[0];
    const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 2.6);
    rg.addColorStop(0, hexA(c2, dark ? 0.16 : 0.1)); rg.addColorStop(1, hexA(c2, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  const styleFor = (k) => {
    const t = k / (L - 1);
    const warm = t < 0.45 ? 0 : (t - 0.45) / 0.55;
    const col = warm <= 0 ? cBase : mix(mix(cBase, c1, Math.min(1, warm * 1.8)), c2, Math.max(0, warm - 0.45) / 0.55);
    return { col, w: k % 5 === 0 ? 1.35 : 0.85, a: warm > 0 ? 0.95 : (dark ? 0.95 : 0.85) };
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const drawLevel = (k) => { const st = styleFor(k); ctx.globalAlpha = st.a; ctx.strokeStyle = st.col; ctx.lineWidth = st.w; ctx.stroke(paths[k]); ctx.globalAlpha = 1; };
  // oznaka ide na stvarni vrh: penji se po polju do lokalnog maksimuma
  const used = [];
  for (const p of placed) {
    let i = Math.round(p.x / cell), j = Math.round(p.y / cell);
    for (let step = 0; step < 500; step++) {
      let bi = i, bj = j, bv = g[j * nx + i];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const v = g[jj * nx + ii]; if (v > bv) { bv = v; bi = ii; bj = jj; }
      }
      if (bi === i && bj === j) break;
      i = bi; j = bj;
    }
    const sx = i * cell, sy = j * cell;
    if (Math.hypot(sx - p.x, sy - p.y) < p.s * 1.2 && !used.some(([ux, uy]) => Math.hypot(ux - sx, uy - sy) < 40)) { p.x = sx; p.y = sy; }
    used.push([p.x, p.y]);
  }
  placePeakLabels(placed);
  if (!animate) { for (let k = 0; k < L; k++) drawLevel(k); return; }
  const dur = 1500, t0 = performance.now();
  let drawn = 0;
  const step = (now) => {
    const upto = Math.min(L, Math.floor(((now - t0) / dur) * L) + 1);
    while (drawn < upto) drawLevel(drawn++);
    if (drawn < L) reliefTimer = requestAnimationFrame(step);
  };
  reliefTimer = requestAnimationFrame(step);
}

function contourPath(g, nx, ny, c, lv) {
  const p = new Path2D();
  const seg = (x1, y1, x2, y2) => { p.moveTo(x1, y1); p.lineTo(x2, y2); };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = g[j * nx + i], b = g[j * nx + i + 1], cc = g[(j + 1) * nx + i + 1], d = g[(j + 1) * nx + i];
      const idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (cc > lv ? 2 : 0) | (d > lv ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = i * c, y = j * c;
      const T = () => [x + (c * (lv - a)) / (b - a), y];
      const R = () => [x + c, y + (c * (lv - b)) / (cc - b)];
      const B = () => [x + (c * (lv - d)) / (cc - d), y + c];
      const Lf = () => [x, y + (c * (lv - a)) / (d - a)];
      switch (idx) {
        case 1: case 14: seg(...Lf(), ...B()); break;
        case 2: case 13: seg(...B(), ...R()); break;
        case 3: case 12: seg(...Lf(), ...R()); break;
        case 4: case 11: seg(...T(), ...R()); break;
        case 6: case 9: seg(...T(), ...B()); break;
        case 7: case 8: seg(...T(), ...Lf()); break;
        case 5: seg(...T(), ...Lf()); seg(...B(), ...R()); break;
        case 10: seg(...T(), ...R()); seg(...Lf(), ...B()); break;
      }
    }
  }
  return p;
}

function parseColor(c) {
  c = c.trim();
  if (c.startsWith('#')) { const n = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)); }
  const m = c.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
}
function mix(a, b, t) { const A = parseColor(a), B = parseColor(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; }
function hexA(c, a) { const [r, g, b] = parseColor(c); return `rgba(${r},${g},${b},${a})`; }

const GLYPHS = '▲△◆◇/\\|:·+';
function scramble(el) {
  if (REDUCED || el._scr) return;
  const final = el.dataset.text || el.textContent;
  el.dataset.text = final;
  let f = 0; const frames = 14;
  el._scr = setInterval(() => {
    f++;
    const reveal = Math.floor((f / frames) * final.length);
    el.textContent = final.split('').map((ch, i) => (i < reveal || ch === ' ' ? ch : GLYPHS[(i + f) % GLYPHS.length])).join('');
    if (f >= frames) { clearInterval(el._scr); el._scr = null; el.textContent = final; }
  }, 24);
}

function placePeakLabels(placed) {
  const wrap = $('#peaks');
  wrap.replaceChildren(...placed.map((p) => {
    const a = h('a', { class: `peak${p.kind === 'hr' ? ' is-hr' : ''}`, href: `#${p.ref}`, 'aria-label': `${p.label}, ${count(p.n || 0, F_RED)}` },
      h('span', { class: 'peak-name', text: p.label }), h('span', { class: 'peak-n', text: count(p.n || 0, F_RED) }));
    a.style.left = `${p.x}px`; a.style.top = `${p.y}px`;
    a.addEventListener('mouseenter', () => scramble(a.firstChild));
    a.addEventListener('focus', () => scramble(a.firstChild));
    return a;
  }));
}

// — tržišta ukratko (traka)
const TAPE = ['^GSPC', '^GDAXI', 'CROBEX', 'BZ=F', 'GC=F', 'EURUSD=X', 'BTC-USD', '^VIX'];
function decimalsFor(it) {
  if (it.sym === 'BTC-USD' || it.sym === 'ETH-USD') return 0;
  if (/=X$/.test(it.sym)) return it.sym.includes('JPY') ? 2 : 4;
  if (it.sym === '^TNX') return 3;
  if (it.sym === '^N225') return 0;
  return 2;
}
function priceText(it) {
  const v = fmt(it.price, decimalsFor(it));
  if (it.sym === '^TNX') return `${v}${NBSP}%`;
  if (['BZ=F', 'CL=F', 'GC=F', 'SI=F', 'HG=F', 'BTC-USD', 'ETH-USD'].includes(it.sym)) return `${v}${NBSP}$`;
  if (it.sym === 'TTF=F') return `${v}${NBSP}€`;
  return v;
}
function renderTape(d) {
  const all = new Map((d.markets?.groups || []).flatMap((g) => g.items).map((i) => [i.sym, i]));
  const items = TAPE.map((s) => all.get(s)).filter((i) => i && !i.missing);
  $('#tape').replaceChildren(...items.map((it) => h('a', { class: 'tape-item', href: '#trzista' },
    h('div', { class: 'tape-name', text: it.name }),
    h('div', { class: 'tape-val', text: priceText(it) }),
    h('div', { class: `tape-chg ${dirClass(it.pct)}`, text: fmtPct(it.pct) }))));
}

// — sažetak (opcionalno, AI)
function renderDigest(d) {
  const sec = $('#digest');
  const dg = d.digest;
  if (!dg?.bullets?.length) { sec.hidden = true; return; }
  sec.hidden = false;
  const count = ['', 'Jedna stvar', 'Dvije stvari', 'Tri stvari', 'Četiri stvari', 'Pet stvari'][dg.bullets.length] || 'Ukratko';
  $('#digest-title').textContent = count === 'Ukratko' ? count : `${count} za danas`;
  $('#digest-lead').textContent = dg.headline || '';
  const target = (b) => (b.ids || []).find((id) => document.getElementById(`p-${id}`));
  $('#digest-list').replaceChildren(...dg.bullets.map((b) => {
    const id = target(b);
    return h('li', null, h('span', null, b.text, id ? h('a', { href: `#p-${id}`, text: 'do priče' }) : null));
  }));
  $('#digest-note').textContent = `Sažetak je u ${hhmm(dg.at)} iz naslova i sažetaka napisao ${dg.model}. Za detalje otvori izvorne članke.`;
}

// — priče
function covGlyph(n) {
  const k = Math.max(1, Math.min(16, n || 1));
  const hgt = 3 + (k / 16) * 11;
  const s = svgEl('svg', { viewBox: '0 0 22 14', 'aria-hidden': 'true' });
  s.append(svgEl('path', { d: `M1 14 L11 ${14 - hgt} L21 14 Z` }));
  return h('span', { class: `cov${k < 3 ? ' low' : ''}` }, s, count(n || 1, F_RED));
}
function storyEl(s, { lead = false, translations = {}, showSum = true } = {}) {
  const tr = translations[s.id];
  const isNew = !state.archive && Date.now() - Date.parse(s.first || s.t) < 3 * 3600_000;
  const head = h(lead ? 'h3' : 'h4', { class: 'story-title' }, link(s.url, tr || s.title));
  const kids = [];
  if (lead && s.img && safeUrl(s.img)) {
    const img = h('img', { class: 'story-img', src: safeUrl(s.img), alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => img.remove());
    kids.push(img);
  }
  kids.push(head);
  if (tr) kids.push(h('p', { class: 'story-orig', lang: 'en', text: s.title }));
  if (showSum && s.summary && (lead || s.summary.length > 0)) kids.push(h('p', { class: 'story-sum', text: lead ? s.summary : truncate(s.summary, 190) }));
  const meta = h('div', { class: 'story-meta' },
    h('span', { class: 'src', text: s.src }),
    h('span', { title: s.upd && s.upd !== s.t ? `Prva objava ${relTime(s.first || s.t)}` : null, text: relTime(s.upd || s.t) }),
    s.n > 1 ? covGlyph(s.n) : null,
    isNew ? h('span', { class: 'badge-new', text: 'novo' }) : null,
    s._follow ? h('span', { class: 'badge-follow', text: `pratiš: ${s._follow[0]}` }) : null);
  for (const b of SIG.badges(s)) meta.append(b);
  kids.push(meta);
  const others = [...(s.also || [])];
  const actions = h('div', { class: 'story-actions' });
  if (others.length || (s.more || []).length) {
    const listId = `also-${s.id}`;
    const btn = h('button', { class: 'text-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': listId, text: 'Kako pišu drugi' });
    const list = h('div', { class: 'also', id: listId, hidden: true },
      ...others.map((o) => link(o.url, o.src)),
      ...(s.more || []).map((m) => h('span', { text: m })));
    btn.addEventListener('click', () => { const open = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', String(!open)); list.hidden = open; btn.textContent = open ? 'Kako pišu drugi' : 'Sakrij'; });
    actions.append(btn);
    const pv = SIG.perspectivePanel(s);
    if (pv) { pv.hidden = true; btn.addEventListener('click', () => { pv.hidden = list.hidden; }); }
    kids.push(actions, pv, list);
  }
  const t = s.lang === 'en' ? translateUrl(s.url) : null;
  if (t) actions.append(h('a', { class: 'text-btn', href: t, target: '_blank', rel: 'noopener noreferrer', text: 'Prevedi' }));
  if (!state.archive) {
    const tracked = state.tracks?.find((x) => x.seed?.url === s.url);
    if (tracked) actions.append(h('a', { class: 'text-btn', href: `#tr-${tracked.id}`, text: 'Pratiš, vidi crtu' }));
    else { const fb = h('button', { type: 'button', class: 'text-btn', text: 'Prati priču' }); fb.addEventListener('click', () => followStory(s, fb)); actions.append(fb); }
  }
  if (actions.childNodes.length && !kids.includes(actions)) kids.push(actions);
  return h('article', { class: `story${lead ? ' lead' : ''}`, id: `p-${s.id}` }, ...kids);
}
const truncate = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1) > 60 ? s.lastIndexOf(' ', n - 1) : n).replace(/[,;:\s]+$/, '') + '…');

function renderList(target, stories, opts = {}) {
  const el = $(target);
  if (!stories?.length) { el.replaceChildren(h('p', { class: 'empty', text: opts.empty || 'Trenutno nema priča.' })); return; }
  el.replaceChildren(...stories.map((s, i) => storyEl(s, { ...opts, lead: !opts.compact && i === 0, showSum: !opts.compact && i < (opts.sumCount ?? 6) })));
}
function renderHr(d) {
  const lim = state.more.hr ? 99 : 12;
  const p = personalize(d.hr, lim);
  renderList('#hr-list', p.list, { empty: state.qf ? 'Danas nema domaćih priča o toj temi.' : 'Domaće vijesti trenutno nisu dostupne.', sumCount: 5 });
  myListNote('#hr-list', p, 'hr', lim);
  const hw = (d.geo?.hrOnWorld || []).filter((x) => state.showHidden || !myMatch({ ...x, summary: '' }).hide);
  $('#hr-world-wrap').hidden = !hw.length;
  $('#hr-world').replaceChildren(...hw.slice(0, 5).map((x) => h('li', null, link(x.url, x.title), ' ', h('span', { text: `${x.src}, ${count(x.n, F_RED)}` }))));
}
function renderWorld(d) {
  const lim = state.more.world ? 99 : 14;
  const p = personalize(d.world, lim);
  renderList('#world-list', p.list, { translations: d.digest?.translations || {}, sumCount: 6, empty: state.qf ? 'Danas nema svjetskih priča o toj temi.' : undefined });
  myListNote('#world-list', p, 'world', lim);
  const bs = state.archive ? null : SIG.blindspotBlock(d.blindspots);
  document.getElementById('mrtvi-kut')?.remove();
  if (bs) $('#world-list').append(bs);
}
function renderMarketNews(d) {
  const m = d.markets || {};
  const tr = d.digest?.translations || {};
  const a = personalize(m.news, state.more.mk ? 99 : 8);
  renderList('#mk-news', a.list, { compact: true, translations: tr, empty: state.qf ? 'Nema vijesti s tržišta o toj temi.' : 'Trenutno nema vijesti s tržišta.' });
  myListNote('#mk-news', a, 'mk', 8);
  const b = personalize(m.hrNews, 6);
  renderList('#hr-biz', b.list, { compact: true, empty: state.qf ? 'Nema domaćih poslovnih vijesti o toj temi.' : 'Trenutno nema vijesti iz hrvatskog gospodarstva.' });
}

// — geopolitika
function decodeWorld() {
  if (decodeWorld.cache) return decodeWorld.cache;
  const rows = WORLD.data.split('|').map((r) => {
    const runs = r.split('.').map((x) => parseInt(x, 36));
    const bits = new Uint8Array(WORLD.cols); let pos = 0, land = 0;
    for (const n of runs) { if (land) bits.fill(1, pos, pos + n); pos += n; land ^= 1; }
    return bits;
  });
  return (decodeWorld.cache = rows);
}
let mapResizeW = 0;
function renderGeo(d) {
  const geo = d.geo || {};
  drawMap(geo.countries || []);
  const topics = geo.topics || [];
  const max = topics[0]?.score || 1;
  $('#topics').replaceChildren(...(topics.length ? topics.slice(0, 7).map((t) => {
    const bar = h('div', { class: 'topic-bar' }, h('i'));
    bar.firstChild.style.width = `${Math.max(4, (t.score / max) * 100)}%`;
    return h('div', { class: 'topic', id: `tema-${t.id}` },
      h('div', { class: 'topic-head' }, h('span', { class: 'topic-name', text: t.name }), h('span', { class: 'topic-count', text: `${count(t.stories, F_PRICA)}, ${count(t.outlets, F_RED)}` })),
      bar,
      h('ul', null, ...t.top.slice(0, 2).map((s) => h('li', null, link(s.url, d.digest?.translations?.[s.id] || s.title), ' ', h('span', { text: s.src })))));
  }) : [h('p', { class: 'empty', text: 'Teme se računaju iz svjetskih vijesti; trenutno ih nema dovoljno.' })]));
  const an = geo.analysis || [];
  $('#analysis').replaceChildren(...(an.length ? an.slice(0, 9).map((a) => h('article', { class: 'an' },
    h('span', { class: 'an-src', text: a.src }),
    h('h4', { class: 'an-title' }, link(a.url, a.title)),
    a.summary ? h('p', { class: 'an-sum', text: a.summary }) : null,
    h('span', { class: 'an-date', text: relTime(a.t) }))) : [h('p', { class: 'empty', text: 'Analize trenutno nisu dostupne.' })]));
}

function drawMap(countries) {
  const fig = $('#map');
  const canvas = $('#map-canvas');
  const W = Math.round(fig.getBoundingClientRect().width);
  if (!W) return;
  mapResizeW = W;
  const cell = W / WORLD.cols;
  const H = Math.round(cell * WORLD.rows);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = `${H}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = cssVar('--contour');
  const r = Math.max(0.8, cell * 0.34);
  const rows = decodeWorld();
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) if (row[i]) { ctx.beginPath(); ctx.arc((i + 0.5) * cell, (j + 0.5) * cell, r, 0, Math.PI * 2); ctx.fill(); }
  }
  const proj = (lat, lon) => [((lon + 180) / WORLD.step) * cell, ((WORLD.lat0 - lat) / WORLD.step) * cell];
  const spots = $('#map-spots');
  spots.style.height = `${H}px`;
  const max = countries[0]?.score || 1;
  const kids = [];
  const [hx, hy] = proj(45.1, 15.6);
  const home = h('span', { class: 'home-ring', title: 'Hrvatska' }); home.style.left = `${hx}px`; home.style.top = `${hy}px`; kids.push(home);
  const top = countries.slice(0, 20);
  const geom = top.map((c) => { const [x, y] = proj(c.lat, c.lon); const size = Math.round((W < 600 ? 6 : 8) + (W < 600 ? 20 : 30) * Math.sqrt(c.score / max)); return { c, x, y, size }; });
  const boxes = geom.map((g) => ({ x0: g.x - g.size / 2, x1: g.x + g.size / 2, y0: g.y - g.size / 2, y1: g.y + g.size / 2 }));
  const overlaps = (b) => boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  let nLabels = 0;
  geom.forEach(({ c, x, y, size }, i) => {
    const b = h('button', { class: `spot${i < 3 ? ' hot' : ''}`, type: 'button', 'aria-label': `${c.name}: ${count(c.stories, F_PRICA)} danas` });
    Object.assign(b.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` });
    const show = () => showTip(c, x, y, size, W);
    b.addEventListener('mouseenter', show); b.addEventListener('focus', show); b.addEventListener('click', show);
    b.addEventListener('mouseleave', () => hideTip(false)); b.addEventListener('blur', () => hideTip(false));
    b.dataset.iso = c.iso;
    kids.push(b);
    if (nLabels >= (W < 600 ? 4 : 8)) return;
    const lw = c.name.length * 7 + 6, lh = 16, r = size / 2;
    const cands = [[x + r + 4, y - lh / 2], [x - r - 4 - lw, y - lh / 2], [x - lw / 2, y + r + 3], [x - lw / 2, y - r - 3 - lh]];
    for (const [lx, ly] of cands) {
      const bb = { x0: lx, x1: lx + lw, y0: ly, y1: ly + lh };
      if (lx < 0 || lx + lw > W || ly < 0 || ly + lh > H || overlaps(bb)) continue;
      boxes.push(bb); nLabels++;
      const l = h('span', { class: 'spot-label', text: c.name }); l.style.left = `${lx}px`; l.style.top = `${ly}px`; kids.push(l);
      break;
    }
  });
  spots.replaceChildren(...kids);
  let hl = $('#hot-list');
  if (!hl) { hl = h('ol', { class: 'hot-list', id: 'hot-list', 'aria-label': 'Najspominjanije države' }); fig.append(hl); }
  hl.replaceChildren(...countries.slice(0, 10).map((c) => {
    const btn = h('button', { type: 'button', text: c.name });
    btn.addEventListener('click', () => { const g = geom.find((x) => x.c.iso === c.iso); if (g) showTip(c, g.x, g.y, g.size, W); else { const p2 = proj(c.lat, c.lon); showTip(c, p2[0], p2[1], 10, W); } fig.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' }); });
    const bar = h('i', null, h('b')); bar.firstChild.style.width = `${Math.max(4, (c.score / max) * 100)}%`;
    return h('li', null, btn, h('span', { text: count(c.stories, F_PRICA) }), bar);
  }));
  $('#map-caption').textContent = countries.length ? 'Veličina točke pokazuje koliko se o državi danas piše. Dodirni točku za naslove.' : 'Karta će se popuniti kad stignu svjetske vijesti.';
}
function showTip(c, x, y, size, W) {
  const tip = $('#map-tip');
  tip.replaceChildren(h('h4', { text: `${c.name}: ${count(c.stories, F_PRICA)}` }), h('ul', null, ...c.top.map((t) => h('li', null, link(t.url, t.title), h('br'), h('span', { text: t.src })))));
  tip.hidden = false;
  const tw = Math.min(320, W - 16);
  tip.style.maxWidth = `${tw}px`;
  const left = Math.max(8, Math.min(W - tw - 8, x - tw / 2));
  tip.style.left = `${left}px`;
  tip.style.top = `${y + size / 2 + 10}px`;
  clearTimeout(showTip.t);
}
function hideTip(now) { clearTimeout(showTip.t); showTip.t = setTimeout(() => { const tip = $('#map-tip'); if (!tip.matches(':hover') && !tip.contains(document.activeElement)) tip.hidden = true; }, now ? 0 : 600); }

// — tržišta
function sparkline(vals, dir) {
  const s = svgEl('svg', { class: 'spark', viewBox: '0 0 74 26', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  const v = (vals || []).filter(Number.isFinite);
  if (v.length < 2) return s;
  const mn = Math.min(...v), mx = Math.max(...v), span = mx - mn || 1;
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * 72 + 1).toFixed(1)},${(24 - ((x - mn) / span) * 22 + 1).toFixed(1)}`).join(' ');
  s.append(svgEl('polyline', { points: pts, class: `${dir}-line` }));
  return s;
}
function mkRow(it, extra) {
  if (it.missing) return h('div', { class: 'mk-row' }, h('div', { class: 'mk-name' }, h('b', { text: it.name || it.sym })), h('span', { class: 'mk-missing', text: 'nedostupno' }), h('span'), h('span'), extra || null);
  const dir = dirClass(it.pct);
  const sub = [it.region, it.unit && it.unit !== '%' ? it.unit : null, it.state === 'open' ? 'trguje se' : it.state === '24h' ? '24 h' : it.time ? `zatv. ${shortDay(it.time)}` : null].filter(Boolean).join(', ');
  return h('div', { class: 'mk-row' },
    h('div', { class: 'mk-name' }, h('b', { text: it.name || it.sym }), sub ? h('small', { text: sub }) : null),
    h('span', { class: 'mk-val', text: priceText(it) }),
    h('span', { class: `mk-chg ${dir}`, text: fmtPct(it.pct) }),
    sparkline(it.spark, dir),
    extra || null);
}
function shortDay(t) {
  const d = new Date(t);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return tf.format(d);
  return new Intl.DateTimeFormat('hr-HR', { weekday: 'short' }).format(d).replace('.', '');
}
function renderMarkets(d) {
  const m = d.markets || {};
  const groups = m.groups || [];
  $('#mk-groups').replaceChildren(...groups.map((g) => h('div', { class: 'mk-group' }, h('h3', { text: g.name }), ...g.items.map((it) => mkRow(it)))));
  $('#pulse').replaceChildren(...pulseSentence(groups, m.fng));
  $('#mk-sub').textContent = m.asOf ? `Stanje u ${hhmm(m.asOf)}${m.stale ? ' (zadnji dostupni podaci)' : ''}. Promjena je u odnosu na prethodno zatvaranje.` : 'Zadnje cijene i dnevne promjene.';
  renderMarketNews(d);
  renderWatch();
}
function sessionDay(t) {
  const d = new Date(t), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'danas';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'jučer';
  const acc = { srijeda: 'srijedu', subota: 'subotu', nedjelja: 'nedjelju' };
  const wd = wdf.format(d);
  return `u ${acc[wd] || wd}`;
}
function pulseSentence(groups, fng) {
  const all = new Map(groups.flatMap((g) => g.items).filter((i) => !i.missing).map((i) => [i.sym, i]));
  const g = (s) => all.get(s);
  const out = [];
  const part = (it, label) => [h('b', { text: label || it.name }), ' ', h('span', { class: dirClass(it.pct), text: fmtPct(it.pct) })];
  const join = (arr) => arr.flatMap((x, i) => (i ? [', ', ...x] : x));
  const spx = g('^GSPC');
  if (spx) {
    const verdict = spx.pct > 0.05 ? 'u plusu' : spx.pct < -0.05 ? 'u minusu' : 'bez većih promjena';
    const when = spx.state === 'open' ? `je trenutačno ${verdict}` : `je ${sessionDay(spx.time)} zatvorio ${verdict}`;
    out.push('Wall Street ', when, ': ', ...join([part(spx), ...[g('^IXIC')].filter(Boolean).map((x) => part(x))]), '. ');
  }
  const eu = [g('^GDAXI'), g('^STOXX50E')].filter(Boolean);
  if (eu.length) out.push('Europa: ', ...join(eu.map((x) => part(x))), '. ');
  const cbx = g('CROBEX');
  if (cbx) out.push('Zagrebačka burza: ', ...part(cbx), '. ');
  const brent = g('BZ=F'), gold = g('GC=F');
  if (brent || gold) {
    out.push(...join([brent && [h('b', { text: 'Brent' }), ` ${priceText(brent)} `, h('span', { class: dirClass(brent.pct), text: `(${fmtPct(brent.pct)})` })], gold && [h('b', { text: 'zlato' }), ` ${priceText(gold)} `, h('span', { class: dirClass(gold.pct), text: `(${fmtPct(gold.pct)})` })]].filter(Boolean)), '. ');
  }
  const vix = g('^VIX');
  if (vix) {
    const mood = vix.price < 15 ? 'mirno' : vix.price < 20 ? 'umjereno' : vix.price < 30 ? 'nervozno' : 'u strahu';
    out.push(h('b', { text: 'VIX' }), ` ${fmt(vix.price, 1)}: tržište je ${mood}. `);
  }
  if (fng) out.push(`Kripto indeks straha i pohlepe: ${fng.value} (${fng.label}).`);
  return out.length ? out : ['Tržišni podaci trenutno nisu dostupni.'];
}

// — osobni popis dionica
async function renderWatch() {
  const body = $('#watch-body');
  const list = state.watch;
  if (!list.length) { body.replaceChildren(h('p', { class: 'empty', text: 'Dodaj simbole koje želiš pratiti, npr. AAPL, NVDA, VWCE.DE ili ^GSPC. Popis se sprema samo u ovom pregledniku.' })); return; }
  if (!body.children.length || body.querySelector('.empty')) body.replaceChildren(h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }));
  try {
    const res = await fetch(`/api/quotes?s=${encodeURIComponent(list.join(','))}`);
    const j = await res.json();
    if (!res.ok) throw new Error(j.error);
    body.replaceChildren(...j.quotes.map((q) => {
      const rm = h('button', { class: 'rm-btn', type: 'button', 'aria-label': `Ukloni ${q.sym}`, title: 'Ukloni', text: '×' });
      rm.addEventListener('click', () => { state.watch = state.watch.filter((s) => s !== q.sym); store('vk-watch', state.watch); renderWatch(); });
      return mkRow({ ...q, name: q.sym, region: q.name && q.name !== q.sym ? q.name : undefined }, rm);
    }));
  } catch (e) {
    body.replaceChildren(h('p', { class: 'empty', text: 'Kotacije se nisu učitale. Pokušaj ponovno kasnije.' }));
  }
}
function setupWatch() {
  $('#watch-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#watch-input');
    const syms = inp.value.toUpperCase().split(/[\s,;]+/).filter((s) => /^[A-Z0-9.^=\-]{1,20}$/.test(s));
    if (!syms.length) return;
    state.watch = [...new Set([...state.watch, ...syms])].slice(0, 15);
    store('vk-watch', state.watch);
    inp.value = '';
    renderWatch();
  });
}

// — znanost
const FIELD_ICONS = {
  space: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z M2 14c4 3 16 3 20-4',
  physics: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M3 12c0-3 4-5 9-5s9 2 9 5-4 5-9 5-9-2-9-5Z',
  life: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z M5 19l8-8',
  health: 'M3 12h4l2-4 3 8 2-4h7',
  earth: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  tech: 'M7 7h10v10H7Z M10 3v4 M14 3v4 M10 17v4 M14 17v4 M3 10h4 M3 14h4 M17 10h4 M17 14h4',
  past: 'M6 21h12 M8 21V8 M16 21V8 M5 8h14 M12 3l7 5H5Z',
  math: 'M17 5H7l6 7-6 7h10',
  misc: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
};
function fieldIcon(id) { const s = svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }); s.append(svgEl('path', { d: FIELD_ICONS[id] || FIELD_ICONS.misc })); return s; }
// — Tjedan u znanosti: kratka oznaka + naslov, cijela pločica vodi na članak
function renderWeekPicks(sc, range, tr) {
  const wrap = $('#sci-week');
  const picks = sc.picks || [];
  if (picks.length < 4) { wrap.hidden = true; return; }
  wrap.hidden = false;
  $('#sci-week-title').textContent = range ? `Tjedan u znanosti, ${range}` : 'Tjedan u znanosti';
  $('#sci-week-sub').textContent = `${count(picks.length, F_PRICA)}: najpraćenija otkrića tjedna i studije koje se rado čitaju. Oznaka kaže o čemu je riječ, a dodir otvara članak.`;
  $('#week-picks').replaceChildren(...picks.map((p) => h('li', null,
    h('a', { class: 'pick', href: safeUrl(p.url) || '#', target: '_blank', rel: 'noopener noreferrer' },
      h('span', { class: 'pick-label' }, fieldIcon(p.field), h('span', { text: p.label })),
      h('span', { class: 'pick-title', lang: tr[p.id] ? 'hr' : (p.lang || 'en'), text: tr[p.id] || p.title }),
      h('span', { class: 'pick-meta', text: `${p.src}${p.n > 1 ? `, ${count(p.n, F_RED)}` : ''}` })))));
}

function renderScience(d, sciOverride) {
  const sc = sciOverride || d.science;
  if (!sc) return;
  const wk = sc.week || {};
  const fromD = wk.from ? new Date(wk.from + 'T12:00') : null, toD = wk.to ? new Date(wk.to + 'T12:00') : null;
  const range = fromD && toD ? `${fromD.getDate()}. ${fromD.getMonth() === toD.getMonth() ? '' : df.format(fromD).split(' ').slice(1).join(' ') + ' '}– ${df.format(toD)}` : '';
  $('#sci-sub').textContent = `${wk.n ? `${wk.n}. tjedan, ` : ''}${range}. ${count(sc.counts?.articles || 0, F_CLANAK)} iz ${count(sc.counts?.outlets || 0, F_IZVOR)}, grupirano u priče i razvrstano po područjima.`;
  const tr = d.digest?.translations || {};
  renderWeekPicks(sc, range, tr);
  const f = sc.feature;
  const feat = $('#sci-feature');
  if (f) {
    const img = f.img && safeUrl(f.img) ? h('img', { src: safeUrl(f.img), alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null;
    img?.addEventListener('error', () => img.remove());
    feat.replaceChildren(
      img || h('div'),
      h('div', null,
        h('p', { class: 'sci-kicker', text: `Tema tjedna, ${(f.fieldName || '').toLowerCase()}` }),
        h('h3', null, link(f.url, tr[f.id] || f.title)),
        tr[f.id] ? h('p', { class: 'story-orig', lang: 'en', text: f.title }) : null,
        f.summary ? h('p', { class: 'sum', text: f.summary }) : null,
        h('div', { class: 'story-meta' }, h('span', { class: 'src', text: f.src }), f.n > 1 ? covGlyph(f.n) : null, h('span', { text: relTime(f.upd || f.t) })),
        (f.also || []).length ? h('div', { class: 'also' }, ...(f.also || []).slice(0, 5).map((o) => link(o.url, o.src))) : null));
  } else feat.replaceChildren(h('p', { class: 'empty', text: 'Tjedni pregled puni se kako stižu znanstvene vijesti.' }));
  $('#sci-fields').replaceChildren(...(sc.fields || []).map((fl) => h('div', { class: 'field' },
    h('h4', null, fieldIcon(fl.id), fl.name),
    h('ul', null, ...fl.stories.slice(0, 4).map((s) => h('li', null, link(s.url, s.title), h('span', { text: `${s.src}${s.n > 1 ? `, ${count(s.n, F_RED)}` : ''}` })))))));
  $('#sci-long').replaceChildren(...(sc.longreads || []).slice(0, 6).map((x) => {
    const img = x.img && safeUrl(x.img) ? h('img', { src: safeUrl(x.img), alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null;
    img?.addEventListener('error', () => img.remove());
    return h('article', { class: 'long' }, img, link(x.url, x.title, 't'), h('span', { text: `${x.src}, ${x.fieldName.toLowerCase()}` }));
  }));
}

// — zanimljivosti
function dailyFacts() {
  const day = state.data?.date || new Date().toISOString().slice(0, 10);
  const rand = mulberry32(seedOf('cinjenice-' + day));
  const arr = FACTS.map((f, i) => ({ ...f, i }));
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function renderFacts(animate) {
  const pool = dailyFacts().filter((f) => state.factCat === 'Sve' || f.c === state.factCat);
  const per = 6;
  const start = (state.factPage * per) % Math.max(1, pool.length);
  const pick = [...pool.slice(start, start + per), ...pool.slice(0, Math.max(0, start + per - pool.length))].slice(0, Math.min(per, pool.length));
  $('#facts').replaceChildren(...pick.map((f, i) => {
    const el = h('div', { class: `fact${animate ? ' enter' : ''}` }, h('span', { class: 'fact-cat', text: f.c }), h('p', { text: f.t }));
    if (animate) el.style.animationDelay = `${i * 45}ms`;
    return el;
  }));
}
function setupFacts() {
  const cats = ['Sve', ...FACT_CATEGORIES];
  $('#fact-chips').replaceChildren(...cats.map((c) => {
    const b = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(c === state.factCat), text: c });
    b.addEventListener('click', () => { state.factCat = c; state.factPage = 0; $$('#fact-chips .chip').forEach((x) => x.setAttribute('aria-pressed', String(x.textContent === c))); renderFacts(true); });
    return b;
  }));
  $('#fact-more').addEventListener('click', () => { state.factPage++; renderFacts(true); });
  renderFacts(false);
}

function renderDyk(d) {
  const list = d.extras?.dyk || [];
  const wrap = $('#dyk-wrap');
  if (!list.length) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const tr = d.digest?.translations || {};
  $('#dyk').replaceChildren(...list.slice(0, 6).map((x) => {
    const t = tr[x.id];
    const tl = x.url ? translateUrl(x.url) : null;
    return h('li', { lang: t ? 'hr' : 'en', id: `p-${x.id}` }, t || x.t, h('small', null,
      t ? h('span', { lang: 'en', text: x.t }) : null,
      t ? h('br') : null,
      x.url ? link(x.url, 'Članak na Wikipediji') : null,
      tl && !t ? h('a', { href: tl, target: '_blank', rel: 'noopener noreferrer', text: 'Prevedi' }) : null));
  }));
}

function renderExtras(d) {
  renderDyk(d);
  const ex = d.extras || {};
  const otd = ex.onThisDay;
  const list = $('#otd');
  if (otd?.events?.length) {
    const ev = otd.events.slice(-7);
    const births = (otd.births || []).slice(0, 4);
    list.replaceChildren(...ev.map((e) => h('li', null, h('b', { text: yearText(e.y) }), h('span', { text: e.t }))));
    $('#births-title').hidden = $('#births').hidden = !births.length;
    $('#births').replaceChildren(...births.map((b) => h('li', null, h('b', { text: yearText(b.y) }), h('span', { text: b.t }))));
    $('#otd-src').replaceChildren('Izvor: ', link(otd.src, 'Wikipedija'));
  } else if (ex.onThisDayEn?.length) {
    $('#births-title').hidden = $('#births').hidden = true;
    list.replaceChildren(...ex.onThisDayEn.map((e) => h('li', null, h('b', { text: yearText(e.y) }), h('span', { lang: 'en', text: e.t }))));
    $('#otd-src').textContent = 'Izvor: engleska Wikipedija (hrvatska trenutno nije dostupna).';
  } else {
    $('#births-title').hidden = $('#births').hidden = true;
    list.replaceChildren(h('li', null, h('span', { class: 'empty', text: 'Podaci za današnji dan trenutno nisu dostupni.' })));
    $('#otd-src').textContent = '';
  }
  renderReads(d);
  const p = ex.picture;
  const fig = $('#potd');
  if (p?.img && safeUrl(p.img)) {
    fig.hidden = false;
    const img = h('img', { src: safeUrl(p.img), alt: p.title || 'Slika dana', loading: 'lazy', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => { fig.hidden = true; });
    fig.replaceChildren(img, h('figcaption', null,
      h('h3', { text: 'Slika dana' }),
      h('p', { lang: 'en', text: p.desc || p.title }),
      h('small', null, [p.artist && `Autor: ${p.artist}`, p.license].filter(Boolean).join(', '), p.url ? ' · ' : '', p.url ? link(p.url, 'Wikimedia Commons') : '')));
  } else fig.hidden = true;
}
const yearText = (y) => (y < 0 ? `${-y}. pr. Kr.` : `${y}.`);
function renderReads(d) {
  const ex = d.extras || {};
  if (state.wiki === 'hr' && !ex.mostReadHr?.length && ex.mostReadEn?.length && !renderReads.auto) {
    renderReads.auto = true; state.wiki = 'en';
    $$('.seg button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.wiki === 'en')));
  }
  const arr = state.wiki === 'hr' ? ex.mostReadHr : ex.mostReadEn;
  const list = $('#reads');
  if (!arr?.length) { list.replaceChildren(); $('#reads-note').textContent = 'Podaci o čitanosti trenutno nisu dostupni.'; return; }
  list.replaceChildren(...arr.slice(0, 8).map((a) => h('li', null, h('div', null, link(a.url, a.title), a.desc ? h('p', { text: a.desc }) : null), h('span', { class: 'views', text: count(a.views || 0, F_PREGLED) }))));
  const dt = ex.mostReadDate ? new Date(ex.mostReadDate.slice(0, 10) + 'T12:00') : null;
  $('#reads-note').textContent = `Najčitaniji članci ${state.wiki === 'hr' ? 'hrvatske' : 'engleske'} Wikipedije${dt ? `, ${df.format(dt)}` : ''}. Dobar pokazatelj onoga što ljude zanima.`;
}
function setupReads() {
  $$('.seg button').forEach((b) => b.addEventListener('click', () => {
    state.wiki = b.dataset.wiki;
    $$('.seg button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    if (state.data) renderReads(state.data);
  }));
}

// — izvori
function renderSources(d) {
  const src = d.sources || [];
  const c = d.counts || {};
  $('#sources-summary').textContent = `${count(c.outlets || 0, F_RED)} u ovom izdanju; dostupno ${c.feedsOk ?? '?'} od ${c.feedsTotal ?? '?'} RSS izvora. Sastavljeno za ${((d.timing?.totalMs || 0) / 1000).toFixed(1).replace('.', ',')} s.`;
  $('#sources').replaceChildren(...src.map((s) => h('li', { class: s.fail && !s.ok ? 'fail' : '' }, `${s.name}: ${count(s.items, F_CLANAK)}${s.fail ? ` (${s.fail} nedostupno)` : ''}`)));
}

// — arhiv
async function loadArchiveList() {
  try {
    const res = await fetch('/api/archive');
    if (!res.ok) return;
    const j = await res.json();
    const eds = j.editions || [];
    if (eds.length) {
      $('#archive-list').replaceChildren(...eds.slice(0, 30).map((e) => {
        const dt = new Date(e.date + 'T12:00');
        const b = h('button', { class: 'ed', type: 'button' }, h('b', { text: `${wdf.format(dt)}, ${df.format(dt)}` }), h('span', { text: e.lead || e.hrLead || '' }));
        b.addEventListener('click', () => openEdition(e.date));
        return b;
      }));
    }
    const weeks = j.weeks || [];
    if (weeks.length) {
      $('#sci-weeks').hidden = false;
      $('#week-list').replaceChildren(...weeks.slice(0, 12).map((w) => {
        const b = h('button', { class: 'week-btn', type: 'button', 'aria-pressed': 'false', title: w.feature || '', text: `${w.id.split('-W')[1]}. tjedan` });
        b.addEventListener('click', async () => {
          $$('.week-btn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          const r = await fetch(`/api/archive?week=${w.id}`); if (!r.ok) return;
          renderScience(state.data, await r.json());
        });
        return b;
      }));
    }
  } catch { /* arhiv nije ključan */ }
}
async function openEdition(date) {
  setStatus('Otvaram arhiv…');
  try {
    const res = await fetch(`/api/archive?date=${date}`);
    const j = await res.json();
    if (!res.ok) throw new Error(j.error);
    state.archive = date;
    render(j);
    $('#archive-banner').hidden = false;
    $('#archive-date').textContent = j.dateLong;
    scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
  } catch (e) { setStatus(e.message || 'Arhiv nije dostupan.'); }
}

// — vrijeme (Open-Meteo, u pregledniku)
const WMO = { 0: 'vedro', 1: 'pretežno vedro', 2: 'djelomično oblačno', 3: 'oblačno', 45: 'magla', 48: 'magla s injem', 51: 'slaba rosulja', 53: 'rosulja', 55: 'jaka rosulja', 56: 'ledena rosulja', 57: 'ledena rosulja', 61: 'slaba kiša', 63: 'kiša', 65: 'jaka kiša', 66: 'ledena kiša', 67: 'ledena kiša', 71: 'slab snijeg', 73: 'snijeg', 75: 'jak snijeg', 77: 'zrnati snijeg', 80: 'slabi pljuskovi', 81: 'pljuskovi', 82: 'jaki pljuskovi', 85: 'snježni pljuskovi', 86: 'jaki snježni pljuskovi', 95: 'grmljavina', 96: 'grmljavina s tučom', 99: 'grmljavina s tučom' };
async function loadWeather() {
  const city = store('vk-city') || { name: 'Koprivnica', lat: 46.1628, lon: 16.8275 };
  const el = $('#weather');
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
    const j = await (await fetch(u)).json();
    const cur = j.current, dl = j.daily;
    const btn = h('button', { type: 'button', title: 'Promijeni mjesto', text: city.name });
    btn.addEventListener('click', () => cityForm(el, city));
    el.replaceChildren(btn, `: ${Math.round(cur.temperature_2m)}${NBSP}°C, ${WMO[cur.weather_code] || ''}. Danas ${Math.round(dl.temperature_2m_min[0])} do ${Math.round(dl.temperature_2m_max[0])}${NBSP}°C, vjetar ${Math.round(cur.wind_speed_10m)} km/h.`);
    el.hidden = false;
  } catch { el.hidden = true; }
}
function cityForm(el, city) {
  const inp = h('input', { value: city.name, 'aria-label': 'Grad za vremensku prognozu', maxlength: '60' });
  Object.assign(inp.style, { font: 'inherit', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line-2)', background: 'var(--bg-2)', color: 'var(--ink)', width: '180px' });
  const form = h('form', null, inp, ' ', h('button', { type: 'submit', class: 'text-btn', text: 'Spremi' }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inp.value)}&count=1&language=hr&format=json`)).json();
      const g = r.results?.[0];
      if (!g) { inp.setCustomValidity('Mjesto nije pronađeno'); inp.reportValidity(); return; }
      store('vk-city', { name: g.name, lat: g.latitude, lon: g.longitude });
      loadWeather();
    } catch { loadWeather(); }
  });
  el.replaceChildren(form);
  inp.focus(); inp.select();
}

// — tema, navigacija, promjena veličine
function setupTheme() {
  $('#theme').addEventListener('click', () => {
    const now = getComputedStyle(document.documentElement).colorScheme === 'dark' ? 'dark' : 'light';
    const next = now === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store('vk-theme', next);
    if (state.data) { paintRelief(state.data, false); drawMap(state.data.geo?.countries || []); }
  });
}
function setupNav() {
  const links = new Map($$('.nav a').map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { links.forEach((a) => a.removeAttribute('aria-current')); links.get(e.target.id)?.setAttribute('aria-current', 'true'); }
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}
let resizeT = 0, lastW = innerWidth;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (Math.abs(innerWidth - lastW) < 30 || !state.data) return;
    lastW = innerWidth;
    paintRelief(state.data, false);
    drawMap(state.data.geo?.countries || []);
  }, 160);
});


// ————————————————————————————————————————— Moje teme
// Teme s poslužitelja (geopolitika) prepoznaju se po oznaci priče; ostale po riječima (bez dijakritika, s osnovom riječi).
const MY_TOPICS = [
  { id: 'hrpol', name: 'Hrvatska politika', re: 'vlad[aeiu]\\b|vladin|sabor|plenkovic|milanovic|hdz|sdp|mozemo|tomasevic|ministr|premijer\\b|premijeru\\b|premijerom\\b|oporb' },
  { id: 'local', name: 'Sjever Hrvatske', re: 'koprivnic|podravin|varazdin|bjelovar|cakovec|medimur|krizevc|durdevac|ludbreg|virovitic|zagorj' },
  { id: 'econ', name: 'Gospodarstvo i novac', re: 'inflacij|cijen[aeiu]?\\b|cijena|plac[aeiu]\\b|mirovin|porez|hnb\\b|ecb\\b|kamat|burz|dionic|investic|gospodarst|bdp\\b|inflation|prices?\\b|econom|stocks?\\b|interest rates?|recession|gdp\\b' },
  { id: 'ukr', name: 'Rusija i Ukrajina', server: true },
  { id: 'mideast', name: 'Bliski istok', server: true },
  { id: 'usa', name: 'SAD', server: true },
  { id: 'europe', name: 'Europa i EU', server: true },
  { id: 'asia', name: 'Azija i Pacifik', server: true },
  { id: 'africa', name: 'Afrika', server: true },
  { id: 'americas', name: 'Amerike', server: true },
  { id: 'energy', name: 'Energija i klima', server: true },
  { id: 'trade', name: 'Trgovina i sankcije', server: true },
  { id: 'elections', name: 'Izbori', server: true },
  { id: 'tech', name: 'Tehnologija i AI', re: 'umjetn\\w* inteligencij|ai\\b|tehnolog|robot|google|apple\\b|microsoft|openai|anthropic|nvidi|cipov|chips?\\b|startup|tesla\\b|elon musk|muskov' },
  { id: 'health', name: 'Zdravlje', re: 'bolnic|lijecni|zdravstv|bolest|virus|cjepiv|pacijent|hzzo|hospital|health|disease|vaccin|patients?\\b' },
  { id: 'weather', name: 'Vrijeme i nepogode', re: 'nevrem|oluj|kis[aeiu]\\b|snijeg|tuc[aeiu]\\b|poplav|potres|toplinsk|dhmz|storms?\\b|flood|earthquake|weather|hurricane|heatwave|wildfire' },
  { id: 'crime', name: 'Kriminal', re: 'ubojstv|ubij|ubio\\b|ubila\\b|uhicen|uhitil|pljack|nozem|pucnjav|optuzen|optuznic|zatvor|silovan|krijumcar|kriminalist|kaznen\\w* djel|tucnjav|pretukl|maltretir|kradj|ukral|ukrao|razbojni|murder|arrest|shooting|stabbing|gunman|charged with|sentenced|robbery' },
  { id: 'accidents', name: 'Nesreće', re: 'nesrec|sudar|poginu|ozlijeden|prevrnu|izletio|crash|accident|collision|derail' },
  { id: 'celebs', name: 'Poznati i zabava', re: 'pjevac|pjevacic|glumac|glumic|influencer|kraljevsk|princez|celebrit|royal family|singer|actress|hollywood|reality show|showbiz|estrad' },
];
const foldTxt = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const reCache = new Map();
function topicRe(src) {
  if (!reCache.has(src)) reCache.set(src, new RegExp(`(?:^|[^a-z0-9])(?:${src})`));
  return reCache.get(src);
}
/** Vlastita riječ → izraz: zadnja riječ dulja od 5 slova gubi završni samoglasnik (Koprivnica → koprivnic…). */
function wordRe(w) {
  const parts = foldTxt(w).trim().split(/\s+/).filter(Boolean).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!parts.length) return null;
  const last = parts.length - 1;
  if (parts[last].length >= 6) parts[last] = parts[last].replace(/[aeiou]+$/, '');
  return topicRe(parts.join('\\s+'));
}
function normMy(x) {
  const arr = (a) => (Array.isArray(a) ? a.filter((v) => typeof v === 'string').slice(0, 40) : []);
  return { follow: arr(x?.follow), hide: arr(x?.hide), fw: arr(x?.fw), hw: arr(x?.hw) };
}
const myActive = () => state.my.follow.length + state.my.hide.length + state.my.fw.length + state.my.hw.length > 0;
function myMatch(s) {
  const txt = foldTxt(`${s.title} ${s.summary || ''} ${state.data?.digest?.translations?.[s.id] || ''}`);
  const has = (t) => (t.server ? (s.topics || []).includes(t.id) : topicRe(t.re).test(txt));
  const keys = [], names = [];
  let hide = false;
  for (const id of state.my.follow) { const t = MY_TOPICS.find((x) => x.id === id); if (t && has(t)) { keys.push(`t:${id}`); names.push(t.name); } }
  for (const w of state.my.fw) { const re = wordRe(w); if (re && re.test(txt)) { keys.push(`w:${w}`); names.push(w); } }
  for (const id of state.my.hide) { const t = MY_TOPICS.find((x) => x.id === id); if (t && has(t)) hide = true; }
  for (const w of state.my.hw) { const re = wordRe(w); if (re && re.test(txt)) hide = true; }
  return { keys, names, hide: hide && !names.length };
}
/** Primijeni Moje teme na popis: skrivene van, praćene na vrh, brzi filtar. */
function personalize(list, limit) {
  const out = []; let hidden = 0;
  for (const s of list || []) {
    const m = myMatch(s);
    if (m.hide && !state.showHidden) { hidden++; continue; }
    if (state.qf && !m.keys.includes(state.qf)) continue;
    out.push(m.names.length ? { ...s, _follow: m.names } : s);
  }
  out.sort((a, b) => (b._follow ? 1 : 0) - (a._follow ? 1 : 0));
  return { list: out.slice(0, limit), hidden, rest: Math.max(0, out.length - limit) };
}
function myListNote(target, p, key, limit) {
  const el = $(target);
  const bits = [];
  if (p.rest > 0) {
    const b = h('button', { class: 'text-btn', type: 'button', text: `Još ${count(p.rest, F_PRICA)}` });
    b.addEventListener('click', () => { state.more[key] = true; renderNews(state.data); });
    bits.push(b);
  }
  if (p.hidden > 0) {
    bits.push(h('span', { text: `Skriveno prema tvojim temama: ${p.hidden}.` }));
    const b = h('button', { class: 'text-btn', type: 'button', text: 'Prikaži' });
    b.addEventListener('click', () => { state.showHidden = true; renderNews(state.data); });
    bits.push(b);
  }
  if (bits.length) el.append(h('p', { class: 'list-note' }, ...bits));
}
function renderNews(d) {
  if (!d) return;
  renderHr(d); renderWorld(d); renderMarketNews(d); renderQuickFilter();
}
function renderQuickFilter() {
  const el = $('#qf');
  const opts = [
    ...state.my.follow.map((id) => MY_TOPICS.find((t) => t.id === id)).filter(Boolean).map((t) => ({ key: `t:${t.id}`, name: t.name })),
    ...state.my.fw.map((w) => ({ key: `w:${w}`, name: w })),
  ];
  if (state.qf && !opts.some((o) => o.key === state.qf)) state.qf = null;
  if (!opts.length) {
    el.replaceChildren(h('span', { class: 'mt-empty', text: myActive() ? 'Skrivaš teme koje ne želiš vidjeti.' : 'Odaberi teme koje pratiš ili koje ne želiš vidjeti.' }));
    return;
  }
  const mk = (key, name) => {
    const b = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.qf === key), text: name });
    b.addEventListener('click', () => { state.qf = key; renderNews(state.data); });
    return b;
  };
  el.replaceChildren(mk(null, 'Sve'), ...opts.map((o) => mk(o.key, o.name)));
}
function setupMyTopics() {
  const open = $('#mt-open'), panel = $('#mt-panel');
  const save = () => { store('vk-my', state.my); state.showHidden = false; renderNews(state.data); };
  const states = [['follow', 'Pratim'], ['none', 'Svejedno'], ['hide', 'Skrivam']];
  const buildGrid = () => {
    $('#mt-grid').replaceChildren(...MY_TOPICS.map((t) => {
      const cur = state.my.follow.includes(t.id) ? 'follow' : state.my.hide.includes(t.id) ? 'hide' : 'none';
      const group = h('div', { class: 'seg', role: 'group', 'aria-label': t.name },
        ...states.map(([v, label]) => {
          const b = h('button', { type: 'button', 'aria-pressed': String(cur === v), 'data-v': v, text: label });
          b.addEventListener('click', () => {
            state.my.follow = state.my.follow.filter((x) => x !== t.id);
            state.my.hide = state.my.hide.filter((x) => x !== t.id);
            if (v === 'follow') state.my.follow.push(t.id);
            if (v === 'hide') state.my.hide.push(t.id);
            group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
            save();
          });
          return b;
        }));
      return h('div', { class: 'mt-row' }, h('span', { class: 'mt-name', text: t.name }), group);
    }));
  };
  const words = (v) => [...new Set(v.split(',').map((x) => x.trim()).filter((x) => x.length >= 2))].slice(0, 30);
  const fw = $('#mt-fw'), hw = $('#mt-hw');
  const fillWords = () => { fw.value = state.my.fw.join(', '); hw.value = state.my.hw.join(', '); };
  fw.addEventListener('change', () => { state.my.fw = words(fw.value); save(); });
  hw.addEventListener('change', () => { state.my.hw = words(hw.value); save(); });
  const toggle = (show) => {
    panel.hidden = !show; open.setAttribute('aria-expanded', String(show));
    if (show) { buildGrid(); fillWords(); }
  };
  open.addEventListener('click', () => toggle(panel.hidden));
  $('#mt-done').addEventListener('click', () => { if (document.activeElement === fw || document.activeElement === hw) document.activeElement.blur(); toggle(false); open.focus(); });
  $('#mt-reset').addEventListener('click', () => { state.my = normMy(null); state.qf = null; fillWords(); buildGrid(); save(); });
  renderQuickFilter();
}

// ————————————————————————————————————————— Praćene priče
// Teme se čuvaju u pregledniku; poslužitelj ih sastavlja (/api/track compile) i pretražuje arhivu i Google News (search).
const TRACK_MAX = 12;
const TR_EXAMPLES = ['rat u Jemenu', 'američke obveznice', 'kamatne stope ECB', 'poplave u Nepalu'];
state.tracks = (store('vk-track') || []).filter((t) => t && t.id && Array.isArray(t.groups)).slice(0, TRACK_MAX);
state.trackRes = {};
state.trackOpen = {};
const saveTracks = () => store('vk-track', state.tracks);
const dayFmt = new Intl.DateTimeFormat('hr-HR', { weekday: 'long', day: 'numeric', month: 'long' });

async function trackApi(body) {
  const res = await fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Greška ${res.status}`);
  return j;
}
function trackMsg(text) { $('#track-msg').textContent = text || ''; }
function addTracker(spec) {
  const labels = Object.fromEntries((spec.labels || []).flatMap((g) => g.refs.map((r) => [r.ref, r.label])));
  const dup = state.tracks.find((t) => (spec.seed?.url && t.seed?.url === spec.seed.url) || t.name.toLowerCase() === spec.name.toLowerCase());
  if (dup) return dup;
  if (state.tracks.length >= TRACK_MAX) throw new Error(`Možeš pratiti najviše ${TRACK_MAX} tema. Makni neku koju više ne trebaš.`);
  const t = { id: Math.random().toString(36).slice(2, 10), name: spec.name, kind: spec.kind, groups: spec.groups, labels, since: spec.since, created: Date.now(), lastSeen: Date.now(), seed: spec.seed || null };
  state.tracks.unshift(t);
  saveTracks();
  return t;
}
async function followStory(s, btn) {
  btn.disabled = true; btn.textContent = 'Dodajem…';
  try {
    const { tracker } = await trackApi({ action: 'compile', story: { title: s.title, summary: s.summary, lang: s.lang, t: Date.parse(s.first || s.t), url: s.url } });
    const t = addTracker(tracker);
    btn.replaceWith(h('a', { class: 'text-btn', href: `#tr-${t.id}`, text: 'Pratiš, vidi crtu' }));
    loadTracks();
  } catch (e) { btn.disabled = false; btn.textContent = 'Prati priču'; trackMsg(e.message); }
}
async function loadTracks() {
  if (!state.tracks.length) { renderTracks(); return; }
  if (!Object.keys(state.trackRes).length) renderTracks(true);
  try {
    const { results } = await trackApi({ action: 'search', trackers: state.tracks.map(({ id, groups, since }) => ({ id, groups, since })) });
    state.trackRes = results || {};
  } catch (e) { trackMsg(`Praćene priče se nisu učitale: ${e.message}`); }
  renderTracks();
}
function trackTerms(t) {
  const lab = (r) => t.labels?.[r] || r.slice(2);
  const all = t.groups.filter((g) => g.kind === 'all'), any = t.groups.filter((g) => g.kind === 'any');
  const out = [];
  all.forEach((g) => out.push(h('span', { class: 'term', title: 'mora biti spomenuto' }, g.refs.map(lab).join(' ili '))));
  if (any.length) {
    if (all.length) out.push(h('span', { class: 'term-sep', text: 'i barem jedno od:' }));
    any.forEach((g) => out.push(h('span', { class: 'term any', title: 'barem jedno od ovih' }, g.refs.map(lab).join(' ili '))));
  }
  return h('div', { class: 'terms' }, ...out);
}
function trackEditor(t) {
  const box = h('div', { class: 'tr-edit' });
  const draw = () => {
    const chips = t.groups.map((g) => h('span', { class: 'term-group' }, ...g.refs.flatMap((r, ri) => {
      const b = h('button', { type: 'button', class: `term edit${g.kind === 'any' ? ' any' : ''}`, 'aria-label': `Makni ${t.labels?.[r] || r.slice(2)}` }, t.labels?.[r] || r.slice(2), h('span', { 'aria-hidden': 'true', text: ' ×' }));
      b.addEventListener('click', () => {
        if (t.groups.flatMap((x) => x.refs).length <= 1) return;
        g.refs = g.refs.filter((x) => x !== r);
        t.groups = t.groups.filter((x) => x.refs.length);
        saveTracks(); draw();
      });
      return ri ? [h('span', { class: 'term-sep', text: 'ili' }), b] : [b];
    })));
    const inp = h('input', { type: 'text', maxlength: '40', placeholder: 'dodaj riječ ili ime', 'aria-label': 'Nova riječ' });
    const sel = h('select', { 'aria-label': 'Vrsta' }, h('option', { value: 'all', text: 'mora biti spomenuto' }), h('option', { value: 'any', text: 'može biti spomenuto' }));
    const add = h('button', { type: 'button', class: 'text-btn', text: 'Dodaj' });
    add.addEventListener('click', () => {
      const w = inp.value.trim().replace(/[<>]/g, '');
      if (w.length < 2) return;
      t.groups.push({ kind: sel.value, refs: [`w:${w}`] });
      t.labels = { ...(t.labels || {}), [`w:${w}`]: w };
      saveTracks(); draw();
    });
    const done = h('button', { type: 'button', class: 'mt-done', text: 'Spremi i pretraži' });
    done.addEventListener('click', () => { state.trackOpen[t.id + ':edit'] = false; delete state.trackRes[t.id]; loadTracks(); });
    box.replaceChildren(
      h('p', { class: 'mt-hint', text: 'Pune oznake moraju biti spomenute u članku, isprekidane su alternative (dovoljna je jedna). Dodir na oznaku je miče.' }),
      h('div', { class: 'terms' }, ...chips),
      h('div', { class: 'tr-add' }, inp, sel, add),
      h('div', { class: 'mt-actions' }, done));
  };
  draw();
  return box;
}
function renderTracks(loading = false) {
  const list = $('#track-list');
  if (!state.tracks.length) {
    list.replaceChildren(h('div', { class: 'track-empty' },
      h('p', { text: 'Upiši temu koju želiš pratiti ili kod bilo koje vijesti odaberi „Prati priču”. Novi članci o toj temi slagat će se na vremensku crtu, od prve objave do danas.' }),
      h('div', { class: 'chips' }, ...TR_EXAMPLES.map((x) => {
        const b = h('button', { type: 'button', class: 'chip', text: x });
        b.addEventListener('click', () => { $('#track-input').value = x; $('#track-form').requestSubmit(); });
        return b;
      }))));
    return;
  }
  list.replaceChildren(...state.tracks.map((t) => {
    const r = state.trackRes[t.id];
    const evs = r?.events || [];
    const fresh = evs.filter((e) => Date.parse(e.t) > (t.lastSeen || 0)).length;
    const head = h('header', { class: 'tr-head' },
      h('h3', null, t.name),
      h('p', { class: 'tr-meta' },
        r ? `${count(r.articles, F_CLANAK)} iz ${count(r.outlets, F_IZVOR)}${r.latest ? `, zadnji ${relTime(r.latest)}` : ''}` : (loading ? 'Tražim članke…' : 'Još nema rezultata.'),
        fresh && t.lastSeen ? h('span', { class: 'badge-new', text: ` ${fresh} ${plural(fresh, ['novi', 'nova', 'novih'])}` }) : null));
    const open = state.trackOpen[t.id];
    const shown = open ? evs : evs.slice(0, 6);
    const byDay = new Map();
    for (const e of shown) { const k = dayFmt.format(new Date(e.t)); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(e); }
    const timeline = evs.length ? h('ol', { class: 'tr-line' }, ...[...byDay].map(([day, es]) => h('li', { class: 'tr-day' },
      h('h4', { text: day }),
      h('ul', null, ...es.map((e) => h('li', { class: `tr-ev${Date.parse(e.t) > (t.lastSeen || 0) ? ' is-new' : ''}` },
        h('time', { datetime: e.t, text: hhmm(e.t) }),
        h('div', null,
          link(e.url, e.title, 'tr-title'),
          h('span', { class: 'tr-src', text: `${e.src}${e.n > 1 ? ` i još ${e.n - 1}` : ''}` }))))))))
      : (r ? h('p', { class: 'empty', text: 'Za sada nema članaka koji odgovaraju. Pokušaj s manje pojmova ili drugom riječju.' }) : null);
    const actions = h('div', { class: 'tr-actions' });
    if (evs.length > 6) {
      const b = h('button', { type: 'button', class: 'text-btn', text: open ? 'Prikaži manje' : `Cijela vremenska crta (${evs.length})` });
      b.addEventListener('click', () => { state.trackOpen[t.id] = !open; renderTracks(); });
      actions.append(b);
    }
    const edit = h('button', { type: 'button', class: 'text-btn', text: 'Uredi pojmove', 'aria-expanded': String(Boolean(state.trackOpen[t.id + ':edit'])) });
    edit.addEventListener('click', () => { state.trackOpen[t.id + ':edit'] = !state.trackOpen[t.id + ':edit']; renderTracks(); });
    const del = h('button', { type: 'button', class: 'text-btn', text: 'Prestani pratiti' });
    del.addEventListener('click', () => { state.tracks = state.tracks.filter((x) => x.id !== t.id); delete state.trackRes[t.id]; saveTracks(); renderTracks(); });
    actions.append(edit, del);
    const card = h('article', { class: 'tracker', id: `tr-${t.id}` }, head, trackTerms(t), timeline, actions,
      state.trackOpen[t.id + ':edit'] ? trackEditor(t) : null);
    if (r && fresh) seenWhenVisible(card, t);
    return card;
  }));
}
// "novo" ostaje vidljivo dok je kartica na ekranu; sljedeći put su ti članci već viđeni
const seenIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const t = state.tracks.find((x) => `tr-${x.id}` === e.target.id);
    seenIO.unobserve(e.target);
    if (t) setTimeout(() => { t.lastSeen = Date.now(); saveTracks(); }, 1500);
  }
}, { threshold: 0.4 }) : null;
function seenWhenVisible(card, t) { if (seenIO) seenIO.observe(card); else { t.lastSeen = Date.now(); saveTracks(); } }
function setupTracks() {
  $('#track-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inp = $('#track-input');
    const text = inp.value.trim();
    if (text.length < 2) { trackMsg('Upiši temu, npr. „rat u Jemenu”.'); return; }
    trackMsg('Slažem temu…');
    try {
      const { tracker } = await trackApi({ action: 'compile', text });
      addTracker(tracker);
      inp.value = '';
      trackMsg('');
      await loadTracks();
    } catch (err) { trackMsg(err.message); }
  });
  renderTracks();
  if (state.tracks.length) loadTracks();
  setInterval(() => { if (document.visibilityState === 'visible' && state.tracks.length && !state.archive) loadTracks(); }, 30 * 60_000);
}

// ————————————————————————————————————————— start
function init() {
  setupTheme(); setupNav(); setupWatch(); setupFacts(); setupReads(); setupMyTopics(); setupTracks();
  $('#refresh').addEventListener('click', () => load({ refresh: true }));
  $('#archive-exit').addEventListener('click', () => { $('#archive-banner').hidden = true; state.archive = null; load(); });
  $('#map-tip').addEventListener('mouseleave', () => hideTip(false));
  document.addEventListener('click', (e) => { if (!e.target.closest('#map')) $('#map-tip').hidden = true; });
  const cached = store('vk-last');
  if (cached?.v) { render(cached); setStatus('Provjeravam ima li novijeg izdanja…'); }
  load();
  loadWeather();
  loadArchiveList();
  // tihi nadzor: ako je stranica otvorena dulje, povuci novo izdanje svakih 15 minuta
  setInterval(() => { if (document.visibilityState === 'visible' && !state.archive) load(); }, 15 * 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.data && !state.archive && Date.now() - Date.parse(state.data.builtAt) > 65 * 60_000) load();
  });
}
init();
