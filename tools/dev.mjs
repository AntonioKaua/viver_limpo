import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build, root } from './build.mjs';
import handler from '../api/chat.js';

await build();
const publicRoot = path.join(root, 'dist');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/chat') {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192) return res.status(413).json({ error: 'Mensagem muito grande.' });
        chunks.push(chunk);
      }
      req.body = Buffer.concat(chunks).toString('utf8');
      return await handler(req, res);
    }
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
    // Lista de caminhos públicos: jamais servir server/, api/, .env ou .git.
    if (pathname !== '/' && pathname !== '/index.html' && !/^\/(style|scripts|images)\//.test(pathname)) {
      return res.status(404).end('Não encontrado');
    }
    const target = path.resolve(publicRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(publicRoot, target);
    if (relative.startsWith('..') || path.isAbsolute(relative) || pathname.includes('\\')) return res.status(404).end();
    const content = await readFile(target);
    res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    if (!res.headersSent) res.status(404).end('Não encontrado');
    else res.end();
  }
});
server.listen(3000, '127.0.0.1', () => console.log('Ambiente local: http://127.0.0.1:3000 — reinicie após alterações.'));
