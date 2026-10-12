// Pražnjenje CDN predmemorije kad izađe novo izdanje.
//
// Prije ovoga svako otvaranje stranice budilo je funkciju (s-maxage je bio 120 s).
// Sada /api/briefing stoji na Netlifyjevu CDN-u do sat vremena i prazni se tek kad
// satni posao napravi novo izdanje, pa funkcija radi jednom po izdanju, a ne po posjetu.

export const BRIEFING_TAG = 'vidikovac-briefing';

/** Oznake se šalju u zaglavlju odgovora; CDN po njima zna što isprazniti. */
export const cacheTag = (...tags) => tags.filter(Boolean).join(',');

/**
 * Isprazni predmemoriju za oznaku. Tiho odustaje izvan Netlifyja (lokalni razvoj, testovi).
 * @returns {Promise<boolean>} je li pražnjenje doista izvedeno
 */
export async function purgeTag(tag = BRIEFING_TAG) {
  try {
    const mod = await import('@netlify/functions');
    if (typeof mod.purgeCache !== 'function') return false;
    await mod.purgeCache({ tags: [tag] });
    return true;
  } catch (e) {
    const msg = String(e?.message || e);
    // izvan Netlifyja modul ne postoji — to nije greška
    if (!/Cannot find package|ERR_MODULE_NOT_FOUND/i.test(msg)) console.warn('purge', msg);
    return false;
  }
}

/**
 * Zaglavlja za odgovor koji se smije keširati do sljedećeg izdanja.
 * `durable` drži kopiju i nakon što istekne s-maxage, pa posjetitelj dobije
 * stari sadržaj odmah dok se u pozadini osvježava.
 */
export function editionHeaders({ maxAge = 60, sMaxAge = 3600, swr = 600, tag = BRIEFING_TAG } = {}) {
  return {
    'cache-control': `public, max-age=${maxAge}`,
    'netlify-cdn-cache-control': `public, durable, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    'cache-tag': tag,
  };
}
