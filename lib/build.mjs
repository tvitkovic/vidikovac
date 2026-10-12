// Orkestracija: dohvat izvora → grupiranje → rubrike → spremanje (najnovije, jutarnje izdanje, tjedni pregled znanosti).
import { FEEDS, OUTLETS, feedsDue } from './sources.mjs';
import { fetchText, mapLimit } from './fetcher.mjs';
import { parseFeed } from './rss.mjs';
import { normalizeItems, dedupeItems, packItem, unpackItem, MAX_AGE_H } from './normalize.mjs';
import { buildNewsSections, buildAnalysis, buildRelief } from './sections.mjs';
import { fetchMarkets } from './markets.mjs';
import { mergePool, buildScienceRecap } from './science.mjs';
import { fetchExtras } from './extras.mjs';
import { zagreb, hrLongDate, isoWeek, HOUR } from './time.mjs';
import { openStore } from './store.mjs';
import { makeDigest } from './digest.mjs';
import { updateArchive } from './newsarchive.mjs';
import { pruneSearchCache } from './track.mjs';

export const VERSION = 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, fallback = null) => Promise.race([p, sleep(ms).then(() => fallback)]);

async function getExtrasCached(store, date, now, allow) {
  const key = `extras/${date}`;
  const cached = await store.getJSON(key);
  if (cached && (cached.complete || now - (cached.fetchedAt || 0) < HOUR)) return cached;
  if (!allow) return cached;
  const fresh = await fetchExtras(date);
  const merged = { ...(cached || {}), ...Object.fromEntries(Object.entries(fresh).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length))), fetchedAt: now };
  merged.complete = Boolean(merged.onThisDay && (merged.mostReadHr?.length || merged.mostReadEn?.length) && merged.picture);
  await store.setJSON(key, merged);
  return merged;
}

/**
 * Izgradi novo izdanje.
 * @param {{store?:any, now?:number, force?:boolean, trigger?:string, budgetMs?:number}} opts
 */
export async function runBuild({ store = openStore(), now = Date.now(), force = false, trigger = 'schedule', budgetMs = 24000 } = {}) {
  const T0 = Date.now();
  const z = zagreb(now);
  const lock = await store.getJSON('lock');
  if (!force && lock && lock.until > Date.now()) return { skipped: 'locked', latest: await store.getJSON('latest') };
  await store.setJSON('lock', { until: Date.now() + 45_000, by: trigger });
  try {
    const [cache0, prevLatest] = await Promise.all([store.getJSON('feed-cache'), store.getJSON('latest')]);
    const cache = cache0?.v === VERSION ? cache0 : { v: VERSION, feeds: {} };
    const lastFetched = Object.fromEntries(Object.entries(cache.feeds).map(([k, v]) => [k, v.fetchedAt || 0]));
    const due = feedsDue(lastFetched, now, { force });
    const fetchDeadline = Math.max(4500, budgetMs - 9000);
    const perFeed = Math.min(7000, fetchDeadline - 300);
    let fetchedScience = false;

    const feedPhase = mapLimit(due, 40, async (f) => {
      const prev = cache.feeds[f.id];
      const r = await fetchText(f.url, { timeout: perFeed, etag: prev?.etag, lastModified: prev?.lm });
      if (r.notModified && prev) {
        Object.assign(prev, { fetchedAt: now, ok: true, status: 304, ms: r.ms, err: undefined });
      } else if (r.ok && r.text) {
        const parsed = parseFeed(r.text, { url: f.url });
        const items = normalizeItems(f, parsed.items, now).slice(0, 90).map(packItem);
        if (!parsed.items.length && prev?.items?.length) {
          Object.assign(prev, { lastTry: now, ok: false, status: r.status, err: 'prazan feed', ms: r.ms });
        } else {
          cache.feeds[f.id] = { fetchedAt: now, etag: r.etag, lm: r.lastModified, ok: true, status: r.status, ms: r.ms, n: items.length, items };
        }
      } else {
        cache.feeds[f.id] = { ...(prev || { items: [] }), lastTry: now, ok: false, status: r.status, err: r.error || `HTTP ${r.status}`, ms: r.ms };
      }
      if (f.desk === 'science' || f.desk === 'longread') fetchedScience = true;
    });
    const marketsP = fetchMarkets(now).catch((e) => { console.warn('markets', e?.message); return null; });
    const extrasP = getExtrasCached(store, z.date, now, budgetMs >= 12000).catch(() => null);

    await Promise.race([feedPhase, sleep(fetchDeadline)]);
    const tFetch = Date.now() - T0;

    // — sastavljanje stavki iz predmemorije (uključuje feedove koji nisu bili na redu) —
    const known = new Set(FEEDS.map((f) => f.id));
    for (const id of Object.keys(cache.feeds)) if (!known.has(id)) delete cache.feeds[id];
    const all = [];
    for (const f of FEEDS) {
      const e = cache.feeds[f.id];
      if (!e?.items) continue;
      const maxAge = (MAX_AGE_H[f.desk] || 48) * HOUR;
      for (const it of e.items) if (now - it.t <= maxAge) all.push(unpackItem(it));
    }
    const items = dedupeItems(all);
    // arhiva članaka za praćene priče (paralelno s ostatkom izgradnje)
    const archP = updateArchive(store, items, now).catch((e) => { console.warn('arhiva', e?.message); return null; });
    const newsItems = items.filter((i) => !i.desks.every((d) => d === 'science' || d === 'longread' || d === 'analysis'));
    const sections = buildNewsSections(newsItems, now);
    const analysis = buildAnalysis(items, now);
    const relief = buildRelief(sections);

    // — znanost: bazen zadnjih 9 dana —
    let pool = await store.getJSON('science-pool');
    const sciItems = items.filter((i) => i.desks.includes('science') || i.desks.includes('longread')).map(packItem);
    if (fetchedScience || !pool) {
      pool = mergePool(pool, sciItems, now);
      await store.setJSON('science-pool', pool);
    }
    const science = buildScienceRecap((pool?.items || []).map(unpackItem), now);

    const [markets, extras] = await Promise.all([withTimeout(marketsP, Math.max(1500, budgetMs - (Date.now() - T0) - 4000)), withTimeout(extrasP, 2500)]);
    const marketsOut = markets && markets.health.ok > 4 ? markets : prevLatest?.markets?.groups ? { ...prevLatest.markets, stale: true } : markets;

    // — zdravlje izvora —
    const byOutlet = new Map();
    for (const f of FEEDS) {
      const e = cache.feeds[f.id];
      const o = byOutlet.get(f.outlet) || { id: f.outlet, name: OUTLETS[f.outlet]?.name || (f.outlet === 'google' ? 'Google News (Reuters, AP)' : f.outlet), ok: 0, fail: 0, items: 0, err: [] };
      if (e?.ok) o.ok++; else { o.fail++; if (e?.err) o.err.push(`${f.id}: ${e.err}`); }
      o.items += e?.items?.filter((it) => now - it.t <= (MAX_AGE_H[f.desk] || 48) * HOUR).length || 0;
      byOutlet.set(f.outlet, o);
    }
    const sources = [...byOutlet.values()].sort((a, b) => b.items - a.items);
    const feedsOk = FEEDS.filter((f) => cache.feeds[f.id]?.ok).length;

    const latest = {
      v: VERSION,
      builtAt: new Date(now).toISOString(),
      trigger,
      date: z.date,
      dateLong: hrLongDate(z.date),
      time: z.time,
      counts: {
        articles: newsItems.length + science.counts.articles + analysis.length,
        news: newsItems.length,
        outlets: new Set(items.map((i) => i.outlet)).size,
        feedsOk, feedsTotal: FEEDS.length,
      },
      relief,
      hr: sections.hr,
      world: sections.world,
      geo: { topics: sections.topics, countries: sections.countries, analysis, hrOnWorld: sections.hrOnWorld },
      markets: marketsOut ? { ...marketsOut, news: sections.markets, hrNews: sections.hrBiz } : { groups: [], news: sections.markets, hrNews: sections.hrBiz },
      science,
      extras: extras ? { onThisDay: extras.onThisDay, onThisDayEn: extras.onThisDayEn, mostReadHr: extras.mostReadHr, mostReadEn: extras.mostReadEn, mostReadDate: extras.mostReadDate, picture: extras.picture, dyk: extras.dyk } : null,
      digest: null,
      sources,
      timing: { fetchMs: tFetch, totalMs: 0, due: due.length },
    };

    // — jutarnje izdanje (prvo izdanje nakon 6:00 po zagrebačkom vremenu) —
    const editionKey = `edition/${z.date}`;
    let isMorning = false;
    if (z.H >= 6) {
      const existing = await store.getJSON(editionKey);
      if (!existing) isMorning = true;
    }
    // — opcionalni sažetak umjetnom inteligencijom (ako postoji ključ): jedan dnevno, uz jutarnje izdanje —
    // Ako jutarnji pokušaj ne uspije (npr. istek vremena), pokušava se u sljedećim izdanjima, najviše 3 puta dnevno.
    let digestAdded = false;
    const sameDay = prevLatest?.date === z.date;
    if (sameDay && prevLatest.digest) latest.digest = prevLatest.digest;
    else if (globalThis.process?.env?.ANTHROPIC_API_KEY && z.H >= 6) {
      const tries = sameDay && prevLatest.digestTries?.date === z.date ? prevLatest.digestTries.n : 0;
      const remaining = budgetMs - (Date.now() - T0) - 2500;
      if (tries < 3 && remaining > 6000) {
        latest.digest = await withTimeout(makeDigest(latest).catch(() => null), remaining);
        latest.digestTries = { date: z.date, n: tries + 1 };
        digestAdded = Boolean(latest.digest);
      } else latest.digestTries = { date: z.date, n: tries };
    }
    latest.timing.totalMs = Date.now() - T0;

    const writes = [store.setJSON('latest', latest), store.setJSON('feed-cache', cache)];
    if (isMorning) {
      writes.push(pruneSearchCache(store, now).catch(() => 0));
      writes.push(store.setJSON(editionKey, { ...latest, edition: 'jutarnje' }));
      const idx = (await store.getJSON('editions-index')) || [];
      const entry = { date: z.date, builtAt: latest.builtAt, lead: (sections.world[0] || sections.hr[0])?.title || '', hrLead: sections.hr[0]?.title || '', articles: latest.counts.articles };
      writes.push(store.setJSON('editions-index', [entry, ...idx.filter((e) => e.date !== z.date)].slice(0, 120)));
    } else if (digestAdded) {
      // sažetak je nastao u kasnijem izdanju: dodaj ga i spremljenom jutarnjem izdanju
      const ed = await store.getJSON(editionKey);
      if (ed && !ed.digest) writes.push(store.setJSON(editionKey, { ...ed, digest: latest.digest }));
    }
    // — tjedni pregled znanosti: nedjeljom navečer zamrzni tjedan —
    if (z.wd === 7 && z.H >= 18 && science.feature) {
      const wk = isoWeek(z.date);
      writes.push(store.setJSON(`science-week/${wk.id}`, { ...science, savedAt: latest.builtAt }));
      const widx = (await store.getJSON('science-weeks-index')) || [];
      const entry = { id: wk.id, from: wk.from, to: wk.to, feature: science.feature.title };
      writes.push(store.setJSON('science-weeks-index', [entry, ...widx.filter((e) => e.id !== wk.id)].slice(0, 60)));
    }
    const [arch] = await Promise.all([archP, ...writes]);
    return { latest, isMorning, arch, ms: Date.now() - T0 };
  } finally {
    await store.setJSON('lock', { until: 0 }).catch(() => {});
  }
}

/** Vrati najnovije izdanje; po potrebi ga izgradi (prvi posjet nakon postavljanja ili zastarjeli podaci). */
export async function getLatest({ store = openStore(), refresh = false, now = Date.now() } = {}) {
  const latest = await store.getJSON('latest');
  const age = latest ? now - Date.parse(latest.builtAt) : Infinity;
  const stale = !latest || latest.v !== VERSION || age > 3 * HOUR;
  if (stale || (refresh && age > 10 * 60_000)) {
    const r = await runBuild({ store, now, trigger: latest ? 'on-demand' : 'first-visit', budgetMs: 25000 });
    if (r.latest) return { data: r.latest, built: !r.skipped };
  }
  return { data: latest, built: false };
}
