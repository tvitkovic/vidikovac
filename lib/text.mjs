// Tekstualni alati: dekodiranje entiteta, čišćenje HTML-a, tokenizacija i "stemming"
// za hrvatski i engleski. Bez vanjskih ovisnosti.

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„', hellip: '…',
  laquo: '«', raquo: '»', middot: '·', bull: '•', deg: '°', euro: '€', pound: '£', yen: '¥',
  copy: '©', reg: '®', trade: '™', times: '×', divide: '÷', minus: '−', plusmn: '±',
  shy: '', zwj: '', zwnj: '', lrm: '', rlm: '', thinsp: ' ', ensp: ' ', emsp: ' ',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', aacute: 'á', agrave: 'à', acirc: 'â',
  auml: 'ä', atilde: 'ã', aring: 'å', aelig: 'æ', ccedil: 'ç', iacute: 'í', igrave: 'ì',
  icirc: 'î', iuml: 'ï', ntilde: 'ñ', oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö',
  otilde: 'õ', oslash: 'ø', uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü', yacute: 'ý',
  szlig: 'ß', Eacute: 'É', Aacute: 'Á', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Ouml: 'Ö',
  Uuml: 'Ü', Auml: 'Ä', scaron: 'š', Scaron: 'Š', zcaron: 'ž', Zcaron: 'Ž', ccaron: 'č',
  Ccaron: 'Č', cacute: 'ć', Cacute: 'Ć', dstrok: 'đ', Dstrok: 'Đ', oelig: 'œ', OElig: 'Œ',
  prime: '′', Prime: '″', larr: '←', rarr: '→', uarr: '↑', darr: '↓',
};

export function decodeEntities(s) {
  if (!s || s.indexOf('&') === -1) return s || '';
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]{1,8});/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff) return '';
      if (n === 160) return ' ';
      try { return String.fromCodePoint(n); } catch { return ''; }
    }
    const v = NAMED[code] ?? NAMED[code.toLowerCase()];
    return v === undefined ? m : v;
  });
}

/** Ukloni CDATA omotače (i one koji su dvostruko escapirani). */
export function unCdata(s) {
  return (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<!\[CDATA\[|\]\]>/g, '');
}

/** Pretvori HTML u čisti tekst. */
export function stripHtml(html) {
  if (!html) return '';
  let s = unCdata(html);
  // Neki feedovi (npr. Dnevnik.hr) escapiraju HTML dvaput.
  if (/&lt;\s*(p|img|a|br|div|span|ol|li|!\[CDATA)/i.test(s)) s = unCdata(decodeEntities(s));
  s = s
    .replace(/<(script|style|figure|figcaption|iframe|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  return s.replace(/[​-‏﻿]/g, '').replace(/\s+/g, ' ').trim();
}

/** Prvi <img src> iz HTML fragmenta. */
export function firstImage(html) {
  if (!html) return null;
  let s = unCdata(html);
  if (/&lt;img/i.test(s)) s = decodeEntities(s);
  const m = s.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  return m ? decodeEntities(m[1]) : null;
}

const BOILERPLATE = [
  /The post .{0,300}? (first )?appeared (first )?on .{0,120}$/i,
  /\s*Continue reading\.{0,3}\s*$/i,
  /\s*Read more\.{0,3}\s*$/i,
  /\s*\[…\]\s*$/,
  /\s*\[\.\.\.\]\s*$/,
  /^Nature, Published online: [^;]+; doi:\S+\s*/i,
  /^\s*(Video|Foto|VIDEO|FOTO)\s*[.:]\s*/,
  /\s*Follow DW\.?\s*$/i,
];

export function cleanSummary(text, max = 300) {
  let s = text || '';
  if (/&(#\d+|#x[0-9a-f]+|[a-z]{2,8});/i.test(s)) s = decodeEntities(s);
  for (const re of BOILERPLATE) s = s.replace(re, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (lastStop >= max * 0.5) return cut.slice(0, lastStop + 1);
  const sp = cut.lastIndexOf(' ');
  return cut.slice(0, sp > 40 ? sp : max).replace(/[,;:\-–—\s]+$/, '') + '…';
}

export function cleanTitle(t) {
  let s = stripHtml(t);
  // neki feedovi (npr. Discover) entitete kodiraju dvaput: &amp;#39; → &#39; → '
  if (/&(#\d+|#x[0-9a-f]+|[a-z]{2,8});/i.test(s)) s = decodeEntities(s);
  return s.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Tokenizacija

const STOP_EN = new Set(`a an the and or but if then than so of to in on at by for from with without into onto over
under about above below after before during while as is are was were be been being am do does did doing done have has
had having not no nor this that these those it its it's he she they them his her their our we you your i me my mine
who whom whose which what when where why how all any both each few more most other some such only own same too very
can could should would will shall may might must just also up down out off again further once here there s t
says said say saying tells told new news report reports reported latest live update updates watch video videos photo photos
amid against among via per vs v get gets got make makes made take takes took one two three first last week weeks year years
day days today yesterday tomorrow now still back like many much way ways time times people man woman men women
says' here's what's how's it’s here’s what’s analysis opinion explainer review podcast newsletter`.split(/\s+/));

const STOP_HR = new Set(`i u na je se da za od do s sa o a ali ili te kao što sto koji koja koje kojeg kojem kojim kojima koju
su će ce bi biti bio bila bilo bili bile ne ni nije nisu to taj ta ovaj ova ovo ove ovih tog tom tome toga ga mu joj im ih
ju njegov njezin njihov sam si smo ste iz po pri prema kod nakon prije zbog više vise manje još jos već vec samo sve svi sva
svih kako kad kada gdje tko zašto zasto jer ako li pa no nego dok oko između izmedu protiv bez kroz preko nad pod pred uz iza
među medu danas jučer jucer sutra godine godina godinu ima imaju nema evo ovako ovdje tamo pogledajte video foto uživo uzivo
novi nova novo nove novih rekao rekla kaže kaze kazao tvrdi objavio objavila priopćio otkriveno sve što zato kojoj može moze
mogu treba trebaju toliko tako onda ipak čak cak oni one ona on mi vi nas vas njih njima nam vam bio će hoće neće nece
jedan jedna jedno dva dvije tri prvi prva prvo godišnji minuta sati sat dan dana tjedan tjedna mjesec mjeseca`.split(/\s+/));

const DIAC = { č: 'c', ć: 'c', đ: 'd', š: 's', ž: 'z', á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ö: 'o', ä: 'a', ñ: 'n', ç: 'c', ø: 'o', å: 'a', ł: 'l', ś: 's', ź: 'z', ż: 'z', ń: 'n', ę: 'e', ą: 'a', ğ: 'g', ş: 's', ı: 'i' };
export function fold(s) {
  return (s || '').toLowerCase().replace(/[čćđšžáéíóúüöäñçøåłśźżńęąğşı]/g, (c) => DIAC[c] || c);
}

const HR_SUFFIXES = ['ovima', 'evima', 'ijama', 'ama', 'ima', 'om', 'em', 'og', 'eg', 'oj', 'ih', 'im', 'ov', 'ev', 'in', 'a', 'e', 'i', 'o', 'u'];

function stemHr(w) {
  if (w.length <= 4) return w;
  for (const suf of HR_SUFFIXES) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) { w = w.slice(0, -suf.length); break; }
  }
  return w.slice(0, 5);
}

function stemEn(w) {
  if (w.length <= 4) return w;
  w = w.replace(/'s$|’s$/, '');
  if (w.endsWith('ies') && w.length > 5) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('es') && w.length > 5) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 4) w = w.slice(0, -1);
  return w.slice(0, 5);
}

/**
 * Tokeniziraj tekst u "korijene". Kratice velikim slovima (US, U.S., SAD, EU, UK) se normaliziraju.
 */
export function tokenize(text, lang = 'en') {
  if (!text) return [];
  let s = ' ' + text + ' ';
  s = s
    .replace(/\bU\.S\.A?\.?/g, ' usa ')
    .replace(/(^|[^\p{L}])(US|USA)(?=[^\p{L}])/gu, '$1 usa ')
    .replace(/(^|[^\p{L}])SAD(-a|-u|-om)?(?=[^\p{L}])/gu, '$1 usa ')
    .replace(/(^|[^\p{L}])U\.K\.(?=[^\p{L}])/gu, '$1 uk ')
    .replace(/(^|[^\p{L}])UN(?=[^\p{L}])/gu, '$1 unitednations ')
    .replace(/(^|[^\p{L}])(UN-a|UN-u)(?=[^\p{L}])/gu, '$1 unitednations ');
  const stop = lang === 'hr' ? STOP_HR : STOP_EN;
  const out = [];
  for (const raw of s.toLowerCase().split(/[^\p{L}\p{N}']+/u)) {
    let w = raw.replace(/^'+|'+$/g, '');
    if (!w) continue;
    if (stop.has(w)) continue;
    if (/^\d+$/.test(w)) { if (w.length >= 2 && w.length <= 4) out.push(w); continue; }
    if (w.length < 2) continue;
    w = fold(w);
    if (stop.has(w)) continue;
    out.push(lang === 'hr' ? stemHr(w) : stemEn(w));
  }
  return out;
}

/** Grubo prepoznavanje jezika: hr ili en. */
export function detectLang(text) {
  const t = ' ' + fold(text || '') + ' ';
  let hr = 0, en = 0;
  for (const w of [' je ', ' su ', ' na ', ' za ', ' od ', ' se ', ' da ', ' iz ', ' koji ', ' nakon ', ' kod ']) if (t.includes(w)) hr++;
  for (const w of [' the ', ' of ', ' and ', ' to ', ' in ', ' is ', ' for ', ' with ', ' after ', ' says ']) if (t.includes(w)) en++;
  if (/[čćđšž]/i.test(text || '')) hr += 2;
  return hr > en ? 'hr' : 'en';
}

export function hashStr(s) {
  // FNV-1a 32-bit → base36
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

export function canonicalUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    const drop = [];
    url.searchParams.forEach((_, k) => { if (/^(utm_|at_|mod$|maca$|traffic_source$|ref$|cmpid$|fbclid$|gclid$|ocid$|rss$|src$|smid$|partner$)/i.test(k)) drop.push(k); });
    drop.forEach((k) => url.searchParams.delete(k));
    let s = url.toString();
    if (s.endsWith('/') && url.pathname !== '/') s = s.slice(0, -1);
    return s.replace(/^http:\/\//, 'https://');
  } catch { return u; }
}
