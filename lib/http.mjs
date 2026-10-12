// JSON odgovori funkcija, sažeti (brotli/gzip) kad ih preglednik prihvaća.
// Netlify odgovore funkcija ne sažima uvijek sam, a izdanje ima ~180 KB JSON-a (sažeto ~50 KB).
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const MIN_BYTES = 1024;

/**
 * @param {Request|null} req  dolazni zahtjev (za Accept-Encoding)
 * @param {any} data
 * @param {number} [status]
 * @param {Record<string,string>} [headers]
 */
export function jsonResponse(req, data, status = 200, headers = {}) {
  const raw = Buffer.from(JSON.stringify(data));
  const h = { 'content-type': 'application/json; charset=utf-8', vary: 'accept-encoding', ...headers };
  const accept = req?.headers?.get?.('accept-encoding') || '';
  if (raw.length >= MIN_BYTES) {
    if (/\bbr\b/i.test(accept)) {
      const body = brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length } });
      return new Response(body, { status, headers: { ...h, 'content-encoding': 'br' } });
    }
    if (/\bgzip\b/i.test(accept)) {
      return new Response(gzipSync(raw, { level: 6 }), { status, headers: { ...h, 'content-encoding': 'gzip' } });
    }
  }
  return new Response(raw, { status, headers: h });
}
