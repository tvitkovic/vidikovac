import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPoints } from '../lib/points.mjs';

const st = (id, title, n, extra = {}) => ({ id, title, n, ...extra });
const base = () => ({
  mood: { word: 'dan s jasnim vrhom' },
  world: [st('w1', 'Big summit opens in Geneva', 14), st('w2', 'Floods hit region', 9, { rhythm: { code: 'uspon', label: 'uspon' } }), st('w3', 'Old story', 8, { rhythm: { code: 'usutjelo', label: 'ušutjelo', note: 'tišina 20 h' } })],
  hr: [st('h1', 'Vlada o proračunu', 7), st('h2', 'Nešto drugo', 5)],
  markets: { groups: [{ items: [{ sym: '^GSPC', name: 'S&P 500', pct: -2.34 }, { sym: 'BTC-USD', name: 'Bitcoin', pct: 0.4 }] }] },
  blindspots: { hr: [{ id: 'b1', title: 'Election in Peru', n: 9 }], world: [] },
});

test('točke dana: najviše pet, bez ponavljanja priče, s poveznicama', () => {
  const p = buildPoints(base(), { now: Date.parse('2026-11-15T10:00:00Z') });
  assert.ok(p.bullets.length <= 5 && p.bullets.length >= 4);
  assert.equal(p.model, null);
  const ids = p.bullets.flatMap((b) => b.ids);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(p.bullets[0].text, /^Svijet: „Big summit/);
  assert.ok(p.bullets.some((b) => /Tržišta: S&P 500 −2,3 %/.test(b.text)), 'veliki pomak tržišta ulazi');
  assert.ok(p.bullets.some((b) => /Mrtvi kut/.test(b.text)));
  assert.ok(p.bullets.some((b) => /Ubrzava/.test(b.text)));
  assert.equal(p.headline, 'Dan: dan s jasnim vrhom.');
});

test('točke dana: mirno tržište se ne spominje, prazno izdanje daje null', () => {
  const d = base();
  d.markets.groups[0].items[0].pct = 0.3;
  assert.ok(!buildPoints(d).bullets.some((b) => /Tržišta/.test(b.text)));
  assert.equal(buildPoints({ hr: [], world: [], markets: null }), null);
});
