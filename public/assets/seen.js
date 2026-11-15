// "Novo od zadnjeg posjeta": preglednik pamti koje je priče (po trajnom sid-u) već vidio.
//
// Snimka se uzima jednom pri učitavanju stranice, pa se kartica ne zatamni dok je čitaš ili dok se
// stranica osvježava u pozadini. Što vidiš tijekom posjeta, zatamnjuje se tek pri sljedećem posjetu.
// Sve je lokalno: ništa se ne šalje poslužitelju.

const KEY = 'vk-seen';
const TTL = 7 * 24 * 3600_000;
const MAX = 600;
const DWELL_MS = 1200;      // koliko dugo kartica mora biti na ekranu da se računa kao viđena
const GROWTH = 3;           // toliko novih redakcija "otključava" viđenu priču

function read() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || '{}');
    const now = Date.now();
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v && now - v.t < TTL));
  } catch { return {}; }
}

const snap = read();          // što je bilo viđeno prije ovog posjeta
const live = { ...snap };     // što bilježimo tijekom ovog posjeta
let timer = null;

function persist() {
  timer = null;
  try {
    const ents = Object.entries(live).sort((a, b) => b[1].t - a[1].t).slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(ents)));
  } catch { /* pun spremnik ili privatni način: tiho odustani */ }
}
function schedule() { if (!timer) timer = setTimeout(persist, 1500); }
addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); persist(); } });

/** 'new' (nikad viđena), 'updated' (viđena, ali se bitno promijenila), 'seen' ili null (nema sid-a). */
export function seenState(s) {
  if (!s?.sid) return null;
  const rec = snap[s.sid];
  if (!rec) return 'new';
  const fresh = (s.fresh || []).join(',');
  const grew = (s.n || 0) >= (rec.n || 0) + GROWTH;
  const newTerms = fresh && fresh !== (rec.f || '');
  const heating = (s.rhythm?.code === 'lavina' || s.rhythm?.code === 'uspon') && (s.n || 0) > (rec.n || 0);
  return grew || newTerms || heating ? 'updated' : 'seen';
}

/** Je li ovo prvi posjet (ili je pamćenje isteklo): tada se ništa ne zatamnjuje. */
export const hasHistory = () => Object.keys(snap).length > 0;

/** Zabilježi priču kao viđenu. */
export function markSeen(s) {
  if (!s?.sid) return;
  live[s.sid] = { n: s.n || 0, f: (s.fresh || []).join(','), t: Date.now() };
  schedule();
}

const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target;
      if (e.isIntersecting) {
        el._seenT = setTimeout(() => { markSeen(el._story); io.unobserve(el); }, DWELL_MS);
      } else if (el._seenT) { clearTimeout(el._seenT); el._seenT = null; }
    }
  }, { threshold: 0.6 })
  : null;

/** Počni pratiti karticu: bit će zabilježena kad ostane na ekranu dovoljno dugo. */
export function watch(el, s) {
  if (!io || !s?.sid) return;
  el._story = s;
  io.observe(el);
}

/** Koliko je priča na popisu novo ili dopunjeno u odnosu na prošli posjet. */
export function countFresh(...lists) {
  if (!hasHistory()) return 0;
  const seen = new Set();
  let n = 0;
  for (const list of lists) for (const s of list || []) {
    if (!s?.sid || seen.has(s.sid)) continue;
    seen.add(s.sid);
    if (seenState(s) !== 'seen') n++;
  }
  return n;
}
