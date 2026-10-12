// Grupiranje istih priča iz različitih redakcija i rangiranje po pokrivenosti.
import { tokenize, hashStr } from './text.mjs';
import { outletInfo } from './normalize.mjs';

const H = 3_600_000;
const PROMINENT_DESKS = new Set(['top', 'mostread', 'hr-top']);

function itemVector(it, idf) {
  const v = new Map();
  for (const tok of it._tt) v.set(tok, (v.get(tok) || 0) + 1.0 * (idf.get(tok) || 1));
  for (const tok of it._st) v.set(tok, (v.get(tok) || 0) + 0.35 * (idf.get(tok) || 1));
  let n = 0;
  for (const x of v.values()) n += x * x;
  return { v, n: Math.sqrt(n) || 1 };
}

function cosine(a, b) {
  const [s, l] = a.v.size < b.v.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, x] of s.v) { const y = l.v.get(k); if (y) dot += x * y; }
  return dot / (a.n * b.n);
}

function addToCentroid(c, vec) {
  for (const [k, x] of vec.v) c.v.set(k, (c.v.get(k) || 0) + x);
  let n = 0;
  for (const x of c.v.values()) n += x * x;
  c.n = Math.sqrt(n) || 1;
}

/**
 * Grupira stavke istog jezika u priče.
 * @returns {Array} ocijenjene grupe (sortirane po ocjeni)
 */
export function clusterItems(items, { threshold = 0.3, now = Date.now(), lang = 'en', mergeThreshold = 0.34 } = {}) {
  if (!items.length) return [];
  for (const it of items) {
    it._tt = [...new Set(tokenize(it.title, lang))];
    it._st = [...new Set(tokenize((it.summary || '').split(/\s+/).slice(0, 28).join(' '), lang))].filter((t) => !it._tt.includes(t));
  }
  const df = new Map();
  for (const it of items) for (const tok of new Set([...it._tt, ...it._st])) df.set(tok, (df.get(tok) || 0) + 1);
  const N = items.length;
  const idf = new Map();
  for (const [tok, d] of df) idf.set(tok, Math.log(1 + N / d));
  for (const it of items) it._vec = itemVector(it, idf);
  // prag "značajne" riječi prilagođen veličini skupa (u malim skupovima idf je prirodno nizak)
  const STRONG = Math.min(1.2, Math.log(1 + N / 4));
  const MERGE_STRONG = Math.min(1.6, Math.log(1 + N / 3));

  const seedScore = (i) => i.ow + (PROMINENT_DESKS.has(i.desk) ? 0.3 : 0) - i.rank * 0.004;
  const sorted = [...items].sort((a, b) => seedScore(b) - seedScore(a) || b.t - a.t);
  let clusters = [];
  const index = new Map();
  const addIndex = (t, ci) => { if (!index.has(t)) index.set(t, new Set()); index.get(t).add(ci); };

  for (const it of sorted) {
    const vec = it._vec;
    const strong = it._tt.filter((t) => (idf.get(t) || 0) > STRONG);
    const cand = new Set();
    const keyToks = [...it._tt].sort((a, b) => (idf.get(b) || 0) - (idf.get(a) || 0)).slice(0, 8);
    for (const t of keyToks) for (const ci of index.get(t) || []) cand.add(ci);
    let best = -1, bestSim = 0;
    for (const ci of cand) {
      const c = clusters[ci];
      const sim = cosine(vec, c.centroid);
      if (sim <= bestSim) continue;
      let shared = 0;
      for (const t of strong) if (c.titleToks.has(t)) shared++;
      if (shared >= 2 || sim >= 0.55) { best = ci; bestSim = sim; }
    }
    if (best >= 0 && bestSim >= threshold) {
      const c = clusters[best];
      c.items.push(it);
      addToCentroid(c.centroid, vec);
      for (const t of it._tt) { c.titleToks.add(t); addIndex(t, best); }
    } else {
      const ci = clusters.length;
      clusters.push({ items: [it], centroid: { v: new Map(vec.v), n: vec.n }, titleToks: new Set(it._tt) });
      for (const t of it._tt) addIndex(t, ci);
    }
  }

  // Drugi prolaz: spoji grupe koje su očito ista priča (npr. "nesreća kod Sinja" i "KBC o ozlijeđenima kod Sinja")
  const outletsOf = (c) => new Set(c.items.map((i) => i.outlet)).size;
  const order = clusters.map((c, i) => [i, outletsOf(c)]).sort((a, b) => b[1] - a[1]).slice(0, 90).map((x) => x[0]);
  const dead = new Set();
  for (let a = 0; a < order.length; a++) {
    const ca = clusters[order[a]];
    if (dead.has(order[a])) continue;
    for (let b = a + 1; b < order.length; b++) {
      if (dead.has(order[b])) continue;
      const cb = clusters[order[b]];
      const sim = cosine(ca.centroid, cb.centroid);
      if (sim < mergeThreshold) continue;
      let shared = 0;
      for (const t of cb.titleToks) if (ca.titleToks.has(t) && (idf.get(t) || 0) > MERGE_STRONG) shared++;
      if (shared < 2) continue;
      for (const it of cb.items) { ca.items.push(it); addToCentroid(ca.centroid, it._vec); }
      for (const t of cb.titleToks) ca.titleToks.add(t);
      dead.add(order[b]);
    }
  }
  clusters = clusters.filter((_, i) => !dead.has(i));
  return clusters.map((c) => scoreCluster(c, now)).sort((a, b) => b.score - a.score);
}

export function scoreCluster(c, now) {
  const items = c.items;
  const byOutlet = new Map();
  for (const it of items) {
    const prev = byOutlet.get(it.outlet);
    if (!prev || it.rank < prev.rank) byOutlet.set(it.outlet, it);
  }
  let coverage = 0;
  for (const it of byOutlet.values()) coverage += it.ow;
  const extra = new Set();
  for (const it of items) for (const o of it.related || []) if (!byOutlet.has(o)) extra.add(o);
  for (const o of extra) coverage += outletInfo(o).w * 0.6;
  let prominence = 0;
  for (const it of items) {
    const top = it.desks.some((d) => PROMINENT_DESKS.has(d));
    prominence += top ? Math.max(0, 1 - it.rank / 20) * 0.8 : Math.max(0, 1 - it.rank / 30) * 0.22;
  }
  prominence = Math.min(prominence, 3.5);
  const newest = Math.max(...items.map((i) => i.t));
  const oldest = Math.min(...items.map((i) => i.t));
  const ageH = Math.max(0, (now - newest) / H);
  const fresh = Math.exp(-ageH / 16);
  const score = (coverage + prominence) * (0.35 + 0.65 * fresh);
  const centroid = c.centroid;
  const repScore = (it) => it.ow + (it.img ? 0.25 : 0) + ((it.summary || '').length > 60 ? 0.3 : 0)
    + (it.desks.some((d) => PROMINENT_DESKS.has(d)) ? 0.15 : 0)
    + (centroid && it._vec ? cosine(it._vec, centroid) * 0.9 : 0)
    - Math.min(1, (now - it.t) / (24 * H)) * 0.3 - (it.feed?.startsWith('gn-') ? 0.2 : 0)
    - (/^(opinion|analysis|explainer|comment)\b|[|:]\s*opinion\b/i.test(it.title) ? 0.6 : 0)
    - (/\b(podcast|quiz|crossword|newsletter|live blog)\b|[–-]\s*video$/i.test(it.title) ? 0.9 : 0);
  const reps = [...byOutlet.values()].sort((a, b) => repScore(b) - repScore(a));
  const rep = reps[0];
  const img = rep.img || reps.find((i) => i.img)?.img || null;
  const summary = rep.summary || reps.map((i) => i.summary).filter(Boolean).sort((a, b) => b.length - a.length)[0] || '';
  return {
    items, rep, score, coverage, prominence, fresh, newest, oldest,
    outlets: byOutlet.size + extra.size,
    extraOutlets: [...extra],
    img, summary,
  };
}

/** Pretvori grupu u zapis priče za klijenta. */
export function toStory(c, extra = {}) {
  const r = c.rep;
  const also = [...new Map(c.items.filter((i) => i.outlet !== r.outlet).sort((a, b) => b.ow - a.ow).map((i) => [i.outlet, i])).values()]
    .slice(0, 6).map((i) => ({ src: i.oname, url: i.url }));
  return {
    id: hashStr(r.curl || r.url),
    title: r.title,
    url: r.url,
    src: r.oname,
    srcId: r.outlet,
    t: new Date(r.t).toISOString(),
    upd: new Date(c.newest).toISOString(),
    first: new Date(c.oldest).toISOString(),
    summary: c.summary,
    img: c.img,
    n: c.outlets,
    also,
    more: c.extraOutlets.length ? c.extraOutlets.map((o) => outletInfo(o).name).slice(0, 6) : undefined,
    lang: r.lang,
    score: Math.round(c.score * 100) / 100,
    ...extra,
  };
}
