// Vrijeme u Zagrebu (CET/CEST) neovisno o vremenskoj zoni poslužitelja.
export const TZ = 'Europe/Zagreb';

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
});

export function zagreb(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  const wd = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
  return {
    y: +p.year, m: +p.month, d: +p.day, H: +p.hour, M: +p.minute, wd,
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}

const HR_DAYS = ['', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota', 'nedjelja'];
const HR_MONTHS_GEN = ['', 'siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];

export function hrLongDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
  return `${HR_DAYS[wd]}, ${d}. ${HR_MONTHS_GEN[m]} ${y}.`;
}

/** ISO tjedan za datum 'YYYY-MM-DD' → { id: '2026-W41', from: 'YYYY-MM-DD' (pon), to: 'YYYY-MM-DD' (ned) } */
export function isoWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = dt.getUTCDay() || 7;
  const monday = new Date(dt); monday.setUTCDate(dt.getUTCDate() - wd + 1);
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
  const thursday = new Date(dt); thursday.setUTCDate(dt.getUTCDate() + 4 - wd);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  const iso = (x) => x.toISOString().slice(0, 10);
  return { id: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`, week, from: iso(monday), to: iso(sunday) };
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export const HOUR = 3_600_000;
