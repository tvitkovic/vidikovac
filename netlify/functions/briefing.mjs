// GET /api/briefing — najnovije izdanje (po potrebi ga gradi). ?refresh=1 osvježava ako je starije od 10 min.
//
// Odgovor stoji na CDN-u do sljedećeg izdanja; satni posao ga isprazni (lib/cdn.mjs).
// Zato ovdje smije stajati dug s-maxage: posjetitelj nikad ne vidi staro izdanje nakon osvježenja.
import { getLatest } from '../../lib/build.mjs';
import { jsonResponse } from '../../lib/http.mjs';
import { editionHeaders } from '../../lib/cdn.mjs';

export default async (req) => {
  const url = new URL(req.url);
  const refresh = url.searchParams.get('refresh') === '1';
  try {
    const { data, built } = await getLatest({ refresh });
    if (!data) return jsonResponse(req, { error: 'Izdanje se upravo sastavlja. Pokušaj ponovno za minutu.' }, 503, { 'retry-after': '60', 'cache-control': 'no-store' });
    const headers = refresh
      ? { 'cache-control': 'no-store', 'netlify-cdn-cache-control': 'no-store' }
      : editionHeaders();
    return jsonResponse(req, data, 200, { ...headers, 'x-vidikovac-built': built ? 'now' : 'cached' });
  } catch (e) {
    console.error('briefing', e);
    return jsonResponse(req, { error: 'Izdanje trenutno nije dostupno.', detail: String(e?.message || e).slice(0, 200) }, 500, { 'cache-control': 'no-store' });
  }
};

export const config = { path: '/api/briefing' };
