// Sastavljanje rubrika iz grupiranih priča.
import { clusterItems, toStory } from './cluster.mjs';
import { hrScopeScore, matchCountries, matchTopics, marketsScore, COUNTRIES, TOPICS } from './geo.mjs';

const EN_NEWS_DESKS = new Set(['world', 'top', 'mostread', 'politics', 'markets']);

function clusterText(c, n = 6) {
  const its = [c.rep, ...c.items.filter((i) => i !== c.rep)].slice(0, n);
  return its.map((i) => i.title).join(' . ') + ' . ' + (c.summary || '');
}

function hrClassify(c) {
  const sc = hrScopeScore(clusterText(c), c.rep.url);
  let dom = sc.dom, wor = sc.foreign;
  let biz = 0;
  for (const it of c.items) {
    if (it.desks.includes('hr-dom')) dom += 1.5;
    if (it.desks.includes('hr-world')) wor += 1.5;
    if (/\/(svijet|world|globalno)\//i.test(it.url)) wor += 1;
    if (/\/(hrvatska|zagreb|regija-hrvatska)\//i.test(it.url)) dom += 1;
    if (it.desks.includes('hr-biz') || /\/(biznis|gospodarstvo|novac|financije|poslovanje)\//i.test(it.url)) biz++;
  }
  return { isWorld: wor > dom + 0.4, isBiz: biz / c.items.length >= 0.5, dom, wor };
}

function enClassify(c) {
  let mk = 0;
  for (const it of c.items) if (it.desks.includes('markets')) mk++;
  const share = mk / c.items.length;
  const kw = marketsScore(c.rep.title + ' ' + (c.summary || ''));
  return { isMarkets: share >= 0.6 || (share >= 0.34 && kw >= 2), share, kw };
}

/** Ukloni gotovo identične naslove (npr. isti tekst u dvije grupe). */
function diversify(list, limit) {
  const out = [];
  for (const c of list) {
    if (out.length >= limit) break;
    out.push(c);
  }
  return out;
}

export function buildNewsSections(items, now) {
  const hrItems = items.filter((i) => i.lang === 'hr');
  const enItems = items.filter((i) => i.lang === 'en' && i.desks.some((d) => EN_NEWS_DESKS.has(d)));
  const hrClusters = clusterItems(hrItems, { threshold: 0.3, now, lang: 'hr' }).sort((a, b) => b.score - a.score);
  const enClusters = clusterItems(enItems, { threshold: 0.3, now, lang: 'en' }).sort((a, b) => b.score - a.score);

  // — Hrvatska —
  const hrDomestic = [], hrBiz = [], hrWorld = [];
  for (const c of hrClusters) {
    const k = hrClassify(c);
    c.k = k;
    if (k.isWorld) hrWorld.push(c);
    else if (k.isBiz) { hrBiz.push(c); if (c.outlets >= 4) hrDomestic.push(c); }
    else hrDomestic.push(c);
  }
  // — Svijet i tržišta —
  const world = [], marketsNews = [];
  for (const c of enClusters) {
    const k = enClassify(c);
    c.k = k;
    if (k.isMarkets) marketsNews.push(c); else world.push(c);
  }

  // — Teme i žarišta (svjetske grupe + hrvatske grupe o svijetu) —
  const topicAgg = new Map(TOPICS.map((t) => [t.id, { id: t.id, name: t.name, score: 0, clusters: [], outlets: new Set(), articles: 0 }]));
  const countryAgg = new Map();
  // teme i države: pogodak u naslovu/sažetku predstavnika ili u barem dva naslova grupe
  const tagCluster = (c, lang) => {
    const repText = `${c.rep.title} . ${c.summary || ''}`;
    const tCount = new Map(), cCount = new Map();
    for (const it of c.items.slice(0, 10)) {
      for (const t of matchTopics(it.title, lang)) tCount.set(t, (tCount.get(t) || 0) + 1);
      for (const x of matchCountries(it.title, lang)) cCount.set(x, (cCount.get(x) || 0) + 1);
    }
    const topics = [...new Set([...matchTopics(repText, lang), ...[...tCount].filter(([, n]) => n >= 2).map(([t]) => t)])];
    const countries = [...new Set([...matchCountries(repText, lang), ...[...cCount].filter(([, n]) => n >= 2).map(([x]) => x)])]
      .filter((x) => x !== 'HR' || lang === 'en');
    c.topics = topics;
    c.countries = countries;
    return { topics, countries };
  };
  for (const c of enClusters) {
    const { topics, countries } = tagCluster(c, 'en');
    for (const t of topics) {
      const a = topicAgg.get(t);
      a.score += c.score; a.clusters.push(c); a.articles += c.items.length;
      for (const it of c.items) a.outlets.add(it.outlet);
    }
    for (const iso of countries) {
      if (!countryAgg.has(iso)) countryAgg.set(iso, { iso, score: 0, clusters: [] });
      const a = countryAgg.get(iso); a.score += c.score; a.clusters.push(c);
    }
  }
  // hrvatske grupe dobivaju države i teme prije nego ih obogaćivanje usporedi sa svjetskima
  for (const c of hrClusters) tagCluster(c, 'hr');

  const story = (c, extra) => toStory(c, { topics: c.topics, countries: c.countries, ...extra });

  // više priča od prikazanih: rezerva za "Moje teme" (skrivene priče zamjenjuju sljedeće po redu) i "Još priča"
  const hrShown = diversify(hrDomestic, 24);
  const worldShown = diversify(world, 24);
  const marketsShown = diversify(marketsNews, 14);
  const hrBizShown = diversify(hrBiz, 6);
  const hrTop = hrShown.map((c) => story(c, { scope: 'hr' }));
  const worldTop = worldShown.map((c) => story(c, { scope: 'world' }));
  const marketsTop = marketsShown.map((c) => story(c, { scope: 'markets' }));
  const hrBizTop = hrBizShown.map((c) => story(c, { scope: 'hr-biz' }));

  const topics = [...topicAgg.values()]
    .filter((t) => t.clusters.length)
    .sort((a, b) => b.score - a.score)
    .map((t) => ({
      id: t.id, name: t.name, score: Math.round(t.score * 10) / 10,
      stories: t.clusters.length, articles: t.articles, outlets: t.outlets.size,
      top: t.clusters.slice(0, 4).map((c) => story(c)),
    }));

  const cinfo = new Map(COUNTRIES.map((c) => [c.iso, c]));
  const countries = [...countryAgg.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map((a) => {
      const ci = cinfo.get(a.iso);
      return {
        iso: a.iso, name: ci.name, lat: ci.lat, lon: ci.lon,
        score: Math.round(a.score * 10) / 10, stories: a.clusters.length,
        top: a.clusters.slice(0, 3).map((c) => ({ title: c.rep.title, url: c.rep.url, src: c.rep.oname })),
      };
    });

  // Hrvatski pogled na svijet: koje svjetske teme hrvatski mediji najviše prate
  const hrOnWorld = diversify(hrWorld, 6).map((c) => ({ title: c.rep.title, url: c.rep.url, src: c.rep.oname, n: c.outlets }));

  return {
    hr: hrTop, world: worldTop, markets: marketsTop, hrBiz: hrBizTop,
    topics, countries, hrOnWorld,
    stats: {
      hrItems: hrItems.length, enItems: enItems.length,
      hrClusters: hrClusters.length, enClusters: enClusters.length,
    },
    _maxScores: { hr: hrDomestic[0]?.score || 1, world: world[0]?.score || 1 },
    // Grupe iza prikazanih priča. Koristi ih lib/enrich.mjs za trajni id, ritam i perspektivu.
    // Ne idu klijentu: build.mjs iz ovog objekta uzima samo imenovane rubrike.
    _clusters: {
      hr: hrShown, world: worldShown, markets: marketsShown, hrBiz: hrBizShown,
      hrAll: hrClusters, worldAll: world,
    },
  };
}

/** Analize i dugi tekstovi (Foreign Affairs, Economist, War on the Rocks...). */
export function buildAnalysis(items, now) {
  const H = 3_600_000;
  const list = items
    .filter((i) => i.desks.includes('analysis'))
    .map((i) => ({ i, s: i.ow * Math.exp(-((now - i.t) / H) / 60) + (i.summary ? 0.1 : 0) }))
    .sort((a, b) => b.s - a.s);
  const perOutlet = new Map();
  const out = [];
  for (const { i } of list) {
    const n = perOutlet.get(i.outlet) || 0;
    if (n >= 2) continue;
    perOutlet.set(i.outlet, n + 1);
    out.push({ title: i.title, url: i.url, src: i.oname, t: new Date(i.t).toISOString(), summary: i.summary, img: i.img, topics: matchTopics(i.title + ' ' + i.summary, 'en') });
    if (out.length >= 9) break;
  }
  return out;
}

/** Vrhovi za reljef u zaglavlju: najjače teme svijeta + dvije najjače domaće priče. */
export function buildRelief(sections) {
  const peaks = [];
  for (const t of sections.topics.slice(0, 5)) peaks.push({ label: t.name, w: t.score, n: t.outlets, kind: 'topic', ref: `tema-${t.id}` });
  const hrMax = sections._maxScores.hr;
  const topicMax = sections.topics[0]?.score || 1;
  for (const s of sections.hr.slice(0, 2)) {
    peaks.push({ label: shortLabel(s.title), w: (s.score / hrMax) * topicMax * 0.62, n: s.n, kind: 'hr', ref: `p-${s.id}` });
  }
  const max = Math.max(...peaks.map((p) => p.w), 1);
  return peaks.map((p) => ({ ...p, h: Math.round((p.w / max) * 100) / 100, w: undefined }));
}

function shortLabel(t) {
  const s = t.replace(/^(VIDEO|FOTO|UŽIVO|UZIVO)\s*[/:]?\s*/i, '').replace(/[„“"']/g, '');
  const cut = s.split(/[:.!?–—]/)[0].trim();
  const base = cut.length >= 14 ? cut : s;
  if (base.length <= 34) return base;
  const words = base.split(' ');
  let out = '';
  for (const w of words) { if ((out + ' ' + w).trim().length > 32) break; out = (out + ' ' + w).trim(); }
  return out + '…';
}
