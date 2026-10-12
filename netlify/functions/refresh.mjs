// Zakazana funkcija: svaki sat sastavlja novo izdanje. Prvo izdanje nakon 6:00 (Zagreb) sprema se kao jutarnje.
// Nakon izdanja prazni CDN i pregrađuje mjesečne pakete arhive, da pretraga praćenih priča
// ostane brza bez posla u korisnikovu zahtjevu.
import { runBuild } from '../../lib/build.mjs';
import { openStore } from '../../lib/store.mjs';
import { buildArchivePacks } from '../../lib/newsarchive.mjs';
import { purgeTag } from '../../lib/cdn.mjs';

export default async () => {
  const r = await runBuild({ trigger: 'schedule', budgetMs: 25000 });
  if (r.skipped) { console.log('Preskočeno:', r.skipped); return; }

  const purged = await purgeTag();
  let packs = null;
  try { packs = await buildArchivePacks(openStore(), Date.now()); } catch (e) { console.warn('paketi arhive', e?.message); }

  console.log(
    `Izdanje gotovo za ${r.ms} ms${r.isMorning ? ' (jutarnje izdanje spremljeno)' : ''}; `
    + `vijesti: ${r.latest.counts.news}, izvori ok: ${r.latest.counts.feedsOk}/${r.latest.counts.feedsTotal}, `
    + `CDN ${purged ? 'ispražnjen' : 'nije praznjen'}${packs ? `, paketi arhive: ${packs.packs}` : ''}`,
  );
};

export const config = { schedule: '@hourly' };
