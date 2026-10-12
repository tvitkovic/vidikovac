// Praćene priče: tema (upisana ili nastala iz vijesti) → vremenska crta događaja kroz dane.
// Izvori: vlastita arhiva članaka (lib/newsarchive.mjs) + Google News pretraga (engleski i hrvatski).
// Tema je skup skupina pojmova:
//   all  – svaka skupina mora biti spomenuta (država, vlastita riječ),
//   any  – barem jedna od tih skupina (pojmovi: rat, poplave, obveznice…).
// Barem jedan pogođeni pojam mora biti u naslovu, da usputno spominjanje ne uđe u crtu.
import { CONCEPTS, CONCEPT_BY_ID } from './concepts.mjs';
import { COUNTRIES, matchCountries } from './geo.mjs';
import { fold, tokenize, hashStr, canonicalUrl, cleanTitle, detectLang } from './text.mjs';
import { fetchText } from './fetcher.mjs';
import { parseFeed } from './rss.mjs';
import { mapPublisher, outletInfo } from './normalize.mjs';
import { loadArchive, countriesIn } from './newsarchive.mjs';
import { zagreb } from './time.mjs';

const H = 3_600_000, D = 24 * H;
export const TRACK_DAYS = 45;
const COUNTRY = new Map(COUNTRIES.map((c) => [c.iso, c]));
const EXTRA = { US: /\b(treasur(y|ies)|federal reserve|wall street)\b/i }; // "Treasury yields" je američka priča
let regionNames = null;
function enName(iso) {
  if (iso === 'US') return 'US';
  if (iso === 'EU') return 'EU';
  try { regionNames ||= new Intl.DisplayNames(['en'], { type: 'region' }); return regionNames.of(iso) || iso; } catch { return iso; }
}

const STOP = new Set(`u i na o za s sa od do iz po pri te ili a ali da se je su biti bio sto što kako koji koja koje oko nakon prema protiv bez kod
vijesti vijest novosti situacija stanje tema teme pracenje praćenje
the of in on and an to for at by with about around after news latest update updates situation`.split(/\s+/).map(fold));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const reCache = new Map();
/** Vlastita riječ → izraz bez dijakritika; zadnja riječ dulja od 5 slova gubi završne samoglasnike (Rimac → rimac, Koprivnica → koprivnic). */
export function wordRe(w) {
  if (reCache.has(w)) return reCache.get(w);
  const parts = fold(w).trim().split(/\s+/).filter(Boolean).map(esc);
  if (!parts.length) return null;
  const last = parts.length - 1;
  if (parts[last].length >= 5) parts[last] = parts[last].replace(/[aeiou]+$/, '');
  // nepostojano a: Rimac → Rimca, Rimčev; Studenac → Studenca
  if (parts[last].length >= 4 && /[^aeiou]ac$/.test(parts[last])) parts[last] = parts[last].replace(/ac$/, 'a?c');
  const re = new RegExp(`(?:^|[^a-z0-9])${parts.join('\\s+')}`);
  reCache.set(w, re);
  return re;
}

export function refLabel(ref) {
  const [k, v] = [ref.slice(0, 1), ref.slice(2)];
  if (k === 'c') return COUNTRY.get(v)?.name || v;
  if (k === 'k') return CONCEPT_BY_ID.get(v)?.name || v;
  return v;
}
export function validRef(ref) {
  if (typeof ref !== 'string') return false;
  if (/^c:[A-Z]{2}$/.test(ref)) return COUNTRY.has(ref.slice(2));
  if (/^k:[a-z]+$/.test(ref)) return CONCEPT_BY_ID.has(ref.slice(2));
  return /^w:.{2,40}$/.test(ref) && !/[<>]/.test(ref);
}

function countryInWord(raw, f) {
  const out = [];
  for (const c of COUNTRIES) {
    if ((c.hr && c.hr.test(' ' + f)) || (c.en && c.en.test(f)) || (c.enCs && c.enCs.test(raw)) || (c.hrCs && c.hrCs.test(raw))) out.push(c.iso);
  }
  return out;
}
function conceptInWord(raw, f) {
  return CONCEPTS.filter((c) => c.en.test(raw) || c.hr.test(' ' + f)).map((c) => c.id);
}

/** Tema iz upisanog teksta ("rat u Jemenu", "američke obveznice", "Rimac robotaksiji"). */
export function compileText(text, now = Date.now()) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (raw.length < 2) return null;
  const words = [...raw.matchAll(/[\p{L}\p{N}][\p{L}\p{N}.&'-]*/gu)].map((m) => ({ raw: m[0], f: fold(m[0]).replace(/['.]/g, '') }));
  const used = new Array(words.length).fill(false);
  const countries = [], concepts = [], free = [];
  // dvije riječi zajedno (Južna Koreja, kamatne stope, cijene stanova); riječ se "troši" ako sama ne znači ništa drugo
  const alone = words.map((w) => [...countryInWord(w.raw, w.f).map((c) => `c:${c}`), ...conceptInWord(w.raw, w.f).map((k) => `k:${k}`)]);
  for (let i = 0; i < words.length - 1; i++) {
    if (STOP.has(words[i].f) || STOP.has(words[i + 1].f)) continue;
    const r = `${words[i].raw} ${words[i + 1].raw}`, f = `${words[i].f} ${words[i + 1].f}`;
    const m = [...countryInWord(r, f).map((c) => `c:${c}`), ...conceptInWord(r, f).map((k) => `k:${k}`)];
    if (!m.length) continue;
    const fresh = m.some((x) => !alone[i].includes(x) && !alone[i + 1].includes(x));
    for (const x of m) (x[0] === 'c' ? countries : concepts).includes(x.slice(2)) || (x[0] === 'c' ? countries : concepts).push(x.slice(2));
    for (const [j, o] of [[i, i + 1], [i + 1, i]]) {
      const sub = (arr) => arr.every((x) => m.includes(x));
      // "kamatne stope": "stope" sama ne znači ništa, a "kamatne" nosi pojam fraze → obje riječi su potrošene
      if ((fresh && (!alone[j].length || sub(alone[j]))) || (!alone[j].length && alone[o].length && sub(alone[o]))) used[j] = true;
    }
  }
  words.forEach((w, i) => {
    if (used[i] || STOP.has(w.f) || w.f.length < 2) return;
    const cs = countryInWord(w.raw, w.f);
    if (cs.length) { for (const c of cs.slice(0, 1)) if (!countries.includes(c)) countries.push(c); return; }
    const ks = conceptInWord(w.raw, w.f);
    if (ks.length) { for (const k of ks.slice(0, 2)) if (!concepts.includes(k)) concepts.push(k); return; }
    if (w.f.length >= 3) free.push(w.raw);
  });
  const groups = [
    ...countries.slice(0, 3).map((c) => ({ kind: 'all', refs: [`c:${c}`] })),
    ...free.slice(0, 3).map((w) => ({ kind: 'all', refs: [`w:${w}`] })),
    ...concepts.slice(0, 4).map((k) => ({ kind: 'any', refs: [`k:${k}`] })),
  ];
  if (!groups.length) return null;
  return { kind: 'topic', name: raw.charAt(0).toUpperCase() + raw.slice(1), groups, since: now - 30 * D, created: now };
}

/** Tema iz vijesti: države iz naslova, pojmovi iz naslova, a ako ih nema — osebujne riječi naslova. */
export function compileStory(story, now = Date.now()) {
  const title = cleanTitle(String(story?.title || '')).slice(0, 220);
  if (title.length < 8) return null;
  const summary = String(story?.summary || '').slice(0, 400);
  const lang = story?.lang === 'hr' || detectLang(title) === 'hr' ? 'hr' : 'en';
  const tf = fold(title);
  const ct = matchCountries(title, lang);
  const countries = ct.length ? ct : matchCountries(summary, lang).slice(0, 1);
  let concepts = CONCEPTS.filter((c) => c.en.test(title) || c.hr.test(' ' + tf)).map((c) => c.id);
  if (!concepts.length) concepts = CONCEPTS.filter((c) => c.en.test(summary) || c.hr.test(' ' + fold(summary))).map((c) => c.id).slice(0, 2);
  const groups = [];
  if (countries.length) groups.push({ kind: 'all', refs: countries.slice(0, 3).map((c) => `c:${c}`) });
  // vlastita imena iz naslova (osim prve riječi rečenice i država)
  const names = [...title.matchAll(/(?<=\s)(\p{Lu}[\p{L}\p{N}-]{2,})/gu)].map((m) => m[1])
    .filter((w) => !STOP.has(fold(w)) && !countryInWord(w, fold(w)).length && !conceptInWord(w, fold(w)).length);
  if (!countries.length && names.length) groups.push({ kind: 'all', refs: [`w:${names[0]}`] });
  for (const k of concepts.slice(0, 3)) groups.push({ kind: 'any', refs: [`k:${k}`] });
  if (!concepts.length) {
    const taken = new Set(groups.flatMap((g) => g.refs).map((r) => fold(r.slice(2))));
    const extra = (countries.length ? names : names.slice(1)).filter((w) => !taken.has(fold(w))).slice(0, 2);
    const longw = extra.length ? extra : title.split(/[^\p{L}\p{N}-]+/u).filter((w) => w.length >= 6 && !taken.has(fold(w)) && !STOP.has(fold(w)) && !countryInWord(w, fold(w)).length).slice(0, 2);
    for (const w of longw) groups.push({ kind: 'any', refs: [`w:${w}`] });
  }
  if (!groups.length) return null;
  const t = Number.isFinite(story?.t) ? story.t : Date.parse(story?.t || '') || now;
  return { kind: 'story', name: title.length > 90 ? `${title.slice(0, 88).replace(/\s+\S*$/, '')}…` : title, groups, since: Math.max(now - TRACK_DAYS * D, t - 2 * D), created: now, seed: { title, url: story?.url || null } };
}

export function cleanGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.slice(0, 8).map((g) => ({ kind: ['all', 'any'].includes(g?.kind) ? g.kind : 'any', refs: (Array.isArray(g?.refs) ? g.refs : []).filter(validRef).slice(0, 6) }))
    .filter((g) => g.refs.length);
}

// ——— podudaranje ———
function refHit(ref, a, inTitle) {
  const k = ref[0], v = ref.slice(2);
  const raw = inTitle ? a.ti : `${a.ti} ${a.s || ''}`;
  const f = inTitle ? (a._ft ||= fold(a.ti)) : (a._fa ||= fold(raw));
  if (k === 'c') return (inTitle ? a.ct : a.cx)?.includes(v) || Boolean(EXTRA[v]?.test(raw));
  if (k === 'k') { const c = CONCEPT_BY_ID.get(v); return Boolean(c && (c.en.test(raw) || c.hr.test(' ' + f))); }
  const re = wordRe(v);
  return Boolean(re && re.test(' ' + f));
}
export function matchArticle(groups, a) {
  // naslov mora spominjati barem jednu obaveznu skupinu (ako ih ima), inače barem jedan pojam
  let titleHit = false, titleAll = false, hasAll = false, anyHit = false, hasAny = false;
  for (const g of groups) {
    let hit = false, inTitle = false;
    for (const r of g.refs) {
      if (refHit(r, a, true)) { hit = inTitle = true; break; }
      if (refHit(r, a, false)) hit = true;
    }
    if (g.kind === 'all') { hasAll = true; if (!hit) return false; if (inTitle) titleAll = true; }
    if (g.kind === 'any') { hasAny = true; if (hit) anyHit = true; }
    if (inTitle) titleHit = true;
  }
  return (hasAll ? titleAll : titleHit) && (!hasAny || anyHit);
}

// ——— Google News pretraga ———
export function gnQuery(groups, lang) {
  const q = (ref) => {
    const k = ref[0], v = ref.slice(2);
    if (k === 'c') return lang === 'hr' ? COUNTRY.get(v)?.name || v : enName(v);
    if (k === 'k') { const c = CONCEPT_BY_ID.get(v); return lang === 'hr' ? c?.hrQ : c?.enQ; }
    return v;
  };
  const or = (xs) => { const u = [...new Set(xs.filter(Boolean))].map((x) => (/\s/.test(x) ? `"${x}"` : x)); return u.length > 1 ? `(${u.join(' OR ')})` : u[0]; };
  const parts = groups.filter((g) => g.kind === 'all').map((g) => or(g.refs.map(q)));
  const any = groups.filter((g) => g.kind === 'any').flatMap((g) => g.refs.map(q));
  if (any.length) parts.push(or(any));
  return parts.filter(Boolean).join(' ');
}

function packGN(it, lang) {
  const pubName = (it.source?.name || '').trim();
  if (!pubName || !it.link) return null;
  const id = mapPublisher(pubName);
  const info = id ? outletInfo(id) : { id: `gn-${fold(pubName).replace(/[^a-z0-9]+/g, '-')}`, name: pubName, w: 0.5 };
  let ti = cleanTitle(it.title || '');
  const cut = ti.lastIndexOf(` - ${pubName}`);
  if (cut > 10) ti = ti.slice(0, cut); else ti = ti.replace(/\s+[-–]\s+[^-–]{2,50}$/, '');
  const t = Date.parse(it.published || '') || new Date(it.published).getTime();
  if (!ti || !Number.isFinite(t)) return null;
  const l = detectLang(ti) === 'hr' ? 'hr' : (lang === 'hr' ? detectLang(ti) || 'en' : 'en');
  return { id: hashStr(canonicalUrl(it.link)), t, o: info.id, n: info.name, w: info.w, l, ti, u: it.link, s: '', ct: countriesIn(ti), cx: countriesIn(ti), gn: true };
}

async function googleNews(store, q, lang, now) {
  if (!q) return [];
  const key = `gnq/${zagreb(now).date}/${hashStr(`${lang}|${q}`)}`;
  const cached = await store.getJSON(key);
  if (cached && now - cached.at < H) return cached.items;
  const loc = lang === 'hr' ? 'hl=hr&gl=HR&ceid=HR:hr' : 'hl=en-US&gl=US&ceid=US:en';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:30d`)}&${loc}`;
  const r = await fetchText(url, { timeout: 6000 });
  if (!r.ok || !r.text) return cached?.items || [];
  const items = parseFeed(r.text, { url }).items.map((it) => packGN(it, lang)).filter(Boolean);
  await store.setJSON(key, { at: now, q, items }).catch(() => {});
  return items;
}

/** Ukloni predmemoriju Google News pretraga stariju od jučer (poziva se jednom dnevno). */
export async function pruneSearchCache(store, now = Date.now()) {
  const keep = zagreb(now - D).date;
  const keys = await store.list('gnq/').catch(() => []);
  const old = keys.filter((k) => (k.split('/')[1] || '') < keep);
  await Promise.all(old.map((k) => store.delete(k).catch(() => {})));
  return old.length;
}

// ——— događaji ———
function jaccard(a, b) { let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n || 1); }

export function toEvents(articles) {
  const sorted = [...articles].sort((a, b) => a.t - b.t);
  const events = [];
  for (const a of sorted) {
    const toks = new Set(tokenize(a.ti, a.l));
    let best = null, bs = 0;
    for (let i = events.length - 1; i >= 0 && i >= events.length - 40; i--) {
      const e = events[i];
      if (a.t - e.last > 36 * H) continue;
      const s = jaccard(toks, e.toks);
      if (s > bs) { bs = s; best = e; }
    }
    if (best && bs >= 0.25) { best.items.push(a); best.last = Math.max(best.last, a.t); for (const x of toks) best.toks.add(x); }
    else events.push({ first: a.t, last: a.t, items: [a], toks });
  }
  return events.map((e) => {
    const outlets = new Map();
    for (const it of e.items) if (!outlets.has(it.o) || outlets.get(it.o).w < it.w) outlets.set(it.o, it);
    const rep = [...outlets.values()].sort((x, y) => (y.w - x.w) || (x.t - y.t))[0];
    return {
      t: new Date(e.first).toISOString(), last: new Date(e.last).toISOString(),
      title: rep.ti, url: rep.u, src: rep.n, lang: rep.l, summary: rep.s || '',
      n: outlets.size,
      also: [...outlets.values()].filter((x) => x !== rep).sort((x, y) => y.w - x.w).slice(0, 5).map((x) => ({ src: x.n, url: x.u })),
    };
  }).sort((a, b) => Date.parse(b.t) - Date.parse(a.t));
}

/** Pretraži arhivu i Google News za više tema odjednom. */
export async function searchTrackers(store, trackers, { now = Date.now(), web = true } = {}) {
  const list = trackers.slice(0, 12).map((t) => ({ id: String(t.id || '').slice(0, 40), groups: cleanGroups(t.groups), since: Math.max(now - TRACK_DAYS * D, Number(t.since) || now - 30 * D) }))
    .filter((t) => t.id && t.groups.length);
  if (!list.length) return {};
  const minSince = Math.min(...list.map((t) => t.since));
  const archive = await loadArchive(store, zagreb(minSince).date, zagreb(now - 3 * D).date).catch(() => []);
  const out = {};
  await Promise.all(list.map(async (t) => {
    const qEn = gnQuery(t.groups, 'en'), qHr = gnQuery(t.groups, 'hr');
    const [gEn, gHr] = web ? await Promise.all([googleNews(store, qEn, 'en', now).catch(() => []), googleNews(store, qHr, 'hr', now).catch(() => [])]) : [[], []];
    const seen = new Set(), seenTitle = new Set(), matched = [];
    for (const a of [...archive, ...gEn, ...gHr]) {
      if (a.t < t.since || a.t > now + H) continue;
      const key = a.id, tkey = `${a.o}|${fold(a.ti).slice(0, 60)}`;
      if (seen.has(key) || seenTitle.has(tkey)) continue;
      if (!matchArticle(t.groups, a)) continue;
      seen.add(key); seenTitle.add(tkey);
      matched.push(a);
    }
    const events = toEvents(matched);
    out[t.id] = {
      events: events.slice(0, 60),
      articles: matched.length,
      outlets: new Set(matched.map((a) => a.o)).size,
      latest: events[0]?.last || null,
      query: { en: qEn, hr: qHr },
      labels: t.groups.map((g) => ({ kind: g.kind, refs: g.refs.map((r) => ({ ref: r, label: refLabel(r) })) })),
    };
  }));
  return out;
}
