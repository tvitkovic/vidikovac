// Opcionalno: jutarnji sažetak i prijevodi naslova na hrvatski pomoću Claude API-ja.
// Uključuje se samo ako je u Netlifyju postavljena varijabla ANTHROPIC_API_KEY.
// Jedan poziv dnevno (jutarnje izdanje); model se može promijeniti varijablom VIDIKOVAC_AI_MODEL.

const SYSTEM = `Ti si urednik jutarnjeg brifinga na hrvatskom jeziku. Dobivaš JSON s naslovima i kratkim sažecima vijesti, s nazivom izvora (src) i brojem redakcija koje prate priču (n).
Pravila:
1. Koristi isključivo informacije iz ulaznih podataka. Ne dodaj činjenice, brojke, imena, uzroke ni kontekst kojih nema u ulazu.
2. Piši standardnim hrvatskim jezikom, neutralno, jasno i sažeto, bez senzacionalizma i bez vlastitih ocjena.
3. Ako sažetak nije dovoljan za tvrdnju, ostani na onome što piše u naslovu.
4. Vrati isključivo valjani JSON, bez ikakvog teksta prije ili poslije, u obliku:
{"naslov":"jedna rečenica koja opisuje dan (najviše 140 znakova)","tocke":[{"tekst":"1–2 rečenice, najviše 240 znakova","id":["id priče"]}],"prijevodi":{"id priče":"vjeran prijevod naslova na hrvatski"}}
"tocke": točno 5 najvažnijih stvari dana, poredanih po važnosti, miješano Hrvatska i svijet; daj prednost pričama s većim n.
"prijevodi": prevedi svaki naslov iz polja "svijet", "trzista_vijesti", "znanost" i "zanimljivosti" (bez dodavanja i bez izostavljanja informacija).`;

function compactMarkets(m) {
  const out = [];
  for (const g of m?.groups || []) for (const i of g.items || []) {
    if (i.missing || i.pct == null) continue;
    if (['^GSPC', '^GDAXI', 'CROBEX', 'BZ=F', 'GC=F', 'EURUSD=X', 'BTC-USD'].includes(i.sym)) out.push({ ime: i.name, cijena: +i.price.toFixed(2), promjena_posto: +i.pct.toFixed(2) });
  }
  return out;
}

export async function makeDigest(latest, { fetchImpl = fetch } = {}) {
  const key = globalThis.process?.env?.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = globalThis.process?.env?.VIDIKOVAC_AI_MODEL || 'claude-haiku-5-5';
  const pick = (arr, n) => (arr || []).slice(0, n).map((s) => ({ id: s.id, src: s.src, n: s.n, title: s.title, summary: (s.summary || '').slice(0, 260) }));
  const input = {
    datum: latest.dateLong,
    hrvatska: pick(latest.hr, 8),
    svijet: pick(latest.world, 10),
    trzista_vijesti: pick(latest.markets?.news, 5),
    znanost: latest.science?.feature ? pick([latest.science.feature], 1) : [],
    trzista: compactMarkets(latest.markets),
    zanimljivosti: (latest.extras?.dyk || []).slice(0, 6).map((d) => ({ id: d.id, title: d.t })),
  };
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 2200, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify(input) }] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) { console.warn('AI sažetak nije uspio:', res.status, (await res.text()).slice(0, 200)); return null; }
  const j = await res.json();
  const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let parsed;
  try { parsed = JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  const ids = new Set([...input.hrvatska, ...input.svijet, ...input.trzista_vijesti, ...input.znanost, ...input.zanimljivosti].map((s) => s.id));
  const str = (x, max) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const bullets = (Array.isArray(parsed.tocke) ? parsed.tocke : []).slice(0, 5)
    .map((t) => ({ text: str(t?.tekst, 300), ids: (Array.isArray(t?.id) ? t.id : [t?.id]).filter((x) => ids.has(x)) }))
    .filter((t) => t.text);
  const translations = {};
  for (const [id, tr] of Object.entries(parsed.prijevodi || {})) if (ids.has(id) && str(tr, 220)) translations[id] = str(tr, 220);
  if (!bullets.length) return null;
  return { model, at: new Date().toISOString(), headline: str(parsed.naslov, 180), bullets, translations };
}
