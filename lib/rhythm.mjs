// Ritam priče: kamo ide, ne koliko je velika. Alpski rječnik, ali svaki pojam ima mjeru.
//
//   lavina    — iz ničega u široku pokrivenost za manje od 6 h
//   uspon     — priča ubrzava
//   sedlo     — zatišje pa ponovni rast unutar 48 h
//   ušutjelo  — 18 h bez novog članka nakon vrha  (najkorisniji signal u brifingu)
//   hlađenje  — vrh je prošao, još se piše ali sve manje
//   magla     — jedva potvrđeno: najviše dvije redakcije i nijedna agencija
const H = 3_600_000;

export const SIGNALS = {
  lavina: { label: 'lavina', hint: 'iz ničega u široku pokrivenost za manje od 6 sati' },
  uspon: { label: 'uspon', hint: 'priča ubrzava' },
  sedlo: { label: 'sedlo', hint: 'zatišje pa ponovni rast' },
  usutjelo: { label: 'ušutjelo', hint: 'nema novog članka 18 sati nakon vrha' },
  hladjenje: { label: 'hlađenje', hint: 'vrh je prošao, pokrivenost pada' },
  magla: { label: 'magla', hint: 'jedva potvrđeno, nema agencije' },
};

/** Niz {t, n} iz zapisa sati, poredan po vremenu. */
export function series(hours = {}, now = Date.now(), windowH = 72) {
  return Object.entries(hours)
    .map(([t, n]) => ({ t: Number(t), n: Number(n) || 0 }))
    .filter((x) => Number.isFinite(x.t) && now - x.t <= windowH * H)
    .sort((a, b) => a.t - b.t);
}

/**
 * Koliko je članaka priraslo u zadnjih `h` sati.
 * Vraća null kad nema snimka starog barem `h` sati: bez osnove za usporedbu ne znamo je li priča
 * rasla ili je tek prvi put viđena. (Prije se u tom slučaju cijeli broj članaka brojao kao rast,
 * pa je svaka nova priča izgledala kao nagli uspon.)
 */
export function growth(ser, now, h) {
  if (ser.length < 2) return null;
  const cutoff = now - h * H;
  const before = ser.filter((x) => x.t <= cutoff).at(-1);
  const last = ser.at(-1);
  if (!last || !before) return null;
  return Math.max(0, last.n - before.n);
}

/**
 * Odredi ritam priče.
 * @param {{hours?:object, peak?:number, peakAt?:number, first?:number, days?:object}} rec
 * @param {{outlets:number, articles:number, hasAgency?:boolean, newest?:number}} cur
 */
export function rhythmOf(rec = {}, cur = {}, now = Date.now()) {
  const ser = series(rec.hours, now);
  const outlets = cur.outlets || 0;
  const newest = cur.newest || rec.last || now;
  // Starost priče = od njezina prvog članka, ne od prvog viđenja u našoj bazi (baza je mlada).
  const firstSeen = Math.min(rec.first || Infinity, cur.oldest || Infinity);
  const ageH = (now - (Number.isFinite(firstSeen) ? firstSeen : newest)) / H;
  const sinceNew = (now - newest) / H;
  const sincePeak = rec.peakAt ? (now - rec.peakAt) / H : null;

  const g6n = growth(ser, now, 6);
  const g12n = growth(ser, now, 12);
  const known = g6n != null && g12n != null; // imamo li barem 12 h povijesti za usporedbu
  const g6 = g6n ?? 0;
  const prev6 = known ? Math.max(0, g12n - g6n) : 0;
  const vel = g6 / 6;

  const base = { velocity: Math.round(vel * 100) / 100, g6, sinceNew: Math.round(sinceNew * 10) / 10 };

  if (outlets <= 2 && !cur.hasAgency && ageH < 36) return { ...base, code: 'magla', ...SIGNALS.magla };
  if (ageH <= 6 && outlets >= 8) return { ...base, code: 'lavina', ...SIGNALS.lavina };
  if (known && g6 >= 3 && g6 > prev6 * 1.5) return { ...base, code: 'uspon', ...SIGNALS.uspon };

  if (sincePeak != null && sincePeak >= 18 && sinceNew >= 18) {
    return { ...base, code: 'usutjelo', ...SIGNALS.usutjelo, note: `tišina ${Math.round(sinceNew)} h` };
  }
  if (isSaddle(ser, now)) return { ...base, code: 'sedlo', ...SIGNALS.sedlo };
  if (known && sincePeak != null && sincePeak >= 12 && g6 > 0 && g6 < prev6 * 0.6) {
    return { ...base, code: 'hladjenje', ...SIGNALS.hladjenje };
  }
  return { ...base, code: null, label: null };
}

/** Pad pa ponovni rast unutar 48 h: priča koja se vratila. */
export function isSaddle(ser, now) {
  const w = ser.filter((x) => now - x.t <= 48 * H);
  if (w.length < 5) return false;
  const d = [];
  for (let i = 1; i < w.length; i++) d.push(w[i].n - w[i - 1].n);
  let quiet = 0, rose = false;
  for (let i = 0; i < d.length; i++) {
    if (d[i] <= 0) quiet++;
    else if (quiet >= 6) { rose = d[i] >= 2; if (rose) break; }
    else quiet = 0;
  }
  return rose;
}

/**
 * Koncentracija dana: koliko je dan "gurnut" u jednu priču.
 * Herfindahlov indeks udjela, 0 = rascjepkano, 1 = sve o jednoj temi.
 */
export function concentration(weights = []) {
  const tot = weights.reduce((a, b) => a + b, 0);
  if (tot <= 0) return 0;
  let hhi = 0;
  for (const w of weights) { const s = w / tot; hhi += s * s; }
  return Math.round(hhi * 1000) / 1000;
}

/** Riječ za koncentraciju, za rečenicu u zaglavlju. */
export function concentrationWord(hhi, n) {
  if (!n) return null;
  if (hhi >= 0.30) return 'dan jedne priče';
  if (hhi >= 0.18) return 'dan s jasnim vrhom';
  if (hhi >= 0.10) return 'nekoliko usporednih priča';
  return 'rascjepkan dan';
}

/**
 * Greben tjedna: zadnjih 7 dnevnih profila za crtanje.
 * history: [{ date, peaks: [{label, h, n}] }] — najnoviji bilo gdje u nizu.
 */
export function buildRidge(history = [], today, days = 7) {
  const byDate = new Map(history.filter((x) => x?.date).map((x) => [x.date, x]));
  if (today?.date) byDate.set(today.date, today);
  const dates = [...byDate.keys()].sort().slice(-days);
  return dates.map((date) => {
    const e = byDate.get(date);
    const peaks = (e.peaks || []).slice(0, 8).map((p) => ({ label: p.label, h: p.h, n: p.n }));
    return { date, peaks, max: Math.max(0, ...peaks.map((p) => p.h || 0)) };
  });
}
