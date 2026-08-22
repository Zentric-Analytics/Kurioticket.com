import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isRfcUuid, normalizeEasPlatform } from './verify-production-eas-result.mjs';

const PROJECT_ID = '89f6fd88-c0d7-495a-9e2b-8301b09f407d';
const fullSha = (value) => /^[0-9a-f]{40}$/.test(value ?? '');
const readJson = (path, label) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { throw new Error(`${label} is missing or malformed.`); }
};

export function reconcileProductionOta({ view, list, expected, evidence, verifiedAt = new Date().toISOString() }) {
  if (!isRfcUuid(expected.updateId) || !isRfcUuid(expected.groupId)) throw new Error('Expected update or group ID is malformed.');
  if (!fullSha(expected.sourceSha) || !/^\d+$/.test(String(expected.originalWorkflowRunId ?? ''))) throw new Error('Expected publication provenance is malformed.');
  const expectedPlatform = normalizeEasPlatform(expected.platform);
  if (expectedPlatform !== 'ANDROID' || expected.runtime !== 'production-0.3.0' || expected.branch !== 'production') throw new Error('Expected Production target is invalid.');
  if (!Array.isArray(view)) throw new Error('EAS update:view result must be an array.');
  const candidates = view.filter((item) => {
    try { return normalizeEasPlatform(item?.platform) === expectedPlatform; }
    catch { return false; }
  });
  if (candidates.length !== 1) throw new Error('EAS update:view must contain exactly one Android candidate.');
  const update = candidates[0];
  const checks = [
    [update.id === expected.updateId, 'Existing update ID mismatch.'],
    [isRfcUuid(update.id), 'Existing update ID is malformed.'],
    [update.group === expected.groupId, 'Existing update group mismatch.'],
    [update.runtimeVersion === expected.runtime, 'Existing update runtime mismatch.'],
    [update.branch === expected.branch, 'Existing update branch mismatch.'],
    [update.gitCommitHash === expected.sourceSha, 'Existing update source SHA mismatch.'],
    [update.createdAt === expected.publishedAt, 'Existing update timestamp mismatch.'],
    [list?.name === expected.branch && Array.isArray(list?.currentPage), 'EAS update:list result is malformed.'],
  ];
  const groups = list?.currentPage?.filter((item) => item?.group === expected.groupId) ?? [];
  checks.push([groups.length === 1, 'EAS update:list must contain exactly one matching group.']);
  let listPlatform;
  try { listPlatform = normalizeEasPlatform(groups[0]?.platforms); } catch { listPlatform = null; }
  checks.push([groups[0]?.branch === expected.branch && groups[0]?.runtimeVersion === expected.runtime && listPlatform === expectedPlatform, 'EAS update:list corroboration mismatch.']);
  checks.push([evidence.baseline?.verified === true && evidence.baseline?.easBuildId === expected.baselineBuildId, 'Reviewed baseline evidence mismatch.']);
  checks.push([evidence.fingerprint?.hash === expected.fingerprint, 'Published-source fingerprint mismatch.']);
  checks.push([evidence.classifier?.classification === 'ota-compatible' && evidence.classifier?.nativeFiles?.length === 0, 'Published-source classifier is not OTA-compatible.']);
  checks.push([evidence.channel?.verified === true && evidence.channel?.channel === expected.branch && evidence.channel?.branches?.length === 1 && evidence.channel.branches[0] === expected.branch, 'Production channel evidence mismatch.']);
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return {
    schemaVersion: 1,
    action: 'reconcile-update',
    environment: 'production',
    platform: expectedPlatform,
    projectId: PROJECT_ID,
    originalWorkflowRunId: String(expected.originalWorkflowRunId),
    originalEasUpdateId: update.id,
    easUpdateId: update.id,
    updateGroupId: update.group,
    publicationSourceSha: update.gitCommitHash,
    publishedAt: update.createdAt,
    runtime: update.runtimeVersion,
    branch: update.branch,
    publicationPerformed: false,
    publicationDecision: 'already-published-verified',
    verificationStatus: 'success',
    finalStatus: 'success',
    baseline: evidence.baseline,
    fingerprint: evidence.fingerprint,
    classifier: evidence.classifier,
    channelMapping: evidence.channel,
    verifiedAt,
  };
}

function args(values) { const out = {}; for (let i = 0; i < values.length; i += 2) { if (!values[i]?.startsWith('--') || values[i + 1] === undefined) throw new Error('Invalid reconciliation arguments.'); out[values[i].slice(2)] = values[i + 1]; } return out; }
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  const result = reconcileProductionOta({
    view: readJson(a.view, 'EAS update:view evidence'),
    list: readJson(a.list, 'EAS update:list evidence'),
    expected: { updateId: a['update-id'], groupId: a['group-id'], sourceSha: a['source-sha'], originalWorkflowRunId: a['original-workflow-run-id'], platform: a.platform, runtime: a.runtime, branch: a.branch, publishedAt: a['published-at'], baselineBuildId: a['baseline-build-id'], fingerprint: a.fingerprint },
    evidence: { baseline: readJson(a.baseline, 'Baseline evidence'), fingerprint: readJson(a['current-fingerprint'], 'Fingerprint evidence'), classifier: readJson(a.classifier, 'Classifier evidence'), channel: readJson(a.channel, 'Channel evidence') },
  });
  writeFileSync(a.output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Verified already-published Production OTA ${result.easUpdateId}; no publication performed.`);
}
