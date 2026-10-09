import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
if (output !== resolve(root, 'dist') || !output.startsWith(root + sep)) {
  throw new Error('Pasta de saída inválida');
}

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'src'), { recursive: true });
await mkdir(resolve(output, 'assets'), { recursive: true });
await cp(resolve(root, 'src/styles.css'), resolve(output, 'src/styles.css'));
await cp(resolve(root, 'assets/map-meadow.png'), resolve(output, 'assets/map-meadow.png'));

const html = await readFile(resolve(root, 'mobile/index.html'), 'utf8');
await writeFile(resolve(output, 'index.html'), html);

await build({
  entryPoints: [resolve(root, 'src/native-entry.js')],
  outfile: resolve(output, 'src/app.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true
});

console.log('Arquivos Android preparados em dist/');
