// Jedinični testovi: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeEntities, stripHtml, tokenize, canonicalUrl, cleanSummary, cleanTitle } from '../lib/text.mjs';
import { parseFeed } from '../lib/rss.mjs';
import { zagreb, isoWeek, hrLongDate, addDays } from '../lib/time.mjs';
import { parseYahooChart, isValidSymbol } from '../lib/markets.mjs';
import { clusterItems } from '../lib/cluster.mjs';
import { matchCountries, matchTopics, hrScopeScore } from '../lib/geo.mjs';
import { parseDayPage, wikitextToPlain } from '../lib/extras.mjs';
import { classifyField } from '../lib/science.mjs';
import { isSkippedUrl, FEEDS, OUTLETS } from '../lib/sources.mjs';
import { normalizeItems } from '../lib/normalize.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (f) => fs.readFileSync(path.join(here, 'fixtures', f), 'utf8');

// ——— tekst ———
test('dekodiranje entiteta i čišćenje HTML-a', () => {
  assert.equal(decodeEntities('Tom &amp; Jerry &#8211; &quot;x&quot; &#x161;'), 'Tom & Jerry – "x" š');
  assert.equal(stripHtml('<p>Prvi</p><p>drugi &nbsp;red</p>'), 'Prvi drugi red');
  // Dnevnik.hr: dvaput escapiran CDATA
  const dbl = '&lt;![CDATA[&lt;img src=&quot;https://x.hr/a.jpg&quot;/&gt;Tekst vijesti.]]&gt;';
  assert.equal(stripHtml(dbl), 'Tekst vijesti.');
});

test('sažetak se reže na granici rečenice ili riječi', () => {
  const s = 'Prva rečenica je ovdje. Druga rečenica je duža i ide dalje od granice koju smo zadali za ovaj test.';
  assert.equal(cleanSummary(s, 40), 'Prva rečenica je ovdje.');
  assert.ok(cleanSummary('The post X appeared first on Quanta Magazine') === '');
});

test('tokenizacija: hrvatski padeži i kratice', () => {
  const a = tokenize('Trump: Vrijeme je da Ukrajina dobije novog predsjednika', 'hr');
  const b = tokenize('Trumpov napad na Ukrajinu i Zelenskog', 'hr');
  assert.ok(a.includes('ukraj') && b.includes('ukraj'), 'Ukrajina/Ukrajinu → isti korijen');
  assert.ok(a.includes('trump') && b.includes('trump'));
  assert.ok(tokenize('Masovna pucnjava u SAD-u', 'hr').includes('usa'));
  assert.ok(!tokenize('Sad gnjavi Vrhovni sud', 'hr').includes('usa'), '"Sad" (sada) nije SAD');
  assert.ok(tokenize('US justice department probes TV networks', 'en').includes('usa'));
});

test('kanonski URL uklanja parametre praćenja', () => {
  assert.equal(canonicalUrl('http://www.bbc.co.uk/news/articles/abc?at_medium=RSS&at_campaign=rss'), 'https://www.bbc.co.uk/news/articles/abc');
  assert.equal(canonicalUrl('https://www.wsj.com/x?mod=rss_markets_main'), 'https://www.wsj.com/x');
});

// ——— RSS ———
test('parser čita sve formate (RSS 2.0, RDF, Atom) iz stvarnih feedova', () => {
  const dir = path.join(here, 'fixtures');
  for (const f of fs.readdirSync(dir).filter((x) => /\.(xml|atom)$/.test(x))) {
    const r = parseFeed(fx(f), { url: 'https://example.com/' });
    assert.ok(r.items.length > 0, `${f}: nema stavki`);
    for (const it of r.items.slice(0, 5)) {
      assert.ok(it.title.length > 3, `${f}: naslov`);
      assert.match(it.link, /^https?:\/\//, `${f}: poveznica`);
      assert.ok(Number.isFinite(it.published), `${f}: datum`);
      assert.ok(!/<|&lt;|CDATA/.test(it.summary), `${f}: HTML u sažetku`);
    }
  }
});

test('posebni slučajevi: CDATA poveznica (ESA), Google News pokrivenost, BBC slike', () => {
  const esa = parseFeed(fx('esa-cdata.xml'));
  assert.equal(esa.items[0].link, 'https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter/switchbacks');
  assert.match(esa.items[0].image, /solar_orbiter_card_full\.png$/);
  const gn = parseFeed(fx('gn-world.xml'));
  assert.ok(gn.items.some((i) => i.related.length >= 3), 'Google News: povezani članci');
  assert.ok(gn.items.every((i) => i.source?.name));
  const bbc = parseFeed(fx('bbc-world.xml'));
  assert.ok(bbc.items.some((i) => /\/standard\/800\//.test(i.image || '')), 'BBC sličica povećana na 800 px');
  const dn = parseFeed(fx('dnevnik.xml'));
  assert.ok(dn.items[0].image?.startsWith('https://image.dnevnik.hr/'));
});

test('normalizacija preskače sport, zabavu i kotacije', () => {
  assert.ok(isSkippedUrl('https://www.jutarnji.hr/sportske/nogomet/abc-123'));
  assert.ok(isSkippedUrl('https://net.hr/hot/paparazzi/abc'));
  assert.ok(isSkippedUrl('https://www.nytimes.com/2026/10/09/sports/x.html'));
  assert.ok(!isSkippedUrl('https://www.nytimes.com/2026/10/09/world/asia/x.html'));
  assert.ok(!isSkippedUrl('https://www.index.hr/vijesti/clanak/x/123.aspx'));
  const feed = FEEDS.find((f) => f.id === 'jutarnji');
  const now = Date.parse('2026-10-11T06:00:00Z');
  const items = normalizeItems(feed, parseFeed(fx('jutarnji.xml')).items, now);
  assert.ok(items.length >= 8);
  assert.ok(items.every((i) => !/\/sportske\//.test(i.url)));
});

test('registar izvora: svaki feed ima poznatu redakciju i jedinstven id', () => {
  const ids = new Set();
  for (const f of FEEDS) {
    assert.ok(!ids.has(f.id), `dupli id ${f.id}`); ids.add(f.id);
    assert.ok(f.outlet === 'google' || OUTLETS[f.outlet], `nepoznata redakcija ${f.outlet}`);
    assert.match(f.url, /^https?:\/\//);
  }
});

// ——— vrijeme ———
test('zagrebačko vrijeme: ljetno i zimsko računanje', () => {
  assert.deepEqual([zagreb(new Date('2026-07-01T04:00:00Z')).H, zagreb(new Date('2026-07-01T04:00:00Z')).date], [6, '2026-07-01']);
  assert.equal(zagreb(new Date('2026-12-01T05:00:00Z')).H, 6);
  assert.equal(zagreb(new Date('2026-10-11T23:30:00Z')).date, '2026-10-12');
  assert.equal(zagreb(new Date('2026-10-11T08:00:00Z')).wd, 7);
});
test('ISO tjedan i hrvatski datum', () => {
  assert.deepEqual(isoWeek('2026-10-11'), { id: '2026-W41', week: 41, from: '2026-10-05', to: '2026-10-11' });
  assert.equal(isoWeek('2027-01-01').id, '2026-W53');
  assert.equal(hrLongDate('2026-10-11'), 'nedjelja, 11. listopada 2026.');
  assert.equal(addDays('2026-10-01', -1), '2026-09-30');
});

// ——— tržišta ———
test('Yahoo: promjena se računa prema prethodnom zatvaranju', () => {
  const now = Date.parse('2026-10-11T06:00:00Z');
  const q = parseYahooChart(JSON.parse(fx('yahoo-gspc.json')), now);
  assert.equal(q.price, 7811.54);
  assert.ok(Math.abs(q.prev - 7765.36) < 0.001);
  assert.ok(Math.abs(q.pct - 0.5947) < 0.001);
  assert.equal(q.state, 'closed');
  assert.ok(q.spark.length >= 20);
  const btc = parseYahooChart(JSON.parse(fx('yahoo-btc.json')), now);
  assert.equal(btc.state, '24h');
  // sintetički: današnja svijeća još ne postoji → prethodno zatvaranje je zadnja svijeća
  const synth = { chart: { result: [{ meta: { regularMarketPrice: 105, regularMarketTime: 1791700000, gmtoffset: 0, instrumentType: 'EQUITY' }, timestamp: [1791500000, 1791586400], indicators: { quote: [{ close: [98, 100] }] } }] } };
  const s = parseYahooChart(synth, 1791700000 * 1000);
  assert.equal(s.prev, 100);
  assert.equal(s.spark.at(-1), 105);
  assert.ok(isValidSymbol('VWCE.DE') && isValidSymbol('^GSPC') && !isValidSymbol('<script>'));
});

// ——— grupiranje ———
function mk(o, title, outlet, w = 1.2, rank = 0, lang = 'en') {
  return { id: title, url: `https://${outlet}.example/${encodeURIComponent(title)}`, curl: `https://${outlet}.example/${encodeURIComponent(title)}`, title, summary: '', img: null, t: o, outlet, oname: outlet, ow: w, feed: outlet, desk: 'world', desks: ['world'], lang, rank, cats: [], related: [] };
}
test('grupiranje spaja istu priču iz više redakcija', () => {
  const now = Date.parse('2026-10-11T06:00:00Z');
  const items = [
    mk(now - 3e6, 'Twelve killed in Houthi attack on Riyadh airport', 'bbc'),
    mk(now - 4e6, 'Houthi strike on Saudi airport kills 12, worst attack in a decade', 'reuters'),
    mk(now - 5e6, 'At least 12 killed at Riyadh airport in Houthi strikes', 'wsj'),
    mk(now - 2e6, 'Hurricane Simon strengthens to Category 4 off Mexico', 'aljazeera'),
    mk(now - 2e6, 'Hurricane Simon hits Category 4 strength off Mexico coast', 'reuters'),
    mk(now - 1e6, 'Spain heads to snap election in November', 'guardian'),
  ];
  const cl = clusterItems(items, { now, lang: 'en' });
  assert.equal(cl.length, 3);
  assert.equal(cl[0].outlets, 3);
  assert.match(cl[0].rep.title, /Riyadh|Saudi/);
  assert.ok(cl[0].score > cl[1].score && cl[1].score > cl[2].score);
});
test('grupiranje hrvatskih naslova s različitim padežima', () => {
  const now = Date.parse('2026-10-11T06:00:00Z');
  const items = [
    mk(now - 3e6, 'Trump: Vrijeme je da Ukrajina dobije novog predsjednika', 'index', 1.1, 0, 'hr'),
    mk(now - 4e6, 'Trump poručio da Ukrajina treba novog predsjednika', 'n1', 1.15, 0, 'hr'),
    mk(now - 5e6, 'Trump iznenadio izjavom: Vrijeme je da Ukrajina dobije novog predsjednika', 'tportal', 1.0, 0, 'hr'),
    mk(now - 2e6, 'Nesreća kod Sinja: pet osoba ozlijeđeno', 'hrt', 1.2, 0, 'hr'),
  ];
  const cl = clusterItems(items, { now, lang: 'hr' });
  assert.equal(cl.length, 2);
  assert.equal(cl[0].outlets, 3);
});

// ——— geografija ———
test('prepoznavanje država i tema', () => {
  assert.ok(matchCountries('Twelve killed in attack on airport in Saudi capital Riyadh', 'en').includes('SA'));
  assert.ok(matchCountries('Masakr na aerodromu u Rijadu: 12 mrtvih', 'hr').includes('SA'));
  assert.ok(matchCountries('Masovna pucnjava u SAD-u', 'hr').includes('US'));
  assert.ok(!matchCountries('Sad gnjavi Vrhovni sud', 'hr').includes('US'));
  assert.ok(!matchCountries('A woman was injured', 'en').includes('OM'), '"woman" nije Oman');
  assert.ok(matchTopics('Trump says Ukraine needs a new leader', 'en').includes('ukr'));
  assert.ok(matchTopics('Kremlj: Putin ima razumijevanja', 'hr').includes('ukr'));
});
test('hrvatske vijesti: domaće ili svjetske', () => {
  assert.equal(hrScopeScore('Plenković se oglasio o smrti Bareta').isWorld, false);
  assert.equal(hrScopeScore('Vrgorac ostao bez vode, u pomoć stigla vojska').isWorld, false);
  assert.equal(hrScopeScore('Masakr na aerodromu u Rijadu: 12 mrtvih').isWorld, true);
  assert.equal(hrScopeScore('Trump: Vrijeme je da Ukrajina dobije novog predsjednika').isWorld, true);
});

// ——— Wikipedija ———
test('"Na današnji dan": čitanje stranice dana s hrvatske Wikipedije', () => {
  const wt = JSON.parse(fx('wiki-hr-day.json')).parse.wikitext;
  const p = parseDayPage(wt);
  assert.equal(p.events[0].y, 1871);
  assert.equal(p.events[0].t, 'U Rakovici kod Plaškog ubijen Eugen Kvaternik');
  assert.ok(p.events.some((e) => e.y === -480));
  assert.ok(!p.events.some((e) => /ref|citiranje|\{\{/.test(e.t)));
  assert.equal(p.births.length, 4);
  assert.equal(p.deaths[0].y, 1896);
  assert.equal(wikitextToPlain("[[Ivan XXIII.|Ivana XXIII.]] i '''bold''' {{x|y}}"), 'Ivana XXIII. i bold');
});
test('"Na današnji dan": stvarna stranica dana (index.php?action=raw)', () => {
  const p = parseDayPage(fx('wiki-hr-day-raw.txt'));
  assert.equal(p.events.length, 5);
  assert.ok(p.events.some((e) => e.y === 1946 && /Stepinac/.test(e.t)));
  assert.ok(p.births.some((b) => b.y === 1895 && /^Jakov Gotovac, hrvatski/.test(b.t)));
  assert.ok(p.deaths.some((d) => d.y === 1891 && /Rimbaud/.test(d.t)));
  assert.ok([...p.events, ...p.births, ...p.deaths].every((x) => !/\[\[|\]\]|\{\{/.test(x.t)));
});

// ——— znanost ———
test('razvrstavanje znanstvenih priča po područjima', () => {
  assert.equal(classifyField('NASA releases trove of Moon data from historic Artemis II flight'), 'space');
  assert.equal(classifyField('Nuclear clocks tick for the first time'), 'physics');
  assert.equal(classifyField('Gene therapy can partly restore sight in blind people'), 'health');
  assert.equal(classifyField('Neanderthal wooden tools from Spain found preserved in stone'), 'past');
  assert.equal(classifyField('Four dead after Hurricane Isaias lashes US'), 'earth');
  assert.equal(classifyField('Experimental observation of critical topology'), 'misc');
});

// ——— Tjedan u znanosti ———
import { labelFor, pickWeek, splitNobel } from '../lib/sciweek.mjs';
const it = (title, outlet = 'nyt', extra = {}) => ({ title, outlet, oname: outlet, url: `https://x.org/${encodeURIComponent(title)}`, t: Date.parse('2026-10-09T10:00:00Z'), ow: 1, summary: '', ...extra });
const cl = (items, extra = {}) => ({ items, rep: items[0], outlets: new Set(items.map((i) => i.outlet)).size, extraOutlets: [], newest: items[0].t, oldest: items[0].t, summary: items[0].summary, img: null, score: 1, sscore: 1, coverage: 1, field: 'misc', ...extra });
test('Tjedan u znanosti: kratke hrvatske oznake', () => {
  assert.equal(labelFor(cl([it('Nuclear clocks tick for the first time')])).hr, 'Nuklearni sat');
  assert.equal(labelFor(cl([it('Jonathan the giant tortoise, 194, offers insight into longevity')])).hr, 'Kornjače');
  assert.equal(labelFor(cl([it('Blue light kills drug-resistant bacteria tied to raw chicken')])).hr, 'Piletina');
  assert.equal(labelFor(cl([it('Chernobyl particles look remarkably similar to explosion day in 1986')])).hr, 'Černobil');
  assert.equal(labelFor(cl([it('Black coffee linked to 14% lower risk of death')])).hr, 'Kava');
  assert.equal(labelFor(cl([it('James Webb telescope pinpoints the most distant fast radio burst ever seen')])).hr, 'Brzi radijski bljesak');
  assert.equal(labelFor(cl([it('Nobel Prize in Chemistry Is Awarded to Henri Kagan and Kenso Soai'), it('Nobel physics prize for neutrinos', 'bbc')])).hr, 'Nobel za kemiju');
  // bez pojma u rječniku: osebujna riječ iz naslova
  assert.match(labelFor(cl([it('Zorblax mystery solved by researchers')])).hr, /^Zorblax/);
});
test('Tjedan u znanosti: Nobelove nagrade se razdvajaju, teme se ne ponavljaju', () => {
  const c = cl([it('Nobel Prize in Physics Is Awarded to Francis Halzen'), it('Nobel Prize in Chemistry Is Awarded to Kagan', 'guardian'), it('Nobel prize in physics: neutrinos', 'bbc'), it('Nobel in Physiology or Medicine awarded', 'ap')]);
  const parts = splitNobel(c);
  assert.equal(parts.length, 3);
  assert.deepEqual(parts.map((p) => labelFor(p).hr).sort(), ['Nobel za fiziku', 'Nobel za kemiju', 'Nobel za medicinu']);
  const toS = (x) => ({ id: x.rep.url, title: x.rep.title, url: x.rep.url, src: x.rep.oname, n: x.outlets, also: [] });
  const picks = pickWeek([c, cl([it('Nuclear clocks tick for the first time')]), cl([it('Thorium nuclear clock is a first', 'ars')], { sscore: 0.5 }), cl([it('Weekly podcast: nuclear clocks')])], toS, { n: 10, curiousSlots: 2 });
  assert.deepEqual(picks.map((p) => p.label).filter((l) => l === 'Nuklearni sat').length, 1, 'ista tema samo jednom');
  assert.equal(picks.find((p) => p.label === 'Nuklearni sat').also.length, 1);
  assert.ok(!picks.some((p) => /podcast/i.test(p.title)));
});
test('znanstveni izvori: preskače kupovinu, dvostruko kodirani entiteti', () => {
  assert.equal(isSkippedUrl('https://www.popsci.com/gear/best-headphones/', { desk: 'science' }), true);
  assert.equal(isSkippedUrl('https://www.popsci.com/science/baby-tyrannosaur/', { desk: 'science' }), false);
  assert.equal(cleanTitle('Mars&amp;#39; Odd Cloud &amp;mdash; a Model'), "Mars' Odd Cloud — a Model");
});

// ——— Praćene priče ———
import { compileText, compileStory, matchArticle, toEvents, wordRe } from '../lib/track.mjs';
import { packArch } from '../lib/newsarchive.mjs';
const art = (title, extra = {}) => packArch({ title, url: `https://x.org/${encodeURIComponent(title)}`, outlet: 'reuters', oname: 'Reuters', ow: 1.35, lang: /[čćšžđ]|\b(u|je|na)\b/i.test(title) ? 'hr' : 'en', t: Date.parse('2026-10-10T10:00:00Z'), summary: '', ...extra });
test('praćenje: tema iz upisanog teksta', () => {
  const y = compileText('rat u Jemenu');
  assert.deepEqual(y.groups, [{ kind: 'all', refs: ['c:YE'] }, { kind: 'any', refs: ['k:war'] }]);
  const b = compileText('američke obveznice');
  assert.deepEqual(b.groups.map((g) => g.refs[0]), ['c:US', 'k:bonds']);
  assert.deepEqual(compileText('kamatne stope ECB').groups.map((g) => g.refs[0]).sort(), ['c:EU', 'k:rates']);
  assert.deepEqual(compileText('Rimac robotaksiji').groups.map((g) => g.kind), ['all', 'all']);
  assert.equal(compileText('u i na'), null);
});
test('praćenje: podudaranje na engleskom i hrvatskom', () => {
  const y = compileText('rat u Jemenu').groups;
  assert.ok(matchArticle(y, art('Houthis report deadly Saudi strikes on Taiz market')));
  assert.ok(matchArticle(y, art('Hutisti raketama napali Rijad, Jemen prijeti novim napadima')));
  assert.ok(!matchArticle(y, art('Yemen coffee exports rise')), 'Jemen bez sukoba');
  assert.ok(!matchArticle(y, art('Stocks fall as war fears grow', { summary: 'Investors also watched Yemen.' })), 'Jemen samo u sažetku: nije priča o Jemenu');
  const b = compileText('američke obveznice').groups;
  assert.ok(matchArticle(b, art('Treasury yields steady as traders wrap up volatile week')), 'Treasury = SAD');
  assert.ok(!matchArticle(b, art('German Bund yields climb')));
  assert.ok(wordRe('Rimac').test(' je li rimcev debakl'));
});
test('praćenje: tema iz vijesti i događaji kroz dane', () => {
  const n = compileStory({ title: 'Buildings swept away as flash floods hit central Nepal', lang: 'en', t: Date.parse('2026-10-11T08:00:00Z') });
  assert.deepEqual(n.groups, [{ kind: 'all', refs: ['c:NP'] }, { kind: 'any', refs: ['k:flood'] }]);
  assert.ok(matchArticle(n.groups, art('Nepal: poplave odnijele kuće, desetci nestalih')));
  const ev = toEvents([
    art('Flash floods hit central Nepal, dozens missing', { t: Date.parse('2026-10-09T08:00:00Z') }),
    art('Dozens missing after flash floods hit central Nepal', { t: Date.parse('2026-10-09T09:00:00Z'), outlet: 'bbc', oname: 'BBC', ow: 1.25, url: 'https://bbc.co.uk/x' }),
    art('Nepal begins rebuilding bridges after floods', { t: Date.parse('2026-10-11T09:00:00Z') }),
  ]);
  assert.equal(ev.length, 2);
  assert.equal(ev[1].n, 2, 'dvije redakcije o istom događaju');
  assert.match(ev[0].title, /rebuilding/, 'najnoviji prvi');
});
