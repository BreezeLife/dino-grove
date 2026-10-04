import { spawnSync } from 'node:child_process';
import { access, chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}
if (!env.JAVA_HOME && process.platform === 'darwin') {
  for (const path of ['/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home', '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home']) {
    if (await exists(`${path}/bin/java`)) { env.JAVA_HOME = path; break; }
  }
}
if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT && process.platform === 'darwin') {
  const sdk = resolve(env.HOME, 'Library/Android/sdk');
  if (await exists(sdk)) env.ANDROID_HOME = sdk;
}
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status ?? result.signal}). No APK published.`);
}
const destination = resolve(root, 'releases/dino-grove-android-v2.1.0.apk');
await rm(destination, { force: true });
// Cloud-synced folders may return a short read or stall the OS copyFile syscall.
// Build a byte-verified local snapshot; never silently publish empty cloud files.
const staging = await mkdtemp(join(tmpdir(), 'dino-grove-android-'));
async function copyVerified(source, target) {
  const info = await stat(source);
  if (info.isDirectory()) {
    await mkdir(target, { recursive: true });
    for (const name of await readdir(source)) await copyVerified(join(source, name), join(target, name));
    return;
  }
  const bytes = await readFile(source);
  if (bytes.length !== info.size || bytes.length === 0) throw new Error(`Unreadable or empty build input: ${source}. Restore/sync this file before rebuilding.`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  const written = await readFile(target);
  if (!written.equals(bytes)) throw new Error(`Build snapshot verification failed: ${target}`);
}
for (const path of ['src', 'public', 'index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
  'android/settings.gradle', 'android/build.gradle', 'android/gradle.properties', 'android/gradlew', 'android/gradlew.bat',
  'android/gradle/wrapper', 'android/app/build.gradle', 'android/app/src']) {
  await copyVerified(resolve(root, path), resolve(staging, path));
}
await symlink(await realpath(resolve(root, 'node_modules')), resolve(staging, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
await chmod(resolve(staging, 'android/gradlew'), 0o755);
console.log(`Verified local build snapshot: ${staging}`);
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], staging);
await copyVerified(resolve(staging, 'public/app-icon-512.png'), resolve(staging, 'android/app/src/main/res/drawable-nodpi/app_icon.png'));
// A failed build must never be mistaken for an older successful APK.
const apk = resolve(staging, 'android/app/build/outputs/apk/debug/app-debug.apk');
await rm(apk, { force: true });
run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['--no-daemon', '--no-watch-fs', `-PwebDistDir=${resolve(staging, 'dist')}`, ':app:assembleDebug', ':app:lintDebug'], resolve(staging, 'android'));
const apkStat = await stat(apk);
if (apkStat.size < 100_000) throw new Error('Android build output is unexpectedly small.');
const metadata = JSON.parse(await readFile(resolve(dirname(apk), 'output-metadata.json'), 'utf8'));
if (metadata.applicationId !== 'com.breezelife.dinogrove' || metadata.elements?.[0]?.versionName !== '2.1.0-test') {
  throw new Error('Unexpected Android package identity.');
}
await mkdir(dirname(destination), { recursive: true });
await copyVerified(apk, destination);
console.log(`Build snapshot retained for asset verification: ${staging}`);
console.log(`\nAndroid 10+ phone/tablet test APK: ${destination}`);
console.log(`SHA-256: ${createHash('sha256').update(await readFile(destination)).digest('hex')}`);
console.log('Version 2.1.0-test; local Android debug certificate. Not a Google Play release.');
