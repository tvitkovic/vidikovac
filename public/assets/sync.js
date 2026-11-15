// Sinkronizacija postavki između uređaja (mobitel ↔ računalo) bez prijave.
//
// Kod koji se izmisli u pregledniku je jedina tajna; sprema se samo ono što je nabrojano u KEYS.
// Pobjeđuje novija izmjena (cijeli paket, ne pojedina polja), što je dovoljno za jednog korisnika.

export const KEYS = ['vk-my', 'vk-track', 'vk-watch', 'vk-city'];
const META = 'vk-sync';
const ID_RE = /^[A-Za-z0-9_-]{32,64}$/;

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* pun spremnik */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ništa */ } },
};

let meta = ls.get(META);                 // { id, at } ili null
let timer = null;

export const enabled = () => Boolean(meta?.id);
export const code = () => meta?.id || '';

function newId() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bundle() {
  const data = {};
  for (const k of KEYS) { const v = ls.get(k); if (v != null) data[k] = v; }
  return data;
}

async function api(method, body) {
  const res = await fetch(`/api/sync?id=${encodeURIComponent(meta.id)}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/** Pozovi nakon svake lokalne promjene sinkroniziranog ključa. */
export function touch(key) {
  if (!enabled() || !KEYS.includes(key)) return;
  meta.at = Date.now();
  ls.set(META, meta);
  clearTimeout(timer);
  timer = setTimeout(() => push().catch(() => {}), 4000);
}

export async function push() {
  if (!enabled()) return { ok: false };
  const { status, json } = await api('PUT', { at: meta.at, data: bundle() });
  if (status === 409) return { ok: false, conflict: json };     // na poslužitelju je novije: preuzmi ga pri sljedećem pull()
  return { ok: status === 200, status, error: json.error };
}

/** Preuzmi udaljeni paket ako je noviji od lokalnog. Vraća true kad su postavke primijenjene (treba ponovno iscrtati). */
export async function pull() {
  if (!enabled()) return false;
  const { status, json } = await api('GET');
  if (status !== 200 || !json?.data) return false;
  if (!(json.at > (meta.at || 0))) return false;
  for (const k of KEYS) {
    if (json.data[k] !== undefined) ls.set(k, json.data[k]); else ls.del(k);
  }
  meta.at = json.at;
  ls.set(META, meta);
  return true;
}

/** Uključi na ovom uređaju: izmisli kod i pošalji trenutne postavke. */
export async function enable() {
  meta = { id: newId(), at: Date.now() };
  ls.set(META, meta);
  const r = await push();
  if (!r.ok) { const err = r.error || 'Poslužitelj nije prihvatio postavke.'; disable(); throw new Error(err); }
  return meta.id;
}

/** Poveži ovaj uređaj s postojećim kodom i preuzmi postavke. */
export async function join(raw) {
  const id = String(raw || '').trim();
  if (!ID_RE.test(id)) throw new Error('Kod nije ispravan. Kopiraj ga s drugog uređaja u cijelosti.');
  meta = { id, at: 0 };
  const { status, json } = await api('GET');
  if (status !== 200) { meta = ls.get(META); throw new Error(json?.error || 'Taj kod ne postoji.'); }
  ls.set(META, meta);
  const applied = await pull();
  return applied;
}

export function disable() { meta = null; ls.del(META); clearTimeout(timer); }
