// Dev server with SPA history fallback (serve lacks it).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname; // package root (scripts/..)
const PORT = process.env.PORT || 4200;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const filePath = join(ROOT, normalize(path));
    if (!filePath.startsWith(ROOT)) throw new Error('traversal');
    const isFile = await stat(filePath).then((s) => s.isFile()).catch(() => false);
    const target = isFile ? filePath : join(ROOT, 'index.html'); // history fallback
    const data = await readFile(target);
    res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('dev-server error: ' + e.message);
  }
});

server.listen(PORT, () => console.log(`dev server on http://localhost:${PORT}`));
