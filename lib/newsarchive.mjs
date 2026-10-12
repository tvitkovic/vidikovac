// Arhiva članaka po danima (za praćene priče): svako izdanje dopisuje nove članke u arch/YYYY-MM-DD.
// Zapis je sažet: naslov, poveznica, izvor, jezik, kratki sažetak i države spomenute u naslovu i tekstu.
import { matchCountries } from './geo.mjs';
import { zagreb } from './time.mjs';
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
    if (n) { added += n; writes.push(store.setJSON(key, blob)); }
  }
  const idx = new Set((await store.getJSON('arch-index')) || []);
  for (const d of byDay.keys()) idx.add(d);
  const days = [...idx].sort();
  const drop = days.length > ARCH_DAYS ? days.slice(0, days.length - ARCH_DAYS) : [];
  const keep = days.slice(drop.length);
  writes.push(store.setJSON('arch-index', keep));
  for (const d of drop) writes.push(store.delete(`arch/${d}`).catch(() => {}));
  await Promise.all(writes);
  return { added, days: keep.length, dropped: drop.length };
}

// Zapisi stariji od dva-tri dana se više ne mijenjaju: zadrži ih u memoriji toplog poslužitelja.
const memo = new Map();
export async function loadArchive(store, fromDate, stableBefore) {
  const idx = (await store.getJSON('arch-index')) || [];
  const days = idx.filter((d) => d >= fromDate);
  const blobs = await Promise.all(days.map(async (d) => {
    if (d < stableBefore && memo.has(d)) return memo.get(d);
    const b = await store.getJSON(`arch/${d}`);
    if (b && d < stableBefore) { memo.set(d, b); if (memo.size > ARCH_DAYS + 2) memo.delete(memo.keys().next().value); }
    return b;
  }));
  // naziv i težina izvora ne spremaju se uz svaki članak
  return blobs.filter(Boolean).flatMap((b) => b.items).map((x) => {
    if (x.n) return x;
    const o = outletInfo(x.o);
    x.n = o?.name || x.o; x.w = o?.w ?? 0.7;
    return x;
  });
}
export function clearArchiveMemo() { memo.clear(); }
