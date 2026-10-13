import { createServer } from 'node:http';
import { open } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { networkInterfaces } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/src/app.js', ['src/app.js', 'text/javascript; charset=utf-8']],
  ['/src/app.bundle.js', ['src/app.bundle.js', 'text/javascript; charset=utf-8']],
  ['/src/games.js', ['src/games.js', 'text/javascript; charset=utf-8']],
  ['/src/tutorials.js', ['src/tutorials.js', 'text/javascript; charset=utf-8']],
  ['/src/state.js', ['src/state.js', 'text/javascript; charset=utf-8']],
  ['/src/styles.css', ['src/styles.css', 'text/css; charset=utf-8']],
  ['/assets/icon-512.png', ['assets/icon-512.png', 'image/png']]
]);

export function createWebServer(directory = root) {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    const message = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      message(405, 'Use GET ou HEAD para acessar este arquivo.');
      return;
    }
    let pathname;
    try { pathname = new URL(request.url, 'http://localhost').pathname; }
    catch { message(400, 'Endereço inválido. Abra a página inicial.'); return; }
    const file = files.get(pathname);
    if (!file) { message(404, 'Página não encontrada. Abra / para jogar.'); return; }
    let handle;
    try {
      handle = await open(resolve(directory, file[0]), 'r');
      const { size } = await handle.stat();
      response.writeHead(200, { 'Content-Type': file[1], 'Content-Length': size });
      if (request.method === 'HEAD' || size === 0) response.end();
      else await pipeline(handle.createReadStream({ autoClose: false }), response);
    } catch (error) {
      if (response.headersSent) response.destroy();
      else message(error.code === 'ENOENT' ? 404 : 500, 'Não foi possível abrir o arquivo. Tente novamente.');
    } finally { await handle?.close().catch(() => {}); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8765);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT deve ser um número entre 1 e 65535.');
  const host = process.env.HOST || '0.0.0.0';
  const server = createWebServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? `A porta ${port} já está em uso. Feche o servidor anterior ou defina outra PORT.`
      : `Não foi possível iniciar o servidor: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    console.log(`Servidor do site ativo em ${host}:${port}. Mantenha esta janela aberta.`);
    console.log(`No computador: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`);
    for (const [name, addresses] of Object.entries(networkInterfaces())) {
      for (const address of addresses || []) {
        if (host === '0.0.0.0' && address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.') && !/vethernet|virtual|loopback/i.test(name)) {
          console.log(`No celular, mesma rede (${name}): http://${address.address}:${port}`);
        }
      }
    }
    console.log('Use http:// e a porta indicada. Se não abrir no celular, execute npm run network:check.');
  });
}
