import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME
  || join(homedir(), 'AppData', 'Local', 'Android', 'Sdk');
const studioJava = 'C:\\Program Files\\Android\\Android Studio\\jbr';
const javaExecutable = home => home ? join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
// JAVA_HOME may belong to another project (for example JDK 17). Capacitor 8
// compiles Java 21 sources; select a compatible JDK without changing Windows.
const candidates = [process.env.JAVA_HOME, existsSync(join(studioJava, 'bin', 'java.exe')) ? studioJava : null, undefined].filter(home => home !== null);
const javaHome = candidates.find(home => {
  const result = spawnSync(javaExecutable(home), ['-version'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  return result.status === 0 && Number(/version "(\d+)/.exec(result.stderr || result.stdout)?.[1]) >= 21;
});
export const java = javaExecutable(javaHome);
const javaVersion = spawnSync(java, ['-version'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
if (javaVersion.status !== 0 || Number(/version "(\d+)/.exec(javaVersion.stderr || javaVersion.stdout)?.[1] || 0) < 21) {
  throw new Error('JDK 21 ou superior não encontrado. Configure JAVA_HOME com um JDK compatível.');
}
export const env = { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk, GRADLE_USER_HOME: join(root, '.gradle-user'), ...(javaHome ? { JAVA_HOME: javaHome } : {}) };

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} terminou com código ${result.status}.\n${result.stdout || ''}\n${result.stderr || ''}`);
  return result.stdout || '';
}

export function inspectApk(apk) {
  const toolsRoot = join(sdk, 'build-tools');
  if (!existsSync(toolsRoot)) throw new Error(`Android Build Tools ausentes em ${toolsRoot}.`);
  const version = readdirSync(toolsRoot).filter(name => /^\d+\.\d+\.\d+$/.test(name))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
  if (!version) throw new Error('Instale uma versão estável do Android SDK Build Tools.');
  const tools = join(toolsRoot, version), exe = process.platform === 'win32' ? '.exe' : '';
  const signature = run(java, ['-jar', join(tools, 'lib/apksigner.jar'), 'verify', '--verbose', '--print-certs', apk]);
  const certificateSha256 = /certificate SHA-256 digest: ([a-f0-9]{64})/i.exec(signature)?.[1];
  if (!certificateSha256 || !/Number of signers: 1\b/.test(signature)) {
    throw new Error('Não foi possível confirmar o certificado único do APK.');
  }
  const badging = run(join(tools, `aapt${exe}`), ['dump', 'badging', apk]);
  const manifest = run(join(tools, `aapt${exe}`), ['dump', 'xmltree', apk, 'AndroidManifest.xml']);
  run(join(tools, `zipalign${exe}`), ['-c', '-P', '16', '4', apk]);
  const packageInfo = /package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/.exec(badging);
  if (!packageInfo) throw new Error('Não foi possível ler a identificação do APK.');
  if (/android:testOnly[^\n]*0xffffffff/.test(manifest)) throw new Error('APK testOnly: gere com assembleDebug para permitir instalação pelo gerenciador de arquivos.');
  const entries = run(join(tools, `aapt${exe}`), ['list', apk]).split(/\r?\n/);
  for (const required of ['assets/public/index.html', 'assets/public/src/app.js', 'assets/public/src/styles.css', 'assets/public/assets/map-meadow.png']) {
    if (!entries.includes(required)) throw new Error(`APK incompleto: falta ${required}.`);
  }
  return {
    applicationId: packageInfo[1], versionCode: Number(packageInfo[2]), versionName: packageInfo[3],
    minSdk: Number(/sdkVersion:'(\d+)'/.exec(badging)?.[1]),
    targetSdk: Number(/targetSdkVersion:'(\d+)'/.exec(badging)?.[1]),
    certificateSha256,
    nativeAbis: [...new Set(entries.filter(name => /^lib\/[^/]+\/.*\.so$/.test(name)).map(name => name.split('/')[1]))],
    debuggable: badging.includes('application-debuggable'), testOnly: false,
    signatureVerified: true, alignmentVerified: true
  };
}
