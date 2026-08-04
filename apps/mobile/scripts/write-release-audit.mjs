import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const read = (path) => {
  if (!path || !existsSync(path)) return { value: null, status: 'missing' };
  const source = readFileSync(path, 'utf8').trim();
  if (!source) return { value: null, status: 'empty' };
  try {
    return { value: JSON.parse(source), status: 'present' };
  } catch {
    return { value: null, status: 'invalid' };
  }
};

export function buildReleaseAudit(env = process.env, completedAt = new Date().toISOString()) {
  const evidence = {
    baseline: read(env.BASELINE_EVIDENCE_PATH),
    channelMapping: read(env.CHANNEL_EVIDENCE_PATH),
    fingerprint: read(env.CURRENT_FINGERPRINT_PATH),
    classifier: read(env.CLASSIFIER_PATH),
    versionCode: read(env.VERSION_EVIDENCE_PATH),
    deliveryResult: read(env.DELIVERY_RESULT_PATH),
    trigger: read(env.TRIGGER_EVIDENCE_PATH),
    replay: read(env.REPLAY_EVIDENCE_PATH),
    stagingReadiness: read(env.STAGING_EVIDENCE_PATH),
  };
  const deliveryResult = evidence.deliveryResult.value;
  const easBuildId = deliveryResult?.id ?? (Array.isArray(deliveryResult) ? deliveryResult[0]?.id : null) ?? null;
  return {
    schemaVersion: 1,
    workflowRunId: env.WORKFLOW_RUN_ID,
    workflowHeadSha: env.WORKFLOW_HEAD_SHA ?? null,
    actor: env.RELEASE_ACTOR,
    environment: env.RELEASE_ENVIRONMENT,
    action: env.RELEASE_ACTION,
    releaseReason: env.RELEASE_REASON,
    commit: env.RELEASE_COMMIT,
    package: env.RELEASE_PACKAGE,
    profile: env.RELEASE_PROFILE,
    runtime: env.RELEASE_RUNTIME,
    channel: env.RELEASE_CHANNEL,
    baselineEasBuildId: env.BASELINE_EAS_BUILD_ID === 'NONE' ? null : env.BASELINE_EAS_BUILD_ID,
    easBuildId,
    baseline: evidence.baseline.value,
    channelMapping: evidence.channelMapping.value,
    fingerprint: evidence.fingerprint.value,
    classifier: evidence.classifier.value,
    versionCode: evidence.versionCode.value,
    deliveryResult: evidence.deliveryResult.value,
    trigger: evidence.trigger.value,
    replay: evidence.replay.value,
    stagingReadiness: evidence.stagingReadiness.value,
    evidenceStatus: Object.fromEntries(Object.entries(evidence).map(([name, result]) => [name, result.status])),
    startedAt: env.WORKFLOW_STARTED_AT,
    completedAt,
    finalStatus: env.FINAL_STATUS,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = buildReleaseAudit();
  writeFileSync(process.env.AUDIT_OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
}
