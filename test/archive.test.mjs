import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArchivePacks, loadArchive, clearArchiveMemo, archiveShape, updateArchive } from '../lib/newsarchive.mjs';

class MemStore {
  constructor() { this.m = new Map(); this.reads = 0; }
  async getJSON(k) { this.reads++; return this.m.has(k) ? structuredClone(this.m.get(k)) : null; }
  async setJSON(k, v) { this.m.set(k, structuredClone(v)); }
  async list(p = '') { return [...this.m.keys()].filter((k) => k.startsWith(p)).sort(); }
  async delete(k) { this.m.delete(k); }
}

const NOW = Date.parse('2026-10-12T09:00:00+02:00');
const D = 86400000;

async function seed(store, days = 40) {
  const idx = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date(NOW - i * D).toISOString().slice(0, 10);
    idx.push(date);
    await store.setJSON(`arch/${date}`, {
      day: date,
      items: Array.from({ length: 5 }, (_, j) => ({ id: `${date}-${j}`, t: NOW - i * D, o: 'reuters', l: 'en', ti: `Article ${j} on ${date}`, u: `https://x/${date}/${j}`, s: '', ct: [], cx: [] })),
    });
  }
  await store.setJSON('arch-index', idx);
  return idx;
}

test('paketi smanjuju broj čitanja, a sadržaj ostaje isti', async () => {
  const a = new MemStore();
  const idx = await seed(a);
  clearArchiveMemo();

  const before = await loadArchive(a, idx[0], idx.at(-1));
  const readsWithoutPacks = a.reads;

  const b = new MemStore();
  await seed(b);
  await buildArchivePacks(b, NOW);
  clearArchiveMemo();
  b.reads = 0;
  const after = await loadArchive(b, idx[0], idx.at(-1));
  const readsWithPacks = b.reads;

  assert.equal(after.length, before.length, 'paketi ne smiju izgubiti nijedan članak');
  assert.deepEqual(new Set(after.map((x) => x.id)), new Set(before.map((x) => x.id)));
  assert.ok(readsWithPacks < readsWithoutPacks / 3, `čitanja: ${readsWithPacks} naspram ${readsWithoutPacks}`);
});

test('današnji i jučerašnji dan ostaju izvan paketa', async () => {
  const s = new MemStore();
  const idx = await seed(s, 10);
  await buildArchivePacks(s, NOW);
  const packs = await s.list('arch-pack/');
  const packed = new Set((await Promise.all(packs.map((k) => s.getJSON(k)))).flatMap((p) => p.days));
  assert.ok(!packed.has(idx.at(-1)), 'današnji dan se još puni');
  assert.ok(!packed.has(idx.at(-2)), 'jučerašnji dan se još puni');
  assert.ok(packed.has(idx.at(-4)));
});

test('novi članci istog dana vide se odmah, bez pregradnje paketa', async () => {
  const s = new MemStore();
  await seed(s, 10);
  await buildArchivePacks(s, NOW);
  clearArchiveMemo();
  const today = new Date(NOW).toISOString().slice(0, 10);
  await updateArchive(s, [{ id: 'svjez', t: NOW, outlet: 'bbc', lang: 'en', title: 'Svjež članak', url: 'https://x/svjez', summary: '' }], NOW);
  const all = await loadArchive(s, new Date(NOW - 10 * D).toISOString().slice(0, 10), today);
  assert.ok(all.some((x) => x.ti === 'Svjež članak'), 'članak dodan nakon pregradnje mora biti vidljiv');
});

test('pregradnja je idempotentna', async () => {
  const s = new MemStore();
  await seed(s, 10);
  const first = await buildArchivePacks(s, NOW);
  const second = await buildArchivePacks(s, NOW);
  assert.ok(first.packs >= 1);
  assert.equal(second.packs, 0, 'drugi prolaz ne smije ništa prepisivati');
});

test('ako paket nedostaje, čita se po danima', async () => {
  const s = new MemStore();
  const idx = await seed(s, 10);
  await buildArchivePacks(s, NOW);
  for (const k of await s.list('arch-pack/')) await s.delete(k);
  clearArchiveMemo();
  const all = await loadArchive(s, idx[0], idx.at(-1));
  assert.equal(all.length, 11 * 5, 'bez paketa rezultat mora ostati potpun');
});

test('archiveShape prijavljuje koliko blobova pretraga otvara', async () => {
  const s = new MemStore();
  const idx = await seed(s, 20);
  await buildArchivePacks(s, NOW);
  const shape = await archiveShape(s, idx[0]);
  assert.equal(shape.days, 21);
  assert.ok(shape.reads < shape.days / 2, `očekivao manje čitanja, dobio ${shape.reads}`);
});
