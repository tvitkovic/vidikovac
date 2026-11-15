// Tko stoji iza redakcije i odakle piše.
//
// DVA PRAVILA ZA OVU DATOTEKU:
//  1. Ovdje stoje samo ČINJENICE O VLASNIŠTVU, nikad ocjena redakcije. Nema političkog spektra,
//     nema ocjene pouzdanosti. Takve ljestvice tražile bi našu prosudbu i ne idu u brifing.
//  2. Svaki unos o vlasništvu mora biti provjeren i datiran. Redakcija za koju vlasništvo nije
//     provjereno dobiva owner: null i broji se kao zaseban vlasnik — tako nikad ne pretjerujemo
//     u tvrdnji o koncentraciji.
//
// Zadnja provjera: 15. 11. 2026. Izvori su u OWNERSHIP_SOURCES.
// POZOR: vlasništvo N1 se mijenja (prodaja Adria News Networka fondu Alpac Capital: srpski dio
// preuzet 17. 8. 2026., ostali dijelovi čekaju odobrenja). Provjeri OWNERS.adrianews.note.
// Poslovni dnevnik namjerno ostaje bez vlasnika: dostupni izvori o Styriji stariji su od 2026.

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
  unitedmedia: { name: 'United Media (Nova TV)', seat: 'NL' },
  adrianews: {
    name: 'Adria News Network (N1)',
    seat: 'LU',
    note: 'Prodaja fondu Alpac Capital: srpski dio preuzet 17. 8. 2026., ostali dijelovi čekaju odobrenja.',
  },
  rtl: { name: 'RTL Hrvatska (CME)', seat: 'HR' },
  htelekom: { name: 'Hrvatski Telekom', seat: 'HR' },
  mediasolutions: { name: 'Media Solutions', seat: 'HR' },
  indexpromocija: { name: 'Index Promocija', seat: 'HR' },
  telegrammedia: { name: 'Telegram Media Group', seat: 'HR' },
  hrt: { name: 'HRT (javni servis)', seat: 'HR' },
};

export const OWNERSHIP_SOURCES = [
  { at: '2026-10-12', what: 'Styria: Večernji list i 24sata; Hanza Media: Jutarnji list, Slobodna Dalmacija, Sportske novosti.', url: 'https://media-ownership.eu/2025-edition/country-reports/croatia/' },
  { at: '2026-11-15', what: 'Media Solutions je vlasnik Novog lista, Glasa Slavonije, Glasa Istre i Zadarskog lista (Glas Istre izdavanje preuzeo Novi list 2023.).', url: 'https://www.novilist.hr/?p=1699001' },
  { at: '2026-11-15', what: 'RTL Hrvatska (CME Media Enterprises, PPF Group) vodi portale Net.hr, RTL.hr, Danas.hr i Žena.hr.', url: 'https://www.cme.net/countries/croatia' },
  { at: '2026-11-15', what: 'tportal izdaje Hrvatski Telekom d.d. (većinski vlasnik Deutsche Telekom).', url: 'https://www.eurotopics.net/en/148836/tportal' },
  { at: '2026-11-15', what: 'Index.hr izdaje Index Promocija d.o.o.; Telegram izdaje Telegram Media Group (vlasnik Miran Pavić po izvoru iz 2023.).', url: 'https://aman-alliance.org/Home/ContentDetail/89127' },
  { at: '2026-11-15', what: 'Adria News Network (N1, Nova S, Danas…) formiran u veljači 2026.; Alpac Capital preuzeo srpski dio 17. 8. 2026., prodaja čeka daljnja odobrenja. Nova TV Hrvatska ostaje u portfelju United Media.', url: 'https://www.cenzolovka.rs/?p=124952' },
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
  n1: { region: 'hr', country: 'HR', owner: 'adrianews', kind: 'portal' },
  dnevnik: { region: 'hr', country: 'HR', owner: 'unitedmedia', kind: 'portal' },
  net: { region: 'hr', country: 'HR', owner: 'rtl', kind: 'portal' },
  tportal: { region: 'hr', country: 'HR', owner: 'htelekom', kind: 'portal' },
  novilist: { region: 'hr', country: 'HR', owner: 'mediasolutions', kind: 'daily' },
  glasistre: { region: 'hr', country: 'HR', owner: 'mediasolutions', kind: 'daily' },
  index: { region: 'hr', country: 'HR', owner: 'indexpromocija', kind: 'portal' },
  telegram: { region: 'hr', country: 'HR', owner: 'telegrammedia', kind: 'portal' },
  // vlasništvo nije provjereno — broji se kao zaseban vlasnik
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
  return { known: hr.filter(([, m]) => m.owner).length, total: hr.length, checked: OWNERSHIP_SOURCES.map((x) => x.at).sort().at(-1) };
}
