import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function verifyProductionAab({ manifest, validation, signing, contents }) {
  const root = manifest.match(/<manifest\b[^>]*>/)?.[0] ?? '';
  const attribute = (name) => root.match(new RegExp(`(?:android:)?${name}="([^"]+)"`))?.[1];
  const packageName = attribute('package');
  const versionName = attribute('versionName');
  const versionCode = Number(attribute('versionCode'));
  const forbiddenIdentityFound = ['com.kurioticket.app.preview', 'com.kurioticket.mobile', 'https://staging.kurioticket.com'].some((value) => contents.includes(value));
  if (!validation.includes('App Bundle information')) throw new Error('bundletool did not validate the AAB.');
  if (!signing.includes('jar verified.')) throw new Error('AAB signature verification failed.');
  if (packageName !== 'com.kurioticket.app') throw new Error('AAB package mismatch.');
  if (versionName !== '0.3.0' || !Number.isInteger(versionCode) || versionCode < 1) throw new Error('AAB version metadata is invalid.');
  if (forbiddenIdentityFound) throw new Error('AAB contains a forbidden Preview, legacy, or staging identity.');
  return { verified: true, signed: true, package: packageName, versionName, versionCode, forbiddenIdentityFound };
}

function args(values) { const out = {}; for (let i = 0; i < values.length; i += 2) out[values[i].replace(/^--/, '')] = values[i + 1]; return out; }
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  const evidence = verifyProductionAab({ manifest: readFileSync(a.manifest, 'utf8'), validation: readFileSync(a.validation, 'utf8'), signing: readFileSync(a.signing, 'utf8'), contents: readFileSync(a.contents, 'utf8') });
  writeFileSync(a.output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Verified signed Production AAB ${evidence.package} ${evidence.versionName} (${evidence.versionCode}).`);
}
