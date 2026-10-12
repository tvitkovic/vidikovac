// Spremište: Netlify Blobs u produkciji, lokalne JSON datoteke za razvoj i testove.
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'vidikovac';

function hasBlobsEnv() {
  return Boolean(globalThis.netlifyBlobsContext || globalThis.process?.env?.NETLIFY_BLOBS_CONTEXT || globalThis.Netlify?.env?.get?.('NETLIFY_BLOBS_CONTEXT'));
}

class BlobsStore {
  constructor() { this.s = getStore({ name: STORE_NAME, consistency: 'strong' }); this.kind = 'blobs'; }
  async getJSON(key) { try { return (await this.s.get(key, { type: 'json' })) ?? null; } catch (e) { console.warn('blobs get', key, e?.message); return null; } }
  async setJSON(key, value) { await this.s.setJSON(key, value); }
  async list(prefix) { const { blobs } = await this.s.list({ prefix }); return blobs.map((b) => b.key); }
  async delete(key) { await this.s.delete(key); }
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
}

export class MemoryStore {
  constructor() { this.m = new Map(); this.kind = 'memory'; }
  async getJSON(k) { return this.m.has(k) ? structuredClone(this.m.get(k)) : null; }
  async setJSON(k, v) { this.m.set(k, structuredClone(v)); }
  async list(p = '') { return [...this.m.keys()].filter((k) => k.startsWith(p)).sort(); }
  async delete(k) { this.m.delete(k); }
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
