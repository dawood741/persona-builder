/**
 * Local development server — `npm run dev`, then open http://localhost:3000
 *
 * Serves the static pages and runs api/personas.js the way Vercel does, using
 * the settings in .env.local. Not used in production; Vercel runs the API itself.
 */
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
let port = Number(process.env.PORT) || 3100;

// Load .env.local (KEY=value lines) without overriding real environment variables.
const envFile = join(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Add it to .env.local first.');
  process.exit(1);
}

const api = await import(pathToFileURL(join(root, 'api', 'personas.js')).href);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  try {
    if (url.pathname === '/api/personas') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
      });
      const handler = api[req.method];
      const out = handler ? await handler(request) : new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405 });
      res.writeHead(out.status, Object.fromEntries(out.headers));
      res.end(Buffer.from(await out.arrayBuffer()));
      console.log(`${req.method} ${url.pathname}${url.search} -> ${out.status}`);
      return;
    }
    const path = normalize(join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
    const blocked = !path.startsWith(root) || path.includes(sep + '.') || path.includes(sep + 'node_modules' + sep);
    if (blocked || !existsSync(path) || !statSync(path).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(path));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Server error');
  }
});

// Use the next free port if this one is taken (for example by another local app).
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < 3120) { port += 1; server.listen(port); }
  else { console.error(error.message); process.exit(1); }
});
server.on('listening', () => {
  console.log(`Persona builder running at http://localhost:${port}`);
  console.log(`Saved personas page:      http://localhost:${port}/personas.html`);
});
server.listen(port);
