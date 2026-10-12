// Tjedni pregled znanosti: bazen članaka iz zadnjih 9 dana, grupiranje i razvrstavanje po područjima.
import { clusterItems, toStory } from './cluster.mjs';
import { isoWeek, zagreb } from './time.mjs';
import { pickWeek } from './sciweek.mjs';

const H = 3_600_000;
const POOL_DAYS = 9;

export const FIELDS = [
  ['space', 'Svemir', /\b(nasa|esa|spacex|spacecraft|space ?station|space telescope|mars|martian|moon|moons|lunar|asteroids?|comets?|meteor\w*|galax\w*|black holes?|telescopes?|webb|jwst|hubble|exoplanets?|stars?|stellar|cosmic|cosmolog\w*|universe|orbit\w*|rockets?|astronauts?|solar system|solar wind|solar flares?|sun's|jupiter|saturn|venus|neptune|uranus|pluto|nebula\w*|supernova\w*|dark matter|dark energy|planets?|planetary|astronom\w*|astrophysic\w*|artemis|starship)\b/i],
  ['physics', 'Fizika i kemija', /\b(physics|physicists?|quantum|particles?|cern|collider|lasers?|photons?|superconduct\w*|materials? science|chemistry|chemists?|chemical|molecules?|molecular|atoms?|atomic|electrons?|magnetic|magnets?|crystals?|fusion|graphene|thermodynamic\w*|neutrinos?|antimatter|relativity|gravitational waves?|nuclear|clocks?|optical|semiconductors?)\b/i],
  ['life', 'Život i evolucija', /\b(species|evolution\w*|evolved|animals?|fossils?|dinosaurs?|genes?|genetic\w*|genom\w*|dna|cells?|plants?|birds?|fish|insects?|bees?|ants|mammals?|whales?|sharks?|octopus\w*|primates?|apes?|chimpanzees?|ecolog\w*|biodiversity|microb\w*|bacteri\w*|fung\w*|predators?|wildlife|corals?|reptiles?|frogs?|spiders?|wolves|bears?|elephants?|dolphins?|zoolog\w*|biolog\w*|embryo\w*|stem cells?|trees?|tortoises?|turtles?|dogs?|cats?)\b/i],
  ['health', 'Zdravlje i medicina', /\b(gene therap\w*|therap\w*|blind\w*|eyesight|sight|vision|hearing|deaf\w*|health|diseases?|cancers?|tumou?rs?|vaccin\w*|drugs?|medicine|medical|brains?|alzheimer'?s?|dementia|heart|cardiovascular|patients?|clinical|trials?|covid\w*|pandemic\w*|obesity|diabet\w*|sleep|mental|depression|anxiety|infections?|antibiotic\w*|surgery|pain|ageing|aging|longevity|diets?|nutrition|psychedelic\w*|psilocybin|hormones?|immune|blood|neuro\w*|virus(es)?|viral|mice)\b/i],
  ['earth', 'Planet i klima', /\b(climate|warming|carbon|co2|emissions?|el ni[ñn]o|la ni[ñn]a|hurricanes?|storms?|earthquakes?|volcan\w*|glaciers?|ice sheets?|sea ice|arctic|antarctic\w*|oceans?|drought\w*|wildfires?|floods?|flooding|pollution|plastics?|weather|heatwaves?|geolog\w*|tectonic\w*|rainforests?|deforestation|methane|permafrost|sea levels?|grand canyon|environment\w*|conservation|renewable\w*|waste|woodlands?|tornado\w*|tsunami\w*|landslides?)\b/i],
  ['tech', 'Tehnologija i AI', /\b(ai|a\.i\.|artificial intelligence|machine learning|neural networks?|robots?|robotic\w*|computers?|computing|chips?|semiconductors?|batter(y|ies)|software|algorithms?|llms?|chatbots?|quantum computers?|engineering|drones?|electric vehicles?|nuclear reactors?|openai|anthropic|deepmind)\b/i],
  ['past', 'Prošlost i čovjek', /\b(archaeolog\w*|ancient (egypt\w*|rome|roman\w*|greek\w*|greece|city|cities|dna|humans?|people|maya\w*|china|tomb\w*)|neanderthals?|homo sapiens|hominins?|tombs?|roman empire|romans|egypt\w*|pharaohs?|bronze age|iron age|stone age|medieval|prehistoric|skeletons?|mumm(y|ies)|artifacts?|artefacts?|civili[sz]ations?|human evolution|cave art|anthropolog\w*|shipwrecks?|earhart)\b/i],
  ['math', 'Matematika', /\b(mathemat\w*|theorems?|proofs?|conjectures?|prime numbers?|geometry|algebra\w*|navier-stokes)\b/i],
];
const FIELD_NAMES = Object.fromEntries(FIELDS.map(([id, name]) => [id, name]));

export function classifyField(title, summary = '', cats = []) {
  let best = 'misc', bestScore = 0;
  const catText = cats.join(' ');
  FIELDS.forEach(([id, , re], idx) => {
    const g = new RegExp(re.source, 'gi');
    const sc = (title.match(g)?.length || 0) * 2 + (summary.match(g)?.length || 0) + (catText.match(g)?.length || 0) * 2 - idx * 0.01;
    if (sc > bestScore) { bestScore = sc; best = id; }
  });
  return bestScore >= 1 ? best : 'misc';
}

/** Spoji svježe članke u bazen i ukloni stare. */
export function mergePool(pool, fresh, now) {
  const map = new Map((pool?.items || []).map((i) => [i.id, i]));
  for (const it of fresh) {
    const prev = map.get(it.id);
    if (!prev) map.set(it.id, it);
    else { prev.desks = [...new Set([...(prev.desks || []), ...(it.desks || [])])]; if (!prev.img && it.img) prev.img = it.img; }
  }
  const cutoff = now - POOL_DAYS * 24 * H;
  const items = [...map.values()].filter((i) => i.t >= cutoff).sort((a, b) => b.t - a.t).slice(0, 1500);
  return { updatedAt: now, items };
}

export function buildScienceRecap(poolItems, now, { days = 7 } = {}) {
  const from = now - days * 24 * H;
  const items = poolItems.filter((i) => i.t >= from && i.t <= now + 3600_000).map((i) => ({ ...i, desks: i.desks || [i.desk] }));
  const news = items.filter((i) => (i.desks.includes('science') || i.desks.includes('longread'))
    && !(i.outlet === 'nature' && (/\/articles\/s4\d{4}/.test(i.url) || /^daily briefing/i.test(i.title))));
  const clusters = clusterItems(news, { threshold: 0.3, now, lang: 'en' });
  // znanstveni tekstovi žive dulje: ponovno ocijeni sa sporijim "starenjem"
  for (const c of clusters) {
    const ageH = Math.max(0, (now - c.newest) / H);
    const fresh = Math.exp(-ageH / 96);
    const quality = Math.max(...c.items.map((i) => i.ow));
    c.sscore = (c.coverage + 0.5 * quality + (c.img ? 0.15 : 0)) * (0.45 + 0.55 * fresh);
    c.field = classifyField(c.rep.title, c.summary, c.rep.cats || []);
  }
  clusters.sort((a, b) => b.sscore - a.sscore);
  const toS = (c) => ({ ...toStory(c), field: c.field, fieldName: FIELD_NAMES[c.field] || 'Ostalo', score: Math.round(c.sscore * 100) / 100 });
  const notFeature = /\b(podcast|quiz|crossword|newsletter|obituary)\b/i;
  const feature = clusters.find((c) => c.img && c.rep.summary && !notFeature.test(c.rep.title)) || clusters.find((c) => !notFeature.test(c.rep.title)) || clusters[0];
  const fields = FIELDS.map(([id, name]) => ({
    id, name,
    stories: clusters.filter((c) => c.field === id && c !== feature).slice(0, 4).map(toS),
  })).filter((f) => f.stories.length);
  // dugi tekstovi: Quanta, Knowable, Nautilus, BBC Future, Smithsonian (zadnjih 14 dana)
  const lrFrom = now - 14 * 24 * H;
  const perOutlet = new Map();
  const longreads = poolItems
    .filter((i) => (i.desks || [i.desk]).includes('longread') && i.t >= lrFrom)
    .sort((a, b) => b.ow - a.ow || b.t - a.t)
    .filter((i) => { const n = perOutlet.get(i.outlet) || 0; if (n >= 2) return false; perOutlet.set(i.outlet, n + 1); return true; })
    .slice(0, 6)
    .map((i) => ({ title: i.title, url: i.url, src: i.oname, t: new Date(i.t).toISOString(), summary: i.summary, img: i.img, field: classifyField(i.title, i.summary, i.cats || []) }))
    .map((x) => ({ ...x, fieldName: FIELD_NAMES[x.field] || 'Ostalo' }));
  const picks = pickWeek(clusters, toS);
  const z = zagreb(now);
  const wk = isoWeek(z.date);
  const zf = zagreb(from);
  return {
    week: { id: wk.id, n: wk.week, from: zf.date, to: z.date },
    feature: feature ? toS(feature) : null,
    picks,
    fields,
    longreads,
    counts: { articles: news.length, outlets: new Set(news.map((i) => i.outlet)).size, stories: clusters.length },
  };
}
