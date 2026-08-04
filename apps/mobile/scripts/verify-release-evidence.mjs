import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadReleaseFiles } from './release-policy.mjs';

const fullSha = (value) => /^[a-f0-9]{40}$/.test(value ?? '');
const deliveryId = (audit) => audit?.easBuildId ?? audit?.deliveryResult?.id ?? (Array.isArray(audit?.deliveryResult) ? audit.deliveryResult[0]?.id : null);

function verifyCompositeAttestation({ manifest, build, workflowRun, artifact, audit }) {
  const source = manifest.sourceAttestation;
  const checks = [
    [manifest.schemaVersion === 2 && source?.type === 'github-actions-build', 'Missing composite source attestation.'],
    [source.repository === 'Zentric-Analytics/Kurioticket.com', 'Attestation repository mismatch.'],
    [String(workflowRun?.id) === String(source.workflowRunId), 'Workflow run ID mismatch.'],
    [workflowRun?.repository?.full_name === source.repository, 'Workflow repository mismatch.'],
    [workflowRun?.name === 'Android Preview Build', 'Unrelated workflow run.'],
    [workflowRun?.path === '.github/workflows/android-preview-build.yml', 'Workflow path mismatch.'],
    [workflowRun?.event === 'workflow_dispatch', 'Build workflow was not manually dispatched.'],
    [workflowRun?.head_branch === 'dev', 'Build workflow did not run from dev.'],
    [workflowRun?.head_sha === manifest.commitSha, 'Workflow source SHA mismatch.'],
    [workflowRun?.status === 'completed' && workflowRun?.conclusion === 'success', 'Build workflow was not successful.'],
    [Number(artifact?.id) === Number(source.artifactId), 'Build audit artifact ID mismatch.'],
    [artifact?.name === source.artifactName, 'Build audit artifact name mismatch.'],
    [artifact?.digest === source.artifactDigest, 'Build audit artifact digest mismatch.'],
    [artifact?.expired === false, 'Build audit artifact is expired.'],
    [String(artifact?.workflow_run?.id) === String(source.workflowRunId), 'Artifact workflow run mismatch.'],
    [artifact?.workflow_run?.head_sha === manifest.commitSha, 'Artifact source SHA mismatch.'],
    [String(audit?.workflowRunId) === String(source.workflowRunId), 'Release audit workflow run mismatch.'],
    [audit?.commit === manifest.commitSha, 'Release audit source SHA mismatch.'],
    [audit?.environment === 'preview' && audit?.action === 'build', 'Release audit action mismatch.'],
    [audit?.package === manifest.package && audit?.profile === manifest.profile, 'Release audit identity mismatch.'],
    [audit?.runtime === manifest.runtime && audit?.channel === manifest.channel, 'Release audit delivery target mismatch.'],
    [audit?.fingerprint?.hash === manifest.nativeFingerprint, 'Release audit fingerprint mismatch.'],
    [deliveryId(audit) === build.id && deliveryId(audit) === manifest.easBuildId, 'Release audit EAS build ID mismatch.'],
    [audit?.finalStatus === 'success', 'Release audit is not successful.'],
  ];
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return 'github-actions-composite';
}

export function verifyBaseline({ manifest, build, variant, policy, workflowRun, artifact, audit }) {
  const expected = policy[variant];
  const buildPackage = build.applicationIdentifier ?? build.appIdentifier;
  let sourceVerification;
  if (fullSha(build.gitCommitHash)) {
    if (manifest.commitSha !== build.gitCommitHash) throw new Error('Build commit mismatch.');
    sourceVerification = 'eas-git-commit';
  } else {
    sourceVerification = verifyCompositeAttestation({ manifest, build, workflowRun, artifact, audit });
  }
  const checks = [
    [[1, 2].includes(manifest.schemaVersion), 'Unsupported manifest schema.'],
    [manifest.environment === variant, 'Manifest environment mismatch.'],
    [manifest.easBuildId === build.id, 'EAS build ID mismatch.'],
    [manifest.projectId === undefined || manifest.projectId === build.project?.id, 'EAS project mismatch.'],
    [manifest.package === expected.androidPackage && (!buildPackage || buildPackage === expected.androidPackage), 'Build package mismatch.'],
    [manifest.profile === expected.profile && build.buildProfile === expected.profile, 'Build profile mismatch.'],
    [manifest.platform === 'ANDROID' && build.platform === 'ANDROID', 'Build platform mismatch.'],
    [manifest.runtime === expected.runtimeVersion && build.runtimeVersion === expected.runtimeVersion, 'Build runtime mismatch.'],
    [manifest.channel === expected.channel && build.channel === expected.channel, 'Build channel mismatch.'],
    [manifest.appVersion === undefined || manifest.appVersion === build.appVersion, 'Build app version mismatch.'],
    [manifest.versionCode === undefined || String(manifest.versionCode) === String(build.appBuildVersion), 'Build versionCode mismatch.'],
    [build.status === 'FINISHED', 'Baseline build is not finished.'],
    [fullSha(manifest.commitSha), 'Manifest commit is not a full SHA.'],
    [typeof manifest.nativeFingerprint === 'string' && manifest.nativeFingerprint.length >= 16, 'Manifest fingerprint is missing.'],
  ];
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return { verified: true, environment: variant, easBuildId: build.id, commitSha: manifest.commitSha, nativeFingerprint: manifest.nativeFingerprint, fingerprintSource: 'repository-reviewed-binary-manifest', sourceVerification };
}

export function verifyChannelMapping({ document, expectedChannel, expectedBranch }) {
  const page = document?.currentPage;
  if (!page || Array.isArray(page) || typeof page !== 'object') throw new Error('Unsupported EAS channel response structure.');
  if (page.name !== expectedChannel) throw new Error('Channel name mismatch.');
  if (page.isPaused !== false) throw new Error('Channel is paused or its state is unknown.');
  if (!Array.isArray(page.updateBranches) || page.updateBranches.length !== 1) throw new Error('Channel mapping is missing, unexpected, or ambiguous.');

  let mapping;
  try { mapping = JSON.parse(page.branchMapping); } catch { throw new Error('Channel mapping metadata is invalid.'); }
  if (mapping?.version !== 0 || !Array.isArray(mapping?.data) || mapping.data.length !== 1) throw new Error('Channel mapping metadata is missing, unexpected, or ambiguous.');

  const [entry] = mapping.data;
  const [branch] = page.updateBranches;
  if (!entry || typeof entry !== 'object' || entry.branchMappingLogic !== 'true' || typeof entry.branchId !== 'string') {
    throw new Error('Channel rollout or mapping logic is not an exact single-branch mapping.');
  }
  if (!branch || typeof branch !== 'object' || branch.id !== entry.branchId || branch.name !== expectedBranch) {
    throw new Error('Channel mapping targets an unexpected branch.');
  }
  return { verified: true, channel: expectedChannel, branches: [branch.name], mappingVersion: mapping.version };
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
  if (a.kind === 'baseline') result = verifyBaseline({
    manifest: JSON.parse(readFileSync(resolve(root, a.manifest), 'utf8')),
    build: JSON.parse(readFileSync(a.build, 'utf8')),
    variant: a.variant,
    policy,
    workflowRun: a['workflow-run'] ? JSON.parse(readFileSync(a['workflow-run'], 'utf8')) : undefined,
    artifact: a.artifact ? JSON.parse(readFileSync(a.artifact, 'utf8')) : undefined,
    audit: a.audit ? JSON.parse(readFileSync(a.audit, 'utf8')) : undefined,
  });
  else if (a.kind === 'channel') result = verifyChannelMapping({ document: JSON.parse(readFileSync(a.input, 'utf8')), expectedChannel: policy[a.variant].channel, expectedBranch: policy[a.variant].channel });
  else if (a.kind === 'play') result = verifyPlayVersion({ currentRemoteVersionCode: Number(a.current), history: JSON.parse(readFileSync(resolve(root, a.manifest), 'utf8')) });
  else throw new Error('Unknown verification kind.');
  const output = JSON.stringify(result, null, 2);
  if (a.output) writeFileSync(a.output, `${output}\n`); else console.log(output);
}
