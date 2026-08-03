import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const read = (path) => path && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
const manifest = {
  schemaVersion: 1,
  workflowRunId: process.env.WORKFLOW_RUN_ID,
  actor: process.env.RELEASE_ACTOR,
  environment: process.env.RELEASE_ENVIRONMENT,
  action: process.env.RELEASE_ACTION,
  releaseReason: process.env.RELEASE_REASON,
  commit: process.env.RELEASE_COMMIT,
  package: process.env.RELEASE_PACKAGE,
  profile: process.env.RELEASE_PROFILE,
  runtime: process.env.RELEASE_RUNTIME,
  channel: process.env.RELEASE_CHANNEL,
  baselineEasBuildId: process.env.BASELINE_EAS_BUILD_ID === 'NONE' ? null : process.env.BASELINE_EAS_BUILD_ID,
  baseline: read(process.env.BASELINE_EVIDENCE_PATH),
  channelMapping: read(process.env.CHANNEL_EVIDENCE_PATH),
  fingerprint: read(process.env.CURRENT_FINGERPRINT_PATH),
  classifier: read(process.env.CLASSIFIER_PATH),
  versionCode: read(process.env.VERSION_EVIDENCE_PATH),
  deliveryResult: read(process.env.DELIVERY_RESULT_PATH),
  startedAt: process.env.WORKFLOW_STARTED_AT,
  completedAt: new Date().toISOString(),
  finalStatus: process.env.FINAL_STATUS,
};
writeFileSync(process.env.AUDIT_OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
