// Tko stoji iza redakcije i odakle piše.
//
// DVA PRAVILA ZA OVU DATOTEKU:
//  1. Ovdje stoje samo ČINJENICE O VLASNIŠTVU, nikad ocjena redakcije. Nema političkog spektra,
//     nema ocjene pouzdanosti. Takve ljestvice tražile bi našu prosudbu i ne idu u brifing.
//  2. Svaki unos o vlasništvu mora biti provjeren i datiran. Redakcija za koju vlasništvo nije
//     provjereno dobiva owner: null i broji se kao zaseban vlasnik — tako nikad ne pretjerujemo
//     u tvrdnji o koncentraciji.
//
// Zadnja provjera: 12. 10. 2026. Izvori su u OWNERSHIP_SOURCES.
// POZOR: vlasništvo N1 i Nove mijenja se tijekom 2026. (prodaja Adria Newsa čeka regulatorna
// odobrenja). Prije nego se tvrdnja prikaže kao sigurna, provjeri OWNERS.unitedmedia.note.

/** Skupine za traku pokrivenosti. Zemljopis redakcije, ne njezin stav. */
export const REGIONS = [
  { id: 'agency', name: 'Agencije', short: 'agencije' },
  { id: 'hr', name: 'Hrvatski mediji', short: 'hrvatski' },
  { id: 'eu', name: 'Europski mediji', short: 'europski' },
  { id: 'world', name: 'Ostatak svijeta', short: 'svijet' },
];
export const REGION_IDS = REGIONS.map((r) => r.id);

export const OWNERS = {
  styria: { name: 'Styria Media Group', seat: 'AT' },
  hanza: { name: 'Hanza Media', seat: 'HR' },
  unitedmedia: {
    name: 'United Media',
    seat: 'RS',
    note: 'Vlasništvo se mijenja tijekom 2026.: prodaja Adria Newsa čeka regulatorna odobrenja.',
  },
  hrt: { name: 'HRT (javni servis)', seat: 'HR' },
};

export const OWNERSHIP_SOURCES = [
  { at: '2026-10-12', what: 'Styria: Večernji list i 24sata; Hanza Media: Jutarnji list, Slobodna Dalmacija, Sportske novosti; United Group/United Media: Nova TV i N1 Hrvatska.', url: 'https://media-ownership.eu/2025-edition/country-reports/croatia/' },
  { at: '2026-10-12', what: 'Prodaja Adria Newsa (regionalna mreža N1 i Nova) podliježe regulatornim odobrenjima; zaključenje se očekuje u drugoj polovici 2026.', url: 'https://www.novilist.hr/?p=1696616' },
];

// region: agency | hr | eu | world
// owner:  ključ iz OWNERS ili null kad vlasništvo nije provjereno
// kind:   agency | public | daily | portal | weekly | specialist  (opisno, ne ocjena)
export const OUTLET_META = {
  // — agencije —
  reuters: { region: 'agency', country: 'GB', kind: 'agency' },
  ap: { region: 'agency', country: 'US', kind: 'agency' },

  // — Hrvatska —
  hrt: { region: 'hr', country: 'HR', owner: 'hrt', kind: 'public' },
  vecernji: { region: 'hr', country: 'HR', owner: 'styria', kind: 'daily' },
  h24sata: { region: 'hr', country: 'HR', owner: 'styria', kind: 'daily' },
  jutarnji: { region: 'hr', country: 'HR', owner: 'hanza', kind: 'daily' },
  slobodna: { region: 'hr', country: 'HR', owner: 'hanza', kind: 'daily' },
  n1: { region: 'hr', country: 'HR', owner: 'unitedmedia', kind: 'portal' },
  // vlasništvo nije provjereno — svaka se broji kao zaseban vlasnik
  index: { region: 'hr', country: 'HR', owner: null, kind: 'portal' },
  telegram: { region: 'hr', country: 'HR', owner: null, kind: 'portal' },
  tportal: { region: 'hr', country: 'HR', owner: null, kind: 'portal' },
  dnevnik: { region: 'hr', country: 'HR', owner: null, kind: 'portal' },
  net: { region: 'hr', country: 'HR', owner: null, kind: 'portal' },
  novilist: { region: 'hr', country: 'HR', owner: null, kind: 'daily' },
  glasistre: { region: 'hr', country: 'HR', owner: null, kind: 'daily' },
  poslovni: { region: 'hr', country: 'HR', owner: null, kind: 'specialist' },

  // — Europa —
  bbc: { region: 'eu', country: 'GB', kind: 'public' },
  guardian: { region: 'eu', country: 'GB', kind: 'daily' },
  ft: { region: 'eu', country: 'GB', kind: 'daily' },
  economist: { region: 'eu', country: 'GB', kind: 'weekly' },
  sky: { region: 'eu', country: 'GB', kind: 'portal' },
  times: { region: 'eu', country: 'GB', kind: 'daily' },
  telegraph: { region: 'eu', country: 'GB', kind: 'daily' },
  independent: { region: 'eu', country: 'GB', kind: 'daily' },
  dw: { region: 'eu', country: 'DE', kind: 'public' },
  spiegel: { region: 'eu', country: 'DE', kind: 'weekly' },
  lemonde: { region: 'eu', country: 'FR', kind: 'daily' },
  france24: { region: 'eu', country: 'FR', kind: 'public' },
  euronews: { region: 'eu', country: 'FR', kind: 'portal' },
  politicoeu: { region: 'eu', country: 'BE', kind: 'specialist' },
  crisisgroup: { region: 'eu', country: 'BE', kind: 'specialist' },
  kyiv: { region: 'eu', country: 'UA', kind: 'portal' },

  // — ostatak svijeta —
  nyt: { region: 'world', country: 'US', kind: 'daily' },
  wsj: { region: 'world', country: 'US', kind: 'daily' },
  wapo: { region: 'world', country: 'US', kind: 'daily' },
  bloomberg: { region: 'world', country: 'US', kind: 'specialist' },
  cnbc: { region: 'world', country: 'US', kind: 'specialist' },
  marketwatch: { region: 'world', country: 'US', kind: 'specialist' },
  investing: { region: 'world', country: 'US', kind: 'specialist' },
  npr: { region: 'world', country: 'US', kind: 'public' },
  politico: { region: 'world', country: 'US', kind: 'specialist' },
  atlantic: { region: 'world', country: 'US', kind: 'weekly' },
  foreignpolicy: { region: 'world', country: 'US', kind: 'specialist' },
  foreignaffairs: { region: 'world', country: 'US', kind: 'specialist' },
  warontherocks: { region: 'world', country: 'US', kind: 'specialist' },
  rstatecraft: { region: 'world', country: 'US', kind: 'specialist' },
  cnn: { region: 'world', country: 'US', kind: 'portal' },
  abc: { region: 'world', country: 'US', kind: 'portal' },
  nbc: { region: 'world', country: 'US', kind: 'portal' },
  cbs: { region: 'world', country: 'US', kind: 'portal' },
  latimes: { region: 'world', country: 'US', kind: 'daily' },
  axios: { region: 'world', country: 'US', kind: 'portal' },
  cbc: { region: 'world', country: 'CA', kind: 'public' },
  aljazeera: { region: 'world', country: 'QA', kind: 'portal' },
  timesofisrael: { region: 'world', country: 'IL', kind: 'portal' },
  scmp: { region: 'world', country: 'HK', kind: 'daily' },
  nikkei: { region: 'world', country: 'JP', kind: 'daily' },
};

const AGENCY_IDS = new Set(['reuters', 'ap']);

/** Zemljopisna skupina redakcije; nepoznate idu u „ostatak svijeta”. */
export function regionOf(outletId) {
  if (!outletId) return 'world';
  const m = OUTLET_META[outletId];
  if (m) return m.region;
  // Google News izdavači koje ne poznajemo (gn-…) i ostalo
  return 'world';
}

export const isAgency = (outletId) => AGENCY_IDS.has(outletId);

/**
 * Vlasnik redakcije za brojanje. Redakcija bez provjerenog vlasnika dobiva
 * vlastiti ključ, pa se broji kao zaseban vlasnik.
 */
export function ownerKeyOf(outletId) {
  const m = OUTLET_META[outletId];
  return m?.owner || `self:${outletId}`;
}

export function ownerName(key) {
  if (!key) return null;
  if (key.startsWith('self:')) return null;
  return OWNERS[key]?.name || null;
}

/** Koliko je redakcija u registru s provjerenim vlasništvom (za bilješku u sučelju). */
export function ownershipCoverage() {
  const hr = Object.entries(OUTLET_META).filter(([, m]) => m.region === 'hr');
  return { known: hr.filter(([, m]) => m.owner).length, total: hr.length, checked: OWNERSHIP_SOURCES[0].at };
}
