# Vidikovac

Osobni dnevni brifing na jednoj stranici: najvažnije vijesti iz Hrvatske i svijeta, geopolitika, tržišta, znanost i zanimljivosti. Stranica se **sama osvježava svaki sat**. Za nove vijesti ne treba ništa ponovno uploadati.

## Što je na stranici

| Rubrika | Sadržaj | Izvori |
|---|---|---|
| Naslovnica | datum, reljef dana (vrhovi su teme, visina je broj redakcija koje ih prate), najveća priča, traka s tržištima, vrijeme za tvoj grad | — |
| Praćene priče | upišeš temu („rat u Jemenu”, „američke obveznice”) ili kod vijesti odabereš „Prati priču”; novi članci o toj temi slažu se na vremensku crtu po danima, s oznakom što je novo od zadnjeg posjeta | vlastita arhiva članaka (45 dana) + Google News pretraga na engleskom i hrvatskom |
| Moje teme | odabereš teme koje pratiš (dobivaju oznaku i idu na vrh) i koje skrivaš (npr. kriminal, nesreće), plus vlastite riječi poput „Koprivnica”; gumbi za brzi filtar iznad vijesti | postavke se pamte u pregledniku |
| Hrvatska | najvažnije domaće priče i „Svijet očima hrvatskih medija” | HRT, Index.hr, Jutarnji, Večernji, N1, Telegram, Tportal, Dnevnik.hr, Net.hr, 24sata, Slobodna Dalmacija, Novi list, Glas Istre |
| Svijet | glavne svjetske priče; uz svaku „Kako pišu drugi” | Reuters i AP (preko Google Newsa), Guardian, BBC, WSJ, NYT, FT, Washington Post, Al Jazeera, DW, France 24, Le Monde, Euronews, NPR, CBC, Sky News |
| Geopolitika | karta svijeta (gdje se o čemu piše), 10 praćenih tema (Rusija i Ukrajina, Bliski istok, SAD, EU, Azija i Pacifik, Afrika, Amerike, energija i klima, trgovina i sankcije, izbori), analize i komentari | Politico, Foreign Policy, Foreign Affairs, The Economist, The Atlantic, Crisis Group, War on the Rocks, Responsible Statecraft |
| Tržišta | rečenica o stanju tržišta; indeksi (S&P 500, Nasdaq, Dow, Euro Stoxx 50, DAX, FTSE, Nikkei, CROBEX), sirovine, valute, kripto, prinos US 10 god., VIX, indeks straha i pohlepe; vijesti s tržišta; hrvatsko gospodarstvo; tvoj popis dionica | Yahoo Finance, Zagrebačka burza, ECB, CoinGecko, alternative.me; WSJ, Bloomberg, Reuters, FT, CNBC, MarketWatch, Economist |
| Znanost | „Tjedan u znanosti”: 20 priča tjedna s kratkom oznakom (npr. „Nobel za fiziku”, „Nuklearni sat”, „Kornjače”), mješavina najpraćenijih otkrića i svakodnevnih studija (hrana, san, tijelo, životinje); zatim tema tjedna, najbolje po područjima (svemir, fizika i kemija, život i evolucija, zdravlje, planet i klima, tehnologija i AI, prošlost, matematika), „Za dulje čitanje”, prethodni tjedni | 38 znanstvenih feedova: Nature, Science, New Scientist, Scientific American, Quanta, Knowable, Nautilus, Science News, NASA, ESA, Physics World, Carbon Brief, Popular Science, Discover, Medical Xpress, PsyPost… |
| Zanimljivosti | ~160 činjenica o Hrvatskoj i svijetu (povijest, geografija, priroda, svemir, ljudsko tijelo, jezik), „Svježe s Wikipedije”, Na današnji dan, što se čita na Wikipediji, slika dana | hrvatska i engleska Wikipedija, Wikimedia Commons |
| Arhiv | jutarnja izdanja (zadnjih 120 dana) i tjedni pregledi znanosti (zadnjih 60 tjedana) | — |

Ukupno 114 RSS/Atom feedova iz 74 redakcije. Priča koju prati više uglednih redakcija, koja je istaknuta na naslovnicama i koja je svježija, ide više.

## Kako se sadržaj osvježava

| Kada | Što se događa |
|---|---|
| svaki sat (u :00 po UTC-u) | zakazana funkcija `refresh` dohvaća izvore koji su na redu (vijesti svaki sat, analize svaka 2–6 h, znanost svaka 3–6 h), spaja iste priče iz različitih redakcija, rangira ih, osvježava tržišta i Wikipediju i sprema izdanje u Netlify Blobs |
| prvo izdanje nakon 6:00 po zagrebačkom vremenu | sprema se kao jutarnje izdanje u arhivu (i dobiva AI sažetak ako je uključen) |
| nedjeljom nakon 18:00 | tjedni pregled znanosti sprema se u arhivu |
| kad otvoriš stranicu | preglednik dohvaća `/api/briefing`; dok je kartica otvorena i vidljiva, ponovno svakih 15 minuta |
| gumb za osvježavanje | traži novo izdanje ako je trenutno starije od 10 minuta |
| prvi posjet nakon postavljanja | ako izdanja još nema (ili je starije od 3 h), sastavlja se odmah, za oko 10 sekundi |

Feedovi se dohvaćaju uvjetno (ETag / If-Modified-Since), pa nepromijenjeni izvori ne šalju ponovno cijeli sadržaj. Ako neki izvor privremeno ne radi, ostaju njegove zadnje priče, a stanje svih izvora vidi se na dnu stranice, pod „Izvori”.

## Kako radi praćenje priča

- **Tema** je skup pojmova: države (Jemen, SAD), pojmovi na oba jezika (rat i sukob, obveznice i prinosi, poplave…) i vlastite riječi (Rimac, Koprivnica). Države i vlastite riječi moraju biti spomenute; od pojmova je dovoljan jedan. Barem jedan obavezni pojam mora biti u naslovu, da usputna spominjanja ne uđu u crtu.
- **Izvori:** svako satno izdanje dopisuje sve pročitane članke u arhivu po danima (čuva se 45 dana). Uz to se tema pretražuje na Google Newsu, pa crta odmah ima i članke od prije postavljanja, do 30 dana unatrag.
- **Događaji:** članci o istom događaju (slični naslovi unutar 36 sati) spajaju se u jedan red s brojem redakcija.
- **Pojmove možeš urediti** („Uredi pojmove”): makni pojam ili dodaj riječ koja mora ili može biti spomenuta.
- Teme se pamte u pregledniku, najviše 12, pa ih na mobitelu i računalu postavljaš posebno.

## Postavljanje na Netlify

> **Važno:** Netlify Drop (povlačenje mape u preglednik) ne podržava funkcije. Stranica bi se prikazala, ali bez vijesti. Koristi jedan od dva načina u nastavku.

### Način A: GitHub i Netlify (bez instalacije)

1. Raspakiraj `vidikovac.zip`.
2. Na GitHubu napravi novi repozitorij (može biti privatan), odaberi „uploading an existing file” i povuci **sadržaj** mape `vidikovac` (ne samu mapu). Potvrdi s „Commit changes”.
3. Na Netlifyju: **Add new project → Import an existing project → GitHub**, dopusti pristup i odaberi repozitorij.
4. Postavke ne treba mijenjati: sve se čita iz `netlify.toml` (objavljuje se mapa `public`, funkcije su u `netlify/functions`). Potvrdi i pričekaj da deploy završi.
5. Otvori adresu stranice. Prvo učitavanje sastavlja izdanje (~10 s), a od tada se osvježava svaki sat.

Svaki novi commit na GitHubu pokreće novi produkcijski deploy (vidi „Troškovi”).

### Način B: Netlify CLI s računala

Potreban je Node.js 20 ili noviji.

```bash
cd vidikovac
npm install
npm install -g netlify-cli
netlify login
netlify deploy --prod --site-name vidikovac-tvojeime   # prvi put: stvara projekt
```

Kasnije izmjene koda objavljuješ s `netlify deploy --prod`.

### Provjera da sve radi

- Na Netlifyju, pod **Functions**, trebaju biti `briefing`, `archive`, `quotes` i `refresh` (označena kao zakazana).
- Kod funkcije `refresh` gumb **Run now** odmah sastavlja novo izdanje. U zapisniku (Logs) treba pisati nešto poput: `Izdanje gotovo za 9709 ms; vijesti: 1106, izvori ok: 112/114`.
- Zakazana funkcija radi samo na objavljenom (produkcijskom) deployu, ne na pregledima ni granama.

## Opcionalno: AI sažetak jutra (Claude)

Ako dodaš ključ za Claude API, jutarnje izdanje dobiva rubriku „Pet stvari za danas” (sažetak dana na hrvatskom) i hrvatske prijevode naslova svjetskih, tržišnih i znanstvenih vijesti te zanimljivosti s engleske Wikipedije. Model je upućen da koristi samo naslove i sažetke iz izdanja, a ispod sažetka piše koji ga je model napisao i u koliko sati.

1. Napravi ključ na [platform.claude.com](https://platform.claude.com).
2. Na Netlifyju: **Project configuration → Environment variables → Add a variable**, naziv `ANTHROPIC_API_KEY`. Ili iz mape projekta: `netlify env:set ANTHROPIC_API_KEY tvoj-kljuc --site vidikovac-tvojeime`.
3. Pokreni novi deploy jer promjene varijabli vrijede tek nakon deploya: kod načina A **Deploys → Trigger deploy**, kod načina B ponovno `netlify deploy --prod`.

| Pitanje | Odgovor |
|---|---|
| Koliko poziva? | jedan dnevno, uz jutarnje izdanje; ako ne uspije, ponavlja se u sljedećim izdanjima, najviše 3 puta dnevno |
| Koji model? | `claude-haiku-5-5`; drugi se postavlja varijablom `VIDIKOVAC_AI_MODEL` (npr. `claude-sonnet-5-5`) |
| Koliko košta? | Haiku 5.5 stoji 0,10 $ za milijun ulaznih i 0,50 $ za milijun izlaznih tokena. Jedan poziv ima oko 3.500 ulaznih i najviše 2.200 izlaznih tokena, dakle oko 0,15 centa dnevno, odnosno oko 5 centi mjesečno |
| Bez ključa? | sve ostalo radi isto; rubrika sa sažetkom se ne prikazuje, a uz strane naslove ostaje poveznica „Prevedi” (Google Prevoditelj) |

## Troškovi na besplatnom Netlify planu

Besplatni plan ima 300 kredita mjesečno, s tvrdom granicom: kad se potroše, Netlify pauzira sve projekte na računu do idućeg mjeseca. Vidikovac troši malo:

| Stavka | Cijena u kreditima | Procjena za Vidikovac |
|---|---|---|
| Produkcijski deploy | 15 po deployu | samo kad mijenjaš kod; nove vijesti ne traže deploy |
| Rad funkcija (1 GB memorije) | 10 po GB-satu | 720 izdanja mjesečno × ~9–20 s ≈ 1,8–4 GB-sata ≈ 18–40 kredita |
| Promet | 20 po GB | izdanje je sažeto ~60 KB, a statične datoteke ~40 KB; 1.000 otvaranja ≈ 0,06–0,1 GB ≈ 1–2 kredita |
| Web-zahtjevi | 2 na 10.000 | zanemarivo |

Pretraga praćenih priča traje 1–2 s rada funkcije po otvaranju stranice, što je za osobnu upotrebu nekoliko kredita mjesečno.

Uobičajen mjesec iznosi oko 25–50 kredita, plus 15 za svaki deploy. Ako kod mijenjaš često, skupi izmjene u jedan deploy.

## Lokalno pokretanje

```bash
npm install
npm test                       # 31 test, rade bez interneta (spremljeni feedovi)
npm run build:local            # sastavi izdanje u mapu .data/ (treba internet); -- --force dohvaća sve izvore
node scripts/serve-local.mjs   # stranica na http://localhost:8888
```

Ili s Netlifyjevim alatom: `netlify dev`, a zatim u drugom terminalu `netlify functions:invoke refresh`.

## Prilagodba

| Što | Gdje |
|---|---|
| izvori vijesti (dodaj ili makni feed, učestalost dohvaćanja) | `lib/sources.mjs`: `FEEDS` (`id`, `outlet`, `url`, `desk`, `every` u minutama) i `OUTLETS` (težina redakcije pri rangiranju) |
| indeksi, sirovine, valute | `lib/markets.mjs`: `MARKET_GROUPS` (Yahoo simboli) |
| praćene teme i države na karti | `lib/geo.mjs`: `TOPICS`, `COUNTRIES` |
| područja znanosti | `lib/science.mjs`: `FIELDS` |
| zanimljive činjenice | `public/assets/facts.js` |
| boje i pisma | `public/assets/app.css` (varijable na vrhu datoteke) |
| grad za vrijeme (zadano Koprivnica), popis dionica, svijetla ili tamna tema | na samoj stranici; pamti se u pregledniku |

## Varijable okoline

| Varijabla | Obavezna | Čemu služi |
|---|---|---|
| `ANTHROPIC_API_KEY` | ne | uključuje AI sažetak jutra i prijevode naslova |
| `VIDIKOVAC_AI_MODEL` | ne | model za sažetak (zadano `claude-haiku-5-5`) |
| `VIDIKOVAC_CONTACT` | ne | e-mail ili adresa koja se šalje u User-Agentu prema izvorima i Wikipediji (Wikimedia traži da se automatski alat može prepoznati i kontaktirati) |
| `URL` | ne | adresa stranice; Netlify je postavlja sam |

## Struktura projekta

```
vidikovac/
├── netlify.toml            postavke za Netlify: mapa public, funkcije, sigurnosna zaglavlja
├── package.json            jedina ovisnost: @netlify/blobs
├── netlify/functions/
│   ├── refresh.mjs         zakazana funkcija, svaki sat sastavlja izdanje
│   ├── briefing.mjs        GET /api/briefing: najnovije izdanje
│   ├── archive.mjs         GET /api/archive: jutarnja izdanja i tjedni pregledi znanosti
│   ├── quotes.mjs          GET /api/quotes?s=AAPL,NVDA: kotacije za tvoj popis
│   └── track.mjs           POST /api/track: sastavljanje i pretraga praćenih priča
├── lib/                    izvori, dohvat, spajanje priča, rubrike, tržišta, znanost, Wikipedija, AI sažetak
├── public/                 stranica: index.html i assets/ (app.js, app.css, facts.js, world.js)
├── scripts/                lokalna izgradnja i lokalni poslužitelj
└── test/                   testovi sa spremljenim feedovima
```

## Kad nešto ne radi

| Znak | Što napraviti |
|---|---|
| „Izdanje se upravo sastavlja” | pričekaj minutu i osvježi stranicu |
| vijesti su stare nekoliko sati | Functions → `refresh` → Logs; gumb **Run now** pokreće novo izdanje |
| neki izvor nedostaje | na dnu stranice, pod „Izvori”, piše koji feed ne odgovara; neki (npr. CBC, Washington Post) povremeno ne odgovore na vrijeme, ali ostali rade normalno |
| nema AI sažetka | provjeri je li `ANTHROPIC_API_KEY` postavljen i je li nakon toga napravljen deploy; poruka o grešci je u zapisniku funkcije `refresh` |
| stranica je „Site not available” | potrošeni su mjesečni krediti; vraća se s idućim mjesecom |

## Napomena o sadržaju

Vidikovac prikazuje naslove, kratke sažetke iz RSS-a i poveznice na izvorne članke; cijeli tekst čita se kod izdavača. Namijenjen je osobnoj upotrebi. Ako ga želiš javno objaviti, provjeri uvjete korištenja izvora.
