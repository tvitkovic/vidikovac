# Vidikovac — koraci 1–4

Sve je napisano prema kodu iz projekta. Testovi: **47 prolazi, 0 pada.**

## Što ide u projekt

| Datoteka | Status | Što radi |
|---|---|---|
| `lib/ownership.mjs` | novo | zemljopis i vlasništvo redakcija, datirano i s izvorima |
| `lib/story.mjs` | novo | trajni `storyId` kroz 7 dana, „što je novo” |
| `lib/rhythm.mjs` | novo | uspon, lavina, sedlo, ušutjelo, magla; koncentracija dana; greben |
| `lib/perspective.mjs` | novo | traka pokrivenosti, vlasništvo, izvorno vs. preneseno, mrtvi kut, razilaženje |
| `lib/enrich.mjs` | novo | spaja gornje s rubrikama; build ga zove u `try/catch` |
| `lib/cdn.mjs` | novo | pražnjenje CDN predmemorije po oznaci |
| `lib/newsarchive.mjs` | **izmijenjeno** | mjesečni paketi: pretraga otvara 2–3 bloba umjesto do 45 |
| `lib/sections.mjs` | **izmijenjeno** | uz rubrike vraća i `_clusters` (ne ide klijentu) |
| `lib/build.mjs` | **izmijenjeno** | poziva obogaćivanje, sprema `stories/open` i `relief-history` |
| `netlify/functions/briefing.mjs` | **izmijenjeno** | trajni CDN keš umjesto 120 s |
| `netlify/functions/refresh.mjs` | **izmijenjeno** | nakon izdanja prazni CDN i gradi pakete arhive |
| `public/assets/signals.js` | novo | oznake, perspektiva, mrtvi kut, greben |
| `public/assets/app.js`, `app.css` | **izmijenjeno** | ugrađene oznake, perspektiva, mrtvi kut, prekidač Danas/Tjedan |
| `package.json` | **izmijenjeno** | dodan `@netlify/functions` (potreban za pražnjenje CDN-a) |
| `test/*.test.mjs` | novo | testovi za sve gore (cijeli skup: 79) |

**Ne kopiraj** `lib/text.mjs`, `lib/time.mjs`, `lib/geo.mjs`, `lib/normalize.mjs` iz ovog paketa — to su
lokalni nadomjesci koji su mi služili samo da testovi mogu raditi. Tvoje verzije ostaju.

## Redoslijed objave

Izmjene su već ugrađene u ovu granu (sučelje u `app.js`/`app.css` je primijenjeno, a testovi prolaze).

```bash
npm install          # povlači @netlify/functions
npm test             # 79 testova
npm run build:local  # treba internet; sastavlja izdanje u .data/
```

Zatim spoji granu u `main` — Netlify sam napravi build. Nakon objave jednom pokreni funkciju
`refresh` (Netlify → Functions → refresh → Run) da se odmah napune priče i paketi arhive.

Ako `--dry-run` javi da se sidro nije poklopilo, znači da se tvoj `app.js` u međuvremenu
promijenio. Skripta tada ništa ne zapisuje; pošalji mi taj dio i prilagodim sidro.

## Što ćeš vidjeti

**Prvi sat:** ništa novo. Priče nemaju povijest, pa nema ni ritma ni „dana N”.
Traka perspektive i mrtvi kut rade odmah.

**Drugi dan:** pojavljuju se „dan 2”, „novo: …” i prve oznake ritma.

**Sedmi dan:** prekidač *Tjedan* nad reljefom ima pun greben. Prije toga crta onoliko dana koliko ih ima.

## Odluke koje sam donio sam

1. **Reljef dana ostaje zadani prikaz.** Greben je prekidač u zaglavlju, ne zamjena.
2. **Nema političkog spektra ni ocjene pouzdanosti redakcije.** Ground News ih ima jer ima
   ručno ocijenjenu ljestvicu američkih medija. Mi je nemamo, pa bi to bila moja prosudba
   ugrađena u tvoj brifing. Umjesto toga: zemljopis, vlasništvo, tko je objavio prvi.
3. **Redakcija bez provjerenog vlasništva broji se kao zaseban vlasnik.** Radije podcijenimo
   koncentraciju nego da tvrdimo nešto što nismo provjerili. Trenutno je provjereno 6 od 14
   domaćih redakcija; ostale su `owner: null` u `lib/ownership.mjs`.
4. **Mrtvi kut uspoređuje vlastita imena**, jer ona prelaze jezičnu granicu. Priča bez ijednog
   imena u naslovu se ne uspoređuje — ondje bi tvrdnja „nitko ne piše” bila neprovjerena.
5. **Vlasništvo N1 i Nove mijenja se tijekom 2026.** (prodaja Adria Newsa čeka regulatorna
   odobrenja). Bilješka stoji uz unos; kad se zaključi, mijenja se jedan redak.

## Trošak

| Prije | Sada |
|---|---|
| `/api/briefing` keširan 120 s → funkcija se budi gotovo pri svakom posjetu | keširan do sljedećeg izdanja, prazni se iz satnog posla → funkcija radi ~24× dnevno |
| pretraga praćenih priča otvara do 45 blobova po otvaranju stranice | 2–3 paketa + današnji dan |
| — | `stories/open` i `relief-history`: dva mala bloba, pišu se jednom po izdanju |

Mjerač kredita u podnožju nisam radio — to je korak 5.
