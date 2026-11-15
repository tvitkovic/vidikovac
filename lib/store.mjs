// Spremište: Netlify Blobs u produkciji, lokalne JSON datoteke za razvoj i testove.
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'vidikovac';
const lockId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Zaključavanje bez atomskih operacija (datoteke, memorija): dovoljno za jedan proces. */
async function softLock(store, key, ms, by, force) {
  const now = Date.now();
  const cur = await store.getJSON(key);
  if (!force && cur && cur.until > now) return null;
  const val = { until: now + ms, by, id: lockId() };
  await store.setJSON(key, val);
  return val.id;
}

function hasBlobsEnv() {
  return Boolean(globalThis.netlifyBlobsContext || globalThis.process?.env?.NETLIFY_BLOBS_CONTEXT || globalThis.Netlify?.env?.get?.('NETLIFY_BLOBS_CONTEXT'));
}

class BlobsStore {
  constructor() { this.s = getStore({ name: STORE_NAME, consistency: 'strong' }); this.kind = 'blobs'; }
  async getJSON(key) { try { return (await this.s.get(key, { type: 'json' })) ?? null; } catch (e) { console.warn('blobs get', key, e?.message); return null; } }
  async setJSON(key, value) { await this.s.setJSON(key, value); }
  async list(prefix) { const { blobs } = await this.s.list({ prefix }); return blobs.map((b) => b.key); }
  async delete(key) { await this.s.delete(key); }
  /**
   * Atomsko zaključavanje uvjetnim pisanjem (onlyIfNew / onlyIfMatch): ako se ručno i satno osvježavanje
   * pokrenu istodobno, samo jedno dobije ključ. Vraća oznaku zaključavanja ili null.
   */
  async acquireLock(key, ms, by, { force = false } = {}) {
    const val = { until: Date.now() + ms, by, id: lockId() };
    try {
      const cur = await this.s.getWithMetadata(key, { type: 'json' });
      if (force) { await this.s.setJSON(key, val); return val.id; }
      if (!cur) { const r = await this.s.setJSON(key, val, { onlyIfNew: true }); return r?.modified === false ? null : val.id; }
      if (cur.data?.until > Date.now()) return null;
      const r = await this.s.setJSON(key, val, { onlyIfMatch: cur.etag });
      return r?.modified === false ? null : val.id;
    } catch (e) {
      // zaključavanje ne smije srušiti izgradnju: u slučaju greške nastavi (stari ponašanje)
      console.warn('acquireLock', e?.message);
      return val.id;
    }
  }
  async releaseLock(key, id) {
    const cur = await this.getJSON(key);
    if (cur && cur.id && id && cur.id !== id) return;     // netko drugi je u međuvremenu preuzeo ključ
    await this.setJSON(key, { until: 0 });
  }
}

class FileStore {
  constructor(dir) { this.dir = dir; this.kind = 'file'; }
  async _fs() { if (!this.fs) { this.fs = await import('node:fs/promises'); this.path = await import('node:path'); } return this.fs; }
  _file(key) { return this.path.join(this.dir, key.replace(/[^\w.\-/]/g, '_')); }
  async getJSON(key) { const fs = await this._fs(); try { return JSON.parse(await fs.readFile(this._file(key), 'utf8')); } catch { return null; } }
  async setJSON(key, value) { const fs = await this._fs(); const f = this._file(key); await fs.mkdir(this.path.dirname(f), { recursive: true }); await fs.writeFile(f, JSON.stringify(value)); }
  async list(prefix = '') {
    const fs = await this._fs();
    const out = [];
    const walk = async (d, rel) => { let ents = []; try { ents = await fs.readdir(d, { withFileTypes: true }); } catch { return; } for (const e of ents) { const r = rel ? `${rel}/${e.name}` : e.name; if (e.isDirectory()) await walk(this.path.join(d, e.name), r); else out.push(r); } };
    await walk(this.dir, '');
    return out.filter((k) => k.startsWith(prefix)).sort();
  }
  async delete(key) { const fs = await this._fs(); try { await fs.unlink(this._file(key)); } catch { /* nema */ } }
  acquireLock(key, ms, by, o = {}) { return softLock(this, key, ms, by, o.force); }
  async releaseLock(key) { await this.setJSON(key, { until: 0 }); }
}

export class MemoryStore {
  constructor() { this.m = new Map(); this.kind = 'memory'; }
  async getJSON(k) { return this.m.has(k) ? structuredClone(this.m.get(k)) : null; }
  async setJSON(k, v) { this.m.set(k, structuredClone(v)); }
  async list(p = '') { return [...this.m.keys()].filter((k) => k.startsWith(p)).sort(); }
  async delete(k) { this.m.delete(k); }
  acquireLock(key, ms, by, o = {}) { return softLock(this, key, ms, by, o.force); }
  async releaseLock(key) { await this.setJSON(key, { until: 0 }); }
}

let cached;
export function openStore() {
  if (cached) return cached;
  const env = globalThis.process?.env || {};
  try {
    cached = new BlobsStore(); // baca grešku ako Netlify Blobs nije dostupan
  } catch (e) {
    const inLambda = Boolean(env.AWS_LAMBDA_FUNCTION_NAME || env.LAMBDA_TASK_ROOT);
    if (inLambda || hasBlobsEnv()) console.warn('Netlify Blobs nije dostupan, koristim privremeno spremište:', e?.message);
    cached = new FileStore(env.VIDIKOVAC_DATA_DIR || (inLambda ? '/tmp/vidikovac' : '.data'));
  }
  return cached;
}
export function setStoreForTests(s) { cached = s; }
