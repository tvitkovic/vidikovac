// Rječnik država i tema. EN uzorci se primjenjuju na izvorni tekst (bez obzira na velika slova,
// osim 'cs' uzoraka), HR uzorci na tekst bez dijakritika i malim slovima (korijeni riječi).
import { fold } from './text.mjs';

// [iso, naziv (hr), lat, lon, enCi, hrCi, enCs?, hrCs?]
const C = [
  ['US', 'SAD', 39.5, -98.4, 'united states|americans?|white house|pentagon|washington', 'americk|amerik|washingt|bijel\\w* kuc|pentagon', 'US|USA|U\\.S\\.', 'SAD(-a|-u|-om)?'],
  ['CA', 'Kanada', 56.1, -106.3, 'canad\\w*|ottawa', 'kanad|otav'],
  ['MX', 'Meksiko', 23.6, -102.5, 'mexic\\w*', 'meksik|meksick'],
  ['CU', 'Kuba', 21.5, -78.0, 'cuba\\w*|havana', 'kub[aeiu]\\b|kubansk|havan'],
  ['HT', 'Haiti', 19.0, -72.4, 'haiti\\w*|port-au-prince', 'haiti'],
  ['PA', 'Panama', 8.5, -80.8, 'panama\\w*', 'panam'],
  ['CO', 'Kolumbija', 4.6, -74.1, 'colombia\\w*|bogota', 'kolumbij'],
  ['VE', 'Venezuela', 7.1, -66.2, 'venezuela\\w*|caracas|maduro', 'venezuel|karakas|maduro'],
  ['EC', 'Ekvador', -1.8, -78.2, 'ecuador\\w*|quito', 'ekvador'],
  ['PE', 'Peru', -9.2, -75.0, 'peruvian|peru|lima', 'peru\\b|perua|peruu|peruansk'],
  ['BR', 'Brazil', -10.8, -52.9, 'brazil\\w*|brasilia|lula|são paulo|sao paulo|rio de janeiro', 'brazil'],
  ['BO', 'Bolivija', -16.3, -63.6, 'bolivia\\w*', 'bolivij'],
  ['CL', 'Čile', -33.5, -70.7, 'chilean|chile', 'cile\\b|cilea|cileu|cilean|cilansk'],
  ['AR', 'Argentina', -36.0, -64.5, 'argentin\\w*|buenos aires|milei', 'argentin'],
  ['GL', 'Grenland', 72.0, -40.0, 'greenland\\w*|nuuk', 'grenland'],
  ['GB', 'Ujedinjeno Kraljevstvo', 53.0, -1.8, 'britain|british|united kingdom|england|scotland|scottish|wales|welsh|london|downing street|starmer', 'britanij|britansk|engles|london|skotsk|skots|vels', 'UK'],
  ['IE', 'Irska', 53.2, -8.1, 'ireland|irish|dublin', 'irsk|dublin'],
  ['FR', 'Francuska', 46.6, 2.4, 'france|french|paris|macron|élysée|elysee', 'francusk|pariz|macron'],
  ['BE', 'Belgija', 50.6, 4.6, 'belgi\\w*', 'belgij'],
  ['NL', 'Nizozemska', 52.2, 5.5, 'netherlands|dutch|amsterdam|the hague', 'nizozem|amsterdam|haag'],
  ['DE', 'Njemačka', 51.1, 10.4, 'german\\w*|berlin|bundestag|merz', 'njemack|berlin|merz'],
  ['CH', 'Švicarska', 46.8, 8.2, 'switzerland|swiss|geneva|zurich', 'svicarsk|zenev|zurich|ciri'],
  ['AT', 'Austrija', 47.6, 14.6, 'austria\\w*|vienna', 'austrij|bec\\b|beca\\b|becu\\b'],
  ['IT', 'Italija', 42.8, 12.6, 'ital(y|ian|ians)|rome|meloni|sicily|sicilian', 'italij|talijan|meloni|sicilij'],
  ['ES', 'Španjolska', 40.2, -3.6, 'spain|spanish|madrid|sánchez|sanchez', 'spanjolsk|madrid'],
  ['PT', 'Portugal', 39.6, -8.0, 'portug\\w*|lisbon', 'portugal|lisabon'],
  ['DK', 'Danska', 56.0, 9.5, 'denmark|danish|copenhagen', 'dansk|kopenhag'],
  ['NO', 'Norveška', 61.0, 9.0, 'norway|norwegian|oslo', 'norvesk|oslo'],
  ['SE', 'Švedska', 62.0, 15.5, 'sweden|swedish|stockholm', 'svedsk|stockholm'],
  ['FI', 'Finska', 63.5, 26.5, 'finland|finnish|helsinki', 'finsk|helsinki'],
  ['EE', 'Estonija', 58.7, 25.5, 'estonia\\w*|tallinn', 'estonij'],
  ['LV', 'Latvija', 56.9, 24.6, 'latvia\\w*', 'latvij'],
  ['LT', 'Litva', 55.3, 23.9, 'lithuania\\w*|vilnius', 'litv'],
  ['PL', 'Poljska', 52.1, 19.4, 'poland|poles|warsaw', 'poljsk|varsav', 'Polish'],
  ['CZ', 'Češka', 49.8, 15.5, 'czech\\w*|prague', 'cesk\\w* republik|cesk[aeiu]\\b|ceskoj'],
  ['SK', 'Slovačka', 48.7, 19.7, 'slovak\\w*|bratislava', 'slovack|bratislav'],
  ['HU', 'Mađarska', 47.2, 19.4, 'hungar\\w*|budapest|orbán|orban', 'madarsk|budimpest|orban'],
  ['SI', 'Slovenija', 46.1, 14.8, 'sloveni\\w*|ljubljana', 'sloven|ljubljan'],
  // HR se u hrvatskim rubrikama namjerno ne broji kao "država u vijesti" (svaka domaća vijest bi ju spomenula),
  // pa ga sections.mjs odbacuje za lang='hr'; uzorak ipak treba zbog praćenja tema ("Hrvatska" kao pojam).
  ['HR', 'Hrvatska', 45.1, 15.2, 'croatia\\w*|zagreb', 'hrvatsk|hrvat[aei]\\b|hrvatim|zagreb|zagrepc', '', 'RH(-a|-u|-om|-i)?'],
  ['BA', 'BiH', 44.2, 17.8, 'bosnia\\w*|sarajevo|republika srpska|dodik', 'bih\\b|bosn|hercegovin|sarajev|dodik|republik\\w* srpsk'],
  ['RS', 'Srbija', 44.0, 20.9, 'serbia\\w*|belgrade|vučić|vucic', 'srbij|beograd|vucic'],
  ['ME', 'Crna Gora', 42.7, 19.3, 'montenegr\\w*|podgorica', 'crn\\w* gor[aeiu]|podgoric'],
  ['XK', 'Kosovo', 42.6, 20.9, 'kosovo|pristina', 'kosov|pristin'],
  ['MK', 'Sjeverna Makedonija', 41.6, 21.7, 'macedonia\\w*|skopje', 'makedonij|skopj'],
  ['AL', 'Albanija', 41.2, 20.2, 'albania\\w*|tirana', 'albanij|albansk|tiran[aeiu]\\b'],
  ['GR', 'Grčka', 39.1, 22.0, 'greece|greek|athens', 'grck|aten[aeiu]\\b'],
  ['BG', 'Bugarska', 42.7, 25.5, 'bulgaria\\w*', 'bugarsk'],
  ['RO', 'Rumunjska', 45.9, 24.9, 'romania\\w*|bucharest', 'rumunjsk|bukurest'],
  ['MD', 'Moldova', 47.4, 28.4, 'moldova\\w*|chisinau|transnistria', 'moldov|moldavij|pridnjestr'],
  ['UA', 'Ukrajina', 48.4, 31.2, 'ukrain\\w*|kyiv|kiev|zelensk\\w*|kharkiv|odesa|odessa|donbas|zaporizhzhia', 'ukrajin|kijev|zelensk|harkiv|odes|donbas|zaporiz'],
  ['BY', 'Bjelorusija', 53.7, 27.9, 'belarus\\w*|minsk|lukashenko', 'bjelorus|minsk|lukasenk'],
  ['RU', 'Rusija', 61.5, 99.0, 'russia\\w*|moscow|kremlin|putin', 'rusij|rusk|rusi\\b|moskv|kremlj|putin'],
  ['GE', 'Gruzija', 42.3, 43.4, 'tbilisi|georgian dream', 'gruzij|tbilisi'],
  ['AM', 'Armenija', 40.1, 45.0, 'armenia\\w*|yerevan', 'armenij|jerevan'],
  ['AZ', 'Azerbajdžan', 40.1, 47.6, 'azerbaijan\\w*|azeri|baku', 'azerbajdz|baku\\b'],
  ['TR', 'Turska', 39.0, 35.2, 'turkey|turkish|türkiye|turkiye|ankara|istanbul|erdogan|erdoğan', 'tursk|ankar|istanbul|erdogan'],
  ['KZ', 'Kazahstan', 48.0, 67.0, 'kazakh\\w*|astana', 'kazahst|kazask'],
  ['IL', 'Izrael', 31.0, 34.9, 'israel\\w*|tel aviv|jerusalem|netanyahu|idf', 'izrael|tel aviv|jeruzalem|netanjahu|netanyahu'],
  ['PS', 'Palestina', 31.9, 35.2, 'gaza|gazans?|palestin\\w*|west bank|hamas|ramallah', 'gaz[aeiu]\\b|palestin|zapadn\\w* obal|hamas'],
  ['LB', 'Libanon', 33.9, 35.9, 'leban\\w*|beirut|hezbollah', 'liban|bejrut|hezbol'],
  ['SY', 'Sirija', 35.0, 38.5, 'syria\\w*|damascus', 'sirij|damask'],
  ['JO', 'Jordan', 31.2, 36.5, 'jordanian|amman', ''],
  ['IQ', 'Irak', 33.2, 43.7, 'iraq\\w*|baghdad', 'irak|bagdad'],
  ['IR', 'Iran', 32.4, 53.7, 'iran\\w*|tehran', 'iran|teheran'],
  ['SA', 'Saudijska Arabija', 24.0, 45.0, 'saudi\\w*|riyadh|jeddah', 'saudij|rijad'],
  ['YE', 'Jemen', 15.6, 48.0, 'yemen\\w*|houthis?', 'jemen|huti|hutist'],
  ['AE', 'UAE', 24.3, 54.4, 'uae|emirat\\w*|dubai|abu dhabi', 'emirat|dubai|abu dhabi'],
  ['QA', 'Katar', 25.3, 51.2, 'qatar\\w*|doha', 'katar|doh[aiu]\\b'],
  ['OM', 'Oman', 21.5, 55.9, 'oman\\b|omani|gulf of oman', 'oman'],
  ['EG', 'Egipat', 26.8, 30.8, 'egypt\\w*|cairo', 'egipat|egipt|kair'],
  ['LY', 'Libija', 26.3, 17.2, 'libya\\w*|tripoli|benghazi', 'libij|tripol'],
  ['TN', 'Tunis', 34.0, 9.5, 'tunisia\\w*', 'tunis'],
  ['DZ', 'Alžir', 28.0, 2.6, 'algeria\\w*|algiers', 'alzir'],
  ['MA', 'Maroko', 31.8, -7.1, 'morocc\\w*|rabat', 'marok'],
  ['ML', 'Mali', 17.6, -4.0, 'malian|bamako', '', 'Mali'],
  ['SD', 'Sudan', 15.5, 30.2, 'sudan\\w*|khartoum|darfur|el fasher', 'sudan|kartum|darfur'],
  ['ET', 'Etiopija', 9.1, 40.5, 'ethiopia\\w*|addis ababa|tigray', 'etiopij|tigraj'],
  ['ER', 'Eritreja', 15.2, 39.8, 'eritrea\\w*|asmara', 'eritrej'],
  ['SO', 'Somalija', 5.2, 46.2, 'somali\\w*|mogadishu', 'somalij|mogadis'],
  ['KE', 'Kenija', 0.0, 37.9, 'kenya\\w*|nairobi', 'kenij|nairobi'],
  ['UG', 'Uganda', 1.4, 32.3, 'uganda\\w*|kampala', 'ugand'],
  ['NG', 'Nigerija', 9.1, 8.7, 'nigeria\\w*|abuja|lagos', 'nigerij|lagos'],
  ['GH', 'Gana', 7.9, -1.0, 'ghana\\w*|accra', ''],
  ['CD', 'DR Kongo', -2.9, 23.7, 'congo\\w*|kinshasa|goma', 'kongo|kinsas'],
  ['GW', 'Gvineja Bisau', 11.8, -15.2, 'guinea-bissau', 'gvinej\\w* bisau'],
  ['MW', 'Malavi', -13.3, 34.3, 'malawi\\w*|lilongwe', 'malavij|malavi\\b'],
  ['MZ', 'Mozambik', -18.7, 35.5, 'mozambi\\w*', 'mozambik'],
  ['ZA', 'Južna Afrika', -30.6, 22.9, 'south africa\\w*|johannesburg|cape town|pretoria|ramaphosa', 'juzn\\w* afri|johannesburg|pretorij'],
  ['AF', 'Afganistan', 33.9, 67.7, 'afghan\\w*|kabul|taliban', 'afganist|afgan|kabul|taliban'],
  ['PK', 'Pakistan', 30.4, 69.3, 'pakistan\\w*|islamabad', 'pakistan|islamabad'],
  ['IN', 'Indija', 22.0, 79.0, 'india|indian|indians|delhi|mumbai|modi', 'indij|delhi|mumbai'],
  ['BD', 'Bangladeš', 23.7, 90.4, 'bangladesh\\w*|dhaka', 'banglades|dhak'],
  ['NP', 'Nepal', 28.4, 84.1, 'nepal\\w*|kathmandu', 'nepal|katmandu'],
  ['CN', 'Kina', 35.0, 104.0, 'china|chinese|beijing|xi jinping|shanghai', 'kin[aeiu]\\b|kinesk|peking|sangaj|xi jinping'],
  ['HK', 'Hong Kong', 22.3, 114.2, 'hong kong', 'hong ?kong'],
  ['TW', 'Tajvan', 23.7, 121.0, 'taiwan\\w*|taipei', 'tajvan|tajpej'],
  ['KP', 'Sjeverna Koreja', 40.3, 127.5, 'north korea\\w*|pyongyang|kim jong', 'sjevern\\w* korej|pjongjang|kim jong'],
  ['KR', 'Južna Koreja', 36.4, 127.9, 'south korea\\w*|seoul', 'juzn\\w* korej|seul'],
  ['JP', 'Japan', 36.2, 138.3, 'japan\\w*|tokyo|okinawa', 'japan|tokij|okinaw'],
  ['PH', 'Filipini', 12.9, 122.0, 'philippin\\w*|filipino|manila', 'filipin|manil'],
  ['VN', 'Vijetnam', 14.1, 108.3, 'vietnam\\w*|hanoi', 'vijetnam|hanoj'],
  ['TH', 'Tajland', 15.9, 100.9, 'thailand|thai|bangkok', 'tajland|bangkok'],
  ['MM', 'Mjanmar', 21.9, 95.9, 'myanmar|burm\\w*', 'mjanmar|burm'],
  ['ID', 'Indonezija', -2.5, 118.0, 'indonesia\\w*|jakarta', 'indonezij|dzakart|jakart'],
  ['AU', 'Australija', -25.3, 133.8, 'australia\\w*|canberra|sydney', 'australij'],
  ['NZ', 'Novi Zeland', -41.0, 174.0, 'new zealand\\w*', 'nov\\w* zeland'],
  ['EU', 'EU', 50.85, 4.35, 'european union|brussels|european commission|von der leyen|european central bank|ecb', 'europsk\\w* unij|bruxell|brisel|europsk\\w* komisij|von der leyen|ecb\\b|europsk\\w* sredisnj', 'EU', 'EU(-a|-u|-om)?'],
];

const compile = (src, flags) => (src ? new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${src})(?![\\p{L}])`, flags) : null);
const compileStem = (src) => (src ? new RegExp(`(?:^|[^\\p{L}])(?:${src})`, 'u') : null);

export const COUNTRIES = C.map(([iso, name, lat, lon, enCi, hrCi, enCs, hrCs]) => ({
  iso, name, lat, lon,
  en: compile(enCi, 'iu'), enCs: compile(enCs, 'u'),
  hr: compileStem(hrCi), hrCs: compile(hrCs, 'u'),
}));

export function matchCountries(text, lang) {
  if (!text) return [];
  const out = [];
  if (lang === 'hr') {
    const f = fold(text);
    for (const c of COUNTRIES) if ((c.hr && c.hr.test(f)) || (c.hrCs && c.hrCs.test(text))) out.push(c.iso);
  } else {
    for (const c of COUNTRIES) if ((c.en && c.en.test(text)) || (c.enCs && c.enCs.test(text))) out.push(c.iso);
  }
  // Brisel/Bruxelles su EU, ne Belgija; Washington je SAD.
  return out;
}

// ——— Teme za praćenje (Geopolitika) ———
const T = [
  ['ukr', 'Rusija i Ukrajina', 'ukrain\\w*|kyiv|kiev|zelensk\\w*|kremlin|putin|russia\\w*|moscow|donbas|crimea', 'ukrajin|kijev|zelensk|kremlj|putin|rusij|rusk|moskv|donbas|krim\\b|krimu\\b|krima\\b|krimsk'],
  ['mideast', 'Bliski istok', 'israel\\w*|gaza|hamas|hezbollah|west bank|palestin\\w*|leban\\w*|syria\\w*|iran\\w*|tehran|yemen\\w*|houthis?|saudi\\w*|riyadh|iraq\\w*|qatar|hormuz', 'izrael|gaz[aeiu]\\b|hamas|hezbol|palestin|liban|sirij|iran|teheran|jemen|huti|saudij|rijad|irak|katar|hormu'],
  ['usa', 'SAD i Washington', 'white house|congress|senate|republicans?|democrats?|supreme court|pentagon|hegseth|vance|trump administration|washington', 'bijel\\w* kuc|kongres|senat|republikan|demokrat|vrhovn\\w* sud|pentagon|hegseth|vance|trumpov\\w* administracij'],
  ['europe', 'Europa i EU', 'european union|brussels|european commission|von der leyen|nato|eurozone|merz|macron|starmer|bundestag', 'europsk|bruxell|brisel|nato|eurozon|merz|macron|starmer'],
  ['asia', 'Azija i Pacifik', 'china|chinese|beijing|xi jinping|taiwan\\w*|japan\\w*|korea\\w*|philippin\\w*|south china sea|indo-pacific|india|modi|pakistan', 'kin[aeiu]\\b|kinesk|peking|tajvan|japan|korej|filipin|indij|pakistan'],
  ['africa', 'Afrika', 'sudan\\w*|ethiopia\\w*|eritrea\\w*|somali\\w*|nigeria\\w*|congo\\w*|sahel|kenya\\w*|south africa|libya\\w*|malawi|guinea|mozambi\\w*|uganda', 'sudan|etiopij|eritrej|somalij|nigerij|kongo|sahel|kenij|juzn\\w* afri|libij|malavi|gvinej|mozambik|ugand'],
  ['americas', 'Amerike', 'mexic\\w*|brazil\\w*|venezuela\\w*|argentin\\w*|colombia\\w*|canad\\w*|cuba\\w*|panama|chile|peru|haiti|ecuador|hurricane', 'meksik|brazil|venezuel|argentin|kolumbij|kanad|kub[aeiu]\\b|panam|cile\\b|peru\\b|haiti|ekvador|uragan'],
  ['energy', 'Energija i klima', 'oil|crude|opec|natural gas|lng|diesel|energy|climate|emissions|el niño|el nino|renewable|heatwave|drought|wildfire', 'naft|plin|dizel|goriv|energ|klim|emisij|el nino|susa|toplinsk'],
  ['trade', 'Trgovina i sankcije', 'tariffs?|sanctions?|trade war|trade deal|export controls?|wto|embargo|blockade', 'carin|sankcij|trgovinsk|embargo|blokad'],
  ['elections', 'Izbori', 'elections?|electoral|ballots?|referendums?|runoff|snap poll|go to the polls|polling stations?|exit polls?', 'izbor[aeiu]?\\b|izbori|izborn|referendum|birac|biralist'],
];

export const TOPICS = T.map(([id, name, en, hr]) => ({ id, name, en: compile(en, 'iu'), hr: compileStem(hr) }));

export function matchTopics(text, lang) {
  if (!text) return [];
  const f = lang === 'hr' ? fold(text) : text;
  return TOPICS.filter((t) => (lang === 'hr' ? t.hr.test(f) : t.en.test(f))).map((t) => t.id);
}

// ——— Hrvatska: domaće ili svjetsko? ———
const HR_DOMESTIC = compileStem([
  'hrvatsk', 'hrvat', 'zagreb', 'split', 'rijek', 'rijec', 'osijek', 'zadr', 'zadar', 'pul[aeiu]\\b', 'sibenik', 'dubrovni', 'varazdin',
  'karlovac', 'karlovc', 'sisak', 'sisk', 'slavonsk', 'vukovar', 'koprivnic', 'cakovec', 'bjelovar', 'vinkovc', 'gospic', 'pozeg',
  'virovitic', 'knin', 'sinj', 'makarsk', 'trogir', 'opatij', 'porec', 'rovinj', 'umag', 'krk\\b', 'hvar', 'brac', 'korcul', 'istr[aeiu]\\b',
  'istarsk', 'dalmacij', 'dalmatin', 'slavonij', 'zagorj', 'lik[aeiu]\\b', 'licko', 'podravin', 'medimur', 'kvarner', 'medvednic', 'sljem',
  'sabor', 'plenkovic', 'milanovic', 'hdz', 'sdp', 'mozemo', 'domovinsk\\w* pokret', 'hnb\\b', 'hzzo', 'hzmo', 'uskok', 'dorh', 'hep\\b',
  'hzpp', 'hz infrastruktur', 'hac\\b', 'mup\\b', 'zupanij', 'gradonacelni', 'tomasevic', 'pantheon', 'kbc', 'hgk', 'hok\\b', 'hbor', 'fina\\b',
].join('|'));
const HR_WEAK = compileStem('ministr|vlad[aeiu]\\b|vladin|premijer|predsjedni');

export function hrScopeScore(text, url = '') {
  const f = fold(text);
  let dom = 0, foreign = 0;
  if (HR_DOMESTIC.test(f)) dom += 2;
  if (HR_WEAK.test(f)) dom += 0.5;
  const cs = matchCountries(text, 'hr').filter((c) => c !== 'HR' && c !== 'EU');
  foreign += cs.length * 1.5;
  if (/\/(svijet|world|globalno|regija)\//i.test(url)) foreign += 3;
  if (/\/(hrvatska|domovina|zagreb|hr-?vijesti)\//i.test(url)) dom += 3;
  return { dom, foreign, isWorld: foreign > dom + 0.4 };
}

// ——— Tržišni pojmovi ———
const MARKETS = compile('stocks?|shares|equities|markets?|wall street|s&p|nasdaq|dow|bonds?|yields?|treasur\\w*|federal reserve|fed|ecb|central bank|inflation|interest rates?|rate cut|rate hike|earnings|profit|revenue|ipo|merger|acquisition|takeover|oil prices?|crude|brent|opec|gold|dollar|euro|currency|bitcoin|crypto\\w*|tariffs?|gdp|recession|economy|economic|investors?|bank|banks|billion|trillion|valuation|startup|layoffs?', 'iu');
export function marketsScore(text) {
  if (!text) return 0;
  const m = text.match(new RegExp(MARKETS.source, 'giu'));
  return m ? m.length : 0;
}
