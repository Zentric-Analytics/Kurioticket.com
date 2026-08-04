import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const EXPECTED = Object.freeze({
  projectId: '89f6fd88-c0d7-495a-9e2b-8301b09f407d',
  packageName: 'com.kurioticket.app',
  profile: 'production',
  runtime: 'production-0.3.0',
  channel: 'production',
  appVersion: '0.3.0',
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseJson(source, label) {
  if (!source.trim()) throw new Error(`${label} returned empty stdout.`);
  try { return JSON.parse(source); } catch { throw new Error(`${label} returned malformed JSON.`); }
}

export function verifyProductionBuildResult({ source, approvedSha, proposedVersionCode }) {
  const value = parseJson(source, 'EAS Production build');
  if (!Array.isArray(value) || value.length !== 1 || !value[0] || typeof value[0] !== 'object') throw new Error('EAS Production build result must contain exactly one build.');
  const build = value[0];
  const archive = build.artifacts?.applicationArchiveUrl ?? build.artifacts?.buildUrl;
  const checks = [
    [uuid.test(build.id ?? ''), 'Build ID is missing or malformed.'],
    [build.status === 'FINISHED', `Build status is not FINISHED (${build.status ?? 'missing'}).`],
    [build.platform === 'ANDROID', 'Build platform mismatch.'],
    [build.project?.id === EXPECTED.projectId, 'Build project mismatch.'],
    [build.buildProfile === EXPECTED.profile, 'Build profile mismatch.'],
    [!build.applicationIdentifier && !build.appIdentifier || build.applicationIdentifier === EXPECTED.packageName || build.appIdentifier === EXPECTED.packageName, 'Build package metadata mismatch.'],
    [build.runtimeVersion === EXPECTED.runtime, 'Build runtime mismatch.'],
    [build.channel === EXPECTED.channel, 'Build channel mismatch.'],
    [build.appVersion === EXPECTED.appVersion, 'Build app version mismatch.'],
    [String(build.appBuildVersion) === String(proposedVersionCode), 'Build versionCode mismatch.'],
    [build.gitCommitHash === approvedSha, 'Build Git commit metadata is missing or mismatched.'],
    [typeof archive === 'string' && /^https:\/\//.test(archive) && /\.aab(?:\?|$)/i.test(archive), 'Finished Production build is missing a Play-compatible AAB artifact.'],
  ];
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return { kind: 'build', id: build.id, status: build.status, platform: build.platform, package: EXPECTED.packageName, projectId: EXPECTED.projectId, profile: build.buildProfile, runtime: build.runtimeVersion, channel: build.channel, appVersion: build.appVersion, versionCode: Number(build.appBuildVersion), commitSha: build.gitCommitHash, artifactType: 'AAB', artifactUrlPresent: true };
}

export function verifyProductionUpdateResult({ source, approvedSha }) {
  const value = parseJson(source, 'EAS Production update');
  if (!Array.isArray(value) || value.length !== 1 || !value[0] || typeof value[0] !== 'object') throw new Error('EAS Production update result must contain exactly one Android update.');
  const update = value[0];
  const checks = [[uuid.test(update.id ?? ''), 'Update ID is missing or malformed.'], [update.platform === 'ANDROID', 'Update platform mismatch.'], [update.branch === EXPECTED.channel, 'Update branch mismatch.'], [update.runtimeVersion === EXPECTED.runtime, 'Update runtime mismatch.'], [update.gitCommitHash === approvedSha, 'Update Git commit metadata is missing or mismatched.']];
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return { kind: 'update', id: update.id, status: 'PUBLISHED', platform: update.platform, branch: update.branch, runtime: update.runtimeVersion, commitSha: update.gitCommitHash };
}

function args(values) { const out = {}; for (let i = 0; i < values.length; i += 2) { if (!values[i]?.startsWith('--') || values[i + 1] === undefined) throw new Error('Invalid EAS result-verifier arguments.'); out[values[i].slice(2)] = values[i + 1]; } return out; }
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  const source = readFileSync(a.input, 'utf8');
  const evidence = a.kind === 'build' ? verifyProductionBuildResult({ source, approvedSha: a.sha, proposedVersionCode: Number(a['version-code']) }) : verifyProductionUpdateResult({ source, approvedSha: a.sha });
  writeFileSync(a.output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Verified Production EAS ${a.kind} result ${evidence.id}.`);
}
