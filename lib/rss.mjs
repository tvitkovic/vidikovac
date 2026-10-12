// Robustan parser za RSS 2.0, RSS 1.0 (RDF) i Atom feedove — bez ovisnosti.
import { decodeEntities, stripHtml, unCdata, firstImage, cleanSummary, cleanTitle } from './text.mjs';

const esc = (n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Unutarnji tekst prvog taga s jednim od zadanih imena. */
function inner(block, names) {
  for (const n of names) {
    const re = new RegExp(`<${esc(n)}(?:\\s[^>]*)?>([\\s\\S]*?)</${esc(n)}\\s*>`, 'i');
    const m = block.match(re);
    if (m && m[1].trim()) return m[1];
  }
  return '';
}

function allInner(block, name) {
  const re = new RegExp(`<${esc(name)}(\\s[^>]*)?>([\\s\\S]*?)</${esc(name)}\\s*>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(block))) out.push({ attrs: parseAttrs(m[1] || ''), text: m[2] });
  return out;
}

function parseAttrs(s) {
  const a = {};
  const re = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(s))) a[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? '');
  return a;
}

/** Atributi svih pojavljivanja taga (samozatvarajućih ili ne). */
function tagAttrs(block, name) {
  const re = new RegExp(`<${esc(name)}(\\s[^>]*?)\\/?>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(block))) out.push(parseAttrs(m[1] || ''));
  return out;
}

function parseDate(s) {
  if (!s) return null;
  s = decodeEntities(unCdata(s)).trim();
  let t = Date.parse(s);
  if (Number.isFinite(t)) return t;
  // "11.10.2026. 07:15" ili slično
  const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?\s*(\d{1,2}):(\d{2})?/);
  if (m) {
    t = Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0) - 2, +(m[5] || 0));
    return Number.isFinite(t) ? t : null;
  }
  // Ukloni naziv dana / vremensku zonu koje Date.parse ne razumije
  const m2 = s.replace(/^[A-Za-zčćšžđ]{2,4},\s*/, '').replace(/\s+(CET|CEST|EET|EEST)$/i, (z) => (/S/i.test(z) ? ' +0200' : ' +0100'));
  t = Date.parse(m2);
  return Number.isFinite(t) ? t : null;
}

function absolutize(u, base) {
  if (!u) return null;
  u = u.trim();
  if (u.startsWith('//')) return 'https:' + u;
  if (/^https?:\/\//i.test(u)) return u;
  try { return new URL(u, base).toString(); } catch { return null; }
}

function pickImage(block, htmlBits, base) {
  const cands = [];
  for (const a of tagAttrs(block, 'media:content')) {
    if (!a.url) continue;
    if (a.medium && a.medium !== 'image') continue;
    if (a.type && !/^image\//i.test(a.type)) continue;
    cands.push({ url: a.url, w: +a.width || 0 });
  }
  for (const a of tagAttrs(block, 'media:thumbnail')) if (a.url) cands.push({ url: a.url, w: +a.width || 0 });
  for (const a of tagAttrs(block, 'enclosure')) if (a.url && (!a.type || /^image\//i.test(a.type))) cands.push({ url: a.url, w: 0 });
  for (const a of tagAttrs(block, 'itunes:image')) if (a.href) cands.push({ url: a.href, w: 0 });
  const imgTag = inner(block, ['image']);
  if (imgTag && /^\s*https?:\/\//.test(stripHtml(imgTag))) cands.push({ url: stripHtml(imgTag), w: 0 });
  if (!cands.length) {
    for (const h of htmlBits) { const u = firstImage(h); if (u) { cands.push({ url: u, w: 0 }); break; } }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.w - a.w);
  let url = absolutize(cands[0].url, base);
  if (!url || /\.(svg|gif)(\?|$)/i.test(url) || /pixel|spacer|1x1|blank\./i.test(url)) return null;
  // Povećaj poznate male sličice
  url = url
    .replace(/(ichef\.bbci\.co\.uk\/(?:ace|news)\/standard\/)\d+\//, '$1800/')
    .replace(/(ichef\.bbci\.co\.uk\/news\/)\d+\//, '$1800/')
    .replace(/-150x150(\.\w{3,4})(\?|$)/, '$1$2');
  return url;
}

function itemLink(block, base) {
  // RSS <link>tekst</link>
  const txt = inner(block, ['link']);
  if (txt) {
    const u = decodeEntities(unCdata(txt)).trim();
    if (/^https?:\/\/\S+$/i.test(u)) return u;
  }
  // Atom <link href rel="alternate">
  const links = tagAttrs(block, 'link').filter((a) => a.href);
  const alt = links.find((a) => !a.rel || a.rel === 'alternate') || links[0];
  if (alt) return absolutize(alt.href, base);
  const guid = inner(block, ['guid', 'id']);
  if (guid && /^https?:\/\//.test(stripHtml(guid))) return stripHtml(guid);
  return null;
}

/** Google News: <ol><li><a href>Naslov</a>&nbsp;<font>Izvor</font></li>... */
function parseRelated(descHtml) {
  if (!descHtml) return [];
  let s = unCdata(descHtml);
  if (/&lt;(ol|li|a)\b/i.test(s)) s = decodeEntities(s);
  const out = [];
  const re = /<li>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>(?:&nbsp;|\s)*<font[^>]*>([\s\S]*?)<\/font>/gi;
  let m;
  while ((m = re.exec(s))) out.push({ url: decodeEntities(m[1]), title: stripHtml(m[2]), source: stripHtml(m[3]) });
  return out;
}

export function parseFeed(xml, { url: feedUrl } = {}) {
  if (!xml || typeof xml !== 'string') return { title: '', items: [] };
  const body = xml.replace(/<!--[\s\S]*?-->/g, '');
  const base = feedUrl || 'https://example.com/';
  const channelTitle = cleanTitle(inner(body.replace(/<(item|entry)\b[\s\S]*$/i, ''), ['title']));
  const items = [];
  const re = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gi;
  let m;
  while ((m = re.exec(body))) {
    const block = m[2];
    const title = cleanTitle(inner(block, ['title', 'dc:title']));
    const link = itemLink(block, base);
    if (!title || !link) continue;
    const descRaw = inner(block, ['description', 'summary']);
    const contentRaw = inner(block, ['content:encoded', 'content']);
    let summaryText = stripHtml(descRaw);
    if (!summaryText || summaryText.length < 40) {
      const c = stripHtml(contentRaw);
      if (c && c.length > summaryText.length) summaryText = c;
    }
    const categories = allInner(block, 'category').map((c) => ({ name: stripHtml(c.text), domain: c.attrs.domain || '' }))
      .concat(tagAttrs(block, 'category').filter((a) => a.term).map((a) => ({ name: a.term, domain: a.scheme || '' })))
      .filter((c) => c.name);
    const sourceTag = allInner(block, 'source')[0];
    const published = parseDate(inner(block, ['pubDate', 'published', 'dc:date', 'updated', 'a10:updated', 'issued']));
    items.push({
      title,
      link,
      guid: stripHtml(inner(block, ['guid', 'id'])) || link,
      published,
      summary: cleanSummary(summaryText, 320),
      image: pickImage(block, [contentRaw, descRaw], base),
      categories,
      author: stripHtml(inner(block, ['dc:creator', 'author', 'name'])).slice(0, 80),
      source: sourceTag ? { name: stripHtml(sourceTag.text), url: sourceTag.attrs.url || '' } : null,
      related: parseRelated(descRaw),
    });
  }
  return { title: channelTitle, items };
}
