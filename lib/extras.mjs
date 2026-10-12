// Dodaci iz Wikipedije: "Na današnji dan" (hr), najčitaniji članci (hr i en), slika dana (Commons).
import { fetchJSON, fetchText, botUA } from './fetcher.mjs';

const MONTHS_GEN = ['', 'siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];

const wikiUA = () => botUA('personal daily briefing');
const wget = (url) => fetchJSON(url, { ua: wikiUA(), timeout: 7000 });

/**
 * Wikitekst stranice dana s hrvatske Wikipedije.
 * Prvo index.php?action=raw (poslužuje se iz predmemorije rubnih poslužitelja), a tek onda API (action=parse),
 * koji anonimne zahtjeve s dijeljenih IP adresa (oblak) češće odbija s HTTP 429.
 */
async function dayWikitext(title) {
  let t = title;
  for (let hop = 0; hop < 2; hop++) {
    const r = await fetchText(`https://hr.wikipedia.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`, {
      ua: wikiUA(), timeout: 7000, headers: { accept: 'text/x-wiki, text/plain;q=0.9, */*;q=0.5' },
    });
    if (!r.ok || !r.text?.trim()) break;
    const redirect = r.text.match(/^\s*#(?:REDIRECT|PREUSMJERI|PREUSMJERENJE)\s*\[\[([^\]|#]+)/i);
    if (!redirect) return r.text;
    t = redirect[1].trim().replace(/ /g, '_');
  }
  const r = await wget(`https://hr.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2&redirects=1`);
  return r.data?.parse?.wikitext || null;
}

export function wikitextToPlain(s) {
  if (!s) return '';
  let t = s;
  t = t.replace(/<!--[\s\S]*?-->/g, '');
  t = t.replace(/<ref[^>]*\/>/gi, '').replace(/<ref[\s\S]*?<\/ref>/gi, '');
  for (let i = 0; i < 3; i++) t = t.replace(/\{\{[^{}]*\}\}/g, '');
  t = t.replace(/\[\[(?:Datoteka|File|Slika|Image|Kategorija|Category):[^\]]*\]\]/gi, '');
  t = t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');
  t = t.replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1').replace(/\[https?:\/\/[^\]]+\]/g, '');
  t = t.replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

export function parseDayPage(wikitext) {
  const out = { events: [], births: [], deaths: [] };
  if (!wikitext) return out;
  let cur = null;
  for (const raw of wikitext.split('\n')) {
    const line = raw.trim();
    const h = line.match(/^==+\s*(.*?)\s*==+$/);
    if (h) {
      const n = h[1].toLowerCase();
      cur = /doga[dđ]aj/.test(n) ? 'events' : /ro[dđ]enj/.test(n) ? 'births' : /smrt/.test(n) ? 'deaths' : null;
      continue;
    }
    if (!cur || !line.startsWith('*')) continue;
    const m = line.match(/^\*+\s*\[\[(\d{1,4})\.(\s*pr\.\s*Kr\.)?\]\]\s*[–—-]+\s*(.+)$/) || line.match(/^\*+\s*(\d{1,4})\.(\s*pr\.\s*Kr\.)?\s*[–—-]+\s*(.+)$/);
    if (!m) continue;
    const text = wikitextToPlain(m[3]).replace(/^[,;:\s]+/, '');
    if (text.length < 8) continue;
    out[cur].push({ y: m[2] ? -Number(m[1]) : Number(m[1]), t: text.charAt(0).toUpperCase() + text.slice(1) });
  }
  return out;
}

async function onThisDayHr(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  const titles = [`${d}._${MONTHS_GEN[m]}`];
  if (m === 11) titles.push(`${d}._studenog`);
  for (const title of titles) {
    const wt = await dayWikitext(title).catch(() => null);
    if (wt) {
      const p = parseDayPage(wt);
      if (!p.events.length && !p.births.length && !p.deaths.length) continue;
      const hrFirst = (a) => [...a].sort((x, y) => (/hrvat|zagreb|split|dubrovni|rijek|osijek|zadar/i.test(y.t) ? 1 : 0) - (/hrvat|zagreb|split|dubrovni|rijek|osijek|zadar/i.test(x.t) ? 1 : 0));
      return {
        src: `https://hr.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        events: p.events.slice(-12),
        births: hrFirst(p.births).slice(0, 4).sort((a, b) => a.y - b.y),
        deaths: hrFirst(p.deaths).slice(0, 4).sort((a, b) => a.y - b.y),
      };
    }
  }
  return null;
}

function cleanMostRead(arts, lang, n = 8) {
  return (arts || [])
    .filter((a) => a.type === 'standard' && !/^(Glavna_stranica|Main_Page|Posebno:|Special:|Wikipedija:|Wikipedia:|Datoteka:|File:)/.test(a.title))
    .slice(0, n)
    .map((a) => ({
      title: a.normalizedtitle || a.titles?.normalized || a.title.replace(/_/g, ' '),
      desc: a.description || '',
      extract: (a.extract || '').slice(0, 220),
      views: a.views,
      url: a.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(a.title)}`,
      img: a.thumbnail?.source || null,
      trend: (a.view_history || []).map((v) => v.views),
    }));
}

async function featured(lang, dateStr) {
  const [y, m, d] = dateStr.split('-');
  const r = await wget(`https://${lang}.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`);
  return r.data || null;
}

function potd(img) {
  if (!img?.thumbnail?.source) return null;
  const thumb = img.thumbnail.source.replace(/\/(\d{2,4})px-/, '/1280px-');
  return {
    title: (img.title || '').replace(/^File:/, '').replace(/\.\w{3,4}$/, '').replace(/_/g, ' '),
    img: thumb,
    w: img.thumbnail.width, h: img.thumbnail.height,
    desc: (img.description?.text || '').replace(/\s+/g, ' ').slice(0, 400),
    artist: (img.artist?.text || '').replace(/\s+/g, ' ').slice(0, 80),
    license: img.license?.type || '',
    url: img.file_page || '',
  };
}

/** "Did you know…" s engleske Wikipedije: pitanje "... that X?" pretvaramo u izjavu. */
function didYouKnow(list) {
  return (list || []).slice(0, 8).map((d, i) => {
    let t = (d.text || '').replace(/\s+/g, ' ').trim().replace(/^\.\.\.\s*(that\s+)?/i, '');
    if (!t) return null;
    t = t.charAt(0).toUpperCase() + t.slice(1);
    t = t.replace(/\?\s*$/, '.');
    const href = (d.html || '').match(/<b[^>]*>\s*<a[^>]+href="([^"]+)"/)?.[1] || (d.html || '').match(/href="([^"]+)"/)?.[1] || null;
    return { id: `dyk-${i}`, t, url: href && /^https:\/\/en\.wikipedia\.org\//.test(href) ? href : null };
  }).filter(Boolean);
}

/** Dohvati dnevne dodatke; rezultat se sprema po datumu pa se dohvaća najviše nekoliko puta dnevno. */
export async function fetchExtras(dateStr) {
  const [otd, hr, en] = await Promise.all([
    onThisDayHr(dateStr).catch(() => null),
    featured('hr', dateStr).catch(() => null),
    featured('en', dateStr).catch(() => null),
  ]);
  return {
    date: dateStr,
    onThisDay: otd,
    onThisDayEn: !otd && en?.onthisday ? en.onthisday.slice(0, 6).map((e) => ({ y: e.year, t: e.text })) : undefined,
    mostReadHr: cleanMostRead(hr?.mostread?.articles, 'hr'),
    mostReadEn: cleanMostRead(en?.mostread?.articles, 'en'),
    mostReadDate: hr?.mostread?.date || en?.mostread?.date || null,
    picture: potd(en?.image),
    dyk: didYouKnow(en?.dyk),
    complete: Boolean(otd && (hr?.mostread || en?.mostread) && en?.image),
  };
}
