// Trajni identitet priče. Grupiranje u lib/cluster.mjs radi unutar jednog izdanja;
// ovdje priča dobiva ID koji živi danima, pa možemo reći "dan 4", "što je novo" i kakav joj je ritam.
//
// Zapis u spremištu: stories/open  → { v, byId: { [id]: StoryRec } }
// StoryRec je namjerno sitan jer se čita i piše svaki sat.
import { tokenize, fold, hashStr } from './text.mjs';
import { zagreb } from './time.mjs';

export const STORY_V = 1;
const H = 3_600_000, D = 24 * H;

export const OPEN_DAYS = 7;        // koliko dugo priča može "uhvatiti" novi članak
export const KEEP_HOURS = 72;      // koliko sati ritma pamtimo
export const KEEP_DAYS = 14;       // koliko dana pamtimo za greben i "dan N"
export const MAX_OPEN = 500;       // gornja granica zapisa u spremištu

// Priča se kroz dane prepoznaje po tri signala: preklapanju riječi, zajedničkim vlastitim
// imenima i istoj državi. Sam kosinus je prestrog — naslov drugog dana često dijeli
// s prvim samo ime i par riječi ("Zelensky summit" → "Kharkiv pledges after Zelensky talks").
const MATCH_MIN = 0.55;            // dovoljno samo preklapanje riječi
const MATCH_NAMES = 0.22;          // uz dva zajednička imena
const MATCH_COUNTRY = 0.25;        // uz jedno ime i istu državu
const KEY_TOKENS = 14;             // koliko tokena pamtimo po priči

/** Vlastita imena iz naslova: most između jezika (Netanyahu, ECB, Rimac). */
export function namesIn(title) {
  const out = new Set();
  const s = String(title || '');
  for (const m of s.matchAll(/(?<![.!?]\s)(?<=\s)(\p{Lu}[\p{L}\p{N}-]{2,})/gu)) out.add(fold(m[1]));
  for (const m of s.matchAll(/\b(\p{Lu}{2,6})\b/gu)) out.add(fold(m[1]));   // kratice: ECB, NATO, HNB
  return out;
}

const vecOf = (toks) => {
  const v = new Map();
  for (const t of toks) v.set(t, (v.get(t) || 0) + 1);
  let n = 0;
  for (const x of v.values()) n += x * x;
  return { v, n: Math.sqrt(n) || 1 };
};
function cos(a, b) {
  const [s, l] = a.v.size < b.v.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, x] of s.v) { const y = l.v.get(k); if (y) dot += x * y; }
  return dot / (a.n * b.n);
}

/** Tokeni po kojima priču prepoznajemo kroz dane: naslovi predstavnika + vlastita imena. */
export function storyTokens(cluster) {
  const titles = [cluster.rep?.title, ...cluster.items.slice(0, 8).map((i) => i.title)].filter(Boolean);
  const lang = cluster.rep?.lang === 'hr' ? 'hr' : 'en';
  const toks = new Set();
  for (const t of titles) for (const x of tokenize(t, lang)) toks.add(x);
  const names = new Set();
  for (const t of titles) for (const n of namesIn(t)) { names.add(n); toks.add(n); }
  const countries = [...new Set(cluster.countries || [])].slice(0, 4);
  return { toks: [...toks].slice(0, 40), names: [...names].slice(0, 12), countries };
}

function keyToks(toks, names) {
  // vlastita imena nose identitet priče, pa idu prva
  const rest = toks.filter((t) => !names.includes(t));
  return [...names, ...rest].slice(0, KEY_TOKENS);
}

const newId = (seed) => hashStr(`s|${seed}|${Math.floor(Math.random() * 1e9)}`);

/** Prazno stanje; koristi se i kad spremište još nema zapis. */
export const emptyStories = () => ({ v: STORY_V, byId: {} });

/**
 * Dodijeli trajne ID-eve grupama ovog izdanja i osvježi zapise.
 * Ne piše u spremište — vraća novo stanje, pozivatelj ga sprema.
 *
 * @param {object} state   prethodno stanje (stories/open)
 * @param {Array}  clusters grupe iz clusterItems(), bilo kojeg jezika
 * @param {number} now
 * @returns {{state:object, assign:Map<object,object>}} assign: cluster → { id, day, isNew, fresh, prevOutlets }
 */
export function assignStories(state, clusters, now = Date.now()) {
  const st = state?.v === STORY_V && state.byId ? { v: STORY_V, byId: { ...state.byId } } : emptyStories();
  const day = zagreb(now).date;
  const hourKey = Math.floor(now / H) * H;
  const assign = new Map();

  // kandidati: priče viđene u zadnjih OPEN_DAYS dana
  const open = Object.values(st.byId).filter((r) => now - r.last <= OPEN_DAYS * D);
  const idx = new Map();                       // token → [rec]
  for (const r of open) for (const t of r.k || []) {
    if (!idx.has(t)) idx.set(t, []);
    idx.get(t).push(r);
  }

  // veće grupe prve: one imaju pravo na identitet prije rubnih
  const order = [...clusters].sort((a, b) => (b.outlets || 0) - (a.outlets || 0));
  const taken = new Set();

  for (const c of order) {
    const { toks, names, countries } = storyTokens(c);
    const k = keyToks(toks, names);
    const vec = vecOf(k);
    const nameSet = new Set(names);

    const cands = new Set();
    for (const t of k) for (const r of idx.get(t) || []) if (!taken.has(r.id)) cands.add(r);

    let best = null, bestSim = 0;
    for (const r of cands) {
      const sim = cos(vec, vecOf(r.k || []));
      if (sim <= bestSim) continue;
      let sharedNames = 0;
      for (const n of r.nm || []) if (nameSet.has(n)) sharedNames++;
      const sameCountry = countries.length && (r.cc || []).some((x) => countries.includes(x));
      const hit = sim >= MATCH_MIN
        || (sharedNames >= 2 && sim >= MATCH_NAMES)
        || (sharedNames >= 1 && sameCountry && sim >= MATCH_COUNTRY);
      if (hit) { best = r; bestSim = sim; }
    }

    const outlets = c.outlets || new Set(c.items.map((i) => i.outlet)).size;
    const articles = c.items.length;
    let rec, isNew = false, fresh = [], prevOutlets = 0;

    if (best) {
      rec = { ...best };
      prevOutlets = rec.peak || 0;
      const known = new Set(rec.k || []);
      fresh = names.filter((n) => !known.has(n)).slice(0, 6);
      // identitet se polako širi: zadrži stare tokene, dopuni novima
      rec.k = [...new Set([...(rec.k || []), ...k])].slice(0, KEY_TOKENS + 8);
      rec.nm = [...new Set([...(rec.nm || []), ...names])].slice(0, 16);
      rec.cc = [...new Set([...(rec.cc || []), ...countries])].slice(0, 6);
    } else {
      isNew = true;
      rec = { id: newId(c.rep?.url || c.rep?.title || day), first: c.oldest || now, k, nm: names, cc: countries, hours: {}, days: {}, peak: 0, titles: [] };
    }

    rec.last = now;
    rec.title = c.rep?.title || rec.title || '';
    rec.peak = Math.max(rec.peak || 0, outlets);
    if (rec.peak === outlets) rec.peakAt = now;
    rec.hours = { ...rec.hours, [hourKey]: (rec.hours[hourKey] || 0) + 0 };   // sat postoji i kad nema prirasta
    rec.hours[hourKey] = Math.max(rec.hours[hourKey] || 0, articles);
    rec.days = { ...rec.days, [day]: { a: articles, o: outlets } };
    // naslovi za "što je novo": jedan po danu je dovoljan
    if (!rec.titles?.some((x) => x.d === day)) rec.titles = [...(rec.titles || []), { d: day, t: (c.rep?.title || '').slice(0, 120) }].slice(-KEEP_DAYS);

    // obrezivanje
    for (const hk of Object.keys(rec.hours)) if (now - Number(hk) > KEEP_HOURS * H) delete rec.hours[hk];
    const dkeys = Object.keys(rec.days).sort();
    if (dkeys.length > KEEP_DAYS) for (const dk of dkeys.slice(0, dkeys.length - KEEP_DAYS)) delete rec.days[dk];

    st.byId[rec.id] = rec;
    taken.add(rec.id);
    assign.set(c, {
      id: rec.id,
      day: Object.keys(rec.days).length,
      first: rec.first,
      isNew,
      fresh,
      prevOutlets,
      peak: rec.peak,
      peakAt: rec.peakAt,
      hours: rec.hours,
      days: rec.days,
    });
  }

  // zatvori stare i drži spremište u granicama
  const all = Object.values(st.byId).sort((a, b) => b.last - a.last);
  const keep = all.filter((r) => now - r.last <= OPEN_DAYS * D).slice(0, MAX_OPEN);
  st.byId = Object.fromEntries(keep.map((r) => [r.id, r]));
  return { state: st, assign };
}

/**
 * Što je novo u priči u odnosu na prethodne dane: vlastita imena iz današnjih naslova
 * kojih u ranijim naslovima te priče nije bilo. Prazan niz znači da priča ponavlja isto.
 *
 * Uspoređuje se na razini cijelih riječi (bez korijenovanja), jer imena ne korijenujemo.
 */
export function whatsNew(rec, cluster, day) {
  if (!rec?.titles?.length) return [];
  const before = rec.titles.filter((x) => x.d < day);
  if (!before.length) return [];
  const seen = new Set();
  for (const x of before) {
    for (const w of fold(x.t).split(/[^\p{L}\p{N}]+/u)) if (w.length >= 2) seen.add(w);
    for (const n of namesIn(x.t)) seen.add(n);
  }
  const out = [];
  for (const it of (cluster.items || []).slice(0, 10)) {
    for (const n of namesIn(it.title)) if (!seen.has(n) && !out.includes(n)) out.push(n);
  }
  return out.slice(0, 6);
}
