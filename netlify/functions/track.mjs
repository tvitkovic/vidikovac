// POST /api/track — praćene priče.
//   { action: 'compile', text: 'rat u Jemenu' }           → nova tema iz upisanog teksta
//   { action: 'compile', story: { title, summary, lang, t, url } } → tema iz vijesti
//   { action: 'search', trackers: [{ id, groups, since }] } → vremenske crte (arhiva + Google News)
// Teme se čuvaju u pregledniku; poslužitelj samo sastavlja i pretražuje.
import { openStore } from '../../lib/store.mjs';
import { compileText, compileStory, searchTrackers, refLabel } from '../../lib/track.mjs';
import { jsonResponse } from '../../lib/http.mjs';

const label = (spec) => spec && { ...spec, labels: spec.groups.map((g) => ({ kind: g.kind, refs: g.refs.map((r) => ({ ref: r, label: refLabel(r) })) })) };

export default async (req) => {
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Koristi POST.' }, 405, { allow: 'POST' });
  let body;
  try {
    const text = await req.text();
    if (text.length > 20_000) return jsonResponse(req, { error: 'Zahtjev je prevelik.' }, 413);
    body = JSON.parse(text);
  } catch { return jsonResponse(req, { error: 'Neispravan JSON.' }, 400); }
  try {
    if (body?.action === 'compile') {
      const spec = body.story ? compileStory(body.story) : compileText(body.text);
      if (!spec) return jsonResponse(req, { error: 'Iz toga ne mogu složiti temu. Upiši državu, pojam ili ime, npr. „rat u Jemenu”.' }, 422);
      return jsonResponse(req, { tracker: label(spec) }, 200, { 'cache-control': 'no-store' });
    }
    if (body?.action === 'search') {
      if (!Array.isArray(body.trackers)) return jsonResponse(req, { error: 'Nedostaju teme.' }, 400);
      const results = await searchTrackers(openStore(), body.trackers);
      return jsonResponse(req, { at: new Date().toISOString(), results }, 200, { 'cache-control': 'no-store' });
    }
    return jsonResponse(req, { error: 'Nepoznata radnja.' }, 400);
  } catch (e) {
    console.error('track', e);
    return jsonResponse(req, { error: 'Praćenje trenutno nije dostupno.' }, 500, { 'cache-control': 'no-store' });
  }
};

export const config = { path: '/api/track' };
