// Registar izvora. Težina (w) redakcije koristi se pri rangiranju: priča koju pokriva
// više uglednih redakcija "raste" više. Svi URL-ovi provjereni 11. 10. 2026.

export const OUTLETS = {
  // — svjetski —
  reuters: { name: 'Reuters', w: 1.35 },
  ap: { name: 'AP', w: 1.3 },
  bbc: { name: 'BBC', w: 1.25 },
  guardian: { name: 'The Guardian', w: 1.25 },
  wsj: { name: 'Wall Street Journal', w: 1.25 },
  nyt: { name: 'New York Times', w: 1.25 },
  ft: { name: 'Financial Times', w: 1.25 },
  bloomberg: { name: 'Bloomberg', w: 1.25 },
  economist: { name: 'The Economist', w: 1.15 },
  wapo: { name: 'Washington Post', w: 1.1 },
  aljazeera: { name: 'Al Jazeera', w: 1.05 },
  dw: { name: 'DW', w: 1.0 },
  lemonde: { name: 'Le Monde', w: 1.0 },
  france24: { name: 'France 24', w: 0.95 },
  npr: { name: 'NPR', w: 0.95 },
  cbc: { name: 'CBC', w: 0.85 },
  sky: { name: 'Sky News', w: 0.85 },
  euronews: { name: 'Euronews', w: 0.85 },
  politico: { name: 'Politico', w: 1.05 },
  politicoeu: { name: 'Politico Europe', w: 1.05 },
  cnbc: { name: 'CNBC', w: 0.95 },
  marketwatch: { name: 'MarketWatch', w: 0.85 },
  investing: { name: 'Investing.com', w: 0.7 },
  // — analize —
  foreignpolicy: { name: 'Foreign Policy', w: 1.1 },
  foreignaffairs: { name: 'Foreign Affairs', w: 1.15 },
  warontherocks: { name: 'War on the Rocks', w: 0.9 },
  crisisgroup: { name: 'Crisis Group', w: 1.0 },
  atlantic: { name: 'The Atlantic', w: 1.0 },
  rstatecraft: { name: 'Responsible Statecraft', w: 0.8 },
  // — Hrvatska —
  hrt: { name: 'HRT', w: 1.2 },
  n1: { name: 'N1', w: 1.15 },
  index: { name: 'Index.hr', w: 1.1 },
  jutarnji: { name: 'Jutarnji list', w: 1.1 },
  vecernji: { name: 'Večernji list', w: 1.1 },
  telegram: { name: 'Telegram', w: 1.0 },
  tportal: { name: 'Tportal', w: 1.0 },
  dnevnik: { name: 'Dnevnik.hr', w: 1.0 },
  net: { name: 'Net.hr', w: 0.9 },
  h24sata: { name: '24sata', w: 0.9 },
  slobodna: { name: 'Slobodna Dalmacija', w: 0.9 },
  novilist: { name: 'Novi list', w: 0.9 },
  glasistre: { name: 'Glas Istre', w: 0.7 },
  poslovni: { name: 'Poslovni dnevnik', w: 1.0 },
  // — znanost —
  nature: { name: 'Nature', w: 1.4 },
  science: { name: 'Science', w: 1.4 },
  quanta: { name: 'Quanta Magazine', w: 1.3 },
  newscientist: { name: 'New Scientist', w: 1.1 },
  sciam: { name: 'Scientific American', w: 1.1 },
  sciencenews: { name: 'Science News', w: 1.1 },
  sciencedaily: { name: 'ScienceDaily', w: 0.8 },
  physorg: { name: 'Phys.org', w: 0.8 },
  livescience: { name: 'Live Science', w: 0.8 },
  sciencealert: { name: 'ScienceAlert', w: 0.7 },
  ars: { name: 'Ars Technica', w: 1.0 },
  nasa: { name: 'NASA', w: 1.0 },
  esa: { name: 'ESA', w: 1.0 },
  universetoday: { name: 'Universe Today', w: 0.7 },
  physicsworld: { name: 'Physics World', w: 0.9 },
  carbonbrief: { name: 'Carbon Brief', w: 1.0 },
  insideclimate: { name: 'Inside Climate News', w: 0.9 },
  knowable: { name: 'Knowable Magazine', w: 1.0 },
  nautilus: { name: 'Nautilus', w: 1.0 },
  smithsonian: { name: 'Smithsonian', w: 0.9 },
  techreview: { name: 'MIT Technology Review', w: 1.0 },
  bbcfuture: { name: 'BBC Future', w: 0.9 },
  wired: { name: 'Wired', w: 0.9 },
  // popularna znanost: manje težine, ali pokrivaju "svakodnevne" studije (hrana, san, mobiteli, životinje)
  popsci: { name: 'Popular Science', w: 0.75 },
  discover: { name: 'Discover', w: 0.75 },
  medicalxpress: { name: 'Medical Xpress', w: 0.7 },
  psypost: { name: 'PsyPost', w: 0.65 },
  scitechdaily: { name: 'SciTechDaily', w: 0.6 },
  zmescience: { name: 'ZME Science', w: 0.6 },
  earthcom: { name: 'Earth.com', w: 0.55 },
  studyfinds: { name: 'StudyFinds', w: 0.55 },
};

// desk: hr | hr-dom | hr-world | hr-top | hr-biz | world | top | mostread | politics | markets | analysis | science | longread
// every: minimalni razmak između dva dohvaćanja (minute)
const G = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const FEEDS = [
  // ——— Hrvatska ———
  { id: 'index', outlet: 'index', lang: 'hr', desk: 'hr', url: 'https://www.index.hr/rss/vijesti' },
  { id: 'index-hr', outlet: 'index', lang: 'hr', desk: 'hr-dom', url: 'https://www.index.hr/rss/vijesti-hrvatska' },
  { id: 'index-svijet', outlet: 'index', lang: 'hr', desk: 'hr-world', url: 'https://www.index.hr/rss/vijesti-svijet' },
  { id: 'index-top', outlet: 'index', lang: 'hr', desk: 'hr-top', url: 'https://www.index.hr/rss/najcitanije' },
  { id: 'hrt', outlet: 'hrt', lang: 'hr', desk: 'hr', url: 'https://feed.hrt.hr/vijesti/page.xml' },
  { id: 'n1', outlet: 'n1', lang: 'hr', desk: 'hr', url: 'https://n1info.hr/feed/' },
  { id: 'jutarnji', outlet: 'jutarnji', lang: 'hr', desk: 'hr', url: 'https://www.jutarnji.hr/vijesti/feed' },
  { id: 'vecernji', outlet: 'vecernji', lang: 'hr', desk: 'hr', url: 'https://www.vecernji.hr/feeds/latest' },
  { id: 'vecernji-hr', outlet: 'vecernji', lang: 'hr', desk: 'hr-dom', url: 'https://www.vecernji.hr/feeds/section/vijesti/hrvatska' },
  { id: 'telegram', outlet: 'telegram', lang: 'hr', desk: 'hr', url: 'https://www.telegram.hr/feed/' },
  { id: 'tportal', outlet: 'tportal', lang: 'hr', desk: 'hr', url: 'https://www.tportal.hr/rss-vijesti.xml' },
  { id: 'dnevnik', outlet: 'dnevnik', lang: 'hr', desk: 'hr', url: 'https://dnevnik.hr/assets/feed/articles/' },
  { id: 'net', outlet: 'net', lang: 'hr', desk: 'hr', url: 'https://net.hr/najnovije/rss.xml' },
  { id: '24sata', outlet: 'h24sata', lang: 'hr', desk: 'hr', url: 'https://www.24sata.hr/feeds/aktualno.xml' },
  { id: 'slobodna', outlet: 'slobodna', lang: 'hr', desk: 'hr', url: 'https://slobodnadalmacija.hr/feed' },
  { id: 'novilist', outlet: 'novilist', lang: 'hr', desk: 'hr', url: 'https://www.novilist.hr/feed/' },
  { id: 'glasistre', outlet: 'glasistre', lang: 'hr', desk: 'hr', url: 'https://www.glasistre.hr/rss.xml' },
  // ——— Hrvatska: gospodarstvo ———
  { id: 'poslovni', outlet: 'poslovni', lang: 'hr', desk: 'hr-biz', url: 'https://www.poslovni.hr/feed' },
  { id: 'tportal-biz', outlet: 'tportal', lang: 'hr', desk: 'hr-biz', url: 'https://www.tportal.hr/rss-biznis.xml' },
  { id: 'n1-biz', outlet: 'n1', lang: 'hr', desk: 'hr-biz', url: 'https://n1info.hr/biznis/feed/' },
  { id: 'vecernji-biz', outlet: 'vecernji', lang: 'hr', desk: 'hr-biz', url: 'https://www.vecernji.hr/feeds/section/biznis' },
  { id: 'jutarnji-biz', outlet: 'jutarnji', lang: 'hr', desk: 'hr-biz', url: 'https://www.jutarnji.hr/novac/feed' },

  // ——— Svijet ———
  { id: 'gn-world', outlet: 'google', lang: 'en', desk: 'top', url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en' },
  { id: 'gn-reuters', outlet: 'google', lang: 'en', desk: 'world', url: G('when:1d site:reuters.com/world') },
  { id: 'gn-ap', outlet: 'google', lang: 'en', desk: 'world', url: G('when:1d site:apnews.com') },
  { id: 'guardian-world', outlet: 'guardian', lang: 'en', desk: 'world', url: 'https://www.theguardian.com/world/rss' },
  { id: 'guardian-intl', outlet: 'guardian', lang: 'en', desk: 'top', url: 'https://www.theguardian.com/international/rss' },
  { id: 'guardian-europe', outlet: 'guardian', lang: 'en', desk: 'world', url: 'https://www.theguardian.com/world/europe-news/rss' },
  { id: 'bbc-world', outlet: 'bbc', lang: 'en', desk: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'bbc-top', outlet: 'bbc', lang: 'en', desk: 'top', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { id: 'wsj-world', outlet: 'wsj', lang: 'en', desk: 'world', url: 'https://feeds.content.dowjones.io/public/rss/RSSWorldNews' },
  { id: 'nyt-world', outlet: 'nyt', lang: 'en', desk: 'world', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { id: 'nyt-home', outlet: 'nyt', lang: 'en', desk: 'top', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { id: 'nyt-most', outlet: 'nyt', lang: 'en', desk: 'mostread', url: 'https://rss.nytimes.com/services/xml/rss/nyt/MostViewed.xml' },
  { id: 'ft-world', outlet: 'ft', lang: 'en', desk: 'world', url: 'https://www.ft.com/world?format=rss' },
  { id: 'aljazeera', outlet: 'aljazeera', lang: 'en', desk: 'world', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { id: 'dw', outlet: 'dw', lang: 'en', desk: 'world', url: 'https://rss.dw.com/rdf/rss-en-all' },
  { id: 'france24', outlet: 'france24', lang: 'en', desk: 'world', url: 'https://www.france24.com/en/rss' },
  { id: 'euronews', outlet: 'euronews', lang: 'en', desk: 'world', url: 'https://www.euronews.com/rss' },
  { id: 'npr-world', outlet: 'npr', lang: 'en', desk: 'world', url: 'https://feeds.npr.org/1004/rss.xml' },
  { id: 'cbc-world', outlet: 'cbc', lang: 'en', desk: 'world', url: 'https://www.cbc.ca/webfeed/rss/rss-world' },
  { id: 'sky-world', outlet: 'sky', lang: 'en', desk: 'world', url: 'https://feeds.skynews.com/feeds/rss/world.xml' },
  { id: 'wapo-world', outlet: 'wapo', lang: 'en', desk: 'world', url: 'https://feeds.washingtonpost.com/rss/world' },
  { id: 'lemonde', outlet: 'lemonde', lang: 'en', desk: 'world', url: 'https://www.lemonde.fr/en/rss/une.xml' },
  // ——— Politika ———
  { id: 'politico-eu', outlet: 'politicoeu', lang: 'en', desk: 'politics', url: 'https://www.politico.eu/feed/' },
  { id: 'politico-us', outlet: 'politico', lang: 'en', desk: 'politics', url: 'https://rss.politico.com/politics-news.xml' },
  { id: 'wsj-politics', outlet: 'wsj', lang: 'en', desk: 'politics', url: 'https://feeds.content.dowjones.io/public/rss/socialpoliticsfeed' },
  { id: 'bloomberg-politics', outlet: 'bloomberg', lang: 'en', desk: 'politics', url: 'https://www.bloomberg.com/feeds/politics/news.rss' },
  { id: 'guardian-us', outlet: 'guardian', lang: 'en', desk: 'politics', url: 'https://www.theguardian.com/us-news/rss' },
  // ——— Analize (sporije) ———
  { id: 'foreignpolicy', outlet: 'foreignpolicy', lang: 'en', desk: 'analysis', every: 180, url: 'https://foreignpolicy.com/feed/' },
  { id: 'foreignaffairs', outlet: 'foreignaffairs', lang: 'en', desk: 'analysis', every: 180, url: 'https://www.foreignaffairs.com/rss.xml' },
  { id: 'warontherocks', outlet: 'warontherocks', lang: 'en', desk: 'analysis', every: 180, url: 'https://warontherocks.com/feed/' },
  { id: 'crisisgroup', outlet: 'crisisgroup', lang: 'en', desk: 'analysis', every: 360, url: 'https://www.crisisgroup.org/rss.xml' },
  { id: 'economist-intl', outlet: 'economist', lang: 'en', desk: 'analysis', every: 120, url: 'https://www.economist.com/international/rss.xml' },
  { id: 'economist-leaders', outlet: 'economist', lang: 'en', desk: 'analysis', every: 120, url: 'https://www.economist.com/leaders/rss.xml' },
  { id: 'economist-europe', outlet: 'economist', lang: 'en', desk: 'analysis', every: 120, url: 'https://www.economist.com/europe/rss.xml' },
  { id: 'atlantic-intl', outlet: 'atlantic', lang: 'en', desk: 'analysis', every: 180, url: 'https://www.theatlantic.com/feed/channel/international/' },
  { id: 'rstatecraft', outlet: 'rstatecraft', lang: 'en', desk: 'analysis', every: 360, url: 'https://responsiblestatecraft.org/feeds/feed.rss' },
  // ——— Tržišta i gospodarstvo ———
  { id: 'wsj-markets', outlet: 'wsj', lang: 'en', desk: 'markets', url: 'https://feeds.content.dowjones.io/public/rss/RSSMarketsMain' },
  { id: 'wsj-business', outlet: 'wsj', lang: 'en', desk: 'markets', url: 'https://feeds.content.dowjones.io/public/rss/WSJcomUSBusiness' },
  { id: 'wsj-economy', outlet: 'wsj', lang: 'en', desk: 'markets', url: 'https://feeds.content.dowjones.io/public/rss/socialeconomyfeed' },
  { id: 'bloomberg-markets', outlet: 'bloomberg', lang: 'en', desk: 'markets', url: 'https://www.bloomberg.com/feeds/markets/news.rss' },
  { id: 'bloomberg-econ', outlet: 'bloomberg', lang: 'en', desk: 'markets', url: 'https://www.bloomberg.com/feeds/economics/news.rss' },
  { id: 'gn-reuters-biz', outlet: 'google', lang: 'en', desk: 'markets', url: G('when:1d site:reuters.com/markets OR site:reuters.com/business') },
  { id: 'ft-markets', outlet: 'ft', lang: 'en', desk: 'markets', url: 'https://www.ft.com/markets?format=rss' },
  { id: 'ft-companies', outlet: 'ft', lang: 'en', desk: 'markets', url: 'https://www.ft.com/companies?format=rss' },
  { id: 'ft-economy', outlet: 'ft', lang: 'en', desk: 'markets', url: 'https://www.ft.com/global-economy?format=rss' },
  { id: 'cnbc-top', outlet: 'cnbc', lang: 'en', desk: 'markets', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114' },
  { id: 'cnbc-investing', outlet: 'cnbc', lang: 'en', desk: 'markets', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069' },
  { id: 'guardian-business', outlet: 'guardian', lang: 'en', desk: 'markets', url: 'https://www.theguardian.com/uk/business/rss' },
  { id: 'guardian-stocks', outlet: 'guardian', lang: 'en', desk: 'markets', url: 'https://www.theguardian.com/business/stock-markets/rss' },
  { id: 'nyt-business', outlet: 'nyt', lang: 'en', desk: 'markets', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml' },
  { id: 'bbc-business', outlet: 'bbc', lang: 'en', desk: 'markets', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { id: 'economist-finance', outlet: 'economist', lang: 'en', desk: 'markets', every: 120, url: 'https://www.economist.com/finance-and-economics/rss.xml' },
  { id: 'marketwatch', outlet: 'marketwatch', lang: 'en', desk: 'markets', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { id: 'investing', outlet: 'investing', lang: 'en', desk: 'markets', url: 'https://www.investing.com/rss/news.rss' },

  // ——— Znanost (tjedni pregled; osvježava se svaka 3 sata) ———
  { id: 'nature', outlet: 'nature', lang: 'en', desk: 'science', every: 180, url: 'https://www.nature.com/nature.rss' },
  { id: 'science', outlet: 'science', lang: 'en', desk: 'science', every: 180, url: 'https://www.science.org/rss/news_current.xml' },
  { id: 'quanta', outlet: 'quanta', lang: 'en', desk: 'longread', every: 180, url: 'https://www.quantamagazine.org/feed/' },
  { id: 'newscientist', outlet: 'newscientist', lang: 'en', desk: 'science', every: 180, url: 'https://www.newscientist.com/feed/home/' },
  { id: 'sciam', outlet: 'sciam', lang: 'en', desk: 'science', every: 180, url: 'http://rss.sciam.com/ScientificAmerican-Global' },
  { id: 'sciencenews', outlet: 'sciencenews', lang: 'en', desk: 'science', every: 180, url: 'https://www.sciencenews.org/feed' },
  { id: 'sciencedaily', outlet: 'sciencedaily', lang: 'en', desk: 'science', every: 180, url: 'https://www.sciencedaily.com/rss/top/science.xml' },
  { id: 'physorg', outlet: 'physorg', lang: 'en', desk: 'science', every: 180, url: 'https://phys.org/rss-feed/' },
  { id: 'guardian-science', outlet: 'guardian', lang: 'en', desk: 'science', every: 180, url: 'https://www.theguardian.com/science/rss' },
  { id: 'guardian-space', outlet: 'guardian', lang: 'en', desk: 'science', every: 180, url: 'https://www.theguardian.com/science/space/rss' },
  { id: 'guardian-env', outlet: 'guardian', lang: 'en', desk: 'science', every: 180, url: 'https://www.theguardian.com/environment/rss' },
  { id: 'bbc-science', outlet: 'bbc', lang: 'en', desk: 'science', every: 180, url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
  { id: 'nyt-science', outlet: 'nyt', lang: 'en', desk: 'science', every: 180, url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml' },
  { id: 'nyt-space', outlet: 'nyt', lang: 'en', desk: 'science', every: 180, url: 'https://rss.nytimes.com/services/xml/rss/nyt/Space.xml' },
  { id: 'ars-science', outlet: 'ars', lang: 'en', desk: 'science', every: 180, url: 'https://feeds.arstechnica.com/arstechnica/science' },
  { id: 'livescience', outlet: 'livescience', lang: 'en', desk: 'science', every: 180, url: 'https://www.livescience.com/feeds.xml' },
  { id: 'sciencealert', outlet: 'sciencealert', lang: 'en', desk: 'science', every: 180, url: 'https://www.sciencealert.com/feed' },
  { id: 'nasa', outlet: 'nasa', lang: 'en', desk: 'science', every: 180, url: 'https://www.nasa.gov/news-release/feed/' },
  { id: 'esa', outlet: 'esa', lang: 'en', desk: 'science', every: 360, url: 'https://www.esa.int/rssfeed/Our_Activities/Space_Science' },
  { id: 'universetoday', outlet: 'universetoday', lang: 'en', desk: 'science', every: 180, url: 'https://www.universetoday.com/rss.xml' },
  { id: 'physicsworld', outlet: 'physicsworld', lang: 'en', desk: 'science', every: 360, url: 'https://physicsworld.com/feed/' },
  { id: 'carbonbrief', outlet: 'carbonbrief', lang: 'en', desk: 'science', every: 360, url: 'https://www.carbonbrief.org/feed' },
  { id: 'insideclimate', outlet: 'insideclimate', lang: 'en', desk: 'science', every: 360, url: 'https://insideclimatenews.org/feed/' },
  { id: 'techreview', outlet: 'techreview', lang: 'en', desk: 'science', every: 180, url: 'https://www.technologyreview.com/feed/' },
  { id: 'wired-science', outlet: 'wired', lang: 'en', desk: 'science', every: 180, url: 'https://www.wired.com/feed/category/science/latest/rss' },
  { id: 'economist-scitech', outlet: 'economist', lang: 'en', desk: 'science', every: 360, url: 'https://www.economist.com/science-and-technology/rss.xml' },
  { id: 'popsci', outlet: 'popsci', lang: 'en', desk: 'science', every: 180, url: 'https://www.popsci.com/feed/' },
  { id: 'discover', outlet: 'discover', lang: 'en', desk: 'science', every: 180, url: 'https://www.discovermagazine.com/rss/all' },
  { id: 'medicalxpress', outlet: 'medicalxpress', lang: 'en', desk: 'science', every: 180, url: 'https://medicalxpress.com/rss-feed/' },
  { id: 'psypost', outlet: 'psypost', lang: 'en', desk: 'science', every: 180, url: 'https://www.psypost.org/feed/' },
  { id: 'scitechdaily', outlet: 'scitechdaily', lang: 'en', desk: 'science', every: 180, url: 'https://scitechdaily.com/feed/' },
  { id: 'zmescience', outlet: 'zmescience', lang: 'en', desk: 'science', every: 180, url: 'https://www.zmescience.com/feed/' },
  { id: 'earthcom', outlet: 'earthcom', lang: 'en', desk: 'science', every: 180, url: 'https://www.earth.com/feed/' },
  { id: 'studyfinds', outlet: 'studyfinds', lang: 'en', desk: 'science', every: 180, url: 'https://studyfinds.org/feed/' },
  { id: 'knowable', outlet: 'knowable', lang: 'en', desk: 'longread', every: 360, url: 'https://knowablemagazine.org/rss' },
  { id: 'nautilus', outlet: 'nautilus', lang: 'en', desk: 'longread', every: 360, url: 'https://nautil.us/feed' },
  { id: 'bbc-future', outlet: 'bbcfuture', lang: 'en', desk: 'longread', every: 360, url: 'https://www.bbc.com/future/feed.rss' },
  { id: 'smithsonian', outlet: 'smithsonian', lang: 'en', desk: 'longread', every: 360, url: 'https://www.smithsonianmag.com/rss/science-nature/' },
];

/** Google News stavke nose stvarnog izdavača u <source>; mapiramo ga na naše redakcije. */
export const GN_PUBLISHERS = [
  [/^reuters$/i, 'reuters'], [/^ap( news)?$|associated press/i, 'ap'], [/^bbc/i, 'bbc'],
  [/guardian/i, 'guardian'], [/wall street journal|^wsj$/i, 'wsj'], [/new york times|^nyt/i, 'nyt'],
  [/financial times|^ft$/i, 'ft'], [/bloomberg/i, 'bloomberg'], [/economist/i, 'economist'],
  [/washington post/i, 'wapo'], [/al jazeera/i, 'aljazeera'], [/^dw\b|deutsche welle/i, 'dw'],
  [/france 24/i, 'france24'], [/^npr$/i, 'npr'], [/^cbc/i, 'cbc'], [/sky news/i, 'sky'],
  [/euronews/i, 'euronews'], [/politico/i, 'politico'], [/^cnbc/i, 'cnbc'], [/le monde/i, 'lemonde'],
  [/foreign policy/i, 'foreignpolicy'], [/the atlantic/i, 'atlantic'],
];

/** Dodatni izdavači koje Google News prikazuje, a vrijedi ih brojati kao pokrivenost. */
export const GN_EXTRA = {
  cnn: { re: /^cnn/i, name: 'CNN', w: 1.0 },
  abc: { re: /^abc news/i, name: 'ABC News', w: 0.85 },
  nbc: { re: /^nbc news/i, name: 'NBC News', w: 0.85 },
  cbs: { re: /^cbs news/i, name: 'CBS News', w: 0.85 },
  latimes: { re: /los angeles times/i, name: 'Los Angeles Times', w: 0.85 },
  times: { re: /^the times\b/i, name: 'The Times', w: 0.9 },
  independent: { re: /independent/i, name: 'The Independent', w: 0.8 },
  telegraph: { re: /telegraph/i, name: 'The Telegraph', w: 0.85 },
  axios: { re: /^axios/i, name: 'Axios', w: 0.85 },
  timesofisrael: { re: /times of israel/i, name: 'Times of Israel', w: 0.8 },
  kyiv: { re: /kyiv independent/i, name: 'Kyiv Independent', w: 0.8 },
  scmp: { re: /south china morning post/i, name: 'SCMP', w: 0.85 },
  nikkei: { re: /nikkei/i, name: 'Nikkei Asia', w: 0.9 },
  spiegel: { re: /spiegel/i, name: 'Der Spiegel', w: 0.9 },
};

// Rubrike koje nisu "vijesti" za ovaj brifing (sport, zabava, lifestyle, vrijeme...).
const SKIP_SEGMENTS = new Set(`sport sports sportske nogomet football soccer tennis tenis cricket golf rugby formula1 formula-1 f1 nfl nba mlb
magazin hot showbiz show showtime scena zabava fun lifestyle lifeandstyle life zivot ljubimci horoskop astro gastro food dobrahrana
recepti recipes putovanja travel moda fashion style ljepota beauty vrt domidizajn mame fit wellness well rouge chill shopping autoklub
spektakli super1 fotogalerije gallery games crosswords puzzles tv-and-radio film music books arts theater stage artanddesign dining
vrijeme weather horoscope video videos podcasts podcast program programmes newsletters crossword obituaries`.split(/\s+/));

// U znanstvenim izvorima preskačemo samo kupovinu, recenzije opreme i sponzorirano.
const SCI_SKIP = new Set('gear deals deal reviews review shopping diy sponsored coupons buying-guide commerce'.split(' '));

export function isSkippedUrl(u, { desk } = {}) {
  if (desk === 'science' || desk === 'longread') {
    try { return new URL(u).pathname.toLowerCase().split('/').filter(Boolean).slice(0, 2).some((s) => SCI_SKIP.has(s)); } catch { return false; }
  }
  try {
    const url = new URL(u);
    let segs = url.pathname.toLowerCase().split('/').filter(Boolean);
    // NYT i sl.: /2026/10/09/sports/... — preskoči datumske segmente
    while (segs.length && /^\d{1,4}$/.test(segs[0])) segs = segs.slice(1);
    if (url.hostname.includes('bbc.') && segs[0] === 'sport') return true;
    return segs.slice(0, 2).some((s) => SKIP_SEGMENTS.has(s));
  } catch { return false; }
}

export function feedsDue(lastFetched = {}, now = Date.now(), { force = false } = {}) {
  return FEEDS.filter((f) => {
    if (force) return true;
    const every = (f.every || 0) * 60_000;
    const last = lastFetched[f.id] || 0;
    return now - last >= every - 5 * 60_000; // tolerancija 5 min
  });
}
