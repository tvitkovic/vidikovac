// Mali DOM nadomjestak: provjerava da se funkcije sučelja izvrše bez greške i
// da ispišu brojke koje odgovaraju podacima. Nije zamjena za pogled u preglednik.
import test from 'node:test';
import assert from 'node:assert/strict';

class El {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.style = {}; this.className = ''; this._text = ''; this.hidden = false; }
  append(...k) { for (const x of k) if (x != null) this.children.push(x); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener() {}
  querySelectorAll() { return []; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this.children.map((c) => (typeof c === 'string' ? c : c.textContent || '')).join('') + this._text; }
}
globalThis.document = {
  createElement: (t) => new El(t),
  documentElement: {},
};
globalThis.Node = El;
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#1d9e75' });

const SIG = await import('../public/assets/signals.js');

const flat = (el) => (typeof el === 'string' ? el : [el._text, ...el.children.map(flat)].join(' '));

test('oznake ritma nastaju samo kad ima što reći', () => {
  assert.equal(SIG.badges({}).length, 0);
  const b = SIG.badges({ rhythm: { code: 'usutjelo', label: 'ušutjelo', hint: 'x', note: 'tišina 20 h' }, day: 4, fresh: ['kharkiv', 'patriot'] });
  assert.equal(b.length, 3);
  assert.match(flat(b[0]), /ušutjelo/);
  assert.match(flat(b[1]), /dan 4/);
  assert.match(flat(b[2]), /kharkiv/);
  assert.equal(b[0].className, 'rh rh-cold');
});

test('traka pokrivenosti ispisuje svaku skupinu i zbraja na 100 %', () => {
  const cv = SIG.coverageBar({ agency: 2, hr: 3, eu: 2, world: 1 });
  const bar = cv.children[0];
  const widths = bar.children.map((i) => parseFloat(i.style.width));
  assert.equal(widths.length, 4);
  assert.ok(Math.abs(widths.reduce((a, b) => a + b, 0) - 100) < 0.01);
  assert.match(flat(cv), /Agencije 2/);
  assert.match(flat(cv), /Hrvatski 3/);
  assert.equal(SIG.coverageBar({}), null);
});

test('rečenica o vlasništvu šuti kad nema što reći', () => {
  assert.equal(SIG.ownershipLine({ hrOutlets: 1, owners: 1 }), null);
  const line = SIG.ownershipLine({ hrOutlets: 4, owners: 2, shared: [{ owner: 'Styria Media Group', n: 2 }, { owner: 'Hanza Media', n: 2 }] });
  assert.match(flat(line), /4 redakcije, 2 vlasnika/);
  assert.match(flat(line), /Styria Media Group: 2/);
  assert.match(flat(line), /iz istog vlasništva/);
});

test('kad je svaka redakcija svoj vlasnik, nema napomene o koncentraciji', () => {
  const line = SIG.ownershipLine({ hrOutlets: 3, owners: 3, shared: [] });
  assert.match(flat(line), /3 redakcije, 3 vlasnika/);
  assert.ok(!/istog vlasništva/.test(flat(line)));
});

test('prvi izvor i preneseni tekstovi', () => {
  assert.equal(SIG.originLine({ first: [] }), null);
  const l = SIG.originLine({ first: ['Reuters', 'AP'], relayed: 2 });
  assert.match(flat(l), /Prvi:/);
  assert.match(flat(l), /Reuters, AP/);
  assert.match(flat(l), /2 teksta se pozivaju/);
});

test('ladica perspektive izostaje kad priča nema podatak', () => {
  assert.equal(SIG.perspectivePanel({}), null);
  const p = SIG.perspectivePanel({ persp: { counts: { agency: 1, hr: 2, eu: 1, world: 0 }, hrOutlets: 2, owners: 1, shared: [{ owner: 'Styria Media Group', n: 2 }], first: ['Reuters'], relayed: 0, agree: 'razilaze se' } });
  const txt = flat(p);
  assert.match(txt, /Agencije 1/);
  assert.match(txt, /Styria/);
  assert.match(txt, /Prvi:/);
  assert.match(txt, /vrijedi pročitati dva izvora/);
});

test('mrtvi kut izostaje kad ga nema', () => {
  assert.equal(SIG.blindspotBlock(null), null);
  assert.equal(SIG.blindspotBlock({ hr: [], world: [] }), null);
  const b = SIG.blindspotBlock({
    hr: [{ title: 'EU mijenja pravila', url: 'https://x/1', n: 27, dir: 'hr', counts: { agency: 4, hr: 0, eu: 12, world: 11 } }],
    world: [],
  });
  const txt = flat(b);
  assert.match(txt, /Svijet piše, hrvatski mediji ne/);
  assert.match(txt, /27 redakcija, nijedna domaća/);
  assert.ok(!/Hrvatski mediji pišu, svijet ne/.test(txt), 'prazan smjer se ne ispisuje');
  assert.equal(b.attrs.id, 'mrtvi-kut');
});

test('množina na hrvatskom', () => {
  const one = SIG.blindspotBlock({ hr: [{ title: 'a', url: 'https://x', n: 1, dir: 'hr', counts: { world: 1 } }], world: [] });
  const few = SIG.blindspotBlock({ hr: [{ title: 'a', url: 'https://x', n: 3, dir: 'hr', counts: { world: 3 } }], world: [] });
  assert.match(flat(one), /1 redakcija,/);
  assert.match(flat(few), /3 redakcije,/);
});

test('drawRidge tiho odustaje bez platna ili podataka', () => {
  assert.doesNotThrow(() => SIG.drawRidge(null, []));
  assert.doesNotThrow(() => SIG.drawRidge({ getBoundingClientRect: () => ({ width: 0, height: 0 }) }, [{ date: '2026-10-12', peaks: [] }]));
});

test('moodLine vraća riječ dana ili ništa', () => {
  assert.equal(SIG.moodLine({ word: 'dan jedne priče' }), 'Dan: dan jedne priče');
  assert.equal(SIG.moodLine(null), null);
});
