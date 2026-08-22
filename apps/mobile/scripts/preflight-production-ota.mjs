import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadReleaseFiles } from './release-policy.mjs';

const PROJECT_ID = '89f6fd88-c0d7-495a-9e2b-8301b09f407d';

export function validateProductionOtaPublicEnvironment(environment, platform, policy) {
  if (!['android', 'ios'].includes(platform)) throw new Error('Production OTA preflight platform is invalid.');
  const checks = [
    [environment.APP_VARIANT === 'production', 'Production OTA APP_VARIANT is missing or crossed.'],
    [environment.APP_BUILD_MODE === 'release', 'Production OTA APP_BUILD_MODE is missing or crossed.'],
    [environment.EXPO_PUBLIC_API_BASE_URL === policy.apiBaseUrl, 'Production OTA API origin is missing or crossed.'],
    [typeof environment.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID === 'string' && environment.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.trim().length > 0, 'Production OTA Google web client is missing.'],
  ];
  if (platform === 'ios') checks.push([environment.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() === policy.googleIosClientId, 'Production OTA Google iOS client is missing or crossed.']);
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return {
    platform: platform.toUpperCase(),
    webClientPresent: true,
    iosClientVerified: platform === 'ios' ? true : null,
  };
}

export function validateProductionOtaConfig(config, platform, policy) {
  const identifier = platform === 'android' ? config?.android?.package : config?.ios?.bundleIdentifier;
  const expectedIdentifier = platform === 'android' ? policy.androidPackage : policy.bundleIdentifier;
  const checks = [
    [config?.name === policy.displayName, 'Production OTA display name mismatch.'],
    [identifier === expectedIdentifier, 'Production OTA application identifier mismatch.'],
    [config?.scheme === policy.scheme, 'Production OTA scheme mismatch.'],
    [config?.runtimeVersion === policy.runtimeVersion, 'Production OTA runtime mismatch.'],
    [config?.extra?.eas?.projectId === PROJECT_ID, 'Production OTA EAS project mismatch.'],
    [config?.extra?.environment?.variant === 'production', 'Production OTA variant mismatch.'],
    [config?.extra?.environment?.buildMode === 'release', 'Production OTA build mode mismatch.'],
    [config?.extra?.environment?.apiBaseUrl === policy.apiBaseUrl, 'Production OTA active API mismatch.'],
    [config?.extra?.environment?.channel === policy.channel, 'Production OTA channel mismatch.'],
    [config?.extra?.environment?.isPreview === false, 'Production OTA Preview state mismatch.'],
  ];
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return { identifier, activeProductionIdentityVerified: true };
}

export function inspectProductionOtaBundle(bundle, environment, platform, policy) {
  const web = environment.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.trim();
  const ios = environment.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
  const checks = [
    [bundle.includes(Buffer.from(web)), 'Production OTA bundle is missing the Google web client.'],
    [bundle.includes(Buffer.from(policy.apiBaseUrl)), 'Production OTA bundle is missing the Production API origin.'],
  ];
  if (platform === 'ios') checks.push([ios === policy.googleIosClientId && bundle.includes(Buffer.from(ios)), 'Production OTA bundle is missing the approved Google iOS client.']);
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return { webClientEmbedded: true, iosClientEmbedded: platform === 'ios' ? true : null, productionApiEmbedded: true };
}

function findFiles(root, suffix, found = []) {
  for (const name of readdirSync(root)) {
    const path = resolve(root, name);
    if (statSync(path).isDirectory()) findFiles(path, suffix, found);
    else if (path.endsWith(suffix)) found.push(path);
  }
  return found;
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    if (!values[index]?.startsWith('--') || values[index + 1] === undefined) throw new Error('Invalid Production OTA preflight arguments.');
    result[values[index].slice(2)] = values[index + 1];
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const platform = args.platform;
  const outputDir = resolve(args['output-dir']);
  const evidencePath = resolve(args.evidence);
  const { policy } = loadReleaseFiles();
  const production = policy.production;
  const publicEnvironment = validateProductionOtaPublicEnvironment(process.env, platform, production);
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const spawnOptions = { encoding: 'utf8', env: process.env, shell: process.platform === 'win32' };
  const configResult = spawnSync(executable, ['expo', 'config', '--type', 'public', '--json'], spawnOptions);
  if (configResult.status !== 0) throw new Error('Production OTA public config resolution failed.');
  const configEvidence = validateProductionOtaConfig(JSON.parse(configResult.stdout), platform, production);
  const exportResult = spawnSync(executable, ['expo', 'export', '--platform', platform, '--clear', '--output-dir', outputDir], { ...spawnOptions, stdio: ['ignore', 'inherit', 'inherit'] });
  if (exportResult.status !== 0) throw new Error('Production OTA bundle preflight export failed.');
  const bundles = findFiles(outputDir, '.hbc');
  if (bundles.length !== 1) throw new Error('Production OTA preflight requires exactly one platform bundle.');
  const bundleEvidence = inspectProductionOtaBundle(readFileSync(bundles[0]), process.env, platform, production);
  const evidence = { verified: true, environment: 'production', ...publicEnvironment, ...configEvidence, ...bundleEvidence };
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Production ${platform} OTA public environment and bundle preflight passed.`);
}
