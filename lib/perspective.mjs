// Perspektiva: tko piše o priči, a tko ne.
//
// Mehanika je posuđena od Ground Newsa (traka pokrivenosti + "mrtvi kut"), ali os nije njihova.
// Oni dijele redakcije po američkom političkom spektru; mi za to nemamo ljestvicu i ne želimo je
// izmišljati. Umjesto toga dijelimo po onome što se može provjeriti: zemljopis redakcije,
// vlasništvo, i tko je objavio prvi. Nigdje ne stoji ocjena redakcije.
import { regionOf, isAgency, ownerKeyOf, ownerName, REGION_IDS } from './ownership.mjs';
import { namesIn } from './story.mjs';
import { tokenize } from './text.mjs';

const H = 3_600_000;
const FIRST_WINDOW = 45 * 60_000;   // tko je objavio unutar 45 min od prvog, broji se kao izvorni

// Naslov koji se poziva na tuđi tekst: "…, Report", "WSJ Reports", "prema pisanju…", "prenosi…"
const RELAY_RE = /(?:^|[\s,:—–-])(?:reports?|according to|prema pisanju|prenosi|piše|javlja|citira)\b|[,:]\s*(?:report|izvješće)\s*$/i;

/** Raspodjela redakcija po zemljopisnim skupinama. */
export function coverageSplit(items = []) {
  const byOutlet = new Map();
  for (const it of items) if (!byOutlet.has(it.outlet)) byOutlet.set(it.outlet, it);
  const counts = Object.fromEntries(REGION_IDS.map((r) => [r, 0]));
  const outlets = Object.fromEntries(REGION_IDS.map((r) => [r, []]));
  for (const [id, it] of byOutlet) {
    const r = isAgency(id) ? 'agency' : regionOf(id);
    counts[r]++;
    if (outlets[r].length < 8) outlets[r].push(it.oname || id);
  }
  const total = byOutlet.size || 1;
  return {
    counts,
    outlets,
    total: byOutlet.size,
    share: Object.fromEntries(REGION_IDS.map((r) => [r, Math.round((counts[r] / total) * 100)])),
  };
}

/**
 * Koliko različitih vlasnika stoji iza redakcija koje pokrivaju priču.
 * Redakcija bez provjerenog vlasništva broji se kao zaseban vlasnik — nikad ne pretjerujemo.
 */
export function ownershipSplit(items = []) {
  const ids = [...new Set(items.map((i) => i.outlet))];
  const hr = ids.filter((id) => regionOf(id) === 'hr' && !isAgency(id));
  const byOwner = new Map();
  for (const id of hr) {
    const k = ownerKeyOf(id);
    if (!byOwner.has(k)) byOwner.set(k, []);
    byOwner.get(k).push(id);
  }
  const shared = [...byOwner.entries()]
    .filter(([k, list]) => list.length > 1 && ownerName(k))
    .map(([k, list]) => ({ owner: ownerName(k), n: list.length }));
  return { outlets: hr.length, owners: byOwner.size, shared };
}

/** Tko je objavio prvi, a tko se poziva na tuđi tekst. */
export function originalitySplit(items = []) {
  if (!items.length) return { first: [], relayed: 0, total: 0 };
  const sorted = [...items].sort((a, b) => a.t - b.t);
  const t0 = sorted[0].t;
  const first = [];
  const seen = new Set();
  for (const it of sorted) {
    if (it.t - t0 > FIRST_WINDOW) break;
    if (seen.has(it.outlet)) continue;
    seen.add(it.outlet);
    first.push({ src: it.oname || it.outlet, t: it.t, agency: isAgency(it.outlet) });
    if (first.length >= 4) break;
  }
  const relayed = items.filter((i) => RELAY_RE.test(i.title || '')).length;
  return { first, relayed, total: items.length, lagH: Math.round(((sorted.at(-1).t - t0) / H) * 10) / 10 };
}

/** Cijeli zapis perspektive za jednu priču. */
export function perspectiveOf(cluster) {
  const items = cluster.items || [];
  const cov = coverageSplit(items);
  const own = ownershipSplit(items);
  const orig = originalitySplit(items);
  return {
    counts: cov.counts,
    share: cov.share,
    outlets: cov.outlets,
    total: cov.total,
    owners: own.owners,
    hrOutlets: own.outlets,
    sharedOwners: own.shared,
    first: orig.first.map((f) => f.src),
    relayed: orig.relayed,
  };
}

// ——— mrtvi kut ———

/** Skup vlastitih imena iz svih naslova grupe; most između jezika. */
export function clusterNames(cluster) {
  const out = new Set();
  for (const it of (cluster.items || []).slice(0, 10)) for (const n of namesIn(it.title)) out.add(n);
  return out;
}

/**
 * Priče koje svijet pokriva a hrvatski mediji ne, i obrnuto.
 *
 * Uspoređujemo preko vlastitih imena jer ona prelaze jezičnu granicu; teme i države
 * služe kao dodatna potvrda. Priča bez ijednog vlastitog imena se preskače — ondje bi
 * tvrdnja "nitko ne piše" bila neprovjerena.
 *
 * @param {Array} world svjetske grupe (en)
 * @param {Array} hr    hrvatske grupe
 * @param {{minOutlets?:number, limit?:number}} opts
 */
export function blindspots(world = [], hr = [], { minOutlets = 8, limit = 4 } = {}) {
  const hrNames = new Set();
  const hrCountries = new Set();
  for (const c of hr) {
    for (const n of clusterNames(c)) hrNames.add(n);
    for (const x of c.countries || []) hrCountries.add(x);
  }
  const worldNames = new Set();
  for (const c of world) for (const n of clusterNames(c)) worldNames.add(n);

  const missedByHr = [];
  for (const c of world) {
    if ((c.outlets || 0) < minOutlets) continue;
    const names = clusterNames(c);
    if (names.size < 1) continue;
    let overlap = 0;
    for (const n of names) if (hrNames.has(n)) overlap++;
    if (overlap > 0) continue;
    const sharedCountry = (c.countries || []).some((x) => hrCountries.has(x));
    if (sharedCountry) continue;
    missedByHr.push({ c, names: [...names].slice(0, 3) });
  }

  const missedByWorld = [];
  for (const c of hr) {
    // samo priče s međunarodnim predznakom: domaća vijest koju svijet ne prenosi nije mrtvi kut
    const intl = (c.countries || []).filter((x) => x !== 'HR');
    if (!intl.length || (c.outlets || 0) < 4) continue;
    const names = clusterNames(c);
    if (names.size < 1) continue;
    let overlap = 0;
    for (const n of names) if (worldNames.has(n)) overlap++;
    if (overlap > 0) continue;
    missedByWorld.push({ c, names: [...names].slice(0, 3) });
  }

  const bySize = (a, b) => (b.c.outlets || 0) - (a.c.outlets || 0);
  return {
    hr: missedByHr.sort(bySize).slice(0, limit),
    world: missedByWorld.sort(bySize).slice(0, Math.max(1, limit - 2)),
  };
}


/**
 * Koliko se redakcije razilaze u opisu istog događaja.
 * Mjeri se udjelom riječi koje se pojavljuju u samo jednom naslovu: isti događaj opisan
 * istim riječima daje nizak udio, isti događaj opisan različitim riječima visok.
 * Nije ocjena točnosti, nego pokazatelj da vrijedi pročitati više izvora.
 */
export function divergence(cluster) {
  const reps = [...new Map((cluster.items || []).map((i) => [i.outlet, i])).values()];
  if (reps.length < 3) return null;
  const df = new Map();
  for (const it of reps) {
    const lang = it.lang === 'hr' ? 'hr' : 'en';
    for (const w of new Set([...tokenize(it.title || '', lang), ...namesIn(it.title || '')])) {
      df.set(w, (df.get(w) || 0) + 1);
    }
  }
  if (df.size < 4) return null;
  let once = 0;
  for (const n of df.values()) if (n === 1) once++;
  const ratio = once / df.size;
  return {
    ratio: Math.round(ratio * 100) / 100,
    level: ratio >= 0.7 ? 'razilaze se' : ratio <= 0.35 ? 'slažu se' : null,
    titles: reps.length,
  };
}
