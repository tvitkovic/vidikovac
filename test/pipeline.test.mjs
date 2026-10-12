// Integracijski test: cijela izgradnja izdanja nad spremljenim feedovima, bez mreže.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FEEDS } from '../lib/sources.mjs';
import { MemoryStore, setStoreForTests } from '../lib/store.mjs';
import { runBuild, getLatest } from '../lib/build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (f) => fs.readFileSync(path.join(here, 'fixtures', f), 'utf8');

// koji feed iz registra čita koju spremljenu datoteku
const FEED_FIXTURES = {
  'guardian-world': 'guardian-world.xml', 'bbc-world': 'bbc-world.xml', 'wsj-markets': 'wsj-markets.xml', 'index-hr': 'index-hr.xml',
  n1: 'n1.xml', dw: 'dw-rdf.xml', quanta: 'quanta.xml', nature: 'nature.xml', 'gn-world': 'gn-world.xml', jutarnji: 'jutarnji.xml',
  hrt: 'hrt.xml', 'economist-intl': 'economist.xml', 'ft-world': 'ft-world.xml', vecernji: 'vecernji.xml', telegram: 'telegram.xml',
  'nyt-world': 'nyt-world.xml', 'ars-science': 'arstechnica.xml', sciencenews: 'sciencenews.xml', tportal: 'tportal.xml', net: 'net.xml',
  '24sata': '24sata.xml', dnevnik: 'dnevnik.xml',
};
const byUrl = new Map(FEEDS.filter((f) => FEED_FIXTURES[f.id]).map((f) => [f.url, FEED_FIXTURES[f.id]]));
const NOW = Date.parse('2026-10-11T06:00:00Z'); // 8:00 u Zagrebu
let realFetch;
const calls = [];

before(() => {
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    calls.push({ u, h: opts.headers || {} });
    const json = (o) => new Response(typeof o === 'string' ? o : JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } });
    if (byUrl.has(u)) {
      if (opts.headers?.['if-none-match'] === '"v1"') return new Response(null, { status: 304 });
      return new Response(fx(byUrl.get(u)), { status: 200, headers: { 'content-type': 'application/rss+xml; charset=utf-8', etag: '"v1"' } });
    }
    if (u.includes('finance.yahoo.com/v8/finance/chart/')) return json(fx(u.includes('BTC') || u.includes('ETH') ? 'yahoo-btc.json' : 'yahoo-gspc.json'));
    if (u.includes('rest.zse.hr')) return json(fx('zse-crobex.json'));
    if (u.includes('hr.wikipedia.org/w/index.php') && u.includes('action=raw')) {
      if (u.includes('title=11._listopada')) return new Response(fx('wiki-hr-day-raw.txt'), { status: 200, headers: { 'content-type': 'text/x-wiki; charset=UTF-8' } });
      return new Response('', { status: 404 });
    }
    if (u.includes('hr.wikipedia.org/w/api.php')) return json(fx('wiki-hr-day.json'));
    if (u.includes('en.wikipedia.org/api/rest_v1/feed/featured')) return json(fx('wiki-en-featured.json'));
    if (u.includes('alternative.me')) return json({ data: [{ value: '61', value_classification: 'Greed' }, { value: '64' }] });
    return new Response('nema', { status: 404 });
  };
});
after(() => { globalThis.fetch = realFetch; });

test('izgradnja izdanja: rubrike, tržišta, znanost, dodaci i jutarnje izdanje', async () => {
  const store = new MemoryStore();
  const r = await runBuild({ store, now: NOW, trigger: 'test', budgetMs: 20000 });
  assert.ok(!r.skipped);
  const L = r.latest;
  assert.equal(L.date, '2026-10-11');
  assert.equal(L.dateLong, 'nedjelja, 11. listopada 2026.');
  assert.ok(L.hr.length >= 5, 'Hrvatska');
  assert.ok(L.world.length >= 5, 'Svijet');
  assert.ok(L.world[0].n >= 3, 'najveća svjetska priča ima više redakcija');
  assert.ok(L.hr.every((s) => !/sportske|\/hot\//.test(s.url)), 'bez sporta i zabave');
  assert.ok(L.geo.topics.length > 0 && L.geo.countries.length > 0);
  assert.ok(L.relief.length >= 3 && L.relief.every((p) => p.h > 0 && p.h <= 1));
  const idx = L.markets.groups.find((g) => g.id === 'idx');
  assert.equal(idx.items.find((i) => i.sym === 'CROBEX').price, 4492.97);
  assert.ok(L.markets.fng?.value === 61);
  assert.ok(L.science.counts.articles > 0);
  assert.ok(L.extras.onThisDay.events.length >= 4);
  assert.ok(L.extras.onThisDay.events.some((e) => /Stepinac/.test(e.t)), 'stranica dana dohvaćena preko action=raw');
  assert.ok(!calls.some((c) => c.u.includes('/w/api.php')), 'API se ne koristi kad action=raw uspije');
  assert.match(L.extras.picture?.img || '', /^https:\/\/[a-z.]*wikimedia\.org\/.+\/1280px-/);
  assert.ok(L.extras.dyk.length >= 3 && L.extras.dyk.every((d) => !d.t.startsWith('...') && d.t.endsWith('.')));
  assert.ok(r.isMorning, 'prvo izdanje nakon 6:00 sprema se kao jutarnje');
  assert.ok(await store.getJSON('edition/2026-10-11'));
  assert.equal((await store.getJSON('editions-index')).length, 1);
  assert.equal((await store.getJSON('lock')).until, 0, 'zaključavanje oslobođeno');
  // HTML ne smije procuriti u naslove/sažetke
  for (const s of [...L.hr, ...L.world]) assert.ok(!/<[a-z]|&lt;|&amp;/i.test(s.title + s.summary), s.title);
  // JSON za klijenta treba biti razumne veličine
  assert.ok(JSON.stringify(L).length < 600_000);
});

test('drugo izdanje istog dana: uvjetni zahtjevi (304) i bez novog jutarnjeg izdanja', async () => {
  const store = new MemoryStore();
  await runBuild({ store, now: NOW, trigger: 'test' });
  calls.length = 0;
  const r2 = await runBuild({ store, now: NOW + 3600_000, trigger: 'test' });
  assert.ok(!r2.isMorning);
  assert.ok(calls.some((c) => c.h['if-none-match'] === '"v1"'), 'šalje If-None-Match');
  assert.ok(r2.latest.hr.length >= 5, 'priče ostaju iz predmemorije nakon 304');
  // znanstveni feedovi nisu na redu svaki sat
  assert.ok(!calls.some((c) => c.u.includes('quantamagazine')), 'Quanta se ne dohvaća svaki sat');
});

test('getLatest gradi izdanje kod prvog posjeta, a poslije čita spremljeno', async () => {
  const store = new MemoryStore();
  const a = await getLatest({ store, now: NOW });
  assert.ok(a.built && a.data.hr.length);
  const b = await getLatest({ store, now: NOW + 600_000 });
  assert.equal(b.built, false);
  assert.equal(b.data.builtAt, a.data.builtAt);
});

test('"Na današnji dan": preusmjeravanje i rezervni put preko API-ja (HTTP 429)', async () => {
  const { fetchExtras } = await import('../lib/extras.mjs');
  const mock = globalThis.fetch;
  const seen = [];
  try {
    // 1) stranica dana je preusmjeravanje → slijedi se cilj
    globalThis.fetch = async (url, opts) => {
      const u = String(url); seen.push(u);
      if (u.includes('action=raw') && u.includes('title=11._listopada&')) return new Response('#Preusmjeri [[11. listopada (dan)]]', { status: 200 });
      if (u.includes('action=raw') && u.includes(`title=${encodeURIComponent('11._listopada_(dan)')}&`)) return new Response(fx('wiki-hr-day-raw.txt'), { status: 200 });
      return mock(url, opts);
    };
    const a = await fetchExtras('2026-10-11');
    assert.ok(a.onThisDay?.events.some((e) => /Stepinac/.test(e.t)), 'cilj preusmjeravanja');
    // 2) action=raw vraća 429 → koristi se API
    seen.length = 0;
    globalThis.fetch = async (url, opts) => {
      const u = String(url); seen.push(u);
      if (u.includes('action=raw')) return new Response('Too many requests', { status: 429 });
      return mock(url, opts);
    };
    const b = await fetchExtras('2026-10-11');
    assert.ok(b.onThisDay?.events.length >= 4);
    assert.ok(seen.some((u) => u.includes('/w/api.php')));
  } finally { globalThis.fetch = mock; }
});

test('AI sažetak: jedan poziv dnevno, ponovni pokušaj ako jutarnji ne uspije (najviše 3)', async () => {
  const mock = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let n = 0, fail = true;
  globalThis.fetch = async (url, opts) => {
    if (String(url) !== 'https://api.anthropic.com/v1/messages') return mock(url, opts);
    n++;
    assert.equal(opts.headers['x-api-key'], 'test-key');
    assert.equal(opts.headers['anthropic-version'], '2023-06-01');
    const body = JSON.parse(opts.body);
    if (fail) return new Response(JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }), { status: 529 });
    const input = JSON.parse(body.messages[0].content);
    const w = input.svijet[0].id, h = input.hrvatska[0].id;
    const text = JSON.stringify({ naslov: 'Dan u dvije točke', tocke: [{ tekst: 'Prva točka.', id: [w] }, { tekst: 'Druga točka.', id: [h, 'izmisljen'] }], prijevodi: { [w]: 'Prevedeni naslov', izmisljen: 'x' } });
    return new Response(JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: `Evo sažetka:\n${text}` }], stop_reason: 'end_turn' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const store = new MemoryStore();
    const r1 = await runBuild({ store, now: NOW, trigger: 'test' });
    assert.ok(r1.isMorning);
    assert.equal(r1.latest.digest, null, 'jutarnji pokušaj nije uspio');
    assert.equal(n, 1);
    fail = false;
    const r2 = await runBuild({ store, now: NOW + 3600_000, trigger: 'test' });
    assert.equal(n, 2, 'drugi pokušaj u sljedećem izdanju');
    const dg = r2.latest.digest;
    assert.equal(dg.model, 'claude-haiku-5-5');
    assert.equal(dg.headline, 'Dan u dvije točke');
    assert.equal(dg.bullets.length, 2);
    assert.deepEqual(dg.bullets[1].ids, [r2.latest.hr[0].id], 'nepoznati id-jevi se odbacuju');
    assert.deepEqual(Object.values(dg.translations), ['Prevedeni naslov']);
    assert.ok((await store.getJSON('edition/2026-10-11')).digest, 'sažetak dodan i jutarnjem izdanju');
    const r3 = await runBuild({ store, now: NOW + 2 * 3600_000, trigger: 'test' });
    assert.equal(n, 2, 'nema novog poziva kad sažetak već postoji');
    assert.deepEqual(r3.latest.digest, dg);
    // stalni neuspjeh: najviše 3 poziva u danu
    fail = true; n = 0;
    const s2 = new MemoryStore();
    for (let i = 0; i < 4; i++) await runBuild({ store: s2, now: NOW + i * 3600_000, trigger: 'test' });
    assert.equal(n, 3);
  } finally {
    globalThis.fetch = mock;
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test('Netlify funkcije: briefing, archive, quotes', async () => {
  const store = new MemoryStore();
  setStoreForTests(store);
  const briefing = (await import('../netlify/functions/briefing.mjs')).default;
  const archive = (await import('../netlify/functions/archive.mjs')).default;
  const quotes = (await import('../netlify/functions/quotes.mjs')).default;
  const res = await briefing(new Request('https://x.netlify.app/api/briefing'));
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.ok(j.hr.length && j.world.length);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.equal(res.headers.get('content-encoding'), null, 'bez Accept-Encoding odgovor nije sažet');
  // sažimanje: brotli kad ga preglednik prihvaća, inače gzip
  const { brotliDecompressSync, gunzipSync } = await import('node:zlib');
  const br = await briefing(new Request('https://x.netlify.app/api/briefing', { headers: { 'accept-encoding': 'gzip, deflate, br, zstd' } }));
  assert.equal(br.headers.get('content-encoding'), 'br');
  assert.match(br.headers.get('vary') || '', /accept-encoding/i);
  const brBuf = Buffer.from(await br.arrayBuffer());
  assert.deepEqual(JSON.parse(brotliDecompressSync(brBuf).toString()).builtAt, j.builtAt);
  assert.ok(brBuf.length < JSON.stringify(j).length / 2, 'sažeto barem upola');
  const gz = await briefing(new Request('https://x.netlify.app/api/briefing', { headers: { 'accept-encoding': 'gzip' } }));
  assert.equal(gz.headers.get('content-encoding'), 'gzip');
  assert.ok(JSON.parse(gunzipSync(Buffer.from(await gz.arrayBuffer())).toString()).hr.length);
  const bad = await archive(new Request('https://x.netlify.app/api/archive?date=../../etc'));
  assert.equal(bad.status, 400);
  const list = await (await archive(new Request('https://x.netlify.app/api/archive'))).json();
  assert.ok(Array.isArray(list.editions));
  const noSym = await quotes(new Request('https://x.netlify.app/api/quotes'));
  assert.equal(noSym.status, 400);
  const q = await (await quotes(new Request('https://x.netlify.app/api/quotes?s=AAPL,<bad>,VWCE.DE'))).json();
  assert.deepEqual(q.quotes.map((x) => x.sym), ['AAPL', 'VWCE.DE']);
});

test('praćene priče: arhiva članaka i /api/track', async () => {
  const store = new MemoryStore();
  setStoreForTests(store);
  const r = await runBuild({ store, now: NOW, trigger: 'test' });
  assert.ok(r.arch?.added > 100, 'članci su dopisani u arhivu');
  const idx = await store.getJSON('arch-index');
  assert.ok(idx.includes('2026-10-11'));
  const again = await runBuild({ store, now: NOW + 3600_000, trigger: 'test' });
  assert.equal(again.arch.added, 0, 'isti članci se ne dopisuju dvaput');
  const track = (await import('../netlify/functions/track.mjs')).default;
  const post = (body) => track(new Request('https://x.netlify.app/api/track', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));
  assert.equal((await track(new Request('https://x.netlify.app/api/track'))).status, 405);
  assert.equal((await post({ action: 'compile', text: 'i' })).status, 422);
  const c = await (await post({ action: 'compile', text: 'rat u Jemenu' })).json();
  assert.equal(c.tracker.name, 'Rat u Jemenu');
  assert.deepEqual(c.tracker.labels.map((g) => g.refs[0].label), ['Jemen', 'rat i sukob']);
  const s = await (await post({ action: 'search', trackers: [{ id: 'y', groups: c.tracker.groups, since: NOW - 3 * 86400_000 }, { id: 'bad', groups: [{ kind: 'all', refs: ['x:<script>'] }] }] })).json();
  assert.ok(s.results.y.articles > 0, 'priče o Jemenu iz spremljenih feedova');
  assert.ok(s.results.y.events.every((e) => /yemen|houthi|jemen|huti|saudi|riyadh|rijad/i.test(e.title)), 'samo relevantni naslovi');
  assert.equal(s.results.bad, undefined, 'neispravni pojmovi se odbacuju');
  const fromStory = await (await post({ action: 'compile', story: { title: s.results.y.events[0].title, lang: 'en', t: NOW } })).json();
  assert.ok(fromStory.tracker.groups.length >= 1);
});
