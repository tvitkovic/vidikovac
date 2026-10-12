// Lokalni poslužitelj koji oponaša Netlify: statične datoteke iz public/ + /api/* funkcije.
//   node scripts/serve-local.mjs [port]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import briefing from '../netlify/functions/briefing.mjs';
import archive from '../netlify/functions/archive.mjs';
import quotes from '../netlify/functions/quotes.mjs';
import track from '../netlify/functions/track.mjs';

const port = +(process.argv[2] || 8888);
const root = path.resolve('public');
const routes = { '/api/briefing': briefing, '/api/archive': archive, '/api/quotes': quotes, '/api/track': track };
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const fn = routes[url.pathname];
  try {
    if (fn) {
      const headers = Object.entries(req.headers).filter(([, v]) => typeof v === 'string');
      let body;
      if (req.method === 'POST') { const chunks = []; for await (const c of req) chunks.push(c); body = Buffer.concat(chunks); }
      const r = await fn(new Request(url, { method: req.method, headers, body }), {});
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let p = path.join(root, decodeURIComponent(url.pathname));
    if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const st = await fs.stat(p).catch(() => null);
    if (st?.isDirectory()) p = path.join(p, 'index.html');
    const data = await fs.readFile(p);
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Nije pronađeno');
  }
}).listen(port, () => console.log(`Vidikovac lokalno: http://localhost:${port}`));
