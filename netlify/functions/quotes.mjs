// GET /api/quotes?s=AAPL,NVDA,VWCE.DE — kotacije za osobni popis (do 15 simbola).
import { fetchQuotes } from '../../lib/markets.mjs';
import { jsonResponse } from '../../lib/http.mjs';

export default async (req) => {
  const s = (new URL(req.url).searchParams.get('s') || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!s.length) return jsonResponse(req, { error: 'Dodaj barem jedan simbol, npr. ?s=AAPL,NVDA' }, 400);
  try {
    const quotes = await fetchQuotes(s);
    return jsonResponse(req, { asOf: new Date().toISOString(), quotes }, 200, {
      'cache-control': 'public, max-age=120',
      'netlify-cdn-cache-control': 'public, s-maxage=300',
    });
  } catch (e) {
    console.error('quotes', e);
    return jsonResponse(req, { error: 'Kotacije trenutno nisu dostupne.' }, 502, { 'cache-control': 'no-store' });
  }
};

export const config = { path: '/api/quotes' };
