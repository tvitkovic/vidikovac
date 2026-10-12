// Pojmovi za praćenje priča: isti pojam na engleskom i hrvatskom, da se "rat u Jemenu" prepozna i u
// "Houthis report deadly Saudi strikes" i u "Hutisti napali saudijsku zračnu luku".
// [id, naziv, EN izraz (izvorni tekst), HR izraz (mala slova, bez dijakritika, korijeni), EN upit, HR upit]

const C = [
  ['war', 'rat i sukob', 'wars?|warfare|conflict|fighting|clashes|offensive|air ?strikes?|strikes?|missiles?|drones?|attacks?|shelling|bombing|troops|military|militar(y|ies)|invasion', 'rat\\b|rata\\b|ratu\\b|ratom\\b|ratn|sukob|borb[aeiu]|napad|ofenziv|raket|dron|bombardir|granatir|vojsk|vojn|invazij', 'war', 'rat'],
  ['peace', 'primirje i pregovori', 'ceasefire|truce|peace (talks|deal|plan|agreement|process)|negotiat\\w*|mediat\\w*', 'primirj|mirovn|pregovor|posredov', 'ceasefire', 'primirje'],
  ['flood', 'poplave', 'floods?|flooding|flash floods?|monsoon|landslides?|mudslides?|torrential', 'poplav|bujic|klizist|monsun|obiln\\w* kis', 'floods', 'poplave'],
  ['quake', 'potres', 'earthquakes?|quakes?|tremors?|aftershocks?|seismic', 'potres|podrhtav|seizm', 'earthquake', 'potres'],
  ['fire', 'požari', 'wildfires?|bushfires?|forest fires?|blazes?', 'pozar|vatrogas|opozaren', 'wildfire', 'požar'],
  ['storm', 'oluje i uragani', 'storms?|hurricanes?|typhoons?|cyclones?|tornado\\w*', 'oluj|uragan|tajfun|ciklon|tornad|nevrem', 'hurricane', 'oluja'],
  ['heat', 'suša i vrućine', 'droughts?|heat ?waves?|extreme heat|record temperatures?', 'susa|suse\\b|susi\\b|toplinsk|vrucin|rekordn\\w* temperatur', 'heatwave', 'toplinski val'],
  ['election', 'izbori', 'elections?|electoral|ballots?|vot(e|es|ing|ers)|polls?|referendums?|runoff|candidates?', 'izbor[aeiu]?\\b|izborn|glasan|glasac|glasal|referendum|kandidat|biralist', 'election', 'izbori'],
  ['protest', 'prosvjedi', 'protests?|protesters?|demonstrat\\w*|rall(y|ies)|riots?|unrest', 'prosvjed|demonstrac|nered|nemir', 'protests', 'prosvjedi'],
  ['labour', 'štrajk i sindikati', 'walkouts?|labou?r (strike|action|dispute)|unions?|strikers', 'strajk|sindikat', 'strike', 'štrajk'],
  ['bonds', 'obveznice i prinosi', 'bonds?|treasur(y|ies)|yields?|gilts?|bunds?|debt (sale|auction|market)', 'obveznic|prinos|zaduzen|javn\\w* dug', 'Treasury yields', 'obveznice'],
  ['rates', 'kamatne stope', 'interest rates?|rate (cuts?|hikes?|rises?|decision)|central bank|federal reserve|fed\\b|ecb|monetary policy|powell|lagarde', 'kamat|sredisnj\\w* bank|ecb|fed\\b|hnb|monetarn', 'interest rates', 'kamatne stope'],
  ['inflation', 'inflacija i cijene', 'inflation|consumer prices|cpi|cost of living', 'inflacij|poskuplj|cijen', 'inflation', 'inflacija'],
  ['stocks', 'dionice i burze', 'stocks?|shares|equit(y|ies)|wall street|s&p|nasdaq|dow jones|stock markets?|sell-?off|market rally', 'dionic|burz|crobex|indeks', 'stock market', 'burza'],
  ['oil', 'nafta i plin', 'oil|crude|brent|opec\\+?|natural gas|lng|gas prices?|fuel|diesel', 'naft|plin\\b|plina\\b|plinu\\b|plinsk|goriv|dizel|benzin|opec', 'oil prices', 'nafta'],
  ['sanctions', 'sankcije', 'sanctions?|embargo|export controls?|blacklist\\w*', 'sankcij|embargo', 'sanctions', 'sankcije'],
  ['tariffs', 'carine i trgovina', 'tariffs?|trade (war|deal|talks|deficit)|import (duties|taxes)', 'carin|trgovinsk', 'tariffs', 'carine'],
  ['migration', 'migracije', 'migrants?|migration|refugees?|asylum|border crossings?|deportations?|displaced', 'migran|migrac|izbjegl|azil|deport|raseljen', 'migrants', 'migranti'],
  ['nuclear', 'nuklearno', 'nuclear|uranium|enrichment|warheads?|atomic', 'nuklear|uran\\b|urana\\b|obogacivan', 'nuclear', 'nuklearni'],
  ['terror', 'terorizam', 'terror\\w*|militants?|jihad\\w*|extremists?|hostages?|kidnapp\\w*', 'teror|militant|dzihad|ekstremist|talac|taoc|otmic|otet', 'terror attack', 'teroristički napad'],
  ['shooting', 'pucnjave', 'shootings?|gunman|gunmen|gunfire|shot dead|mass shooting', 'pucnjav|pucao|pucali|ustrijel', 'shooting', 'pucnjava'],
  ['court', 'sud i istraga', 'trials?|courts?|judges?|verdicts?|sentenc\\w*|indict\\w*|charged|prosecut\\w*|investigations?|probe', 'sud\\b|suda\\b|sudu\\b|sudsk|sudac|presud|optuz|istrag|uskok|dorh|tuzitelj', 'court', 'sud'],
  ['recall', 'povlačenje proizvoda', 'recalls?|recalled|contaminat\\w*|listeria|salmonella|e\\. ?coli|food safety', 'povuc\\w* (iz prodaje|s trzista)|povlac|opoziv|bakterij|listerij|salmonel|kontaminir', 'food recall', 'povlačenje proizvoda'],
  ['corruption', 'korupcija', 'corruption|brib\\w*|fraud|embezzl\\w*|kickbacks?', 'korupc|mito\\b|mita\\b|prijevar|pronevjer', 'corruption', 'korupcija'],
  ['outbreak', 'epidemije', 'outbreaks?|epidemics?|pandemics?|virus(es)?|infections?|vaccin\\w*|cholera|measles|ebola|bird flu|mpox|plague', 'epidemij|pandemij|virus|zaraz|cijep|kolera|ospic|ebol|ptic\\w* grip|kuga|kuge\\b', 'outbreak', 'epidemija'],
  ['ai', 'umjetna inteligencija', 'artificial intelligence|ai\\b|chatbots?|openai|chatgpt|anthropic|gemini|llms?', 'umjetn\\w* inteligencij|ai\\b|chatbot', 'artificial intelligence', 'umjetna inteligencija'],
  ['chips', 'čipovi', 'chips?|semiconductors?|nvidia|tsmc|chipmakers?', 'cip\\b|cipov|poluvodic|nvidi', 'chips', 'čipovi'],
  ['crypto', 'kriptovalute', 'bitcoin|crypto\\w*|ethereum|stablecoins?', 'bitcoin|kripto', 'bitcoin', 'bitcoin'],
  ['housing', 'nekretnine i stanovi', 'housing|home prices|house prices|real estate|property market|mortgages?|rents?\\b', 'nekretnin|stanov[aei]\\b|stanova\\b|cijen\\w* stan|najam|najm|stambe', 'housing market', 'nekretnine'],
  ['climate', 'klima', 'climate|emissions|carbon|global warming|cop ?\\d+', 'klim[aeiu]\\b|klimat|emisij|ugljik|globaln\\w* zatopl', 'climate', 'klima'],
  ['space', 'svemir', 'space|nasa|spacex|rockets?|launch(es)?|moon|lunar|mars|astronauts?|artemis', 'svemir|nasa|raket|mjesec|mars\\b|astronaut', 'space', 'svemir'],
  ['shipping', 'brodski promet', 'shipping|ships?|vessels?|tankers?|red sea|strait|hormuz|suez|freight|ports?\\b', 'brod|tanker|plovidb|crven\\w* mor|tjesnac|hormusk|sueski|luk[aeu]\\b', 'shipping', 'brodovi'],
  ['aviation', 'zrakoplovstvo', 'airports?|airlines?|flights?|planes?|aircraft|aviation', 'zracn\\w* luk|aerodrom|zrakoplov|letov|avion|zrakopl', 'airport', 'zračna luka'],
  ['accident', 'nesreće', 'crash(es)?|accidents?|collisions?|derail\\w*|disasters?', 'nesrec|sudar|katastrof|iskliznu', 'accident', 'nesreća'],
  ['government', 'vlada i politika', 'government|parliament|prime minister|president|cabinet|coalition|ministers?', 'vlad[aeiu]\\b|vladin|sabor|parlament|premijer|predsjedni|ministr|koalicij', 'government', 'vlada'],
  ['budget', 'proračun i porezi', 'budgets?|tax(es)?|tax cuts?|fiscal|deficits?|spending', 'proracun|porez|fiskal|deficit', 'budget', 'proračun'],
  ['jobs', 'tržište rada i plaće', 'jobs report|unemployment|payrolls|wages?|labou?r market|layoffs?|job cuts', 'nezaposlen|zaposlen|plac[aeiu]\\b|placa|otkaz|trzist\\w* rada', 'jobs report', 'plaće'],
  ['pensions', 'mirovine', 'pensions?|retirement|retirees', 'mirovin|umirovljen', 'pensions', 'mirovine'],
  ['tourism', 'turizam', 'touris\\w*|holidaymakers|hotels?|visitors', 'turiz|turist|nocenj|hotel', 'tourism', 'turizam'],
  ['cars', 'automobili', 'cars?|carmakers?|automakers?|electric vehicles?|evs?\\b|tesla|volkswagen|byd', 'automobil|autoindustr|elektricn\\w* vozil|tesla|volkswagen', 'carmakers', 'automobili'],
];

const enRe = (src) => new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${src})(?![\\p{L}])`, 'iu');
const hrRe = (src) => new RegExp(`(?:^|[^a-z0-9])(?:${src})`);

export const CONCEPTS = C.map(([id, name, en, hr, enQ, hrQ]) => ({ id, name, en: enRe(en), hr: hrRe(hr), enQ, hrQ }));
export const CONCEPT_BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));
