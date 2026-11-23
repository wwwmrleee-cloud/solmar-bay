// Solmar Bay — a small static server for local development and
// testing. It serves only the game directory, on loopback, with
// no caching, so a fresh edit is always what the browser gets.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, 'game');
const PORT = 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    const file = normalize(join(root, path));
    // The file must live inside the game directory: a plain prefix
    // check would also match a sibling like "game-evil".
    if (file !== root && !file.startsWith(root + '/')) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
    const data = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
      'content-length': data.length,
    });
    // A HEAD request gets the headers and no body.
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
    } else {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Server error');
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Solmar Bay dev server on http://127.0.0.1:${PORT}/`);
});
