// Servidor estatico minimo (sem dependencias) para o Forma Studio.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function send(res, status, headers, body) {
  res.writeHead(status, { ...SECURITY, ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { Allow: 'GET, HEAD' }, 'Metodo nao permitido');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, {}, 'Requisicao invalida');
  }

  let file = path.normalize(path.join(ROOT, pathname));
  if (!file.startsWith(ROOT)) return send(res, 403, {}, 'Acesso negado');

  fs.stat(file, (error, stat) => {
    if (!error && stat.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (readError, data) => {
      if (readError) {
        // O app usa rotas por hash; qualquer outro caminho volta para a pagina inicial.
        return fs.readFile(path.join(ROOT, 'index.html'), (indexError, index) => {
          if (indexError) return send(res, 500, {}, 'Pasta dist nao encontrada');
          send(res, 200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' }, req.method === 'HEAD' ? undefined : index);
        });
      }
      const ext = path.extname(file).toLowerCase();
      const hashed = file.includes(`${path.sep}assets${path.sep}`);
      send(
        res,
        200,
        {
          'Content-Type': TYPES[ext] || 'application/octet-stream',
          'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
        },
        req.method === 'HEAD' ? undefined : data,
      );
    });
  });
});

server.listen(PORT, () => console.log(`Forma Studio em http://localhost:${PORT}`));
