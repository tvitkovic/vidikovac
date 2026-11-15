// GET /api/sync?id=KOD → { at, data }   PUT /api/sync?id=KOD  { at, data }
//
// Sinkronizacija postavki između mobitela i računala BEZ prijave: kod (id) koji preglednik sam izmisli
// je tajna. Tko ima kod, može čitati i pisati taj jedan zapis; bez koda nema pristupa ničemu.
// Sprema se samo ono što klijent smije sinkronizirati (teme, praćene priče, dionice, grad), najviše 40 KB.
import { openStore } from '../../lib/store.mjs';
import { jsonResponse } from '../../lib/http.mjs';

const ID_RE = /^[A-Za-z0-9_-]{32,64}$/;
export const SYNC_KEYS = ['vk-my', 'vk-track', 'vk-watch', 'vk-city'];
const MAX_BYTES = 40_000;
const maxGroups = () => Number(globalThis.process?.env?.VIDIKOVAC_SYNC_MAX) || 20;   // zaštita od zlouporabe spremišta

const noStore = { 'cache-control': 'no-store' };

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';
  if (!ID_RE.test(id)) return jsonResponse(req, { error: 'Neispravan kod.' }, 400, noStore);
  const store = openStore();
  const key = `sync/${id}`;
  try {
    if (req.method === 'GET') {
      const rec = await store.getJSON(key);
      return rec ? jsonResponse(req, rec, 200, noStore) : jsonResponse(req, { error: 'Taj kod ne postoji.' }, 404, noStore);
    }
    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > MAX_BYTES) return jsonResponse(req, { error: 'Postavke su prevelike za sinkronizaciju.' }, 413, noStore);
      let body;
      try { body = JSON.parse(text); } catch { return jsonResponse(req, { error: 'Neispravan JSON.' }, 400, noStore); }
      const at = Number(body?.at);
      if (!Number.isFinite(at) || at <= 0 || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
        return jsonResponse(req, { error: 'Neispravan oblik.' }, 400, noStore);
      }
      const data = {};
      for (const k of SYNC_KEYS) if (body.data[k] !== undefined && body.data[k] !== null) data[k] = body.data[k];
      const prev = await store.getJSON(key);
      if (!prev) {
        const n = (await store.getJSON('sync-count'))?.n || 0;
        if (n >= maxGroups()) return jsonResponse(req, { error: 'Dosegnut je najveći broj sinkroniziranih skupina.' }, 429, noStore);
        await store.setJSON('sync-count', { n: n + 1 });
      } else if (prev.at > at) {
        // novija verzija već postoji: klijent je zastario, neka je prvo preuzme
        return jsonResponse(req, prev, 409, noStore);
      }
      const rec = { at, data };
      await store.setJSON(key, rec);
      return jsonResponse(req, { ok: true, at }, 200, noStore);
    }
    return jsonResponse(req, { error: 'Koristi GET ili PUT.' }, 405, { ...noStore, allow: 'GET, PUT' });
  } catch (e) {
    console.error('sync', e);
    return jsonResponse(req, { error: 'Sinkronizacija trenutno nije dostupna.' }, 500, noStore);
  }
};

export const config = { path: '/api/sync' };
