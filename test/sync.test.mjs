import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore, setStoreForTests } from '../lib/store.mjs';

const ID = 'A'.repeat(32);
const req = (method, id, body) => new Request(`https://x.netlify.app/api/sync?id=${id}`, { method, body: body ? JSON.stringify(body) : undefined });

test('/api/sync: kod je tajna, sprema se samo dopušteno, novija verzija pobjeđuje', async () => {
  setStoreForTests(new MemoryStore());
  const sync = (await import('../netlify/functions/sync.mjs')).default;
  assert.equal((await sync(req('GET', 'kratko'))).status, 400);
  assert.equal((await sync(req('GET', ID))).status, 404);
  const put = await sync(req('PUT', ID, { at: 100, data: { 'vk-my': { follow: ['x'] }, 'vk-last': { veliko: 1 }, 'vk-watch': ['AAPL'] } }));
  assert.equal(put.status, 200);
  const got = await (await sync(req('GET', ID))).json();
  assert.deepEqual(Object.keys(got.data).sort(), ['vk-my', 'vk-watch'], 'vk-last se ne sinkronizira');
  const old = await sync(req('PUT', ID, { at: 50, data: { 'vk-my': {} } }));
  assert.equal(old.status, 409, 'starija verzija ne prepisuje noviju');
  assert.equal((await old.json()).at, 100);
  assert.equal((await sync(req('PUT', ID, { at: 'x', data: {} }))).status, 400);
  const big = await sync(req('PUT', 'B'.repeat(32), { at: 1, data: { 'vk-track': 'x'.repeat(50_000) } }));
  assert.equal(big.status, 413);
  assert.equal((await sync(req('DELETE', ID))).status, 405);
});

test('/api/sync: ograničen broj skupina', async () => {
  setStoreForTests(new MemoryStore());
  process.env.VIDIKOVAC_SYNC_MAX = '2';
  try {
    const sync = (await import('../netlify/functions/sync.mjs')).default;
    for (const c of ['C', 'D']) assert.equal((await sync(req('PUT', c.repeat(32), { at: 1, data: { 'vk-my': {} } }))).status, 200);
    assert.equal((await sync(req('PUT', 'E'.repeat(32), { at: 1, data: { 'vk-my': {} } }))).status, 429);
    assert.equal((await sync(req('PUT', 'C'.repeat(32), { at: 2, data: { 'vk-my': {} } }))).status, 200, 'postojeća skupina se i dalje ažurira');
  } finally { delete process.env.VIDIKOVAC_SYNC_MAX; }
});

test('klijent sync.js: uključi na jednom, poveži na drugom, preuzmi novije', async () => {
  const mem = new MemoryStore();
  setStoreForTests(mem);
  const handler = (await import('../netlify/functions/sync.mjs')).default;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => handler(new Request(`https://x.netlify.app${url}`, { method: opts.method, body: opts.body }));
  const mkLS = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
  try {
    // uređaj A
    globalThis.localStorage = mkLS();
    localStorage.setItem('vk-my', JSON.stringify({ follow: ['a'] }));
    const A = await import('../public/assets/sync.js?a');
    const code = await A.enable();
    assert.match(code, /^[A-Za-z0-9_-]{32}$/);
    const lsA = globalThis.localStorage;
    // uređaj B
    globalThis.localStorage = mkLS();
    const B = await import('../public/assets/sync.js?b');
    await assert.rejects(() => B.join('nema'), /Kod nije ispravan/);
    assert.equal(await B.join(code), true, 'postavke su preuzete');
    assert.deepEqual(JSON.parse(localStorage.getItem('vk-my')), { follow: ['a'] });
    assert.equal(await B.pull(), false, 'nema ničeg novijeg');
    // B mijenja, A preuzima
    localStorage.setItem('vk-my', JSON.stringify({ follow: ['a', 'b'] }));
    B.touch('vk-my');
    await new Promise((r) => setTimeout(r, 4100));
    globalThis.localStorage = lsA;
    assert.equal(await A.pull(), true);
    assert.deepEqual(JSON.parse(localStorage.getItem('vk-my')), { follow: ['a', 'b'] });
    A.disable();
    assert.equal(A.enabled(), false);
  } finally { globalThis.fetch = realFetch; delete globalThis.localStorage; }
});

test('seen.js: nova, viđena i dopunjena priča', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  store.set('vk-seen', JSON.stringify({
    seen1: { n: 5, f: '', t: Date.now() - 1000 },
    grew: { n: 5, f: '', t: Date.now() - 1000 },
    termsNew: { n: 5, f: '', t: Date.now() - 1000 },
    old: { n: 5, f: '', t: Date.now() - 30 * 86400_000 },
  }));
  try {
    const S = await import('../public/assets/seen.js');
    assert.equal(S.hasHistory(), true);
    assert.equal(S.seenState({ sid: 'seen1', n: 6 }), 'seen');
    assert.equal(S.seenState({ sid: 'grew', n: 9 }), 'updated', 'tri nove redakcije otključavaju priču');
    assert.equal(S.seenState({ sid: 'termsNew', n: 5, fresh: ['kharkiv'] }), 'updated');
    assert.equal(S.seenState({ sid: 'nikad', n: 3 }), 'new');
    assert.equal(S.seenState({ sid: 'old', n: 5 }), 'new', 'zapis stariji od 7 dana je zaboravljen');
    assert.equal(S.seenState({ n: 3 }), null);
    assert.equal(S.countFresh([{ sid: 'seen1', n: 5 }, { sid: 'nikad', n: 2 }, { sid: 'nikad', n: 2 }]), 1);
  } finally { delete globalThis.localStorage; delete globalThis.window; delete globalThis.addEventListener; }
});
