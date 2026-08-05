import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PRODUCTION = Object.freeze({
  packageName: 'com.kurioticket.app',
  profile: 'production',
  runtime: 'production-0.3.0',
});
const MAX_HISTORY_AGE_MS = 24 * 60 * 60 * 1000;

function parseVersionDocument(output) {
  let document;
  try {
    document = JSON.parse(output);
  } catch {
    throw new Error('Unable to parse structured EAS remote Production version output.');
  }
  if (!document || Array.isArray(document) || typeof document !== 'object') {
    throw new Error('EAS remote Production version output must be a JSON object.');
  }
  const keys = Object.keys(document);
  if (keys.length === 0) return { status: 'uninitialized', value: null };
  if (keys.length !== 1 || keys[0] !== 'versionCode' || typeof document.versionCode !== 'string' || !/^(?:0|[1-9]\d*)$/.test(document.versionCode)) {
    throw new Error('EAS remote Production version JSON has an unsupported schema.');
  }
  const value = Number(document.versionCode);
  if (!Number.isSafeInteger(value)) throw new Error('EAS remote Production versionCode exceeds the safe integer range.');
  return { status: 'configured', value };
}

function parseBuilds(output, expected) {
  let builds;
  try {
    builds = JSON.parse(output);
  } catch {
    throw new Error('Unable to parse the filtered EAS Production build history.');
  }
  if (!Array.isArray(builds)) throw new Error('EAS Production build history must be a JSON array.');
  for (const build of builds) {
    const applicationIdentifier = build?.applicationIdentifier ?? build?.appIdentifier;
    if (!build || typeof build !== 'object' || build.platform !== 'ANDROID' || build.buildProfile !== expected.profile || applicationIdentifier !== expected.packageName || build.runtimeVersion !== expected.runtime || build.project?.id !== expected.projectId) {
      throw new Error('EAS Production build history contains mismatched or incomplete identity metadata.');
    }
  }
  return builds;
}

function normalizeBundleVersionCodes(history) {
  if (!Array.isArray(history.uploadedBundles)) throw new Error('Production Play history must include reviewed uploaded bundle evidence.');
  if (history.uploadedBundles.some((value) => !Number.isInteger(value) || value < 1)) {
    throw new Error('Production Play bundle evidence contains a malformed versionCode.');
  }
  return [...new Set(history.uploadedBundles)].sort((left, right) => left - right);
}

export function validateProductionPlayHistory(history, now, { requireFresh = true } = {}) {
  if (history?.schemaVersion !== 2 || history.package !== PRODUCTION.packageName) {
    throw new Error('Production Play history is missing or package-mismatched.');
  }
  const verifiedAt = Date.parse(history.verifiedAt ?? '');
  const age = now.getTime() - verifiedAt;
  if (!Number.isFinite(verifiedAt) || (requireFresh && (age < 0 || age > MAX_HISTORY_AGE_MS)) || !(history.evidenceReference ?? '').trim()) {
    throw new Error('Production Play history is stale or lacks reviewed evidence (maximum age 24 hours).');
  }
  const uploadedVersionCodes = normalizeBundleVersionCodes(history);
  if (history.recordStatus === 'absent') {
    if (history.playApplicationRecord !== 'absent' || uploadedVersionCodes.length !== 0 || history.highestUploadedVersionCode !== null) {
      throw new Error('Absent Production Play history must explicitly report no record, bundles, or versionCode.');
    }
    return { playRecordStatus: 'absent', highestUploadedVersionCode: null, uploadedVersionCodes };
  }
  if (history.recordStatus !== 'present' || history.playApplicationRecord !== 'present') {
    throw new Error('Production Play history is unknown or malformed.');
  }
  if (uploadedVersionCodes.length === 0) {
    if (history.highestUploadedVersionCode !== null) {
      throw new Error('Present-empty Production Play history must not claim a highest uploaded versionCode.');
    }
    return { playRecordStatus: 'present', highestUploadedVersionCode: null, uploadedVersionCodes };
  }
  if (!Number.isInteger(history.highestUploadedVersionCode) || history.highestUploadedVersionCode < 1) {
    throw new Error('Production Play history with bundles must include the highest uploaded versionCode.');
  }
  const bundleMaximum = uploadedVersionCodes.at(-1);
  if (history.highestUploadedVersionCode !== bundleMaximum) {
    throw new Error('Production Play highest uploaded versionCode does not match reviewed bundle evidence.');
  }
  return { playRecordStatus: 'present', highestUploadedVersionCode: bundleMaximum, uploadedVersionCodes };
}

export function validateProductionPlayHistoryTransition(history, previousHistory, now) {
  const play = validateProductionPlayHistory(history, now);
  const previousPlay = previousHistory ? validateProductionPlayHistory(previousHistory, now, { requireFresh: false }) : null;
  if (play.playRecordStatus === 'present' && previousPlay === null) {
    throw new Error('A present Production Play record requires immutable previous reviewed history.');
  }
  if (previousPlay?.playRecordStatus === 'present' && play.playRecordStatus !== 'present') {
    throw new Error('Production Play history cannot revert from present to absent.');
  }
  if (previousPlay && previousPlay.highestUploadedVersionCode !== null && (play.highestUploadedVersionCode === null || play.highestUploadedVersionCode < previousPlay.highestUploadedVersionCode)) {
    throw new Error('Production Play highest uploaded versionCode cannot decrease from previous reviewed history.');
  }
  if (previousPlay && previousPlay.uploadedVersionCodes.some((value) => !play.uploadedVersionCodes.includes(value))) {
    throw new Error('Production Play bundle evidence cannot remove a previously reviewed versionCode.');
  }
  return play;
}

export function resolveProductionVersionEvidence({
  versionOutput,
  versionExitCode,
  buildsOutput,
  buildsExitCode,
  history,
  previousHistory = null,
  packageName,
  profile,
  runtime,
  now = new Date(),
}) {
  if (packageName !== PRODUCTION.packageName || profile !== PRODUCTION.profile || runtime !== PRODUCTION.runtime) {
    throw new Error('Production version handling is restricted to the approved Production identity.');
  }
  const play = validateProductionPlayHistoryTransition(history, previousHistory, now);
  if (versionExitCode !== 0) throw new Error('EAS remote Production version query failed.');

  if (!versionOutput.trim()) throw new Error('EAS remote Production version query returned empty stdout.');
  const remote = parseVersionDocument(versionOutput);
  if (remote.status === 'configured') {
    const current = remote.value;
    const proposed = current + 1;
    if (play.highestUploadedVersionCode !== null && proposed <= play.highestUploadedVersionCode) {
      throw new Error('Proposed Production versionCode does not exceed Google Play history.');
    }
    return { currentRemoteVersionCode: current, proposedVersionCode: proposed, remoteVersionStatus: 'configured', ...play };
  }

  if (buildsExitCode !== 0) throw new Error('Filtered EAS Production build-history query failed.');
  const builds = parseBuilds(buildsOutput, { packageName, profile, runtime, projectId: '89f6fd88-c0d7-495a-9e2b-8301b09f407d' });
  if (builds.length !== 0) throw new Error('Cannot initialize Production versionCode because an existing build uses this package/profile.');
  if (play.uploadedVersionCodes.length !== 0 || play.highestUploadedVersionCode !== null) {
    throw new Error('Cannot initialize Production versionCode because Google Play history is not empty.');
  }

  return { currentRemoteVersionCode: null, proposedVersionCode: 1, remoteVersionStatus: 'uninitialized', ...play };
}

function readArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) throw new Error('Invalid Production version-evidence arguments.');
    values[flag.slice(2)] = value;
  }
  return values;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = readArgs(process.argv.slice(2));
  const evidence = resolveProductionVersionEvidence({
    versionOutput: readFileSync(args['version-output'], 'utf8'),
    versionExitCode: Number(args['version-exit-code']),
    buildsOutput: readFileSync(args['builds-output'], 'utf8'),
    buildsExitCode: Number(args['builds-exit-code']),
    history: JSON.parse(readFileSync(args['play-history'], 'utf8')),
    previousHistory: args['previous-play-history'] ? JSON.parse(readFileSync(args['previous-play-history'], 'utf8')) : null,
    packageName: args.package,
    profile: args.profile,
    runtime: args.runtime,
  });
  writeFileSync(args.output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Production versionCode proposal: ${evidence.proposedVersionCode} (${evidence.remoteVersionStatus})`);
}
