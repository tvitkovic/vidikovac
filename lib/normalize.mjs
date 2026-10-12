// Pretvaranje parsiranih stavki feeda u jedinstveni oblik + filtriranje.
import { OUTLETS, GN_PUBLISHERS, GN_EXTRA, isSkippedUrl } from './sources.mjs';
import { canonicalUrl, hashStr } from './text.mjs';

const H = 3_600_000;
export const MAX_AGE_H = { hr: 36, 'hr-dom': 36, 'hr-world': 36, 'hr-top': 30, 'hr-biz': 72, world: 36, top: 30, mostread: 30, politics: 36, markets: 48, analysis: 24 * 7, science: 24 * 9, longread: 24 * 14 };

export function outletInfo(id) {
  if (OUTLETS[id]) return { id, name: OUTLETS[id].name, w: OUTLETS[id].w };
  if (GN_EXTRA[id]) return { id, name: GN_EXTRA[id].name, w: GN_EXTRA[id].w };
  return { id, name: id, w: 0.6 };
}

export function mapPublisher(name) {
  if (!name) return null;
  const n = name.trim();
  for (const [re, id] of GN_PUBLISHERS) if (re.test(n)) return id;
  for (const [id, x] of Object.entries(GN_EXTRA)) if (x.re.test(n)) return id;
  return null;
}

function stripPublisherSuffix(title, pub) {
  if (!pub) return title.replace(/\s+[-–|]\s+[^-–|]{2,40}$/, '');
  const i = title.lastIndexOf(' - ' + pub);
  if (i > 10) return title.slice(0, i);
  return title.replace(/\s+[-–]\s+[^-–]{2,40}$/, '');
}

/**
 * @param {object} feed  zapis iz FEEDS
 * @param {Array} parsed items iz parseFeed
 * @param {number} now
 */
export function normalizeItems(feed, parsed, now) {
  const out = [];
  const maxAge = (MAX_AGE_H[feed.desk] || 48) * H;
  parsed.forEach((it, rank) => {
    let outlet = feed.outlet;
    let title = it.title;
    let summary = it.summary;
    let related = [];
    if (outlet === 'google') {
      outlet = mapPublisher(it.source?.name);
      if (!outlet) return; // nepoznat izdavač — preskoči
      title = stripPublisherSuffix(title, it.source?.name);
      // Reutersove stranice s kotacijama ("NCO.O - | Stock Price & Latest News") nisu vijesti
      if (/stock price|latest news|^[A-Z0-9.]{1,10}\s*-\s*\|/i.test(title) || title.length < 20) return;
      summary = '';
      related = (it.related || []).map((r) => mapPublisher(r.source)).filter(Boolean);
    }
    let url = it.link;
    if (!url || isSkippedUrl(url, feed)) return;
    if (feed.desk !== 'science' && feed.desk !== 'longread' && it.categories?.some((c) => /\/(sport|football|lifeandstyle|fashion|music|film|tv-and-radio|games|food|travel)\//.test(c.domain || ''))) return;
    if (title.length < 12) return;
    // Nature: zadrži vijesti i komentare (d41586), preskoči izvorne znanstvene radove (s41586) i dnevne sažetke
    if (feed.outlet === 'nature' && (/\/articles\/s4\d{4}/.test(url) || /^daily briefing/i.test(title))) return;
    let t = it.published || 0;
    if (!t) t = now - 2 * H; // bez datuma: tretiraj kao nedavno, ali ne najsvježije
    if (t > now + 10 * 60_000) t = now;
    if (now - t > maxAge) return;
    const curl = canonicalUrl(url);
    const o = outletInfo(outlet);
    out.push({
      id: hashStr(curl),
      url: url.replace(/^http:\/\//, 'https://'),
      curl,
      title: title.replace(/\s+/g, ' ').trim(),
      summary: summary && summary !== title ? summary : '',
      img: it.image || null,
      t,
      outlet: o.id,
      oname: o.name,
      ow: o.w,
      feed: feed.id,
      desk: feed.desk,
      desks: [feed.desk],
      lang: feed.lang,
      rank,
      cats: (it.categories || []).slice(0, 4).map((c) => c.name.replace(/[<>]/g, '').trim()).filter(Boolean),
      related,
    });
  });
  return out;
}

/** Spoji duplikate (isti URL iz više feedova iste redakcije). */
export function dedupeItems(items) {
  const byUrl = new Map();
  for (const it of items) {
    const prev = byUrl.get(it.curl);
    if (!prev) { byUrl.set(it.curl, { ...it, desks: [...it.desks] }); continue; }
    for (const d of it.desks) if (!prev.desks.includes(d)) prev.desks.push(d);
    if (it.rank < prev.rank) prev.rank = it.rank;
    if (!prev.img && it.img) prev.img = it.img;
    if ((it.summary || '').length > (prev.summary || '').length) prev.summary = it.summary;
    if (it.related?.length) prev.related = [...new Set([...(prev.related || []), ...it.related])];
  }
  return [...byUrl.values()];
}

/** Sažet zapis za predmemoriju feedova. */
export function packItem(it) {
  const { curl, ...rest } = it;
  return rest;
}
export function unpackItem(it) {
  return { ...it, curl: canonicalUrl(it.url) };
}
