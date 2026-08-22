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
  if (env.RELEASE_ENVIRONMENT === 'production' && env.FINAL_STATUS === 'success') {
    const expectedKind = { 'dry-run': 'dry-run', build: 'build', update: 'update' }[env.RELEASE_ACTION];
    if (!expectedKind || evidence.deliveryResult.status !== 'present' || deliveryResult?.kind !== expectedKind) {
      throw new Error('Successful Production release audit is missing its exact delivery result.');
    }
    if (expectedKind === 'build') {
      const validBuild = typeof deliveryResult.id === 'string'
        && deliveryResult.status === 'FINISHED'
        && deliveryResult.platform === 'ANDROID'
        && deliveryResult.package === env.RELEASE_PACKAGE
        && deliveryResult.projectId === '89f6fd88-c0d7-495a-9e2b-8301b09f407d'
        && deliveryResult.profile === env.RELEASE_PROFILE
        && deliveryResult.runtime === env.RELEASE_RUNTIME
        && deliveryResult.channel === env.RELEASE_CHANNEL
        && deliveryResult.commitSha === env.RELEASE_COMMIT
        && deliveryResult.artifactType === 'AAB'
        && Number.isSafeInteger(deliveryResult.versionCode) && deliveryResult.versionCode > 0
        && deliveryResult.aabInspected === true
        && deliveryResult.signed === true
        && deliveryResult.activeProductionIdentityVerified === true
        && deliveryResult.activeApiOrigin === 'https://kurioticket.com'
        && deliveryResult.isPreview === false;
      if (!validBuild) throw new Error('Successful Production build audit is missing verified artifact evidence.');
    }
    if (expectedKind === 'update' && typeof deliveryResult.id !== 'string') {
      throw new Error('Successful Production update audit is missing publication evidence.');
    }
  }
  const easBuildId = deliveryResult?.kind === 'build' ? deliveryResult.id ?? null : null;
  const easUpdateId = deliveryResult?.kind === 'update' ? deliveryResult.id ?? null : null;
  let publicationDecision = 'blocked-or-not-reached';
  if (deliveryResult?.kind === 'dry-run') publicationDecision = 'ready-not-submitted';
  else if (deliveryResult?.kind === 'build') publicationDecision = 'artifact-verified';
  else if (deliveryResult?.kind === 'update') publicationDecision = 'published';
  else if (evidence.replay.value?.alreadyPublished === true) publicationDecision = 'already-published';
  else if (evidence.classifier.value?.classification === 'native-build-required') publicationDecision = 'preview-build-required';
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
    easUpdateId,
    publicationDecision,
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
