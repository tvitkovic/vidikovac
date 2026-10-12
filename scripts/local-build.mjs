// Lokalno sastavljanje izdanja (bez Netlifyja): podaci se spremaju u .data/
//   node scripts/local-build.mjs            → jedno izdanje
//   node scripts/local-build.mjs --force    → dohvati sve izvore bez obzira na raspored
import { runBuild } from '../lib/build.mjs';
const force = process.argv.includes('--force');
const r = await runBuild({ trigger: 'local', force, budgetMs: 25000 });
if (r.skipped) { console.log('Preskočeno:', r.skipped); process.exit(0); }
const L = r.latest;
console.log(`Gotovo za ${r.ms} ms (dohvat ${L.timing.fetchMs} ms, feedova na redu: ${L.timing.due}) — ${L.dateLong} ${L.time}`);
console.log(`Vijesti: ${L.counts.news}, redakcija: ${L.counts.outlets}, feedovi ok: ${L.counts.feedsOk}/${L.counts.feedsTotal}${r.isMorning ? ', spremljeno jutarnje izdanje' : ''}`);
console.log('Hrvatska:', L.hr.slice(0, 3).map((s) => s.title).join(' | '));
console.log('Svijet:', L.world.slice(0, 3).map((s) => s.title).join(' | '));
console.log('Znanost (tema tjedna):', L.science.feature?.title, `— ${L.science.counts.articles} članaka`);
console.log('Tržišta:', L.markets.groups?.[0]?.items?.slice(0, 3).map((i) => `${i.name} ${i.pct?.toFixed(2)}%`).join(', '));
console.log('Na današnji dan:', L.extras?.onThisDay?.events?.length ?? 0, 'događaja; najčitanije HR:', L.extras?.mostReadHr?.[0]?.title);
const bad = L.sources.filter((s) => s.fail);
if (bad.length) console.log('Problemi s izvorima:', bad.map((s) => `${s.name} (${s.err.join('; ')})`).join(', '));
