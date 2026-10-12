// Zakazana funkcija: svaki sat sastavlja novo izdanje. Prvo izdanje nakon 6:00 (Zagreb) sprema se kao jutarnje.
import { runBuild } from '../../lib/build.mjs';

export default async () => {
  const r = await runBuild({ trigger: 'schedule', budgetMs: 25000 });
  if (r.skipped) console.log('Preskočeno:', r.skipped);
  else console.log(`Izdanje gotovo za ${r.ms} ms${r.isMorning ? ' (jutarnje izdanje spremljeno)' : ''}; vijesti: ${r.latest.counts.news}, izvori ok: ${r.latest.counts.feedsOk}/${r.latest.counts.feedsTotal}`);
};

export const config = { schedule: '@hourly' };
