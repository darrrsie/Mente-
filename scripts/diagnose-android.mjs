import { join } from 'node:path';
import { root, sdk, run, inspectApk } from './android-tools.mjs';

const apk = join(root, 'release/Mente-e-Movimento-Android-debug.apk');
console.log(JSON.stringify(inspectApk(apk), null, 2));
const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const devices = run(adb, ['devices', '-l']);
console.log(devices);
const connected = devices.split(/\r?\n/).filter(line => /^\S+\s+device\b/.test(line));
if (connected.length !== 1) {
  console.log('Para diagnóstico do aparelho, conecte um único Android por USB e autorize a depuração. Nenhum aplicativo ou dado foi removido.');
  process.exitCode = 1;
} else {
  const model = run(adb, ['shell', 'getprop', 'ro.product.model']).trim();
  const api = Number(run(adb, ['shell', 'getprop', 'ro.build.version.sdk']).trim());
  const abi = run(adb, ['shell', 'getprop', 'ro.product.cpu.abilist']).trim();
  console.log({ model, api, abi });
  console.log(run(adb, ['shell', 'df', '-h', '/data']));
  console.log(run(adb, ['shell', 'pm', 'path', 'com.jardimdamente.app']) || 'Aplicativo ainda não instalado.');
  if (api < 24) { console.error('Este projeto requer Android 7.0 (API 24) ou superior.'); process.exitCode = 1; }
  else if (process.argv.includes('--install')) {
    try { console.log(run(adb, ['install', '-r', apk])); }
    catch (error) {
      console.error(error.message);
      console.error('UPDATE_INCOMPATIBLE: certificado diferente; use a chave original. VERSION_DOWNGRADE: use versionCode maior. INSUFFICIENT_STORAGE: libere espaço. USER_RESTRICTED: confira as permissões de instalação. Não desinstale antes de preservar os dados.');
      process.exitCode = 1;
    }
  } else console.log('Para testar a instalação preservando os dados: npm run apk:diagnose -- --install');
}
