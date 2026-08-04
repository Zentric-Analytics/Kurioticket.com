import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { classifyRelease } from './classify-release.mjs';
import { validateStaticDeliveryInputs } from './delivery-policy.mjs';
import { downloadArtifactArchive, extractReviewedAudit } from './fetch-github-build-attestation.mjs';
import { loadReleaseFiles } from './release-policy.mjs';
import { verifyBaseline, verifyChannelMapping } from './verify-release-evidence.mjs';
import { buildReleaseAudit } from './write-release-audit.mjs';

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});
const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
function zipAudit(audit) {
  const data = Buffer.from(`${JSON.stringify(audit)}\n`);
  const name = Buffer.from('release-audit.json');
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(0x0314, 4); central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  const centralOffset = local.length + name.length + data.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length + name.length, 12); eocd.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, name, data, central, name, eocd]);
}

const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
export function buildPreviewUpdateCommand(reason) {
  requireValue(typeof reason === 'string' && reason.trim().length > 0, 'Release reason is required.');
  return ['npx', 'eas-cli@16.17.4', 'update', '--channel', 'preview', '--platform', 'android', '--message', reason, '--non-interactive', '--json'];
}

export async function runPreviewOtaDryRun({ fixture, workflow, manifest, policy, eas }) {
  const dispatch = fixture.dispatch;
  requireValue(/^[a-f0-9]{40}$/.test(dispatch.sha), 'Dry-run source SHA is invalid.');
  validateStaticDeliveryInputs({
    variant: 'preview', sha: dispatch.sha, runtime: dispatch.runtime, packageName: dispatch.package,
    channel: dispatch.channel, profile: dispatch.profile, apiBaseUrl: dispatch.apiBaseUrl,
    confirmation: dispatch.confirmation, action: 'update', releaseReason: dispatch.releaseReason,
    baselineBuildId: fixture.provenance.baselineBuildId, policy, eas,
  });

  requireValue(manifest.easBuildId === fixture.provenance.baselineBuildId, 'Reviewed manifest lookup failed.');
  const transportAudit = { fixture: 'sanitized-real-baseline', workflowRunId: fixture.provenance.baselineWorkflowRunId };
  const archive = zipAudit(transportAudit);
  let storageAuthorized = false;
  const fetchImpl = async (url, options = {}) => {
    if (String(url).startsWith('https://api.github.com/')) {
      requireValue(options.headers?.Authorization === 'Bearer dry-run-token', 'GitHub API authorization is missing.');
      return new Response(null, { status: 302, headers: { location: 'https://signed-artifacts.example.invalid/evidence.zip' } });
    }
    storageAuthorized = Boolean(options.headers?.Authorization);
    return new Response(archive, { status: 200, headers: { 'content-type': 'application/zip', 'content-length': String(archive.length) } });
  };
  const downloaded = await downloadArtifactArchive('https://api.github.com/repos/Zentric-Analytics/Kurioticket.com/actions/artifacts/8877213375/zip', 'dry-run-token', fetchImpl);
  requireValue(!storageAuthorized, 'GitHub authorization leaked to signed artifact storage.');
  const transportDigest = `sha256:${createHash('sha256').update(downloaded).digest('hex')}`;
  requireValue(transportDigest === fixture.artifactTransport.expectedDigest, 'Downloaded dry-run artifact digest does not match its reviewed fixture.');
  const directory = mkdtempSync(resolve(tmpdir(), 'preview-ota-dry-run-'));
  try {
    const auditPath = extractReviewedAudit(downloaded, directory);
    requireValue(JSON.parse(readFileSync(auditPath, 'utf8')).fixture === transportAudit.fixture, 'ZIP extraction fixture mismatch.');
  } finally { rmSync(directory, { recursive: true, force: true }); }

  const baseline = verifyBaseline({ manifest, build: fixture.build, variant: 'preview', policy, workflowRun: fixture.workflowRun, artifact: fixture.artifact, audit: fixture.audit });
  requireValue(baseline.nativeFingerprint === fixture.currentFingerprint, 'Current fingerprint does not match the approved baseline.');
  const classifier = classifyRelease({
    files: fixture.changedFiles, baselineFingerprint: baseline.nativeFingerprint, currentFingerprint: fixture.currentFingerprint,
    expectedRuntime: policy.preview.runtimeVersion, actualRuntime: dispatch.runtime,
    expectedChannel: policy.preview.channel, actualChannel: dispatch.channel,
  });
  requireValue(classifier.classification === 'ota-compatible', `Dry-run classification blocked publication: ${classifier.reason}`);
  const channel = verifyChannelMapping({ document: fixture.channelResponse, expectedChannel: 'preview', expectedBranch: 'preview' });

  requireValue(fixture.staging.health?.data?.available === true && fixture.staging.health?.data?.environment === 'staging', 'Staging health fixture failed.');
  requireValue(fixture.staging.config?.data?.environment === 'staging' && fixture.staging.config?.data?.features?.flights === true, 'Staging config fixture failed.');
  requireValue(fixture.staging.config?.data?.features?.externalCheckout === false, 'External checkout is not disabled.');
  requireValue(fixture.staging.provider?.mode === 'staging' && fixture.staging.provider?.duffelMode === 'test' && fixture.staging.provider?.sandboxProvidersAllowed === true, 'Duffel sandbox attestation failed.');
  requireValue(fixture.staging.email?.policyRestricted === true, 'Staging email restriction attestation failed.');

  const updateCommand = buildPreviewUpdateCommand(dispatch.releaseReason);
  requireValue(!updateCommand.includes('build') && !updateCommand.includes('submit'), 'Dry-run command crossed into build or submission.');
  requireValue(!/eas-cli@16\.17\.4 build:view[^\n]*--non-interactive/.test(workflow), 'Unsupported build:view option returned.');
  requireValue(!/\bnpx\s+eas-cli@\S+\s+(?:build|submit)(?:\s|$)/im.test(workflow), 'Preview OTA workflow contains a build or Play submission command.');
  requireValue(/release-classification\.json" \|\| \{[\s\S]*exit "\$status"/.test(workflow), 'Classifier failure propagation is not fail-closed.');
  requireValue(/if: always\(\)[\s\S]*write-release-audit\.mjs[\s\S]*if: always\(\)[\s\S]*actions\/upload-artifact@/.test(workflow), 'Audit generation or upload is not preserved on failure.');

  const auditDirectory = mkdtempSync(resolve(tmpdir(), 'preview-ota-audit-dry-run-'));
  let releaseAudit;
  try {
    const evidence = { baseline, channel, fingerprint: { hash: fixture.currentFingerprint }, classifier };
    for (const [name, value] of Object.entries(evidence)) writeFileSync(resolve(auditDirectory, `${name}.json`), `${JSON.stringify(value)}\n`);
    releaseAudit = buildReleaseAudit({
      WORKFLOW_RUN_ID: 'dry-run', WORKFLOW_HEAD_SHA: dispatch.sha, RELEASE_ACTOR: 'dry-run', RELEASE_ENVIRONMENT: 'preview', RELEASE_ACTION: 'update',
      RELEASE_REASON: dispatch.releaseReason, RELEASE_COMMIT: dispatch.sha, RELEASE_PACKAGE: dispatch.package, RELEASE_PROFILE: dispatch.profile,
      RELEASE_RUNTIME: dispatch.runtime, RELEASE_CHANNEL: dispatch.channel, BASELINE_EAS_BUILD_ID: fixture.provenance.baselineBuildId,
      BASELINE_EVIDENCE_PATH: resolve(auditDirectory, 'baseline.json'), CHANNEL_EVIDENCE_PATH: resolve(auditDirectory, 'channel.json'),
      CURRENT_FINGERPRINT_PATH: resolve(auditDirectory, 'fingerprint.json'), CLASSIFIER_PATH: resolve(auditDirectory, 'classifier.json'),
      WORKFLOW_STARTED_AT: fixture.provenance.capturedAt, FINAL_STATUS: 'dry-run',
    }, fixture.provenance.capturedAt);
    requireValue(releaseAudit.commit === dispatch.sha && releaseAudit.classifier?.classification === 'ota-compatible', 'Audit manifest generation failed.');
  } finally { rmSync(auditDirectory, { recursive: true, force: true }); }

  return {
    status: 'publication-boundary-reached', published: false, sourceSha: dispatch.sha,
    stages: [
      'workflow-input-validation', 'exact-dev-sha-validation', 'baseline-eas-lookup', 'reviewed-manifest-lookup',
      'github-artifact-download', 'redirect-handling', 'digest-verification', 'zip-safety-validation',
      'composite-source-attestation', 'baseline-fingerprint-lookup', 'current-fingerprint-generation',
      'ota-native-classification', 'fail-closed-classifier-termination', 'live-channel-json-parsing',
      'preview-mapping-validation', 'staging-health-config-validation', 'duffel-sandbox-validation',
      'checkout-disabled-validation', 'email-restriction-validation', 'update-command-construction',
      'build-play-command-absence', 'failure-propagation', 'audit-manifest-generation', 'audit-artifact-upload-configuration',
    ].map((stage) => ({ stage, status: 'passed' })),
    baseline: { ...baseline, artifactDigest: fixture.artifact.digest },
    artifactTransport: { redirect: 'https-only', authorizationForwarded: false, digest: transportDigest, zipValidated: true },
    classifier, channel, staging: fixture.staging, updateCommand,
    audit: { generationConfigured: true, uploadConfigured: true, manifest: releaseAudit }, historicalFailuresCovered: fixture.historicalFailures,
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { policy, eas, root } = loadReleaseFiles();
  const fixture = JSON.parse(readFileSync(resolve(root, 'scripts/fixtures/preview-ota-dry-run.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(resolve(root, 'release-baselines/android/preview.json'), 'utf8'));
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  console.log(JSON.stringify(await runPreviewOtaDryRun({ fixture, workflow, manifest, policy, eas }), null, 2));
}
