import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, sdk, java, run as execute, inspectApk } from './android-tools.mjs';

const android = resolve(root, 'android');
if (!existsSync(sdk)) throw new Error(`Android SDK não encontrado: ${sdk}`);
if (!existsSync(android)) throw new Error('Projeto Android ausente. Execute: npm exec cap add android');

function run(label, command, args, cwd) {
  console.log(`\n${label}`);
  execute(command, args, { cwd, stdio: 'inherit', timeout: 900000 });
}

await writeFile(resolve(android, 'local.properties'), `sdk.dir=${sdk.replaceAll('\\', '/')}\n`);
run('Preparando arquivos do aplicativo', process.execPath, ['scripts/build-mobile.mjs'], root);
run('Sincronizando o projeto Android', process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'], root);
run('Compilando o APK', java, [
  '-Dorg.gradle.appname=gradlew',
  '-classpath', resolve(android, 'gradle/wrapper/gradle-wrapper.jar'),
  'org.gradle.wrapper.GradleWrapperMain',
  'assembleDebug', ...(process.argv.includes('--device-test') ? [':app:connectedDebugAndroidTest'] : []),
  '--no-daemon', '--console=plain', '-Pandroid.injected.testOnly=false'
], android);

const source = resolve(android, 'app/build/outputs/apk/debug/app-debug.apk');
const release = resolve(root, 'release');
const destination = resolve(release, 'Mente-e-Movimento-Android-debug.apk');
const report = inspectApk(source);
if (report.applicationId !== 'com.jardimdamente.app' || report.minSdk !== 24 || report.targetSdk !== 36) {
  throw new Error('Identificação ou compatibilidade do APK diverge da configuração esperada.');
}
if (existsSync(destination)) {
  const previous = inspectApk(destination);
  if (previous.certificateSha256 !== report.certificateSha256) throw new Error('A assinatura mudou. Restaure a chave anterior antes de distribuir uma atualização.');
  if (report.versionCode < previous.versionCode) throw new Error('versionCode menor que o APK anterior. A atualização seria recusada.');
  const archive = resolve(release, 'archive');
  await mkdir(archive, { recursive: true });
  const previousHash = createHash('sha256').update(await readFile(destination)).digest('hex');
  await copyFile(destination, resolve(archive, `Mente-${previous.versionCode}-${previousHash.slice(0, 12)}.apk`));
}
await mkdir(release, { recursive: true });
// Publish only a complete file; active downloads keep reading the old handle.
const staged = `${destination}.partial`;
await copyFile(source, staged);
await rename(staged, destination);
const bytes = (await stat(destination)).size;
const checksum = createHash('sha256').update(await readFile(destination)).digest('hex');
await writeFile(resolve(release, 'SHA256.txt'), `${checksum}  Mente-e-Movimento-Android-debug.apk\n`);
await writeFile(resolve(release, 'apk-report.json'), JSON.stringify({ ...report, bytes, sha256: checksum }, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log(`\nAPK pronto: ${destination} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
