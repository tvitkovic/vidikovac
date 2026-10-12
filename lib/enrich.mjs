// Spaja trajni identitet priče, ritam i perspektivu s već složenim rubrikama.
//
// Namjerno stoji sa strane: build.mjs ga zove u try/catch, pa ako ovdje nešto pukne,
// izdanje izađe kakvo je bilo i prije — bez oznaka, ali cijelo.
import { assignStories, emptyStories, whatsNew } from './story.mjs';
import { rhythmOf, concentration, concentrationWord, buildRidge } from './rhythm.mjs';
import { perspectiveOf, blindspots, divergence } from './perspective.mjs';
import { isAgency } from './ownership.mjs';
import { hashStr } from './text.mjs';
import { zagreb } from './time.mjs';

export const RIDGE_DAYS = 7;
const RIDGE_KEEP = 21;

const storyId = (c) => hashStr(c.rep?.curl || c.rep?.url || '');

/** Jedna mapa id → zapis priče, preko svih rubrika. */
function indexStories(sections) {
  const byId = new Map();
  for (const key of ['hr', 'world', 'markets', 'hrBiz']) {
    (sections[key] || []).forEach((s, i) => { if (!byId.has(s.id)) { byId.set(s.id, s); rankOf.set(s, i); } });
  }
  return byId;
}

// Mjesto priče u vlastitoj rubrici (0 = najviše). „Magla” je informativna samo kod priča koje su
// visoko na ljestvici; na dnu rubrike gotovo svaka priča ima jedan izvor, pa bi oznaka bila šum.
const rankOf = new WeakMap();
const MAGLA_TOP = 4;

/**
 * Obogati rubrike i vrati ono što ide u izdanje uz njih.
 *
 * @param {object} sections rezultat buildNewsSections (mora nositi _clusters)
 * @param {object} storiesState prethodno stanje stories/open
 * @param {Array}  reliefHistory prethodni dnevni profili
 * @param {Array}  relief današnji profil
 * @param {number} now
 */
export function enrichEdition({ sections, storiesState, reliefHistory = [], relief = [], now = Date.now() } = {}) {
  const cl = sections?._clusters || {};
  const world = cl.world || [];
  const hr = cl.hr || [];
  const all = [...world, ...hr, ...(cl.markets || []), ...(cl.hrBiz || [])];
  const day = zagreb(now).date;

  const { state, assign } = assignStories(storiesState || emptyStories(), all, now);
  const byId = indexStories(sections);
  const rec = (id) => state.byId[id];

  let tagged = 0;
  for (const c of all) {
    const a = assign.get(c);
    if (!a) continue;
    const s = byId.get(storyId(c));
    if (!s) continue;

    const hasAgency = (c.items || []).some((i) => isAgency(i.outlet));
    const r = rhythmOf(rec(a.id) || {}, {
      outlets: c.outlets || 0,
      articles: (c.items || []).length,
      hasAgency,
      newest: c.newest,
    }, now);

    s.sid = a.id;
    s.day = a.day;
    if (a.day > 1) s.since = new Date(a.first).toISOString();
    const hideFog = r.code === 'magla' && (rankOf.get(s) ?? 99) >= MAGLA_TOP;
    if (r.code && !hideFog) s.rhythm = { code: r.code, label: r.label, hint: r.hint, note: r.note };
    const fresh = whatsNew(rec(a.id), c, day);
    if (fresh.length && a.day > 1) s.fresh = fresh;

    const p = perspectiveOf(c);
    if (p.total >= 2) {
      s.persp = {
        counts: p.counts,
        owners: p.owners,
        hrOutlets: p.hrOutlets,
        shared: p.sharedOwners,
        first: p.first,
        relayed: p.relayed,
      };
      const dv = divergence(c);
      if (dv?.level) s.persp.agree = dv.level;
    }
    tagged++;
  }

  // mrtvi kut u oba smjera
  const bs = blindspots(world, hr, { minOutlets: 8, limit: 4 });
  const toCard = (x, dir) => {
    const s = byId.get(storyId(x.c));
    const p = perspectiveOf(x.c);
    return {
      id: storyId(x.c),
      title: x.c.rep?.title || '',
      url: x.c.rep?.url || '',
      src: x.c.rep?.oname || '',
      n: x.c.outlets || 0,
      dir,
      counts: p.counts,
      linked: Boolean(s),
    };
  };
  const blind = {
    hr: bs.hr.map((x) => toCard(x, 'hr')),
    world: bs.world.map((x) => toCard(x, 'world')),
  };

  // koncentracija dana i greben tjedna
  const hhi = concentration((relief || []).map((p) => p.h || 0));
  const today = { date: day, peaks: (relief || []).map((p) => ({ label: p.label, h: p.h, n: p.n })) };
  const history = [...(reliefHistory || []).filter((x) => x?.date && x.date !== day), today]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-RIDGE_KEEP);

  return {
    storiesState: state,
    reliefHistory: history,
    ridge: buildRidge(history, today, RIDGE_DAYS),
    blindspots: blind,
    mood: { hhi, word: concentrationWord(hhi, (relief || []).length) },
    tagged,
  };
}
