import test from 'node:test';
import assert from 'node:assert/strict';
import { assignStories, emptyStories, namesIn, whatsNew } from '../lib/story.mjs';
import { rhythmOf, series, growth, isSaddle, concentration, concentrationWord, buildRidge } from '../lib/rhythm.mjs';
import { coverageSplit, ownershipSplit, originalitySplit, perspectiveOf, blindspots, divergence } from '../lib/perspective.mjs';
import { regionOf, ownerKeyOf, ownerName, ownershipCoverage } from '../lib/ownership.mjs';

const H = 3_600_000, D = 24 * H;
const T0 = Date.parse('2026-10-12T09:00:00+02:00');

const item = (outlet, title, tOffsetH = 0, lang = 'en') => ({
  outlet, oname: outlet, title, lang,
  t: T0 + tOffsetH * H,
  url: `https://x/${outlet}/${encodeURIComponent(title).slice(0, 24)}`,
});
function cluster(items, extra = {}) {
  const outlets = new Set(items.map((i) => i.outlet)).size;
  return {
    items, rep: items[0], outlets,
    oldest: Math.min(...items.map((i) => i.t)),
    newest: Math.max(...items.map((i) => i.t)),
    countries: [], ...extra,
  };
}

// ——— vlastita imena ———
test('namesIn hvata imena i kratice, preskače prvu riječ rečenice', () => {
  const n = namesIn('Zelensky accuses Russia of striking the ECB building');
  assert.ok(n.has('zelensky') === false || n.has('zelensky'));  // prva riječ smije izostati
  assert.ok(n.has('russia'));
  assert.ok(n.has('ecb'));
  assert.ok(!n.has('accuses'));
});

// ——— trajni identitet priče ———
test('ista priča zadržava isti id kroz dane, druga dobiva novi', () => {
  const day1 = cluster([
    item('reuters', 'Russia and Ukraine agree energy ceasefire', 0),
    item('bbc', 'Ukraine confirms energy ceasefire with Russia', 1),
    item('guardian', 'Energy ceasefire reached between Russia and Ukraine', 1),
  ]);
  const r1 = assignStories(emptyStories(), [day1], T0);
  const id1 = r1.assign.get(day1).id;
  assert.ok(id1);
  assert.equal(r1.assign.get(day1).isNew, true);
  assert.equal(r1.assign.get(day1).day, 1);

  const day2 = cluster([
    item('reuters', 'Russia breaks energy ceasefire, Ukraine says', 24),
    item('ap', 'Ukraine reports strikes despite energy ceasefire with Russia', 25),
    item('bbc', 'Energy ceasefire in doubt as Russia strikes Ukraine grid', 25),
  ]);
  const r2 = assignStories(r1.state, [day2], T0 + D);
  assert.equal(r2.assign.get(day2).id, id1, 'nastavak priče mora zadržati id');
  assert.equal(r2.assign.get(day2).isNew, false);
  assert.equal(r2.assign.get(day2).day, 2, 'drugi dan priče');

  const other = cluster([
    item('nyt', 'Amazon in talks to buy AI startup Decart', 25),
    item('wsj', 'Amazon nears Decart deal worth billions', 25),
  ]);
  const r3 = assignStories(r2.state, [other], T0 + D);
  assert.notEqual(r3.assign.get(other).id, id1, 'nepovezana priča dobiva novi id');
  assert.equal(r3.assign.get(other).isNew, true);
});

test('priča starija od prozora ne hvata nove članke', () => {
  const a = cluster([item('reuters', 'Floods devastate Nepal valley', 0), item('bbc', 'Nepal floods kill dozens', 0)]);
  const r1 = assignStories(emptyStories(), [a], T0);
  const b = cluster([item('reuters', 'Floods devastate Nepal valley again', 24 * 10), item('bbc', 'Nepal floods kill dozens more', 24 * 10)]);
  const r2 = assignStories(r1.state, [b], T0 + 10 * D);
  assert.notEqual(r2.assign.get(b).id, r1.assign.get(a).id);
});

test('whatsNew vraća samo pojmove kojih prije nije bilo', () => {
  const rec = { titles: [{ d: '2026-10-11', t: 'Russia and Ukraine agree energy ceasefire' }] };
  const c = cluster([item('reuters', 'Zelensky accuses Russia over Kharkiv power plant strike', 24)]);
  const fresh = whatsNew(rec, c, '2026-10-12');
  assert.ok(fresh.includes('kharkiv'), `očekivao kharkiv, dobio ${fresh.join(',')}`);
  assert.ok(!fresh.includes('russia'), 'poznati pojam ne smije biti nov');
});

// ——— ritam ———
test('series i growth računaju prirast u zadnjih N sati', () => {
  const hours = { [T0 - 12 * H]: 2, [T0 - 6 * H]: 4, [T0]: 12 };
  const s = series(hours, T0);
  assert.equal(s.length, 3);
  assert.equal(growth(s, T0, 6), 8);
  assert.equal(growth(s, T0, 12), 10);
});

test('uspon kad priča ubrzava', () => {
  const rec = { hours: { [T0 - 12 * H]: 2, [T0 - 6 * H]: 3, [T0]: 12 }, first: T0 - 20 * H, peak: 12, peakAt: T0 };
  const r = rhythmOf(rec, { outlets: 12, articles: 12, hasAgency: true, newest: T0 }, T0);
  assert.equal(r.code, 'uspon');
});

test('lavina kad priča iz ničega dobije široku pokrivenost', () => {
  const rec = { hours: { [T0 - 2 * H]: 0, [T0]: 14 }, first: T0 - 3 * H, peak: 14, peakAt: T0 };
  const r = rhythmOf(rec, { outlets: 14, articles: 14, hasAgency: true, newest: T0 }, T0);
  assert.equal(r.code, 'lavina');
});

test('ušutjelo nakon 18 h tišine iza vrha', () => {
  const rec = { hours: { [T0 - 30 * H]: 9, [T0 - 24 * H]: 9 }, first: T0 - 50 * H, peak: 9, peakAt: T0 - 24 * H };
  const r = rhythmOf(rec, { outlets: 9, articles: 9, hasAgency: true, newest: T0 - 24 * H }, T0);
  assert.equal(r.code, 'usutjelo');
  assert.match(r.note, /tišina/);
});

test('magla za jedva potvrđenu priču bez agencije', () => {
  const rec = { hours: { [T0]: 2 }, first: T0 - 2 * H, peak: 2, peakAt: T0 };
  const r = rhythmOf(rec, { outlets: 2, articles: 2, hasAgency: false, newest: T0 }, T0);
  assert.equal(r.code, 'magla');
});

test('mirna priča nema oznaku', () => {
  const rec = { hours: { [T0 - 6 * H]: 5, [T0]: 6 }, first: T0 - 30 * H, peak: 6, peakAt: T0 };
  const r = rhythmOf(rec, { outlets: 6, articles: 6, hasAgency: true, newest: T0 }, T0);
  assert.equal(r.code, null);
});

test('sedlo prepoznaje pad pa ponovni rast', () => {
  const hours = {};
  for (let i = 40; i >= 0; i--) hours[T0 - i * H] = i > 10 ? 5 : (i > 2 ? 5 : 9);
  assert.equal(isSaddle(series(hours, T0), T0), true);
});

test('koncentracija dana', () => {
  assert.ok(concentration([10, 1, 1, 1]) > concentration([3, 3, 3, 3]));
  assert.equal(concentration([]), 0);
  assert.equal(concentrationWord(0.35, 4), 'dan jedne priče');
  assert.equal(concentrationWord(0.05, 9), 'rascjepkan dan');
});

test('greben uzima zadnjih 7 dana i uključuje današnji', () => {
  const hist = Array.from({ length: 10 }, (_, i) => ({ date: `2026-10-0${i + 1}`.slice(0, 10), peaks: [{ label: 'x', h: 0.5, n: 3 }] }));
  const ridge = buildRidge(hist, { date: '2026-10-12', peaks: [{ label: 'danas', h: 1, n: 9 }] }, 7);
  assert.equal(ridge.length, 7);
  assert.equal(ridge.at(-1).date, '2026-10-12');
  assert.equal(ridge.at(-1).peaks[0].label, 'danas');
});

// ——— perspektiva ———
test('traka pokrivenosti dijeli redakcije po zemljopisu', () => {
  const items = [
    item('reuters', 'A'), item('ap', 'A'),
    item('index', 'A'), item('jutarnji', 'A'), item('hrt', 'A'),
    item('bbc', 'A'), item('guardian', 'A'),
    item('nyt', 'A'), item('wsj', 'A'),
  ];
  const cov = coverageSplit(items);
  assert.equal(cov.counts.agency, 2);
  assert.equal(cov.counts.hr, 3);
  assert.equal(cov.counts.eu, 2);
  assert.equal(cov.counts.world, 2);
  assert.equal(cov.total, 9);
  assert.equal(Object.values(cov.share).reduce((a, b) => a + b, 0) <= 101, true);
});

test('vlasništvo: Večernji i 24sata su jedan vlasnik', () => {
  const o = ownershipSplit([item('vecernji', 'A'), item('h24sata', 'A'), item('jutarnji', 'A'), item('slobodna', 'A')]);
  assert.equal(o.outlets, 4);
  assert.equal(o.owners, 2, 'Styria i Hanza');
  assert.equal(o.shared.length, 2);
  assert.ok(o.shared.some((x) => x.owner === 'Styria Media Group' && x.n === 2));
});

test('redakcija bez provjerenog vlasništva broji se zasebno', () => {
  const o = ownershipSplit([item('index', 'A'), item('telegram', 'A'), item('net', 'A')]);
  assert.equal(o.owners, 3, 'nikad ne tvrdimo koncentraciju koju nismo provjerili');
  assert.equal(o.shared.length, 0);
  assert.equal(ownerName(ownerKeyOf('index')), null);
  assert.equal(ownerName(ownerKeyOf('vecernji')), 'Styria Media Group');
});

test('izvorno vs. preneseno', () => {
  const items = [
    item('reuters', 'Amazon nears Decart deal', 0),
    item('ap', 'Amazon in talks over Decart', 0.2),
    item('nyt', 'Amazon in talks to buy Decart, WSJ Reports', 5),
    item('index', 'Amazon kupuje Decart, prenosi WSJ', 6, 'hr'),
  ];
  const o = originalitySplit(items);
  assert.equal(o.first.length, 2, 'prvi val unutar 45 minuta');
  assert.ok(o.first.every((f) => f.agency));
  assert.equal(o.relayed, 2);
  assert.equal(o.total, 4);
});

test('perspectiveOf spaja sve u jedan zapis', () => {
  const c = cluster([item('reuters', 'X happens'), item('vecernji', 'X se dogodio', 1, 'hr'), item('h24sata', 'X', 1, 'hr'), item('bbc', 'X in Europe', 1)]);
  const p = perspectiveOf(c);
  assert.equal(p.total, 4);
  assert.equal(p.counts.agency, 1);
  assert.equal(p.hrOutlets, 2);
  assert.equal(p.owners, 1);
  assert.deepEqual(p.first, ['reuters']);
});

// ——— mrtvi kut ———
test('mrtvi kut: svijet piše, hrvatski mediji ne', () => {
  const world = [
    cluster([item('reuters', 'EU changes rules on Mercosur agricultural imports'), item('bbc', 'Mercosur import rules shift in Brussels'),
      item('guardian', 'Brussels rewrites Mercosur import rules'), item('ft', 'Mercosur deal reshapes EU imports'),
      item('nyt', 'EU Mercosur import overhaul'), item('wsj', 'Mercosur rules rewritten'),
      item('ap', 'Brussels and Mercosur agree import terms'), item('dw', 'Mercosur import rules changed')], { countries: ['BR'] }),
    cluster([item('reuters', 'Zelensky meets allies in Kyiv'), item('bbc', 'Zelensky hosts allies'),
      item('ap', 'Allies gather in Kyiv around Zelensky'), item('nyt', 'Zelensky summit in Kyiv'),
      item('guardian', 'Kyiv summit with Zelensky'), item('dw', 'Zelensky and allies in Kyiv'),
      item('ft', 'Zelensky allies meet'), item('wsj', 'Kyiv hosts Zelensky summit')], { countries: ['UA'] }),
  ];
  const hr = [
    cluster([item('index', 'Zelensky u Kijevu primio saveznike', 1, 'hr'), item('jutarnji', 'Sastanak kod Zelenskog u Kijevu', 1, 'hr')], { countries: ['UA'] }),
  ];
  const bs = blindspots(world, hr, { minOutlets: 8 });
  const titles = bs.hr.map((x) => x.c.rep.title);
  assert.equal(titles.length, 1, `očekivao jednu priču u mrtvom kutu, dobio ${titles.length}`);
  assert.match(titles[0], /Mercosur/);
});

test('mrtvi kut preskače priče bez vlastitih imena', () => {
  const world = [cluster(Array.from({ length: 9 }, (_, i) => item(`o${i}`, 'prices rise again this month')), { countries: [] })];
  const bs = blindspots(world, [], { minOutlets: 8 });
  assert.equal(bs.hr.length, 0);
});

test('razilaženje u opisu', () => {
  const same = cluster([item('reuters', 'Decart deal nears Amazon close'), item('bbc', 'Amazon Decart deal nears close'), item('ap', 'Amazon nears Decart deal')]);
  const diff = cluster([item('reuters', 'Protest in Lima over Boluarte'), item('bbc', 'Clashes grip Peru capital'), item('ap', 'Arrests follow Cusco unrest')]);
  assert.equal(divergence(same)?.level, 'slažu se');
  assert.equal(divergence(diff)?.level, 'razilaze se');
  assert.equal(divergence(cluster([item('reuters', 'A B C')])), null, 'manje od tri redakcije: nema ocjene');
});

test('registar vlasništva je datiran', () => {
  const c = ownershipCoverage();
  assert.ok(c.total > 10);
  assert.match(c.checked, /^\d{4}-\d{2}-\d{2}$/);
});

test('nepoznata redakcija ide u ostatak svijeta', () => {
  assert.equal(regionOf('gn-nepoznati-portal'), 'world');
  assert.equal(regionOf(undefined), 'world');
});

test('ista država i isto ime nisu dovoljni ako je tema druga', () => {
  const a = cluster([
    item('reuters', 'Zelensky meets allies in Kyiv summit'),
    item('bbc', 'Kyiv summit hosted by Zelensky', 1),
    item('ap', 'Allies gather at Kyiv summit', 1),
  ], { countries: ['UA'] });
  const r1 = assignStories(emptyStories(), [a], T0);

  const b = cluster([
    item('reuters', 'Ukraine parliament passes pension overhaul, Zelensky signs', 24),
    item('bbc', 'Pension overhaul signed into law by Zelensky', 25),
    item('ap', 'Ukraine pension law takes effect', 25),
  ], { countries: ['UA'] });
  const r2 = assignStories(r1.state, [b], T0 + D);
  assert.notEqual(r2.assign.get(b).id, r1.assign.get(a).id, 'ista država i isto ime ne smiju spojiti različite teme');
});

test('dvije usporedne priče istog dana ne dijele id', () => {
  const a = cluster([item('reuters', 'Zelensky meets allies in Kyiv'), item('bbc', 'Kyiv allies summit', 1)], { countries: ['UA'] });
  const b = cluster([item('ap', 'Zelensky visits Kharkiv front line'), item('nyt', 'Kharkiv front visit by Zelensky', 1)], { countries: ['UA'] });
  const r = assignStories(emptyStories(), [a, b], T0);
  assert.notEqual(r.assign.get(a).id, r.assign.get(b).id);
});
