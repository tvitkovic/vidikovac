// HTTP dohvat s vremenskim ograničenjem, uvjetnim zahtjevima (ETag) i ograničenom paralelnošću.

const ascii = (s) => String(s || '').replace(/[^\x20-\x7E]/g, '').replace(/[()]/g, '').trim();
const siteUrl = () => ascii(globalThis.process?.env?.URL) || 'https://vidikovac.netlify.app';
// Opcionalni kontakt (e-mail ili URL) za User-Agent: Wikimedia i neki izdavači traže da se automatski alat može identificirati.
const contact = () => ascii(globalThis.process?.env?.VIDIKOVAC_CONTACT).slice(0, 120);

/** User-Agent za automatske zahtjeve: naziv alata, adresa stranice i (ako je postavljen) kontakt. */
export const botUA = (purpose = 'personal news reader') => `Vidikovac/1.0 (+${siteUrl()}${contact() ? `; ${contact()}` : ''}; ${purpose})`;
export const UA_FEED = () => botUA('personal news reader');
export const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

function charsetOf(contentType, bytes) {
  let cs = (contentType || '').match(/charset=["']?([\w-]+)/i)?.[1];
  if (!cs) {
    const head = new TextDecoder('ascii').decode(bytes.subarray(0, 200));
    cs = head.match(/encoding=["']([\w-]+)["']/i)?.[1];
  }
  cs = (cs || 'utf-8').toLowerCase();
  if (cs === 'utf8') cs = 'utf-8';
  return cs;
}

/**
 * @returns {Promise<{ok:boolean,status:number,text?:string,etag?:string,lastModified?:string,notModified?:boolean,ms:number,error?:string,url:string}>}
 */
export async function fetchText(url, { timeout = 7000, headers = {}, etag, lastModified, ua } = {}) {
  const t0 = Date.now();
  const h = {
    'user-agent': ua || UA_FEED(),
    accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, application/json;q=0.8, */*;q=0.5',
    'accept-language': 'hr,en;q=0.8',
    ...headers,
  };
  if (etag) h['if-none-match'] = etag;
  if (lastModified) h['if-modified-since'] = lastModified;
  try {
    const res = await fetch(url, { headers: h, redirect: 'follow', signal: AbortSignal.timeout(timeout) });
    if (res.status === 304) return { ok: true, notModified: true, status: 304, ms: Date.now() - t0, url };
    const buf = new Uint8Array(await res.arrayBuffer());
    let text;
    try { text = new TextDecoder(charsetOf(res.headers.get('content-type'), buf)).decode(buf); }
    catch { text = new TextDecoder('utf-8').decode(buf); }
    return {
      ok: res.ok, status: res.status, text,
      etag: res.headers.get('etag') || undefined,
      lastModified: res.headers.get('last-modified') || undefined,
      ms: Date.now() - t0, url,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    const msg = e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timeout' : (e?.cause?.code || e?.message || 'greška');
    return { ok: false, status: 0, ms: Date.now() - t0, url, error: String(msg).slice(0, 80) };
  }
}

export async function fetchJSON(url, opts = {}) {
  const r = await fetchText(url, { ...opts, headers: { accept: 'application/json', ...(opts.headers || {}) } });
  if (!r.ok || r.notModified) return { ...r, data: null };
  try { return { ...r, data: JSON.parse(r.text) }; }
  catch { return { ...r, ok: false, data: null, error: 'neispravan JSON' }; }
}

/** Paralelno mapiranje s ograničenjem istovremenih zadataka. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); } catch (e) { out[idx] = { error: e?.message || String(e) }; }
    }
  });
  await Promise.all(workers);
  return out;
}
