// Ritam, perspektiva i mrtvi kut u sučelju.
//
// Pravilo za cijeli ovaj modul: ništa ne dobiva svoju rubriku ni svoju postavku.
// Oznake sjedaju na postojeći red vijesti, perspektiva u postojeću ladicu "Kako pišu drugi",
// greben na postojeći reljef, mrtvi kut na dno rubrike Svijet.

const SVG_NS = 'http://www.w3.org/2000/svg';

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };
const link = (url, text, cls) => {
  const href = safeUrl(url);
  return href ? h('a', { href, class: cls, target: '_blank', rel: 'noopener noreferrer' }, text) : h('span', { class: cls }, text);
};
function plural(n, [one, few, many]) {
  const a = Math.abs(n) % 10, b = Math.abs(n) % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}
const F_RED = ['redakcija', 'redakcije', 'redakcija'];
const F_VLAS = ['vlasnik', 'vlasnika', 'vlasnika'];
const count = (n, f) => `${n} ${plural(n, f)}`;

// ————————————————————————————————————————— oznake ritma

// Boja nosi smjer, a ne važnost: topla = raste, hladna = stala, siva = neprovjereno.
export const RHYTHM_CLASS = {
  lavina: 'rh-hot',
  uspon: 'rh-hot',
  sedlo: 'rh-warm',
  usutjelo: 'rh-cold',
  hladjenje: 'rh-cool',
  magla: 'rh-dim',
};

/** Oznake uz naslov: ritam, koji je dan priče, i što je u njoj novo. */
export function badges(s) {
  const out = [];
  if (s.rhythm?.label) {
    out.push(h('span', {
      class: `rh ${RHYTHM_CLASS[s.rhythm.code] || ''}`,
      title: [s.rhythm.hint, s.rhythm.note].filter(Boolean).join(' · '),
      text: s.rhythm.label,
    }));
  }
  if (s.day > 1) {
    const since = s.since ? new Date(s.since) : null;
    out.push(h('span', {
      class: 'rh rh-day',
      title: since ? `Prva objava ${since.toLocaleDateString('hr-HR', { day: 'numeric', month: 'long' })}` : null,
      text: `dan ${s.day}`,
    }));
  }
  if (s.fresh?.length) {
    out.push(h('span', { class: 'rh rh-fresh', title: 'Pojmovi kojih u ovoj priči dosad nije bilo', text: `novo: ${s.fresh.slice(0, 3).join(', ')}` }));
  }
  return out;
}

// ————————————————————————————————————————— perspektiva

const REGION_LABEL = { agency: 'Agencije', hr: 'Hrvatski', eu: 'Europski', world: 'Svijet' };
const REGION_ORDER = ['agency', 'hr', 'eu', 'world'];

/** Traka pokrivenosti: koliko redakcija odakle. Širina segmenta je udio, ne ocjena. */
export function coverageBar(counts = {}) {
  const total = REGION_ORDER.reduce((a, r) => a + (counts[r] || 0), 0);
  if (!total) return null;
  const bar = h('div', { class: 'cv-bar', role: 'img', 'aria-label': REGION_ORDER.filter((r) => counts[r]).map((r) => `${REGION_LABEL[r]}: ${counts[r]}`).join(', ') });
  for (const r of REGION_ORDER) {
    const n = counts[r] || 0;
    if (!n) continue;
    const seg = h('i', { class: `cv-${r}` });
    seg.style.width = `${(n / total) * 100}%`;
    bar.append(seg);
  }
  const legend = h('div', { class: 'cv-legend' }, ...REGION_ORDER.filter((r) => counts[r]).map((r) => h('span', { class: `cv-key cv-${r}` }, h('i'), `${REGION_LABEL[r]} ${counts[r]}`)));
  return h('div', { class: 'cv' }, bar, legend);
}

/** Rečenica o vlasništvu. Šuti kad nema što reći — ne izmišljamo koncentraciju. */
export function ownershipLine(p) {
  if (!p?.hrOutlets || p.hrOutlets < 2) return null;
  const bits = [`${count(p.hrOutlets, F_RED)}, ${count(p.owners, F_VLAS)}`];
  const shared = (p.shared || []).filter((x) => x.n > 1);
  if (shared.length) bits.push(shared.map((x) => `${x.owner}: ${x.n}`).join(', '));
  const note = p.owners < p.hrOutlets
    ? 'Dio domaćih naslova dolazi iz istog vlasništva.'
    : null;
  return h('p', { class: 'pv-own' }, h('b', { text: 'Vlasništvo: ' }), bits.join(' · '), note ? h('span', { class: 'pv-note', text: ` ${note}` }) : null);
}

/** Tko je objavio prvi i koliko se tekstova poziva na druge. */
export function originLine(p) {
  if (!p?.first?.length) return null;
  const bits = [h('b', { text: 'Prvi: ' }), p.first.slice(0, 3).join(', ')];
  if (p.relayed > 0) bits.push(h('span', { class: 'pv-note', text: ` · ${p.relayed} ${plural(p.relayed, ['tekst se poziva', 'teksta se pozivaju', 'tekstova se poziva'])} na drugi izvor` }));
  return h('p', { class: 'pv-first' }, ...bits);
}

/**
 * Sadržaj ladice "Kako pišu drugi": traka, vlasništvo, prvi izvor, slaganje, pa popis poveznica.
 * Popis poveznica ostaje isti kao prije — perspektiva se dodaje iznad njega.
 */
export function perspectivePanel(s) {
  const p = s.persp;
  if (!p) return null;
  const kids = [];
  const bar = coverageBar(p.counts);
  if (bar) kids.push(bar);
  const own = ownershipLine(p);
  if (own) kids.push(own);
  const org = originLine(p);
  if (org) kids.push(org);
  if (p.agree) {
    kids.push(h('p', { class: `pv-agree pv-${p.agree === 'slažu se' ? 'same' : 'diff'}` },
      h('b', { text: 'Opis: ' }),
      p.agree === 'slažu se' ? 'redakcije opisuju događaj sličnim riječima' : 'redakcije se razilaze u opisu, vrijedi pročitati dva izvora'));
  }
  if (!kids.length) return null;
  return h('div', { class: 'pv' }, ...kids);
}

// ————————————————————————————————————————— mrtvi kut

/**
 * Priče koje svijet pokriva a hrvatski mediji ne (i obrnuto).
 * Ide na dno rubrike Svijet, bez vlastite stavke u izborniku.
 */
export function blindspotBlock(bs) {
  const hr = bs?.hr || [], world = bs?.world || [];
  if (!hr.length && !world.length) return null;
  const row = (x) => h('li', { class: 'bs-row' },
    h('div', { class: 'bs-head' },
      link(x.url, x.title, 'bs-title'),
      h('span', { class: 'bs-n', text: `${count(x.n, F_RED)}, ${x.dir === 'hr' ? 'nijedna domaća' : 'nijedna svjetska'}` })),
    coverageBar(x.counts) || null);
  const kids = [];
  if (hr.length) {
    kids.push(h('h4', { text: 'Svijet piše, hrvatski mediji ne' }));
    kids.push(h('ul', null, ...hr.map(row)));
  }
  if (world.length) {
    kids.push(h('h4', { text: 'Hrvatski mediji pišu, svijet ne' }));
    kids.push(h('ul', null, ...world.map(row)));
  }
  kids.push(h('p', { class: 'bs-note', text: 'Uspoređuju se imena iz naslova u istom izdanju. Priča bez vlastitog imena se ne uspoređuje.' }));
  return h('section', { class: 'bs', id: 'mrtvi-kut' }, h('h3', { text: 'Mrtvi kut' }), ...kids);
}

// ————————————————————————————————————————— greben tjedna

const HR_WD = ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub'];
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/**
 * Sedam dnevnih profila jedan ispod drugog; današnji sprijeda i istaknut.
 * Crta se na isti canvas kao reljef, pa ne traži novo mjesto u rasporedu.
 */
export function drawRidge(canvas, ridge, { labels } = {}) {
  if (!canvas || !ridge?.length) return;
  const box = canvas.getBoundingClientRect();
  const W = Math.round(box.width), H = Math.round(box.height);
  if (!W || !H) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const rows = ridge.slice(-7);
  const padL = Math.max(16, W * 0.04), padR = labels === false ? Math.max(16, W * 0.04) : Math.max(54, W * 0.06);
  const padT = Math.max(18, H * 0.12), padB = Math.max(22, H * 0.14);
  const usable = H - padT - padB;
  const gap = usable / Math.max(1, rows.length - 1 + 1.6);
  const amp = gap * 1.75;
  const x0 = padL, x1 = W - padR;

  const base = cssVar('--contour') || '#8a8a8a';
  const hot = cssVar('--glow-2') || '#1D9E75';
  const ink = cssVar('--ink') || '#222';

  const globalMax = Math.max(0.0001, ...rows.flatMap((r) => (r.peaks || []).map((p) => p.h || 0)));

  rows.forEach((row, i) => {
    const isToday = i === rows.length - 1;
    const yBase = padT + gap * (i + 0.8);
    const peaks = (row.peaks || []).slice(0, 7);
    const pts = profile(peaks, globalMax, x0, x1, yBase, amp);
    if (pts.length < 2) return;

    if (isToday) {
      ctx.beginPath();
      moveThrough(ctx, pts);
      ctx.lineTo(x1, yBase); ctx.lineTo(x0, yBase); ctx.closePath();
      ctx.fillStyle = withAlpha(hot, 0.13);
      ctx.fill();
    }
    ctx.beginPath();
    moveThrough(ctx, pts);
    ctx.strokeStyle = isToday ? hot : base;
    ctx.globalAlpha = isToday ? 1 : 0.22 + (i / rows.length) * 0.4;
    ctx.lineWidth = isToday ? 1.6 : 0.8;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (labels !== false) {
      ctx.font = `${isToday ? '600 ' : ''}12px system-ui, sans-serif`;
      ctx.fillStyle = ink;
      ctx.globalAlpha = isToday ? 0.95 : 0.65;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(dayLabel(row.date, isToday), x1 + 8, yBase);
      ctx.globalAlpha = 1;
    }
  });
}

function dayLabel(date, isToday) {
  if (isToday) return 'danas';
  const d = new Date(`${date}T12:00`);
  return Number.isNaN(d.getTime()) ? '' : HR_WD[d.getDay()];
}

/** Vrhovi → glatka linija: svaki vrh je zvono, između njih je dolina. */
function profile(peaks, max, x0, x1, yBase, amp) {
  const N = 72;
  const span = x1 - x0;
  const centers = peaks.map((p, i) => ({
    x: x0 + span * ((i + 0.5) / Math.max(1, peaks.length)),
    h: (p.h || 0) / max,
    w: span / Math.max(2.2, peaks.length * 1.5),
  }));
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = x0 + (span * i) / N;
    let v = 0;
    for (const c of centers) {
      const d = (x - c.x) / c.w;
      v += c.h * Math.exp(-d * d * 2.2);
    }
    pts.push([x, yBase - Math.min(1.15, v) * amp]);
  }
  return pts;
}
function moveThrough(ctx, pts) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  ctx.lineTo(...pts.at(-1));
}
function withAlpha(c, a) {
  const s = c.trim();
  if (s.startsWith('#')) {
    const n = s.length === 4 ? s.slice(1).split('').map((x) => x + x).join('') : s.slice(1);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
    return `rgba(${r},${g},${b},${a})`;
  }
  const m = s.match(/\d+(\.\d+)?/g);
  return m ? `rgba(${m.slice(0, 3).join(',')},${a})` : `rgba(130,130,130,${a})`;
}

/** Prekidač danas / tjedan u zaglavlju reljefa. Jedna kontrola, bez nove postavke. */
export function reliefToggle(onChange, initial = 'danas') {
  let mode = initial;
  const mk = (v, label) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(mode === v), text: label });
    b.addEventListener('click', () => {
      if (mode === v) return;
      mode = v;
      for (const x of wrap.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
      onChange(mode);
    });
    return b;
  };
  const wrap = h('div', { class: 'seg relief-seg', role: 'group', 'aria-label': 'Prikaz reljefa' }, mk('danas', 'Danas'), mk('tjedan', 'Tjedan'));
  return wrap;
}

/** Rečenica o koncentraciji dana, za zaglavlje. */
export const moodLine = (mood) => (mood?.word ? `Dan: ${mood.word}` : null);
