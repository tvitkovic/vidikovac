// Tržišni podaci: Yahoo Finance (chart v8), Zagrebačka burza (CROBEX), ECB/Frankfurter i CoinGecko kao rezerva.
import { fetchJSON, mapLimit, UA_BROWSER } from './fetcher.mjs';
import { zagreb, addDays } from './time.mjs';

export const MARKET_GROUPS = [
  { id: 'idx', name: 'Dionički indeksi', items: [
    ['^GSPC', 'S&P 500', { region: 'SAD' }], ['^IXIC', 'Nasdaq', { region: 'SAD' }], ['^DJI', 'Dow Jones', { region: 'SAD' }],
    ['^STOXX50E', 'Euro Stoxx 50', { region: 'Europa' }], ['^GDAXI', 'DAX', { region: 'Njemačka' }], ['^FTSE', 'FTSE 100', { region: 'UK' }],
    ['^N225', 'Nikkei 225', { region: 'Japan' }], ['CROBEX', 'CROBEX', { region: 'Zagreb' }],
  ] },
  { id: 'cmd', name: 'Sirovine', items: [
    ['BZ=F', 'Nafta Brent', { unit: '$/bbl' }], ['CL=F', 'Nafta WTI', { unit: '$/bbl' }], ['TTF=F', 'Plin TTF', { unit: '€/MWh' }],
    ['GC=F', 'Zlato', { unit: '$/oz' }], ['SI=F', 'Srebro', { unit: '$/oz' }], ['HG=F', 'Bakar', { unit: '$/lb' }],
  ] },
  { id: 'fx', name: 'Valute', items: [
    ['EURUSD=X', 'EUR/USD', {}], ['EURGBP=X', 'EUR/GBP', {}], ['EURCHF=X', 'EUR/CHF', {}], ['EURJPY=X', 'EUR/JPY', {}],
  ] },
  { id: 'crypto', name: 'Kripto', items: [['BTC-USD', 'Bitcoin', { unit: '$' }], ['ETH-USD', 'Ethereum', { unit: '$' }]] },
  { id: 'rates', name: 'Prinosi i volatilnost', items: [['^TNX', 'US 10 god. prinos', { unit: '%' }], ['^VIX', 'VIX', { unit: 'bod.' }]] },
];

const SYM_RE = /^[A-Za-z0-9.^=\-]{1,20}$/;
export const isValidSymbol = (s) => SYM_RE.test(s);

export function parseYahooChart(j, now = Date.now()) {
  const r = j?.chart?.result?.[0];
  if (!r?.meta) return null;
  const m = r.meta;
  const ts = r.timestamp || [];
  const cl = r.indicators?.quote?.[0]?.close || [];
  const pts = ts.map((t, i) => [t, cl[i]]).filter((p) => p[1] != null && Number.isFinite(p[1]));
  const price = Number.isFinite(m.regularMarketPrice) ? m.regularMarketPrice : pts.at(-1)?.[1];
  if (!Number.isFinite(price)) return null;
  const off = m.gmtoffset || 0;
  const day = (t) => Math.floor((t + off) / 86400);
  const tMarket = m.regularMarketTime || pts.at(-1)?.[0] || Math.floor(now / 1000);
  const curDay = day(tMarket);
  let prev = null;
  for (let i = pts.length - 1; i >= 0; i--) if (day(pts[i][0]) < curDay) { prev = pts[i][1]; break; }
  if (prev == null && Number.isFinite(m.previousClose)) prev = m.previousClose;
  if (prev == null && Number.isFinite(m.chartPreviousClose)) prev = m.chartPreviousClose;
  const spark = pts.map((p) => p[1]);
  if (pts.length && day(pts.at(-1)[0]) === curDay) spark[spark.length - 1] = price; else spark.push(price);
  const chg = prev != null ? price - prev : null;
  const isCrypto = m.instrumentType === 'CRYPTOCURRENCY';
  const ageMin = (now / 1000 - tMarket) / 60;
  return {
    price, prev, chg, pct: prev ? (chg / prev) * 100 : null,
    cur: m.currency || null,
    time: tMarket * 1000,
    state: isCrypto ? '24h' : ageMin < 40 ? 'open' : 'closed',
    spark: spark.slice(-30).map((x) => +x.toPrecision(7)),
    name: m.shortName || m.longName || m.symbol,
    type: m.instrumentType,
  };
}

export async function yahooQuote(sym, { range = '1mo', now = Date.now() } = {}) {
  for (const host of ['query1', 'query2']) {
    const u = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d&includePrePost=false`;
    const r = await fetchJSON(u, { ua: UA_BROWSER, timeout: 6000 });
    const q = r.data ? parseYahooChart(r.data, now) : null;
    if (q) return q;
    if (r.status === 404) return null;
  }
  return null;
}

async function crobex(now) {
  const to = zagreb(now).date;
  const from = addDays(to, -50);
  const r = await fetchJSON(`https://rest.zse.hr/web/Bvt9fe2peQ7pwpyYqODM/index-history/XZAG/HRZB00ICBEX6/${from}/${to}/json`, { ua: UA_BROWSER, timeout: 6000 });
  let hist = r.data?.history;
  if (Array.isArray(hist) && hist.length >= 2) {
    hist = [...hist].sort((a, b) => (a.date < b.date ? 1 : -1));
    const price = +hist[0].last_value, prev = +hist[1].last_value;
    const pct = Number.isFinite(+hist[0].change_prev_close_percentage) ? +hist[0].change_prev_close_percentage : ((price - prev) / prev) * 100;
    return {
      price, prev, chg: price - prev, pct, cur: 'EUR', time: Date.parse(hist[0].date + 'T16:00:00+02:00'),
      state: 'closed', spark: hist.slice(0, 30).reverse().map((h) => +h.last_value), name: 'CROBEX', type: 'INDEX',
    };
  }
  // rezerva: podaci sa stranice ZSE
  const r2 = await fetchJSON('https://zse.hr/hr/indeks/365?isin=HRZB00ICBEX6&range=1m', { ua: UA_BROWSER, timeout: 6000, headers: { 'x-requested-with': 'XMLHttpRequest' } });
  const mv = r2.data?.moves;
  if (mv?.value?.length >= 2) {
    const vals = mv.value.map(Number);
    const price = vals.at(-1), prev = vals.at(-2);
    return { price, prev, chg: price - prev, pct: ((price - prev) / prev) * 100, cur: 'EUR', time: Date.parse(mv.date.at(-1)), state: 'closed', spark: vals.slice(-30), name: 'CROBEX', type: 'INDEX' };
  }
  return null;
}

async function fxFallback(now) {
  const to = zagreb(now).date;
  const r = await fetchJSON(`https://api.frankfurter.dev/v1/${addDays(to, -40)}..${to}?base=EUR&symbols=USD,GBP,CHF,JPY`, { timeout: 6000 });
  const rates = r.data?.rates;
  if (!rates) return {};
  const days = Object.keys(rates).sort();
  const out = {};
  for (const [sym, code] of [['EURUSD=X', 'USD'], ['EURGBP=X', 'GBP'], ['EURCHF=X', 'CHF'], ['EURJPY=X', 'JPY']]) {
    const series = days.map((d) => rates[d][code]).filter(Number.isFinite);
    if (series.length < 2) continue;
    const price = series.at(-1), prev = series.at(-2);
    out[sym] = { price, prev, chg: price - prev, pct: ((price - prev) / prev) * 100, cur: code, time: Date.parse(days.at(-1) + 'T16:00:00+02:00'), state: 'closed', spark: series.slice(-30), name: `EUR/${code}`, type: 'CURRENCY', src: 'ECB' };
  }
  return out;
}

async function cryptoFallback() {
  const r = await fetchJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', { timeout: 6000 });
  const d = r.data;
  if (!d) return {};
  const mk = (x, name) => (x ? { price: x.usd, pct: x.usd_24h_change, chg: x.usd - x.usd / (1 + x.usd_24h_change / 100), prev: null, cur: 'USD', time: Date.now(), state: '24h', spark: [], name, type: 'CRYPTOCURRENCY', src: 'CoinGecko' } : null);
  return { 'BTC-USD': mk(d.bitcoin, 'Bitcoin'), 'ETH-USD': mk(d.ethereum, 'Ethereum') };
}

async function fearGreed() {
  const r = await fetchJSON('https://api.alternative.me/fng/?limit=2', { timeout: 5000 });
  const x = r.data?.data?.[0];
  if (!x) return null;
  const map = { 'Extreme Fear': 'krajnji strah', Fear: 'strah', Neutral: 'neutralno', Greed: 'pohlepa', 'Extreme Greed': 'krajnja pohlepa' };
  return { value: +x.value, label: map[x.value_classification] || x.value_classification, prev: r.data.data[1] ? +r.data.data[1].value : null };
}

export async function fetchMarkets(now = Date.now()) {
  const t0 = Date.now();
  const all = MARKET_GROUPS.flatMap((g) => g.items.map(([sym]) => sym)).filter((s) => s !== 'CROBEX');
  const quotes = {};
  const res = await mapLimit(all, 8, async (s) => [s, await yahooQuote(s, { now })]);
  for (const [s, q] of res) if (q) quotes[s] = q;
  const [cbx, fng] = await Promise.all([crobex(now).catch(() => null), fearGreed().catch(() => null)]);
  if (cbx) quotes.CROBEX = cbx;
  if (['EURUSD=X', 'EURGBP=X', 'EURCHF=X', 'EURJPY=X'].some((s) => !quotes[s])) {
    const fx = await fxFallback(now).catch(() => ({}));
    for (const [s, q] of Object.entries(fx)) if (!quotes[s]) quotes[s] = q;
  }
  if (!quotes['BTC-USD'] || !quotes['ETH-USD']) {
    const cr = await cryptoFallback().catch(() => ({}));
    for (const [s, q] of Object.entries(cr)) if (q && !quotes[s]) quotes[s] = q;
  }
  const groups = MARKET_GROUPS.map((g) => ({
    id: g.id, name: g.name,
    items: g.items.map(([sym, label, extra]) => {
      const q = quotes[sym];
      if (!q) return { sym, name: label, ...extra, missing: true };
      return { ...q, sym, name: label, ...extra };
    }),
  }));
  const ok = Object.keys(quotes).length;
  return { asOf: new Date(now).toISOString(), groups, fng, health: { ok, total: all.length + 1, ms: Date.now() - t0 } };
}

/** Za osobni popis (watchlist): do 15 simbola. */
export async function fetchQuotes(symbols, now = Date.now()) {
  const list = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(isValidSymbol))].slice(0, 15);
  const res = await mapLimit(list, 6, async (s) => [s, await yahooQuote(s, { now })]);
  return res.map(([sym, q]) => (q ? { sym, ...q } : { sym, missing: true }));
}
