import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { once } from 'node:events';
import { createDownloadServer } from '../scripts/serve.mjs';

test('download: integridade, retomada, HEAD e proteção dos arquivos internos', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'mente-server-test-'));
  const server = createDownloadServer(directory);
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.equal(dirname(directory), tmpdir());
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(join(directory, 'release'));
  const bytes = Buffer.from('APK-fixture-0123456789');
  await writeFile(join(directory, 'index.html'), '<html lang="pt-BR">Download</html>');
  await writeFile(join(directory, 'release/Mente-e-Movimento-Android-debug.apk'), bytes);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const apk = origin + '/release/Mente-e-Movimento-Android-debug.apk';
  const full = await fetch(apk);
  assert.equal(full.status, 200);
  assert.equal(full.headers.get('content-type'), 'application/vnd.android.package-archive');
  assert.match(full.headers.get('content-disposition'), /attachment/);
  assert.equal(full.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await full.arrayBuffer()), bytes);
  const changed = await fetch(apk, { headers: { Range: 'bytes=4-', 'If-Range': '"older-apk"' } });
  assert.equal(changed.status, 200);
  assert.deepEqual(Buffer.from(await changed.arrayBuffer()), bytes);
  const partial = await fetch(apk, { headers: { Range: 'bytes=4-8' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), `bytes 4-8/${bytes.length}`);
  assert.deepEqual(Buffer.from(await partial.arrayBuffer()), bytes.subarray(4, 9));
  const suffix = await fetch(apk, { headers: { Range: 'bytes=-4' } });
  assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(-4));
  const invalid = await fetch(apk, { headers: { Range: 'bytes=999-' } });
  assert.equal(invalid.status, 416); await invalid.text();
  const head = await fetch(apk, { method: 'HEAD' });
  assert.equal(Number(head.headers.get('content-length')), bytes.length);
  assert.equal(await head.text(), '');
  for (const path of ['/package.json', '/.git/config', '/android/local.properties', '/%2e%2e/package.json']) {
    const response = await fetch(origin + path); assert.equal(response.status, 404); await response.text();
  }
  const post = await fetch(origin, { method: 'POST' });
  assert.equal(post.status, 405); assert.equal(post.headers.get('allow'), 'GET, HEAD'); await post.text();
  const missing = await fetch(origin + '/release/SHA256.txt');
  assert.equal(missing.status, 404); await missing.text();
});
