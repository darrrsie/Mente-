import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { once } from 'node:events';
import { createWebServer } from '../scripts/serve.mjs';

test('site: entrega a interface e recursos web e protege os arquivos internos', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'mente-server-test-'));
  const server = createWebServer(directory);
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.equal(dirname(directory), tmpdir());
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(join(directory, 'src'));
  await mkdir(join(directory, 'assets'));
  await writeFile(join(directory, 'index.html'), '<html lang="pt-BR">Mente & Movimento</html>');
  await writeFile(join(directory, 'src/app.js'), 'render();');
  await writeFile(join(directory, 'src/app.bundle.js'), '(() => { render(); })();');
  await writeFile(join(directory, 'src/tutorials.js'), 'export const tutorial = true;');
  await writeFile(join(directory, 'src/styles.css'), 'body { color: #333; }');
  await writeFile(join(directory, 'assets/icon-512.png'), Buffer.from([1, 2, 3]));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const [path, type] of [['/', 'text/html'], ['/src/app.js', 'text/javascript'], ['/src/app.bundle.js', 'text/javascript'], ['/src/tutorials.js', 'text/javascript'], ['/src/styles.css', 'text/css'], ['/assets/icon-512.png', 'image/png']]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), new RegExp(type));
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(Number(response.headers.get('content-length')) > 0);
  }
  for (const path of ['/package.json', '/.git/config', '/private/config', '/downloads/old-file.bin', '/%2e%2e/package.json']) {
    const response = await fetch(origin + path); assert.equal(response.status, 404); await response.text();
  }
  const post = await fetch(origin, { method: 'POST' });
  assert.equal(post.status, 405); assert.equal(post.headers.get('allow'), 'GET, HEAD'); await post.text();
  const head = await fetch(origin, { method: 'HEAD' });
  assert.equal(head.status, 200); assert.ok(Number(head.headers.get('content-length')) > 0); assert.equal(await head.text(), '');
});
