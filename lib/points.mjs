// "Pet stvari za danas" bez umjetne inteligencije.
//
// Točke se biraju pravilima iz podataka koje izdanje već ima (pokrivenost, ritam, mrtvi kut, tržišta),
// pa ne treba API ključ i ne smije se dogoditi da netko "izmisli" činjenicu: svaka rečenica je
// predložak popunjen vrijednostima iz izdanja. Osvježava se sa svakim satnim izdanjem.

const KEY_MARKETS = new Set(['^GSPC', '^IXIC', '^DJI', '^GDAXI', '^STOXX50E', '^FTSE', '^N225', 'CROBEX', 'BZ=F', 'GC=F', 'EURUSD=X', 'BTC-USD']);
const MOVE_MIN = 1.5;            // najmanja dnevna promjena (u %) da tržište uđe u sažetak

const FORMS = (n, f) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? f[0] : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? f[1] : f[2])}`;
const redakcija = (n) => FORMS(n, ['redakcija', 'redakcije', 'redakcija']);
const pct = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(1).replace('.', ',')} %`;
const clip = (t, n = 130) => (t.length <= n ? t : `${t.slice(0, t.lastIndexOf(' ', n - 1) > 60 ? t.lastIndexOf(' ', n - 1) : n).replace(/[,;:\s]+$/, '')}…`);
const q = (t) => `„${clip(String(t || '').replace(/\s+/g, ' ').trim())}”`;

/** Priča s najvećom pokrivenošću među onima s tim ritmom, koja još nije uzeta. */
function pickByRhythm(lists, codes, used) {
  let best = null;
  for (const s of lists.flat()) {
    if (!s?.rhythm || !codes.includes(s.rhythm.code) || used.has(s.id)) continue;
    if (!best || (s.n || 0) > (best.n || 0)) best = s;
  }
  return best;
}

/**
 * @param {object} latest izdanje (hr, world, markets, blindspots, mood)
 * @returns {{at:string, model:null, headline:string, bullets:Array<{text:string, ids:string[]}>, translations:{}}|null}
 */
export function buildPoints(latest, { now = Date.now() } = {}) {
  const used = new Set();
  const out = [];
  const add = (text, id) => {
    if (!text || out.length >= 5) return;
    if (id) { if (used.has(id)) return; used.add(id); }
    out.push({ text, ids: id ? [id] : [] });
  };

  const world = latest.world || [];
  const hr = latest.hr || [];

  // 1. najveća svjetska priča
  const w0 = world[0];
  if (w0) add(`Svijet: ${q(w0.title)} — prati je ${redakcija(w0.n || 1)}.`, w0.id);

  // 2. najveća domaća priča
  const h0 = hr[0];
  if (h0) add(`Hrvatska: ${q(h0.title)} — ${redakcija(h0.n || 1)}.`, h0.id);

  // 3. priča koja ubrzava (lavina ima prednost pred usponom)
  const hot = pickByRhythm([world, hr], ['lavina'], used) || pickByRhythm([world, hr], ['uspon'], used);
  if (hot) add(`${hot.rhythm.code === 'lavina' ? 'Naglo raste' : 'Ubrzava'}: ${q(hot.title)} (${redakcija(hot.n || 1)}).`, hot.id);

  // 4. tržište s najvećim pomakom, ako je pomak velik
  let mover = null;
  for (const g of latest.markets?.groups || []) for (const i of g.items || []) {
    if (i.missing || i.pct == null || !KEY_MARKETS.has(i.sym)) continue;
    if (!mover || Math.abs(i.pct) > Math.abs(mover.pct)) mover = i;
  }
  if (mover && Math.abs(mover.pct) >= MOVE_MIN) add(`Tržišta: ${mover.name} ${pct(mover.pct)}${latest.markets?.stale ? ' (zadnji dostupni podatak)' : ''}.`);

  // 5. mrtvi kut: što svijet prati, a domaći mediji ne (ili obrnuto)
  const bsHr = latest.blindspots?.hr?.[0];
  const bsWorld = latest.blindspots?.world?.[0];
  if (bsHr) add(`Mrtvi kut: svijet piše o ${q(bsHr.title)} (${redakcija(bsHr.n)}), domaći mediji ne.`, bsHr.id);
  else if (bsWorld) add(`Mrtvi kut: domaći mediji prate ${q(bsWorld.title)}, svjetski ne.`, bsWorld.id);

  // 6. priča koja je utihnula
  const quiet = pickByRhythm([world, hr], ['usutjelo'], used);
  if (quiet) add(`Utihnulo: ${q(quiet.title)}${quiet.rhythm.note ? ` (${quiet.rhythm.note})` : ''}.`, quiet.id);

  // popuni do pet sljedećim pričama po pokrivenosti
  for (const s of [...world.slice(1), ...hr.slice(1)].sort((a, b) => (b.n || 0) - (a.n || 0))) {
    if (out.length >= 5) break;
    add(`${world.includes(s) ? 'Svijet' : 'Hrvatska'}: ${q(s.title)} — ${redakcija(s.n || 1)}.`, s.id);
  }

  if (!out.length) return null;
  return {
    at: new Date(now).toISOString(),
    model: null,
    headline: latest.mood?.word ? `Dan: ${latest.mood.word}.` : '',
    bullets: out,
    translations: {},
  };
}
