import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const EXPECTED = Object.freeze({
  name: 'Kurioticket',
  packageName: 'com.kurioticket.app',
  scheme: 'kurioticket',
  versionName: '0.3.0',
  runtime: 'production-0.3.0',
  projectId: '89f6fd88-c0d7-495a-9e2b-8301b09f407d',
  api: 'https://kurioticket.com',
  channel: 'production',
  updatesUrl: 'https://u.expo.dev/89f6fd88-c0d7-495a-9e2b-8301b09f407d',
});

function parseAppConfig(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Embedded AAB app.config is missing or empty.');
  try { return JSON.parse(source); } catch { throw new Error('Embedded AAB app.config is malformed JSON.'); }
}

export function verifyProductionAab({ manifest, validation, signing, appConfigSource }) {
  const root = manifest.match(/<manifest\b[^>]*>/)?.[0] ?? '';
  const attribute = (name) => root.match(new RegExp(`(?:android:)?${name}="([^"]+)"`))?.[1];
  const packageName = attribute('package');
  const versionName = attribute('versionName');
  const versionCode = Number(attribute('versionCode'));
  const appConfig = parseAppConfig(appConfigSource);
  const environment = appConfig.extra?.environment;
  if (!validation.includes('App Bundle information')) throw new Error('bundletool did not validate the AAB.');
  if (!signing.includes('jar verified.')) throw new Error('AAB signature verification failed.');
  if (packageName !== EXPECTED.packageName) throw new Error('AAB manifest package mismatch.');
  if (versionName !== EXPECTED.versionName || !Number.isSafeInteger(versionCode) || versionCode < 1) throw new Error('AAB version metadata is invalid.');
  if (appConfig.name !== EXPECTED.name || appConfig.android?.package !== EXPECTED.packageName || appConfig.scheme !== EXPECTED.scheme) throw new Error('Embedded AAB app.config application identity mismatch.');
  if (appConfig.version !== EXPECTED.versionName || appConfig.runtimeVersion !== EXPECTED.runtime) throw new Error('Embedded AAB app.config version or runtime mismatch.');
  if (appConfig.extra?.eas?.projectId !== EXPECTED.projectId || appConfig.updates?.url !== EXPECTED.updatesUrl) throw new Error('Embedded AAB app.config EAS project identity mismatch.');
  if (environment?.variant !== 'production' || environment?.buildMode !== 'release' || environment?.apiBaseUrl !== EXPECTED.api || environment?.channel !== EXPECTED.channel || environment?.isPreview !== false) throw new Error('Embedded AAB app.config Production environment mismatch.');
  return { verified: true, signed: true, package: packageName, versionName, versionCode, activeProductionIdentityVerified: true, activeApiOrigin: environment.apiBaseUrl, runtimeVersion: appConfig.runtimeVersion, channel: environment.channel, isPreview: environment.isPreview, projectId: appConfig.extra.eas.projectId };
}

function args(values) { const out = {}; for (let i = 0; i < values.length; i += 2) out[values[i].replace(/^--/, '')] = values[i + 1]; return out; }
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  const evidence = verifyProductionAab({ manifest: readFileSync(a.manifest, 'utf8'), validation: readFileSync(a.validation, 'utf8'), signing: readFileSync(a.signing, 'utf8'), appConfigSource: readFileSync(a['app-config'], 'utf8') });
  writeFileSync(a.output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Verified signed Production AAB ${evidence.package} ${evidence.versionName} (${evidence.versionCode}).`);
}
