// Arhiva članaka po danima (za praćene priče): svako izdanje dopisuje nove članke u arch/YYYY-MM-DD.
// Zapis je sažet: naslov, poveznica, izvor, jezik, kratki sažetak i države spomenute u naslovu i tekstu.
//
// Uz dnevne zapise držimo i mjesečne pakete (arch-pack/YYYY-MM). Pretraga praćenih priča prije je
// otvarala do 45 blobova po otvaranju stranice; sada otvara dva-tri paketa i današnji dan.
// Paketi se grade u satnom poslu, ne u zahtjevu korisnika.
import { matchCountries } from './geo.mjs';
import { zagreb, addDays } from './time.mjs';
import { hashStr, canonicalUrl } from './text.mjs';
import { outletInfo } from './normalize.mjs';

export const ARCH_DAYS = 45;
const H = 3_600_000;

// države tražimo na oba jezika: naslov na hrvatskom može doći i iz "engleskog" izvora i obrnuto
export const countriesIn = (text) => [...new Set([...matchCountries(text, 'hr'), ...matchCountries(text, 'en')])];

export function packArch(i) {
  const s = (i.summary || '').slice(0, 130);
  return {
    id: i.id || hashStr(i.curl || canonicalUrl(i.url)),
    t: i.t, o: i.outlet, l: i.lang,
    ti: i.title, u: i.url, s,
    ct: countriesIn(i.title), cx: countriesIn(`${i.title} ${s}`),
  };
}

/** Dopiši nove članke u dnevne zapise i ukloni dane starije od ARCH_DAYS. */
export async function updateArchive(store, items, now) {
  const byDay = new Map();
  for (const it of items) {
    if (!it?.url || !it.title || it.t < now - 50 * H || it.t > now + H) continue;
    const day = zagreb(it.t).date;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(it);
  }
  let added = 0;
  const writes = [];
  const touched = [];
  for (const [day, list] of byDay) {
    const key = `arch/${day}`;
    const blob = (await store.getJSON(key)) || { day, items: [] };
    const ids = new Set(blob.items.map((x) => x.id));
    let n = 0;
    for (const it of list) {
      const id = it.id || hashStr(it.curl || canonicalUrl(it.url));
      if (ids.has(id)) continue;
      ids.add(id);
      blob.items.push(packArch({ ...it, id }));
      n++;
    }
    if (n) { added += n; touched.push(day); writes.push(store.setJSON(key, blob)); }
  }
  const idx = new Set((await store.getJSON('arch-index')) || []);
  for (const d of byDay.keys()) idx.add(d);
  const days = [...idx].sort();
  const drop = days.length > ARCH_DAYS ? days.slice(0, days.length - ARCH_DAYS) : [];
  const keep = days.slice(drop.length);
  writes.push(store.setJSON('arch-index', keep));
  for (const d of drop) writes.push(store.delete(`arch/${d}`).catch(() => {}));
  await Promise.all(writes);
  return { added, days: keep.length, dropped: drop.length, touched };
}

const monthOf = (day) => day.slice(0, 7);

/**
 * Pregradi mjesečne pakete za dane koji se više neće mijenjati.
 * Poziva se iz satnog posla; nikad iz zahtjeva korisnika.
 */
export async function buildArchivePacks(store, now = Date.now()) {
  const idx = (await store.getJSON('arch-index')) || [];
  if (!idx.length) return { packs: 0, days: 0 };
  const today = zagreb(now).date;
  const yesterday = addDays(today, -1);
  // današnji i jučerašnji dan ostaju izvan paketa jer se još pune
  const settled = idx.filter((d) => d < yesterday);
  const byMonth = new Map();
  for (const d of settled) {
    const m = monthOf(d);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(d);
  }
  let packs = 0, days = 0;
  for (const [month, list] of byMonth) {
    const key = `arch-pack/${month}`;
    const have = await store.getJSON(key);
    const need = list.slice().sort();
    if (have?.days?.length === need.length && have.days.every((d, i) => d === need[i])) continue;
    const blobs = await Promise.all(need.map((d) => store.getJSON(`arch/${d}`).catch(() => null)));
    const items = blobs.filter(Boolean).flatMap((b) => b.items || []);
    await store.setJSON(key, { month, days: need, items, at: now });
    packs++; days += need.length;
  }
  // paketi za mjesece koji su ispali iz arhive
  const live = new Set([...byMonth.keys()]);
  const keys = await store.list('arch-pack/').catch(() => []);
  for (const k of keys) {
    const m = k.split('/')[1];
    if (m && !live.has(m)) await store.delete(k).catch(() => {});
  }
  return { packs, days };
}

// Zapisi stariji od dva-tri dana se više ne mijenjaju: zadrži ih u memoriji toplog poslužitelja.
const memo = new Map();
const packMemo = new Map();

function hydrate(x) {
  if (x.n) return x;
  const o = outletInfo(x.o);
  x.n = o?.name || x.o; x.w = o?.w ?? 0.7;
  return x;
}

export async function loadArchive(store, fromDate, stableBefore) {
  const idx = (await store.getJSON('arch-index')) || [];
  const days = idx.filter((d) => d >= fromDate);
  if (!days.length) return [];

  const byMonth = new Map();
  for (const d of days) {
    const m = monthOf(d);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(d);
  }

  const covered = new Set();
  const chunks = [];

  // 1) mjesečni paketi — jedan blob umjesto dvadesetak
  await Promise.all([...byMonth.keys()].map(async (month) => {
    const key = `arch-pack/${month}`;
    let pack = packMemo.get(month);
    if (!pack) {
      pack = await store.getJSON(key).catch(() => null);
      if (pack?.items) {
        packMemo.set(month, pack);
        if (packMemo.size > 4) packMemo.delete(packMemo.keys().next().value);
      }
    }
    if (!pack?.items) return;
    const need = byMonth.get(month);
    const has = new Set(pack.days || []);
    const usable = need.filter((d) => has.has(d));
    if (!usable.length) return;
    for (const d of usable) covered.add(d);
    chunks.push(pack.items);
  }));

  // 2) dani koje paket ne pokriva (današnji, jučerašnji, i svaki propušteni)
  const rest = days.filter((d) => !covered.has(d));
  const blobs = await Promise.all(rest.map(async (d) => {
    if (d < stableBefore && memo.has(d)) return memo.get(d);
    const b = await store.getJSON(`arch/${d}`).catch(() => null);
    if (b && d < stableBefore) {
      memo.set(d, b);
      if (memo.size > ARCH_DAYS + 2) memo.delete(memo.keys().next().value);
    }
    return b;
  }));
  for (const b of blobs) if (b?.items) chunks.push(b.items);

  // naziv i težina izvora ne spremaju se uz svaki članak
  const out = [];
  const seen = new Set();
  for (const list of chunks) {
    for (const x of list) {
      if (seen.has(x.id)) continue;
      seen.add(x.id);
      out.push(hydrate(x));
    }
  }
  return out;
}

export function clearArchiveMemo() { memo.clear(); packMemo.clear(); }

/** Za dijagnostiku u sučelju: koliko blobova pretraga mora otvoriti. */
export async function archiveShape(store, fromDate) {
  const idx = (await store.getJSON('arch-index')) || [];
  const days = idx.filter((d) => d >= fromDate);
  const months = new Set(days.map(monthOf));
  const packs = await Promise.all([...months].map((m) => store.getJSON(`arch-pack/${m}`).catch(() => null)));
  const packed = new Set(packs.filter(Boolean).flatMap((p) => p.days || []));
  return { days: days.length, months: months.size, packed: days.filter((d) => packed.has(d)).length, reads: months.size + days.filter((d) => !packed.has(d)).length };
}
