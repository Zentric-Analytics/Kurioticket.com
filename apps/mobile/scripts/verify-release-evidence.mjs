import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadReleaseFiles } from './release-policy.mjs';

export function verifyBaseline({ manifest, build, variant, policy }) {
  const expected = policy[variant];
  const buildPackage = build.applicationIdentifier ?? build.appIdentifier;
  const checks = [
    [manifest.schemaVersion === 1, 'Unsupported manifest schema.'],
    [manifest.environment === variant, 'Manifest environment mismatch.'],
    [manifest.easBuildId === build.id, 'EAS build ID mismatch.'],
    [manifest.commitSha === build.gitCommitHash, 'Build commit mismatch.'],
    [manifest.package === expected.androidPackage && buildPackage === expected.androidPackage, 'Build package mismatch.'],
    [manifest.profile === expected.profile && build.buildProfile === expected.profile, 'Build profile mismatch.'],
    [manifest.platform === 'ANDROID' && build.platform === 'ANDROID', 'Build platform mismatch.'],
    [manifest.runtime === expected.runtimeVersion && build.runtimeVersion === expected.runtimeVersion, 'Build runtime mismatch.'],
    [manifest.channel === expected.channel && build.channel === expected.channel, 'Build channel mismatch.'],
    [build.status === 'FINISHED', 'Baseline build is not finished.'],
    [/^[a-f0-9]{40}$/.test(manifest.commitSha ?? ''), 'Manifest commit is not a full SHA.'],
    [typeof manifest.nativeFingerprint === 'string' && manifest.nativeFingerprint.length >= 16, 'Manifest fingerprint is missing.'],
  ];
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return { verified: true, environment: variant, easBuildId: build.id, commitSha: manifest.commitSha, nativeFingerprint: manifest.nativeFingerprint, fingerprintSource: 'repository-reviewed-binary-manifest' };
}

export function verifyChannelMapping({ document, expectedChannel, expectedBranch }) {
  if (document.name !== expectedChannel) throw new Error('Channel name mismatch.');
  const names = (document.updateBranches ?? document.branches ?? []).map((entry) => typeof entry === 'string' ? entry : entry.name).filter(Boolean);
  if (names.length !== 1 || names[0] !== expectedBranch) throw new Error('Channel mapping is missing, unexpected, or ambiguous.');
  return { verified: true, channel: expectedChannel, branches: names };
}

export function verifyPlayVersion({ currentRemoteVersionCode, history }) {
  if (!Number.isInteger(currentRemoteVersionCode) || currentRemoteVersionCode < 0) throw new Error('Invalid EAS remote versionCode.');
  const proposedVersionCode = currentRemoteVersionCode + 1;
  if (history.schemaVersion !== 1 || history.package !== 'com.kurioticket.app') throw new Error('Invalid Play history manifest.');
  const verifiedAt = Date.parse(history.verifiedAt ?? '');
  if (!Number.isFinite(verifiedAt) || Date.now() - verifiedAt < 0 || Date.now() - verifiedAt > 24 * 60 * 60 * 1000 || !(history.evidenceReference ?? '').trim()) throw new Error('Play history is missing a current reviewed audit (maximum age 24 hours).');
  if (history.recordStatus === 'absent') return { currentRemoteVersionCode, proposedVersionCode, playRecordStatus: 'absent', highestUploadedVersionCode: null };
  if (history.recordStatus !== 'present' || !Number.isInteger(history.highestUploadedVersionCode)) throw new Error('Play history is unknown.');
  if (proposedVersionCode <= history.highestUploadedVersionCode) throw new Error('Proposed versionCode does not exceed Google Play history.');
  return { currentRemoteVersionCode, proposedVersionCode, playRecordStatus: 'present', highestUploadedVersionCode: history.highestUploadedVersionCode };
}

function args(values) { const out = {}; for (let i = 0; i < values.length; i += 2) out[values[i].replace(/^--/, '')] = values[i + 1]; return out; }
if (process.argv[1]?.endsWith('verify-release-evidence.mjs')) {
  const a = args(process.argv.slice(2));
  const { policy, root } = loadReleaseFiles();
  let result;
  if (a.kind === 'baseline') result = verifyBaseline({ manifest: JSON.parse(readFileSync(resolve(root, a.manifest), 'utf8')), build: JSON.parse(readFileSync(a.build, 'utf8')), variant: a.variant, policy });
  else if (a.kind === 'channel') result = verifyChannelMapping({ document: JSON.parse(readFileSync(a.input, 'utf8')), expectedChannel: policy[a.variant].channel, expectedBranch: policy[a.variant].channel });
  else if (a.kind === 'play') result = verifyPlayVersion({ currentRemoteVersionCode: Number(a.current), history: JSON.parse(readFileSync(resolve(root, a.manifest), 'utf8')) });
  else throw new Error('Unknown verification kind.');
  const output = JSON.stringify(result, null, 2);
  if (a.output) writeFileSync(a.output, `${output}\n`); else console.log(output);
}
