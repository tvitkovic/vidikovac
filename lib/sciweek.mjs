// "Tjedan u znanosti": ~18 različitih priča tjedna, svaka s kratkom oznakom od 1–3 riječi
// (po uzoru na tjedne preglede s popularnoznanstvenih profila: "Nobel za fiziku", "Nuklearni sat", "Hrskavica"…).
// Oznake nastaju bez umjetne inteligencije: rječnik pojmova (engleski → hrvatski) i, ako ništa ne odgovara,
// najosebujnija riječ iz naslova.

// [izraz, hrvatska oznaka (tekst ili funkcija), prioritet: 3 = specifično, 2 = uobičajeno, 1 = općenito]
const G = [
  // — svemir —
  [/\bdead sea scrolls?\b/, 'Svici s Mrtvog mora', 3],
  [/\bfast radio bursts?\b|\bfrbs?\b/, 'Brzi radijski bljesak', 3],
  [/\bblack holes?\b/, 'Crne rupe', 3], [/\bdark energy\b/, 'Tamna energija', 3], [/\bdark matter\b/, 'Tamna tvar', 3],
  [/\bexoplanets?\b/, 'Egzoplaneti', 3], [/\bsupernova\w*\b/, 'Supernova', 3], [/\bneutron stars?\b|\bmagnetars?\b|\bpulsars?\b/, 'Neutronske zvijezde', 3],
  [/\bquasars?\b/, 'Kvazari', 3], [/\bgravitational waves?\b/, 'Gravitacijski valovi', 3], [/\bbig bang\b/, 'Veliki prasak', 3],
  [/\bmilky way\b/, 'Mliječna staza', 3], [/\bhalley\b/, 'Halleyjev komet', 3], [/\bcomets?\b/, 'Kometi', 3], [/\basteroids?\b/, 'Asteroidi', 3],
  [/\bmeteor\w*\b/, 'Meteori', 3], [/\bauroras?\b|\bnorthern lights\b/, 'Polarna svjetlost', 3], [/\beclipses?\b/, 'Pomrčina', 3],
  [/\bsaturn\b/, 'Saturn', 3], [/\bjupiter\b/, 'Jupiter', 3], [/\bvenus\b/, 'Venera', 3], [/\bneptune\b/, 'Neptun', 3], [/\buranus\b/, 'Uran', 3],
  [/\bpluto\b/, 'Pluton', 3], [/\benceladus\b/, 'Enkelad', 3], [/\btitan\b/, 'Titan', 3], [/\beuropa\b/, 'Europa', 3], [/\bmars\b|\bmartian\b/, 'Mars', 3],
  [/\bmoons?\b|\blunar\b/, 'Mjesec', 2], [/\bsolar (flares?|storms?|wind|cycle)\b|\bthe sun\b|\bsun's\b/, 'Sunce', 2],
  [/\bartemis\b/, 'Artemis', 3], [/\bstarship\b/, 'Starship', 3], [/\bspace station\b|\biss\b/, 'Svemirska postaja', 3], [/\bspace debris\b|\bspace junk\b/, 'Svemirski otpad', 3],
  [/\bastronauts?\b/, 'Astronauti', 2], [/\bcosmic rays?\b/, 'Kozmičke zrake', 3], [/\bneutrinos?\b/, 'Neutrini', 3],
  [/\bplanets?\b/, 'Planeti', 2], [/\bgalax(y|ies)\b/, 'Galaksije', 2], [/\bjames webb\b|\bjwst\b|\bwebb\b/, 'Teleskop Webb', 2], [/\bhubble\b/, 'Hubble', 2], [/\bsatellites?\b/, 'Sateliti', 1],
  // — fizika i kemija —
  [/\bnuclear clocks?\b|\bthorium-229\b/, 'Nuklearni sat', 3], [/\batomic clocks?\b|\boptical clocks?\b/, 'Atomski sat', 3],
  [/\bquantum computers?\b|\bqubits?\b/, 'Kvantno računalo', 3], [/\bsupercondu\w*\b/, 'Supravodiči', 3], [/\bfusion\b/, 'Fuzija', 3],
  [/\bantimatter\b/, 'Antimaterija', 3], [/\bhiggs\b/, 'Higgsov bozon', 3], [/\bcern\b|\bcolliders?\b/, 'CERN', 3], [/\btime crystals?\b/, 'Vremenski kristali', 3],
  [/\bgraphene\b/, 'Grafen', 3], [/\bhydrogen\b/, 'Vodik', 3], [/\bhelium\b/, 'Helij', 3], [/\blasers?\b/, 'Laseri', 2], [/\bcrystals?\b/, 'Kristali', 2],
  [/\bmicroplastics?\b|\bnanoplastics?\b/, 'Mikroplastika', 3], [/\bplastics?\b/, 'Plastika', 2], [/\bglass\b/, 'Staklo', 2], [/\bmagnets?\b|\bmagnetic\b/, 'Magnetizam', 1],
  [/\bpickles?\b/, 'Kiseli krastavci', 3], [/\bbatter(y|ies)\b/, 'Baterije', 2], [/\bquantum\b/, 'Kvantna fizika', 1],
  // — život i evolucija —
  [/\btortoises?\b|\bturtles?\b/, 'Kornjače', 3], [/\boctop(us|uses|i)\b/, 'Hobotnice', 3], [/\bsquids?\b/, 'Lignje', 3], [/\bsharks?\b/, 'Morski psi', 3],
  [/\bwhales?\b/, 'Kitovi', 3], [/\bdolphins?\b/, 'Dupini', 3], [/\bbees?\b|\bbumblebees?\b/, 'Pčele', 3], [/\bants?\b/, 'Mravi', 3], [/\bspiders?\b/, 'Pauci', 3],
  [/\bsnakes?\b|\bvipers?\b|\bpythons?\b|\bboas?\b/, 'Zmije', 3], [/\bfrogs?\b|\btoads?\b/, 'Žabe', 3], [/\bparrots?\b/, 'Papige', 3], [/\bcrows?\b|\bravens?\b/, 'Vrane', 3],
  [/\bowls?\b/, 'Sove', 3], [/\bbats?\b/, 'Šišmiši', 3], [/\bpenguins?\b/, 'Pingvini', 3], [/\bbirds?\b/, 'Ptice', 2],
  [/\bdogs?\b|\bpupp(y|ies)\b/, 'Psi', 3], [/\bcats?\b|\bkittens?\b/, 'Mačke', 3], [/\bhorses?\b/, 'Konji', 3], [/\belephants?\b/, 'Slonovi', 3],
  [/\bchimp(anzee)?s?\b|\bbonobos?\b/, 'Čimpanze', 3], [/\bgorillas?\b/, 'Gorile', 3], [/\bmonkeys?\b|\bprimates?\b/, 'Majmuni', 2], [/\brats?\b/, 'Štakori', 2],
  [/\bwol(f|ves)\b/, 'Vukovi', 3], [/\bbears?\b/, 'Medvjedi', 3], [/\bfox(es)?\b/, 'Lisice', 3], [/\bdeer\b/, 'Jeleni', 3], [/\bjellyfish\b/, 'Meduze', 3],
  [/\bcorals?\b|\breefs?\b/, 'Koralji', 3], [/\bcrabs?\b|\blobsters?\b/, 'Rakovi', 3], [/\bbutterfl(y|ies)\b|\bmoths?\b/, 'Leptiri', 3], [/\bmosquito(es)?\b/, 'Komarci', 3],
  [/\btardigrades?\b/, 'Tardigradi', 3], [/\bmammoths?\b/, 'Mamuti', 3], [/\btyrannosaur\w*\b|\bt\. ?rex\b/, 'Tiranosaur', 3], [/\bpterosaurs?\b/, 'Pterosauri', 3],
  [/\bdinosaurs?\b/, 'Dinosauri', 2], [/\bsalmon\b/, 'Losos', 3], [/\bfish(es)?\b/, 'Ribe', 2], [/\binsects?\b/, 'Kukci', 2], [/\bworms?\b/, 'Crvi', 2],
  [/\bchickens?\b|\bhens?\b|\bpoultry\b/, (t) => (/\b(raw|meat|food|eat\w*|poison\w*|bacteri\w*|cook\w*)\b/.test(t) ? 'Piletina' : 'Kokoši'), 3],
  [/\bcows?\b|\bcattle\b/, 'Krave', 3], [/\bpigs?\b/, 'Svinje', 3], [/\bsheep\b/, 'Ovce', 3],
  [/\bfung(i|us)\b|\bmushrooms?\b/, 'Gljive', 3], [/\btrees?\b/, 'Drveće', 2], [/\bforests?\b/, 'Šume', 2], [/\bplants?\b|\bflowers?\b/, 'Biljke', 1],
  [/\bcrispr\b|\bgene edit\w*\b/, 'CRISPR', 3], [/\bclon(e|ed|ing)\b/, 'Kloniranje', 3], [/\bgenomes?\b/, 'Genom', 2],
  [/\bgut (bacteria|microbes?|microbiome)\b|\bmicrobiomes?\b/, 'Crijevna flora', 3], [/\bbacteri(a|um)\b/, 'Bakterije', 1], [/\bevolution\w*\b/, 'Evolucija', 1],
  [/\bfossils?\b/, 'Fosili', 1], [/\blongevity\b|\blifespans?\b|\blive longer\b/, 'Dugovječnost', 2],
  // — zdravlje i medicina —
  [/\bglp-1\w*\b|\bozempic\b|\bwegovy\b|\bsemaglutide\b|\btirzepatide\b|\bmounjaro\b|\bweight-loss drugs?\b/, 'GLP-1', 3],
  [/\bgene therap\w*\b/, 'Genska terapija', 3], [/\bstem cells?\b/, 'Matične stanice', 3], [/\b(xeno)?transplant\w*\b/, 'Transplantacija', 3],
  [/\bcartilage\b/, 'Hrskavica', 3], [/\bosteoarthritis\b|\barthritis\b/, 'Artritis', 3], [/\bknuckles?\b/, 'Pucketanje zglobova', 3],
  [/\bdiarrh\w*\b/, 'Proljev', 3], [/\bfood poisoning\b|\bsalmonella\b|\be\. ?coli\b|\blisteria\b/, 'Trovanje hranom', 3],
  [/\balzheimer'?s?\b/, 'Alzheimerova bolest', 3], [/\bdementia\b/, 'Demencija', 3], [/\bparkinson'?s?\b/, 'Parkinsonova bolest', 3],
  [/\bstrokes?\b/, 'Moždani udar', 3], [/\bheart attacks?\b/, 'Srčani udar', 3], [/\bblood pressure\b|\bhypertension\b/, 'Krvni tlak', 3], [/\bcholesterol\b/, 'Kolesterol', 3],
  [/\bdiabet\w*\b/, 'Dijabetes', 3], [/\bobes\w*\b/, 'Pretilost', 3], [/\bvaccin\w*\b/, 'Cjepiva', 3], [/\bflu\b|\binfluenza\b/, 'Gripa', 3],
  [/\bcovid\w*\b|\bsars-cov-2\b/, 'COVID-19', 3], [/\bmeasles\b/, 'Ospice', 3], [/\bmalaria\b/, 'Malarija', 3], [/\btuberculosis\b/, 'Tuberkuloza', 3], [/\bhiv\b/, 'HIV', 3],
  [/\bantibiotic\w*\b|\bsuperbugs?\b|\bantimicrobial resistance\b/, 'Antibiotici', 3], [/\bcancers?\b|\btumou?rs?\b|\bleukemia\b|\bchemotherapy\b/, 'Rak', 2],
  [/\bplague\b|\bbubonic\b/, 'Kuga', 3], [/\btattoos?\b/, 'Tetovaže', 3], [/\bembryos?\b/, 'Embriji', 3], [/\bnerves?\b|\bnerve-cells?\b/, 'Živci', 2],
  [/\bplacenta\w*\b/, 'Posteljica', 3], [/\bpregnan\w*\b/, 'Trudnoća', 3], [/\bbab(y|ies)\b|\binfants?\b|\bnewborns?\b/, 'Bebe', 2], [/\bteens?\b|\bteenagers?\b|\badolescen\w*\b/, 'Tinejdžeri', 2],
  [/\btickl\w*\b/, 'Škakljanje', 3], [/\bmigraines?\b/, 'Migrena', 3], [/\ballerg\w*\b/, 'Alergije', 3], [/\bliver\b/, 'Jetra', 2], [/\bkidneys?\b/, 'Bubrezi', 2],
  [/\blungs?\b/, 'Pluća', 2], [/\bskin\b/, 'Koža', 2], [/\bhair\b/, 'Kosa', 2], [/\bteeth\b|\btooth\b|\bdental\b/, 'Zubi', 3], [/\bbones?\b/, 'Kosti', 2],
  [/\bmuscles?\b/, 'Mišići', 2], [/\bblind\w*\b|\beyesight\b|\bvision\b|\beyes?\b/, 'Vid', 2], [/\bdeaf\w*\b|\bhearing\b/, 'Sluh', 3], [/\bpain\b/, 'Bol', 3],
  [/\bpsychedelic\w*\b|\bpsilocybin\b|\blsd\b|\bmdma\b/, 'Psihodelici', 3], [/\bcannabis\b|\bmarijuana\b|\bthc\b/, 'Kanabis', 3], [/\balcohol\b|\bbeer\b|\bwine\b/, 'Alkohol', 3],
  [/\bsmok\w*\b|\bcigarettes?\b|\bvap\w*\b|\bnicotine\b/, 'Pušenje', 3], [/\bcaffeine\b|\benergy drinks?\b/, 'Kofein', 3], [/\bcoffee\b/, 'Kava', 3], [/\btea\b/, 'Čaj', 3],
  [/\bchocolate\b|\bcocoa\b/, 'Čokolada', 3], [/\bsugar\w*\b|\bsweeteners?\b/, 'Šećer', 3], [/\bsalt\b|\bsodium\b/, 'Sol', 3], [/\bultra-?processed\b/, 'Ultraprerađena hrana', 3],
  [/\bfasting\b/, 'Post', 3], [/\bdiets?\b|\bnutrition\w*\b|\bnutrients?\b/, 'Prehrana', 2], [/\bexercis\w*\b|\bworkouts?\b|\bfitness\b/, 'Tjelovježba', 2],
  [/\bwalk(ing|s)?\b|\bsteps\b/, 'Hodanje', 2], [/\brunn(ing|ers?)\b|\bmarathons?\b/, 'Trčanje', 3], [/\bsitting\b|\bsedentary\b/, 'Sjedenje', 3],
  [/\bsleep\w*\b|\binsomnia\b|\bnaps?\b/, 'San', 3], [/\bdreams?\b/, 'Snovi', 3], [/\bmemor(y|ies)\b/, 'Pamćenje', 2],
  [/\bdepress\w*\b/, 'Depresija', 3], [/\banxi\w*\b/, 'Anksioznost', 3], [/\badhd\b/, 'ADHD', 3], [/\bautis\w*\b/, 'Autizam', 3], [/\bstress\w*\b/, 'Stres', 2],
  [/\blonel\w*\b|\bsocial isolation\b/, 'Usamljenost', 3], [/\bhappiness\b|\bhappier\b|\bwell-being\b|\bwellbeing\b/, 'Sreća', 2],
  [/\bemotional intelligence\b/, 'Emocionalna inteligencija', 3], [/\bpsychopath\w*\b|\bnarcissis\w*\b/, 'Psihopatija', 3],
  [/\bsmartphones?\b|\bphones?\b|\bscreen ?time\b|\bscreens\b/, 'Mobiteli', 3], [/\bsocial media\b|\btiktok\b|\binstagram\b/, 'Društvene mreže', 3],
  [/\bmusic\w*\b|\bsongs?\b|\bmelod\w*\b|\bsinging\b/, 'Glazba', 3], [/\blanguages?\b|\bwords\b|\bspeech\b/, 'Jezik', 2], [/\bnoise\b/, 'Buka', 2],
  [/\bag(e)?ing\b|\bzombie cells?\b|\bsenescen\w*\b/, 'Starenje', 2], [/\bbrains?\b|\bneurons?\b/, 'Mozak', 1],
  // — planet i klima —
  [/\bchernobyl\b|\bchornobyl\b/, 'Černobil', 3], [/\bfukushima\b/, 'Fukushima', 3], [/\bdead sea\b/, 'Mrtvo more', 3],
  [/\bheat ?waves?\b|\bextreme heat\b/, 'Toplinski val', 3], [/\bhurricanes?\b|\btyphoons?\b|\bcyclones?\b/, 'Uragani', 3], [/\btornado\w*\b/, 'Tornada', 3],
  [/\bearthquakes?\b|\bquakes?\b/, 'Potresi', 3], [/\bvolcan\w*\b|\beruptions?\b/, 'Vulkani', 3], [/\btsunamis?\b/, 'Tsunami', 3], [/\bfloods?\b|\bflooding\b/, 'Poplave', 3],
  [/\bdroughts?\b/, 'Suša', 3], [/\bwildfires?\b|\bbushfires?\b/, 'Šumski požari', 3], [/\bglaciers?\b|\bice sheets?\b/, 'Ledenjaci', 3], [/\bgreenland\b/, 'Grenland', 3],
  [/\bantarctic\w*\b/, 'Antarktika', 3], [/\barctic\b/, 'Arktik', 3], [/\bpermafrost\b/, 'Permafrost', 3], [/\bsea levels?\b/, 'Razina mora', 3],
  [/\bgroundwater\b|\baquifers?\b/, 'Podzemne vode', 3], [/\bair pollution\b|\bsmog\b/, 'Zagađenje zraka', 3], [/\bmethane\b/, 'Metan', 3], [/\bozone\b/, 'Ozon', 3],
  [/\bcarbon capture\b/, 'Hvatanje ugljika', 3], [/\bsolar (power|panels?|energy|cells?)\b/, 'Solarna energija', 3], [/\bwind (power|turbines?|farms?|energy)\b/, 'Energija vjetra', 3],
  [/\bnuclear (power|reactors?|plants?|energy)\b/, 'Nuklearna energija', 3], [/\bmass extinctions?\b/, 'Masovno izumiranje', 3], [/\bpangea\b|\bpangaea\b/, 'Pangea', 3],
  [/\bel ni[ñn]o\b|\bla ni[ñn]a\b/, 'El Niño', 3], [/\bamazon\b/, 'Amazonija', 2], [/\bsahara\b/, 'Sahara', 3], [/\badriatic\b/, 'Jadran', 3], [/\bmediterranean\b/, 'Mediteran', 3],
  [/\bsunlight\b|\bdaylight\b/, 'Sunčeva svjetlost', 2], [/\bsnow\w*\b/, 'Snijeg', 2], [/\bgulf stream\b|\bamoc\b/, 'Golfska struja', 3],
  [/\bclimate\b|\bglobal warming\b/, 'Klima', 1], [/\boceans?\b|\bsea\b/, 'Ocean', 1],
  // — tehnologija —
  [/\bbrain implants?\b|\bneuralink\b|\bbrain-computer\b/, 'Moždani implantat', 3], [/\bsmart glasses\b/, 'Pametne naočale', 3], [/\bself-driving\b|\brobotaxi\w*\b/, 'Autonomna vozila', 3],
  [/\bdrones?\b/, 'Dronovi', 3], [/\brobot\w*\b/, 'Roboti', 2], [/\bchatbots?\b|\bchatgpt\b|\bllms?\b|\blarge language models?\b/, 'Chatbotovi', 3], [/\bchips?\b|\bsemiconductors?\b/, 'Čipovi', 2],
  [/\belectric (vehicles?|cars?)\b|\bevs?\b/, 'Električni automobili', 3], [/\b3d[- ]print\w*\b/, '3D ispis', 3], [/\bai\b|\bartificial intelligence\b/, 'Umjetna inteligencija', 1],
  // — prošlost i čovjek —
  [/\bneanderthals?\b/, 'Neandertalci', 3], [/\bdenisovans?\b/, 'Denisovci', 3], [/\bpompeii\b|\bvesuvius\b|\bherculaneum\b/, 'Pompeji', 3],
  [/\bpharaohs?\b|\bpyramids?\b|\bancient egypt\w*\b/, 'Egipat', 3], [/\bmumm(y|ies|ified)\b/, 'Mumije', 3], [/\bvikings?\b/, 'Vikinzi', 3], [/\bmaya\w*\b/, 'Maje', 3],
  [/\bincas?\b/, 'Inke', 3], [/\baztecs?\b/, 'Asteci', 3], [/\bstonehenge\b/, 'Stonehenge', 3], [/\bcave (art|paintings?)\b/, 'Špiljska umjetnost', 3],
  [/\bshipwrecks?\b/, 'Brodolomi', 3], [/\bscrolls?\b/, 'Svici', 3], [/\balexandria\b/, 'Aleksandrija', 3], [/\bromans?\b|\broman empire\b/, 'Rimljani', 3],
  [/\bbronze age\b/, 'Brončano doba', 3], [/\bstone age\b|\bneolithic\b|\bpaleolithic\b/, 'Kameno doba', 3], [/\bice age\b/, 'Ledeno doba', 3],
  [/\btombs?\b|\bburials?\b|\bgraves?\b/, 'Grobnice', 3], [/\bskeletons?\b|\bskulls?\b/, 'Kosturi', 2], [/\btitanic\b/, 'Titanic', 3], [/\bearhart\b/, 'Amelia Earhart', 3],
  [/\barchaeolog\w*\b/, 'Arheologija', 1],
  // — matematika —
  [/\bprime numbers?\b|\bprimes\b/, 'Prosti brojevi', 3], [/\bnavier-stokes\b/, 'Navier-Stokes', 3], [/\bconjectures?\b/, 'Matematička slutnja', 3], [/\btheorems?\b|\bproofs?\b/, 'Teorem', 2],
  [/\bmathemat\w*\b/, 'Matematika', 1],
];
const GLOSSARY = G.map(([re, hr, prio]) => ({ re: new RegExp(re.source, 'i'), hr, prio }));

const NOBEL = [
  [/physics/i, 'Nobel za fiziku', 'physics'], [/chemistry/i, 'Nobel za kemiju', 'chemistry'],
  [/medicine|physiology/i, 'Nobel za medicinu', 'medicine'], [/econom/i, 'Nobel za ekonomiju', 'economics'],
  [/peace/i, 'Nobel za mir', 'peace'], [/literature/i, 'Nobel za književnost', 'literature'],
];

const GENERIC = new Set(`scientists scientist researchers research study studies new finds find found reveals reveal revealed shows show
may might could can will just first ever years year million billion thousands hundreds discover discovered discovery surprising
finally reason really way ways key help helps make makes made people humans human world earth life time day days week weeks know
says said report reports suggest suggests secret secrets hidden mystery mysterious strange weird odd old new big small huge tiny`.split(/\s+/));
const STOP = new Set(`a an the and or but of to in on at by for from with into over under about after before as is are was were be been
it its this that these those their there than then so not no yes you your our we they he she his her them what why how when where which
who whom whose do does did doing have has had having more most less least very too also only still even like up down out off`.split(/\s+/));

const titleCase = (s) => s.replace(/\b\p{L}/gu, (m) => m.toUpperCase());

/** Oznaka priče: { hr, key }. `df` je broj priča tjedna u kojima se riječ pojavljuje, `N` ukupan broj priča. */
export function labelFor(c, df = new Map(), N = 50) {
  const titles = [c.rep.title, ...c.items.filter((i) => i !== c.rep).map((i) => i.title)];
  const text = titles.join(' \n ').toLowerCase();
  const all = `${text} ${(c.rep.summary || '').toLowerCase()}`;
  // Nobelove nagrade
  if (/\bnobel\b/.test(c.rep.title.toLowerCase()) || titles.filter((t) => /\bnobel\b/i.test(t)).length >= 2) {
    for (const src of [c.rep.title, text]) for (const [re, hr, k] of NOBEL) if (re.test(src)) return { hr, key: `nobel-${k}` };
  }
  // rječnik pojmova
  let best = null, bestScore = 0;
  GLOSSARY.forEach((g, idx) => {
    let sc = 0;
    titles.forEach((t, i) => { if (g.re.test(t)) sc += i === 0 ? 2 : 1; });
    if (!sc && c.rep.summary && g.re.test(c.rep.summary)) sc = 0.4;
    if (!sc) return;
    sc = sc * g.prio - idx * 1e-4;
    if (sc > bestScore) { bestScore = sc; best = g; }
  });
  if (best && bestScore >= 1.2) {
    const hr = typeof best.hr === 'function' ? best.hr(all) : best.hr;
    return { hr, key: `g-${hr.toLowerCase()}` };
  }
  // rezerva: najosebujnija riječ (ili dvije) iz naslova
  const words = c.rep.title.replace(/[’'"“”‘:;,.!?()[\]]/g, ' ').split(/\s+/).filter(Boolean);
  let bw = null, bs = 0;
  words.forEach((w, i) => {
    const lw = w.toLowerCase();
    if (lw.length < 3 || STOP.has(lw) || GENERIC.has(lw) || /^\d/.test(lw)) return;
    const occ = titles.filter((t) => t.toLowerCase().includes(lw)).length;
    const idf = Math.log(1 + N / (df.get(lw) || 1));
    const cap = i > 0 && /^\p{Lu}/u.test(w) ? 1.3 : 1;
    const sc = occ * idf * cap;
    if (sc > bs) { bs = sc; bw = i; }
  });
  if (bw == null) return { hr: words.slice(0, 3).join(' '), key: `t-${c.rep.title.toLowerCase().slice(0, 30)}` };
  let label = words[bw];
  const next = words[bw + 1];
  if (/^\p{Lu}/u.test(label) && next && /^\p{Lu}/u.test(next) && !STOP.has(next.toLowerCase())) label = `${label} ${next}`;
  label = /^\p{Lu}/u.test(label) ? label : titleCase(label);
  return { hr: label, key: `w-${label.toLowerCase()}` };
}

// "Svakodnevne" i neobične teme koje čitatelji rado otvaraju (hrana, san, tijelo, ljubimci, mobiteli…)
const CURIOUS = /\b(coffee|caffeine|chocolate|tea|beer|wine|alcohol|pizza|bread|cheese|chicken|eggs?|food|diets?|eat(ing)?|sleep\w*|dreams?|naps?|dogs?|cats?|pets?|music|songs?|singing|phones?|smartphones?|screens?|social media|sex|kiss\w*|love|dating|poop|feces|faeces|diarrh\w*|farts?|gut|tickl\w*|knuckles?|yawn\w*|laugh\w*|bab(y|ies)|teens?|kids|children|walk(ing)?|exercise|running|weight|hair|skin|teeth|longevity|ag(e)?ing|lifespan|happiness|lonel\w*|tortoises?|octop\w*|parrots?|crows?|elephants?|whales?|sharks?|spiders?|snakes?|squid|pickles?|weird|bizarre|surprising|finally)\b/i;
const NOT_PICK = /\b(podcast|quiz|crossword|newsletter|obituary|deals?|discount|sale|best .{0,30} to buy|gift guide|photos of the week|week in (pictures|images)|this week in|weekly roundup|the download|morning briefing|starwatch|apod|dies( at| aged)?|died aged|(sci-fi|science fiction|documentary) (film|series|novel)|film review|book review|review: )\b/i;

const NOBEL_FIELD = { physics: 'physics', chemistry: 'physics', medicine: 'health' };

/** Nobelove nagrade iz različitih područja često završe u istoj skupini ("Nobel prize … awarded"): razdvoji ih. */
export function splitNobel(c) {
  if (!c.items.some((i) => /\bnobel\b/i.test(i.title))) return [c];
  const groups = new Map();
  for (const it of c.items) {
    const d = /\bnobel\b/i.test(it.title) ? NOBEL.find(([re]) => re.test(it.title)) : null;
    const k = d ? d[2] : null;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  const keys = [...groups.keys()].filter(Boolean);
  if (keys.length < 2) return [c];
  const total = new Set(c.items.map((i) => i.outlet)).size || 1;
  return keys.map((k) => {
    const items = groups.get(k);
    const pref = (i) => i.ow + (/\b(awarded|wins?|won|goes to)\b/i.test(i.title) ? 0.5 : 0) + (i.summary ? 0.1 : 0);
    const rep = [...items].sort((a, b) => pref(b) - pref(a))[0];
    const outlets = new Set(items.map((i) => i.outlet)).size;
    return {
      ...c, items, rep, outlets, extraOutlets: [],
      newest: Math.max(...items.map((i) => i.t)), oldest: Math.min(...items.map((i) => i.t)),
      summary: rep.summary || '', img: rep.img || items.find((i) => i.img)?.img || null,
      sscore: c.sscore * Math.sqrt(outlets / total),
      field: NOBEL_FIELD[k] || 'misc',
    };
  });
}

/**
 * Odaberi priče tjedna.
 * @param {any[]} clusters  grupirane znanstvene priče (s `sscore` i `field`)
 * @param {(c:any)=>any} toS  pretvorba u priču za klijenta
 */
export function pickWeek(clusters, toS, { n = 20, curiousSlots = 8, perField = 5 } = {}) {
  const cands = clusters.flatMap(splitNobel).filter((c) => c.rep?.title && c.rep.title.length > 18 && !NOT_PICK.test(c.rep.title) && !/^apod:/i.test(c.rep.title));
  const N = cands.length || 1;
  const df = new Map();
  for (const c of cands) for (const w of new Set(c.rep.title.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/))) if (w) df.set(w, (df.get(w) || 0) + 1);
  const scored = cands.map((c) => {
    const lab = labelFor(c, df, N);
    const curious = CURIOUS.test(c.rep.title) ? 0.35 : 0;
    // izvještaji o nesrećama (mrtvi, ozlijeđeni, bez struje) su vijesti, ne znanost
    const disaster = /\b(dead|killed|deaths?|injur\w*|without power|damage|evacuat\w*|strikes)\b/i.test(c.rep.title) ? -0.45 : 0;
    const multi = Math.min(0.5, (new Set(c.items.map((i) => i.outlet)).size - 1) * 0.12);
    return { c, lab, curious: curious > 0, multi, score: c.sscore + curious + multi + disaster };
  }).sort((a, b) => b.score - a.score);
  const used = new Map(), perF = new Map(), out = [], seen = new Set();
  const add = (s, limit) => {
    if (out.length >= limit || seen.has(s)) return;
    const k = s.lab.key;
    if (used.has(k)) { // ista tema: dodaj kao "piše i…"
      seen.add(s);
      const o = used.get(k);
      if (o.also.length < 4 && !o.also.some((a) => a.url === s.c.rep.url)) o.also.push({ src: s.c.rep.oname, url: s.c.rep.url, title: s.c.rep.title });
      return;
    }
    const f = s.c.field || 'misc';
    const cap = f === 'misc' ? 3 : perField;
    if ((perF.get(f) || 0) >= cap) return;
    seen.add(s);
    perF.set(f, (perF.get(f) || 0) + 1);
    const st = toS(s.c);
    const item = { ...st, label: s.lab.hr, key: k, also: (st.also || []).slice(0, 4), curious: Boolean(s.curious) };
    used.set(k, item);
    out.push(item);
  };
  // 1) najpraćenije priče tjedna, 2) mjesta za "svakodnevne" i neobične studije (hrana, san, tijelo, životinje…)
  for (const s of scored) add(s, n - curiousSlots);
  const curious = scored.filter((s) => s.curious).sort((a, b) => (b.c.sscore + b.multi) - (a.c.sscore + a.multi));
  for (const s of curious) add(s, n);
  for (const s of scored) add(s, n); // ako nema dovoljno neobičnih
  return out;
}
