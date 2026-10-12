import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichEdition } from '../lib/enrich.mjs';
import { emptyStories } from '../lib/story.mjs';
import { hashStr } from '../lib/text.mjs';

const H = 3_600_000, D = 24 * H;
const T0 = Date.parse('2026-10-12T09:00:00+02:00');

const item = (outlet, title, tH = 0, lang = 'en') => ({
  outlet, oname: outlet, title, lang, t: T0 + tH * H, url: `https://x/${outlet}/${hashStr(title)}`,
});
function cluster(items, extra = {}) {
  return {
    items, rep: items[0],
    outlets: new Set(items.map((i) => i.outlet)).size,
    oldest: Math.min(...items.map((i) => i.t)),
    newest: Math.max(...items.map((i) => i.t)),
    countries: [], ...extra,
  };
}
const asStory = (c) => ({ id: hashStr(c.rep.url), title: c.rep.title, url: c.rep.url, src: c.rep.oname, n: c.outlets });

function fixture() {
  const w1 = cluster([
    item('reuters', 'Zelensky meets allies in Kyiv'), item('bbc', 'Zelensky hosts allies in Kyiv', 1),
    item('ap', 'Allies gather around Zelensky', 1), item('nyt', 'Kyiv summit with Zelensky', 1),
    item('guardian', 'Zelensky summit in Kyiv', 2), item('dw', 'Zelensky and allies meet', 2),
    item('ft', 'Kyiv hosts allies', 2), item('wsj', 'Zelensky allies summit', 2),
  ], { countries: ['UA'] });
  const w2 = cluster([
    item('reuters', 'EU rewrites Mercosur import rules'), item('bbc', 'Mercosur import rules shift', 1),
    item('guardian', 'Brussels and Mercosur agree terms', 1), item('ft', 'Mercosur reshapes EU imports', 1),
    item('nyt', 'Mercosur import overhaul', 2), item('wsj', 'Mercosur rules rewritten', 2),
    item('ap', 'Brussels Mercosur deal', 2), item('dw', 'Mercosur import change', 2),
  ], { countries: ['BR'] });
  const h1 = cluster([
    item('index', 'Zelensky u Kijevu primio saveznike', 1, 'hr'),
    item('vecernji', 'Sastanak kod Zelenskog u Kijevu', 1, 'hr'),
    item('h24sata', 'Zelensky okupio saveznike', 2, 'hr'),
    item('jutarnji', 'Kijev: Zelensky i saveznici', 2, 'hr'),
  ], { countries: ['UA'] });
  const sections = {
    hr: [asStory(h1)], world: [asStory(w1), asStory(w2)], markets: [], hrBiz: [],
    _clusters: { world: [w1, w2], hr: [h1], markets: [], hrBiz: [] },
  };
  return { sections, w1, w2, h1 };
}

test('obogaćivanje dodaje id priče, ritam i perspektivu', () => {
  const { sections, w1 } = fixture();
  const relief = [{ label: 'Ukrajina', h: 1, n: 8 }, { label: 'Trgovina', h: 0.6, n: 8 }];
  const out = enrichEdition({ sections, storiesState: emptyStories(), relief, now: T0 });

  assert.equal(out.tagged, 3);
  const s = sections.world.find((x) => x.id === hashStr(w1.rep.url));
  assert.ok(s.sid, 'priča mora dobiti trajni id');
  assert.equal(s.day, 1);
  assert.ok(s.persp, 'mora imati perspektivu');
  assert.equal(s.persp.counts.agency, 2);
  assert.equal(s.persp.counts.eu, 4);
  assert.equal(s.persp.counts.world, 2);
});

test('hrvatska priča prijavljuje koliko vlasnika stoji iza redakcija', () => {
  const { sections } = fixture();
  const out = enrichEdition({ sections, storiesState: emptyStories(), now: T0 });
  assert.ok(out.tagged >= 1);
  const s = sections.hr[0];
  assert.equal(s.persp.hrOutlets, 4);
  assert.equal(s.persp.owners, 3, 'Styria (2), Hanza (1), Index zasebno');
  assert.ok(s.persp.shared.some((x) => x.owner === 'Styria Media Group'));
});

test('mrtvi kut nalazi svjetsku priču bez domaće pokrivenosti', () => {
  const { sections } = fixture();
  const out = enrichEdition({ sections, storiesState: emptyStories(), now: T0 });
  assert.equal(out.blindspots.hr.length, 1);
  assert.match(out.blindspots.hr[0].title, /Mercosur/);
  assert.equal(out.blindspots.hr[0].counts.hr, 0);
});

test('drugi dan iste priče nosi dan 2 i oznaku ritma', () => {
  const a = fixture();
  const r1 = enrichEdition({ sections: a.sections, storiesState: emptyStories(), now: T0 });

  const b = fixture();
  // isti događaj sutradan, s novim imenom u naslovu
  b.sections._clusters.world[0] = cluster([
    item('reuters', 'Zelensky and allies agree Kharkiv air defence', 24),
    item('bbc', 'Kharkiv air defence pledge after Zelensky talks', 25),
    item('ap', 'Allies pledge Kharkiv defences at Zelensky summit', 25),
    item('nyt', 'Zelensky secures Kharkiv pledges', 25),
    item('guardian', 'Kharkiv defence deal with Zelensky', 26),
    item('dw', 'Zelensky Kharkiv agreement', 26),
  ], { countries: ['UA'] });
  b.sections.world[0] = { id: hashStr(b.sections._clusters.world[0].rep.url), title: b.sections._clusters.world[0].rep.title, n: 6, url: b.sections._clusters.world[0].rep.url, src: 'reuters' };

  const r2 = enrichEdition({ sections: b.sections, storiesState: r1.storiesState, now: T0 + D });
  const s = b.sections.world[0];
  assert.equal(s.day, 2, 'nastavak priče mora biti dan 2');
  assert.ok(s.since, 'mora nositi datum prve objave');
  assert.ok(s.fresh?.includes('kharkiv'), `očekivao kharkiv u novostima, dobio ${s.fresh}`);
  assert.ok(r2.ridge.length >= 1);
});

test('greben pamti najviše 7 dana i koncentraciju dana', () => {
  const { sections } = fixture();
  const hist = Array.from({ length: 12 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, peaks: [{ label: 'x', h: 0.4, n: 2 }] }));
  const out = enrichEdition({
    sections, storiesState: emptyStories(), reliefHistory: hist,
    relief: [{ label: 'Ukrajina', h: 1, n: 8 }, { label: 'B', h: 0.2, n: 2 }, { label: 'C', h: 0.2, n: 2 }],
    now: T0,
  });
  assert.equal(out.ridge.length, 7);
  assert.equal(out.ridge.at(-1).date, '2026-10-12');
  assert.ok(out.mood.hhi > 0);
  assert.ok(out.mood.word);
  assert.ok(out.reliefHistory.length <= 21);
});

test('izdanje bez _clusters ne ruši obogaćivanje', () => {
  const out = enrichEdition({ sections: { hr: [], world: [] }, storiesState: emptyStories(), now: T0 });
  assert.equal(out.tagged, 0);
  assert.deepEqual(out.blindspots, { hr: [], world: [] });
});

test('magla se pokazuje samo visoko na ljestvici, ne na dnu rubrike', () => {
  // 10 priča s jednim izvorom i bez agencije; sve bi po pravilu bile „magla”
  const cs = Array.from({ length: 10 }, (_, i) =>
    cluster([item('telegraph', `Local story number ${i} about topic${i} ${'x'.repeat(i)}`, 0)], { countries: [] }));
  const sections = {
    hr: [], world: cs.map(asStory), markets: [], hrBiz: [],
    _clusters: { world: cs, hr: [], markets: [], hrBiz: [] },
  };
  enrichEdition({ sections, storiesState: emptyStories(), relief: [], now: T0 });
  const fog = sections.world.map((s) => s.rhythm?.code === 'magla');
  assert.equal(fog.filter(Boolean).length, 4, 'najviše 4 oznake magle');
  assert.ok(fog.slice(0, 4).every(Boolean), 'oznaka ide na vrh ljestvice');
  assert.ok(fog.slice(4).every((x) => !x), 'dno ljestvice bez oznake');
});
