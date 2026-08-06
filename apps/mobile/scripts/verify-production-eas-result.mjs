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

export function verifyProductionBuildResult({ source, historySource, aabEvidenceSource, approvedSha, proposedVersionCode, remoteVersionStatus }) {
  const value = parseJson(source, 'EAS Production build');
  if (!Array.isArray(value) || value.length !== 1 || !value[0] || typeof value[0] !== 'object') throw new Error('EAS Production build result must contain exactly one build.');
  const build = value[0];
  const history = parseJson(historySource, 'Filtered EAS Production build history');
  if (!Array.isArray(history) || history.length !== 1 || !history[0] || typeof history[0] !== 'object') throw new Error('Filtered EAS Production build history must contain exactly one build.');
  const authoritative = history[0];
  const aab = parseJson(aabEvidenceSource, 'Production AAB inspection');
  if (!['uninitialized', 'configured'].includes(remoteVersionStatus)) throw new Error('Remote Production version status is missing or invalid.');
  const expectedBuiltVersionCode = remoteVersionStatus === 'uninitialized' ? proposedVersionCode + 1 : proposedVersionCode;
  if (authoritative.id !== build.id) throw new Error('Submitted build ID does not match filtered EAS history.');
  const archive = authoritative.artifacts?.applicationArchiveUrl ?? authoritative.artifacts?.buildUrl;
  const checks = [
    [uuid.test(authoritative.id ?? ''), 'Build ID is missing or malformed.'],
    [authoritative.status === 'FINISHED', `Build status is not FINISHED (${authoritative.status ?? 'missing'}).`],
    [authoritative.platform === 'ANDROID', 'Build platform mismatch.'],
    [authoritative.project?.id === EXPECTED.projectId, 'Build project mismatch.'],
    [authoritative.buildProfile === EXPECTED.profile, 'Build profile mismatch.'],
    [(authoritative.applicationIdentifier ?? authoritative.appIdentifier) === EXPECTED.packageName, 'Filtered build package metadata is missing or mismatched.'],
    [authoritative.distribution === 'STORE', 'Build distribution mismatch.'],
    [authoritative.runtimeVersion === EXPECTED.runtime, 'Build runtime mismatch.'],
    [authoritative.channel === EXPECTED.channel, 'Build channel mismatch.'],
    [authoritative.appVersion === EXPECTED.appVersion, 'Build app version mismatch.'],
    [String(authoritative.appBuildVersion) === String(expectedBuiltVersionCode), 'Build versionCode mismatch.'],
    [authoritative.gitCommitHash === approvedSha, 'Build Git commit metadata is missing or mismatched.'],
    [typeof archive === 'string' && /^https:\/\//.test(archive) && /\.aab(?:\?|$)/i.test(archive), 'Finished Production build is missing a Play-compatible AAB artifact.'],
    [aab.verified === true && aab.package === EXPECTED.packageName, 'Inspected AAB package mismatch.'],
    [aab.versionName === EXPECTED.appVersion && String(aab.versionCode) === String(expectedBuiltVersionCode), 'Inspected AAB version mismatch.'],
    [aab.signed === true && aab.forbiddenIdentityFound === false, 'AAB signing or identity-isolation verification failed.'],
  ];
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return { kind: 'build', id: authoritative.id, status: authoritative.status, platform: authoritative.platform, package: EXPECTED.packageName, projectId: EXPECTED.projectId, profile: authoritative.buildProfile, runtime: authoritative.runtimeVersion, channel: authoritative.channel, appVersion: authoritative.appVersion, versionCode: Number(authoritative.appBuildVersion), commitSha: authoritative.gitCommitHash, artifactType: 'AAB', artifactUrlPresent: true, aabInspected: true, signed: true };
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
  const evidence = a.kind === 'build' ? verifyProductionBuildResult({ source, historySource: readFileSync(a.history, 'utf8'), aabEvidenceSource: readFileSync(a['aab-evidence'], 'utf8'), approvedSha: a.sha, proposedVersionCode: Number(a['version-code']), remoteVersionStatus: a['version-status'] }) : verifyProductionUpdateResult({ source, approvedSha: a.sha });
  writeFileSync(a.output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Verified Production EAS ${a.kind} result ${evidence.id}.`);
}
