// GET /api/archive — popis jutarnjih izdanja i tjednih pregleda znanosti.
// GET /api/archive?date=YYYY-MM-DD — jutarnje izdanje tog dana; ?week=YYYY-Www — tjedni pregled znanosti.
import { openStore } from '../../lib/store.mjs';
import { jsonResponse } from '../../lib/http.mjs';

export default async (req) => {
  const store = openStore();
  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  const week = url.searchParams.get('week');
  const json = (data, status = 200, cache = 'public, max-age=300') => jsonResponse(req, data, status, { 'cache-control': cache });
  try {
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'Neispravan datum.' }, 400);
      const ed = await store.getJSON(`edition/${date}`);
      return ed ? json(ed, 200, 'public, max-age=3600') : json({ error: 'Za taj dan nema spremljenog izdanja.' }, 404);
    }
    if (week) {
      if (!/^\d{4}-W\d{2}$/.test(week)) return json({ error: 'Neispravan tjedan.' }, 400);
      const wk = await store.getJSON(`science-week/${week}`);
      return wk ? json(wk, 200, 'public, max-age=3600') : json({ error: 'Za taj tjedan nema spremljenog pregleda.' }, 404);
    }
    const [editions, weeks] = await Promise.all([store.getJSON('editions-index'), store.getJSON('science-weeks-index')]);
    return json({ editions: editions || [], weeks: weeks || [] });
  } catch (e) {
    console.error('archive', e);
    return json({ error: 'Arhiva trenutno nije dostupna.' }, 500, 'no-store');
  }
};

export const config = { path: '/api/archive' };
