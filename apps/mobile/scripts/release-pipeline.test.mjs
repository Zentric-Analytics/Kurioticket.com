import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { classifyRelease } from './classify-release.mjs';
import { validateSourcePolicy, validateStaticDeliveryInputs } from './delivery-policy.mjs';
import { buildPreviewUpdateCommand, runPreviewOtaDryRun } from './dry-run-preview-ota.mjs';
import { downloadArtifactArchive, extractReviewedAudit, fetchGithubBuildAttestation } from './fetch-github-build-attestation.mjs';
import { assertReleasePolicy, loadReleaseFiles } from './release-policy.mjs';
import { resolvePreviewVersionEvidence } from './resolve-preview-version-code.mjs';
import { resolveProductionVersionEvidence, validateProductionPlayHistory } from './resolve-production-version-code.mjs';
import { resolveTrustedPreviousPlayHistory } from './resolve-production-play-history-lineage.mjs';
import { validateProductionDryRun } from './dry-run-production-delivery.mjs';
import { verifyProductionBuildResult, verifyProductionUpdateResult } from './verify-production-eas-result.mjs';
import { verifyProductionAab } from './verify-production-aab.mjs';
import { verifyBaseline, verifyChannelMapping, verifyPlayVersion } from './verify-release-evidence.mjs';
import { buildReleaseAudit } from './write-release-audit.mjs';
import { classifyMobileValidationPaths, isMobileRelevantPath } from './classify-mobile-validation-paths.mjs';
import { classifyReplayLookupFailure, inspectPreviewUpdateHistory, normalizePreviewUpdatePage, resolveTrustedPreviewTarget, validateStagingReadiness, waitForStaging } from './preview-ota-automation.mjs';
import { classifyPreviewPlatform, combinePreviewDecisions, resolveLatestPreviewBaseline, selectReviewedPreviewBuild } from './preview-delivery-contract.mjs';

const { policy, eas, root } = loadReleaseFiles();

test('web-only changes conclude without running the heavy mobile suite', () => {
  assert.deepEqual(classifyMobileValidationPaths(['src/components/search/DealsSearchForm.tsx']), {
    mobileRelevant: false,
    classification: 'not-mobile-relevant',
  });
});

test('mobile code, workflows, dependencies, configs, and shared imports require full validation', () => {
  for (const file of [
    'apps/mobile/src/api/travelApi.ts',
    '.github/workflows/mobile-preview-update.yml',
    '.github/workflows/android-preview-ota.yml',
    '.github/actions/mobile-helper/action.yml',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'src/lib/travel/searchContract.ts',
    'src/shared/airports.ts',
    'src/data/destinationImages.ts',
  ]) assert.equal(isMobileRelevantPath(file), true, file);
});

test('uncertain mobile path classification fails closed to the full suite', () => {
  assert.equal(classifyMobileValidationPaths([]).mobileRelevant, true);
  assert.equal(classifyMobileValidationPaths(['../outside']).mobileRelevant, true);
  assert.equal(classifyMobileValidationPaths(['']).mobileRelevant, true);
});

test('required Preview validation always concludes and gates cross-platform delivery after a successful dev push', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/mobile-preview-update.yml'), 'utf8');
  assert.match(workflow, /^name: Validate mobile preview$/m);
  assert.doesNotMatch(workflow, /^\s+paths:/m);
  assert.match(workflow, /Mobile validation not applicable/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read\s*\n\s+actions: read/);
  assert.match(workflow, /github\.event\.pull_request\.base\.sha/);
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
  assert.doesNotMatch(workflow, /pull_request_target|inputs\.(?:changed|path|mobile)/);
  assert.doesNotMatch(workflow, /continue-on-error|\beas(?:-cli@[^\s]+)?\s+(?:build|update|submit)\b/i);
  assert.match(workflow, /automatic-preview-ota:[\s\S]*needs: validate-preview/);
  assert.match(workflow, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/dev' && needs\.validate-preview\.result == 'success'/);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/preview-dev-delivery\.yml/);
  assert.match(workflow, /target_sha: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /mobile_relevant: \$\{\{ needs\.validate-preview\.outputs\.mobile_relevant == 'true' \}\}/);
});
const valid = (variant = 'preview', overrides = {}) => ({ variant, sha: 'a'.repeat(40), runtime: policy[variant].runtimeVersion, packageName: policy[variant].androidPackage, channel: policy[variant].channel, profile: policy[variant].profile, apiBaseUrl: policy[variant].apiBaseUrl, confirmation: variant === 'preview' ? 'DELIVER ANDROID PREVIEW' : 'DELIVER ANDROID PRODUCTION', action: 'build', releaseReason: 'approved release', baselineBuildId: 'NONE', policy, eas, ...overrides });

const testCrcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});
const testCrc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = testCrcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
function testZip(content = '{"ok":true}', name = 'release-audit.json', { externalAttributes = 0 } = {}) {
  const data = Buffer.from(content);
  const filename = Buffer.from(name);
  const crc = testCrc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(filename.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(0x0314, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(filename.length, 28);
  central.writeUInt32LE(externalAttributes, 38);
  const centralOffset = local.length + filename.length + data.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length + filename.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, filename, data, central, filename, eocd]);
}
const response = (body, { status = 200, headers = {} } = {}) => new Response(body, { status, headers });

test('approved matrix isolates runtimes and Android-only counters', () => {
  assert.doesNotThrow(() => assertReleasePolicy(policy, eas));
  assert.equal(policy.preview.runtimeVersion, 'preview-0.3.0');
  assert.equal(policy.production.runtimeVersion, 'production-0.3.0');
  assert.equal(eas.build.preview.autoIncrement, undefined);
  assert.equal(eas.build.preview.android.autoIncrement, true);
});
test('dispatcher has no baseline fingerprint or SHA inputs', () => {
  for (const name of ['android-preview-ota.yml', 'android-preview-build.yml', 'android-production-delivery.yml']) {
    const workflow = readFileSync(resolve(root, '../../.github/workflows', name), 'utf8');
    assert.doesNotMatch(workflow, /baseline_(?:sha|fingerprint)|current_fingerprint/);
    if (name === 'android-production-delivery.yml') assert.match(workflow, /baseline_eas_build_id/);
    if (name === 'android-preview-ota.yml') {
      assert.doesNotMatch(workflow, /^\s+baseline_eas_build_id:/m);
      assert.match(workflow, /release-baselines\/android\/preview\.json/);
    }
  }
});
test('Preview break-glass remains manual while trusted dev delivery may call native builds', () => {
  const ota = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  const build = readFileSync(resolve(root, '../../.github/workflows/android-preview-build.yml'), 'utf8');
  for (const workflow of [ota, build]) {
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /(?:^|\n)\s*(?:push|pull_request|schedule):/);
    assert.doesNotMatch(workflow, /environment:\s*mobile-production/);
    assert.doesNotMatch(workflow, /com\.kurioticket\.app(?:\s|['"]|$)/);
    assert.doesNotMatch(workflow, /production-0\.3\.0|--channel production|https:\/\/kurioticket\.com(?:\/|['"]|\s)/);
  }
  assert.match(ota, /environment:\s*mobile-preview-ota/);
  assert.match(ota, /eas-cli@16\.17\.4 update --channel preview/);
  assert.doesNotMatch(ota, /eas-cli@16\.17\.4 build --platform/);
  assert.doesNotMatch(ota, /action:\s*\{/);
  assert.match(build, /environment:\s*mobile-preview-build/);
  assert.match(build, /workflow_call:/);
  assert.match(build, /eas-cli@16\.17\.4 build --platform android --profile preview/);
  assert.doesNotMatch(build, /eas-cli@16\.17\.4 update/);
  assert.doesNotMatch(build, /action:\s*\{/);
});
test('Preview workflows validate the staging classification inside the mobile API response envelope', () => {
  const build = readFileSync(resolve(root, '../../.github/workflows/android-preview-build.yml'), 'utf8');
  const ota = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  const automation = readFileSync(resolve(root, 'scripts/preview-ota-automation.mjs'), 'utf8');
  assert.match(build, /body\.data\?\.environment !== 'staging'/);
  assert.match(ota, /preview-ota-automation\.mjs wait-staging/);
  assert.match(automation, /body\?\.data\?\.environment === "staging"/);
  assert.doesNotMatch(`${build}\n${automation}`, /body\.environment !== ['"]staging['"]/);
});
test('Preview OTA uses only supported non-interactive flags and fails closed after baseline lookup', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  const baselineLookup = 'eas-cli@16.17.4 build:view "$BASELINE_EAS_BUILD_ID" --json > "$RUNNER_TEMP/baseline-build.json"';
  const baselineIndex = workflow.indexOf(baselineLookup);
  const fingerprintIndex = workflow.indexOf('fingerprint fingerprint:generate');
  const channelIndex = workflow.indexOf('channel:view preview --json --non-interactive');
  const updateIndex = workflow.indexOf('update --channel preview --platform android');

  assert.ok(baselineIndex >= 0, 'Preview OTA must perform the approved baseline lookup');
  assert.doesNotMatch(workflow, /build:view[^\n]*--non-interactive/);
  assert.ok(baselineIndex < fingerprintIndex, 'baseline lookup must gate fingerprint verification');
  assert.ok(fingerprintIndex < channelIndex, 'fingerprint verification must gate channel verification');
  assert.ok(channelIndex < updateIndex, 'channel verification must gate publication');
  assert.doesNotMatch(workflow.slice(baselineIndex, updateIndex), /continue-on-error|if:\s*always\(\)/);

  assert.match(workflow, /channel:view preview --json --non-interactive/);
  assert.match(workflow, /update --channel preview --platform android[^\n]*--non-interactive --json/);
});
test('Preview build verifies first-binary history for the exact package and profile', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-build.yml'), 'utf8');
  assert.match(workflow, /build:list --platform android --build-profile preview --app-identifier com\.kurioticket\.app\.preview --limit 1 --json --non-interactive/);
  assert.match(workflow, /resolve-preview-version-code\.mjs/);
  assert.doesNotMatch(workflow, /build:list[^\n]*(?:production|com\.kurioticket\.mobile)/);
});
test('Preview build preserves EAS failure through tee and freezes credential mutation', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-build.yml'), 'utf8');
  assert.match(workflow, /set -o pipefail[\s\S]*eas-cli@16\.17\.4 build --platform android --profile preview --freeze-credentials --non-interactive --json \| tee/);
  assert.match(workflow, /if-no-files-found:\s*warn/);
  assert.match(workflow, /if \[ "\$AUDIT_EXIT" -ne 0 \] && \[ "\$PRIOR_JOB_STATUS" != failure \]; then exit "\$AUDIT_EXIT"; fi/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});
test('failed build submission still produces a safe audit with no empty-result parser failure', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'kurioticket-audit-'));
  try {
    const delivery = resolve(directory, 'delivery.json');
    const version = resolve(directory, 'version.json');
    writeFileSync(delivery, '');
    writeFileSync(version, JSON.stringify({ currentRemoteVersionCode: 2, proposedVersionCode: 3 }));
    const audit = buildReleaseAudit({ WORKFLOW_RUN_ID: 'run', RELEASE_ENVIRONMENT: 'preview', RELEASE_PACKAGE: policy.preview.androidPackage, RELEASE_PROFILE: 'preview', RELEASE_RUNTIME: 'preview-0.3.0', RELEASE_CHANNEL: 'preview', BASELINE_EAS_BUILD_ID: 'NONE', DELIVERY_RESULT_PATH: delivery, VERSION_EVIDENCE_PATH: version, FINAL_STATUS: 'failure' }, '2026-08-04T00:00:00.000Z');
    assert.equal(audit.finalStatus, 'failure');
    assert.equal(audit.deliveryResult, null);
    assert.equal(audit.evidenceStatus.deliveryResult, 'empty');
    assert.equal(audit.versionCode.currentRemoteVersionCode, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test('delivery workflows require their protected environment token without repository fallback syntax', () => {
  const names = ['android-preview-ota.yml', 'android-preview-build.yml', 'android-production-delivery.yml'];
  for (const name of names) {
    const workflow = readFileSync(resolve(root, '../../.github/workflows', name), 'utf8');
    assert.match(workflow, /environment:\s*mobile-(?:preview-ota|preview-build|production)/);
    assert.match(workflow, /EXPO_TOKEN: "\$\{\{ secrets\.EXPO_TOKEN \}\}"/);
    assert.doesNotMatch(workflow, /vars\.EXPO_TOKEN|EXPO_TOKEN\s*\|\||EXPO_TOKEN:\s*"?\$\{\{ github\.token/);
  }
});
const directManifest = () => ({ schemaVersion: 1, environment: 'preview', easBuildId: 'id', commitSha: 'b'.repeat(40), package: policy.preview.androidPackage, profile: 'preview', platform: 'ANDROID', runtime: 'preview-0.3.0', channel: 'preview', nativeFingerprint: 'f'.repeat(64) });
const directBuild = () => ({ id: 'id', gitCommitHash: 'b'.repeat(40), applicationIdentifier: policy.preview.androidPackage, buildProfile: 'preview', platform: 'ANDROID', runtimeVersion: 'preview-0.3.0', channel: 'preview', status: 'FINISHED' });
const composite = () => {
  const commit = 'b'.repeat(40);
  const manifest = { ...directManifest(), schemaVersion: 2, projectId: 'project', appVersion: '0.3.0', versionCode: 3, sourceAttestation: { type: 'github-actions-build', repository: 'Zentric-Analytics/Kurioticket.com', workflowRunId: '123', artifactId: 456, artifactName: 'android-preview-build-evidence-123', artifactDigest: `sha256:${'d'.repeat(64)}` } };
  const build = { ...directBuild(), gitCommitHash: null, project: { id: 'project' }, appVersion: '0.3.0', appBuildVersion: '3' };
  const workflowRun = { id: 123, name: 'Android Preview Build', path: '.github/workflows/android-preview-build.yml', repository: { full_name: 'Zentric-Analytics/Kurioticket.com' }, event: 'workflow_dispatch', head_branch: 'dev', head_sha: commit, status: 'completed', conclusion: 'success' };
  const artifact = { id: 456, name: 'android-preview-build-evidence-123', digest: manifest.sourceAttestation.artifactDigest, expired: false, workflow_run: { id: 123, head_sha: commit } };
  const audit = { schemaVersion: 1, workflowRunId: '123', commit, environment: 'preview', action: 'build', package: policy.preview.androidPackage, profile: 'preview', runtime: 'preview-0.3.0', channel: 'preview', fingerprint: { hash: manifest.nativeFingerprint }, deliveryResult: { id: 'id' }, finalStatus: 'success' };
  return { manifest, build, workflowRun, artifact, audit };
};

test('approved EAS build and protected manifest must match', () => {
  const manifest = directManifest();
  const build = directBuild();
  assert.equal(verifyBaseline({ manifest, build, variant: 'preview', policy }).verified, true);
  assert.throws(() => verifyBaseline({ manifest, build: { ...build, channel: 'production' }, variant: 'preview', policy }), /channel/);
});
test('missing EAS commit requires complete immutable composite evidence', () => {
  const evidence = composite();
  assert.equal(verifyBaseline({ ...evidence, variant: 'preview', policy }).sourceVerification, 'github-actions-composite');
  assert.throws(() => verifyBaseline({ manifest: evidence.manifest, build: evidence.build, variant: 'preview', policy }), /composite source attestation|Workflow run/);
});
test('composite baseline rejects mismatched workflow SHA, build ID, identity, and unrelated workflow', () => {
  const evidence = composite();
  assert.throws(() => verifyBaseline({ ...evidence, workflowRun: { ...evidence.workflowRun, head_sha: 'c'.repeat(40) }, variant: 'preview', policy }), /source SHA/);
  assert.throws(() => verifyBaseline({ ...evidence, build: { ...evidence.build, id: 'other' }, variant: 'preview', policy }), /EAS build ID/);
  assert.throws(() => verifyBaseline({ ...evidence, audit: { ...evidence.audit, package: 'com.kurioticket.mobile' }, variant: 'preview', policy }), /identity/);
  assert.throws(() => verifyBaseline({ ...evidence, build: { ...evidence.build, buildProfile: 'production' }, variant: 'preview', policy }), /profile/);
  assert.throws(() => verifyBaseline({ ...evidence, build: { ...evidence.build, runtimeVersion: 'production-0.3.0' }, variant: 'preview', policy }), /runtime/);
  assert.throws(() => verifyBaseline({ ...evidence, build: { ...evidence.build, channel: 'production' }, variant: 'preview', policy }), /channel/);
  assert.throws(() => verifyBaseline({ ...evidence, workflowRun: { ...evidence.workflowRun, name: 'Other workflow' }, variant: 'preview', policy }), /Unrelated/);
});
test('Preview attestation identity is repository-owned and never dispatcher supplied', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  assert.doesNotMatch(workflow, /workflow_run_id:|artifact_id:|source_sha:/);
  assert.match(workflow, /fetch-github-build-attestation\.mjs --manifest release-baselines\/android\/preview\.json/);
  assert.match(workflow, /permissions: \{ contents: read, actions: read \}/);
});
test('supported GitHub artifact redirect downloads without forwarding authorization', async () => {
  const archive = testZip();
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return response(null, { status: 302, headers: { location: 'https://signed.example.test/archive.zip' } });
    return response(archive, { headers: { 'content-type': 'application/zip', 'content-length': String(archive.length) } });
  };
  assert.deepEqual(await downloadArtifactArchive('https://api.github.com/repos/org/repo/actions/artifacts/1/zip', 'secret', fetchImpl), archive);
  assert.equal(calls[0].options.headers.Accept, 'application/vnd.github+json');
  assert.equal(calls[0].options.headers['X-GitHub-Api-Version'], '2022-11-28');
  assert.equal(calls[0].options.redirect, 'manual');
  assert.equal(calls[1].options.headers, undefined);
  assert.equal(calls[1].options.redirect, 'follow');
});
test('artifact HTTP, expiry, empty, content type, and non-ZIP failures are closed', async () => {
  for (const status of [415, 404, 410]) {
    await assert.rejects(() => downloadArtifactArchive('https://api.github.com/archive', 'secret', async () => response(null, { status })), new RegExp(String(status)));
  }
  const redirected = async (body, con…13109 tokens truncated…normalizePreviewUpdatePage(previewUpdatePage([
    previewUpdate({ sha: targetSha, runtimeVersion: 'preview-0.2.0' }),
    previewUpdate({ sha: targetSha, platforms: 'ios' }),
    previewUpdate({ sha: 'b'.repeat(40) }),
    previewUpdate({ sha: targetSha, branch: 'production' }),
  ]));
  assert.equal(inspectPreviewUpdateHistory(history, targetSha).alreadyPublished, false);
  history.push(...normalizePreviewUpdatePage(previewUpdatePage([previewUpdate({ sha: targetSha })])));
  assert.equal(inspectPreviewUpdateHistory(history, targetSha).alreadyPublished, true);
});

test('cross-platform Preview replay protection isolates Android and iOS publications', () => {
  const targetSha = 'c'.repeat(40);
  const history = normalizePreviewUpdatePage(previewUpdatePage([
    previewUpdate({ platforms: 'android', message: `"Automatic Preview Android OTA for ${targetSha}; audit run 456" (Aug 5, 2026 by CI)` }),
    previewUpdate({ platforms: 'ios', message: `"Automatic Preview iOS OTA for ${targetSha}; audit run 457" (Aug 5, 2026 by CI)` }),
  ]));
  assert.equal(inspectPreviewUpdateHistory(history, targetSha, 'android').alreadyPublished, true);
  assert.equal(inspectPreviewUpdateHistory(history, targetSha, 'ios').alreadyPublished, true);
  assert.equal(inspectPreviewUpdateHistory(history.slice(0, 1), targetSha, 'ios').alreadyPublished, false);
  assert.throws(() => inspectPreviewUpdateHistory(history, targetSha, 'web'), /platform is invalid/);
});

test('Preview replay JSON and CLI failures fail closed with safe classifications', () => {
  assert.throws(() => normalizePreviewUpdatePage([]), /page is malformed/);
  assert.throws(() => normalizePreviewUpdatePage({ name: 'preview', currentPage: 'not-an-array' }), /currentPage/);
  assert.throws(() => normalizePreviewUpdatePage(previewUpdatePage([previewUpdate({ platforms: 'web' })])), /platforms/);
  assert.throws(() => normalizePreviewUpdatePage(previewUpdatePage([{ ...previewUpdate(), runtimeVersion: '' }])), /runtime is missing/);
  assert.throws(() => normalizePreviewUpdatePage(previewUpdatePage([{ ...previewUpdate(), group: '' }])), /group is missing/);
  assert.equal(classifyReplayLookupFailure('Error: Nonexistent flag: --platform', 1), 'unsupported-command');
  assert.equal(classifyReplayLookupFailure('Authentication failed', 1), 'authentication');
  assert.equal(classifyReplayLookupFailure('HTTP 403 Forbidden', 1), 'authorization');
  assert.equal(classifyReplayLookupFailure('HTTP 503 Service unavailable', 1), 'service-or-network');
  assert.equal(classifyReplayLookupFailure('Error: update:list command failed.', 1), 'cli-failure');
});
test('staging readiness requires exact deployed SHA and every public safety gate', async () => {
  const targetSha = 'a'.repeat(40);
  const readiness = { commitSha: targetSha, sandboxTravelSafe: true, emailPolicyRestricted: true };
  const health = { data: { environment: 'staging', releaseReadiness: readiness } };
  const config = { data: { environment: 'staging', releaseReadiness: readiness, features: { externalCheckout: false } } };
  assert.equal(validateStagingReadiness({ health, config, targetSha }).ready, true);
  assert.throws(() => validateStagingReadiness({ health: { data: { ...health.data, releaseReadiness: { ...readiness, commitSha: 'b'.repeat(40) } } }, config, targetSha }), /has not deployed/);
  assert.throws(() => validateStagingReadiness({ health, config: { data: { ...config.data, features: { externalCheckout: true } } }, targetSha }), /checkout/);
  assert.throws(() => validateStagingReadiness({ health, config: { data: { ...config.data, releaseReadiness: { ...readiness, sandboxTravelSafe: false } } }, targetSha }), /travel safety/);
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    const stale = calls <= 2;
    const body = url.endsWith('/health') ? health : config;
    return { ok: true, status: 200, json: async () => stale ? { ...body, data: { ...body.data, releaseReadiness: { ...readiness, commitSha: 'b'.repeat(40) } } } : body };
  };
  assert.equal((await waitForStaging({ origin: 'https://staging.kurioticket.com', targetSha, attempts: 2, delayMs: 0, fetchImpl, sleep: async () => {} })).attempt, 2);
});
test('automatic Preview workflow is cross-platform and structurally isolated from Production delivery', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/preview-dev-delivery.yml'), 'utf8');
  assert.match(workflow, /environment: mobile-preview-ota/);
  assert.match(workflow, /update --channel preview --platform android/);
  assert.match(workflow, /update --channel preview --platform ios/);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/android-preview-build\.yml/);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/ios-preview-build\.yml/);
  assert.doesNotMatch(workflow, /mobile-production|com\.kurioticket\.mobile|production-0\.3\.0|--channel production|google play/i);
  const production = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  assert.doesNotMatch(production, /workflow_call|(?:^|\n)\s*push:/);
});
test('automatic Preview delivery orders exact staging, baselines, fingerprints, and selected actions', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/preview-dev-delivery.yml'), 'utf8').replaceAll('\r\n', '\n');
  const staging = workflow.indexOf('Wait for exact staging deployment and safety');
  const baseline = workflow.indexOf('Resolve latest finished Preview baselines');
  const fingerprint = workflow.indexOf('Generate baseline and target native fingerprints');
  const combine = workflow.indexOf('Combine platform decisions');
  const androidUpdate = workflow.indexOf('Publish exact Android Preview update');
  const iosUpdate = workflow.indexOf('Publish exact iOS Preview update');
  assert.ok(staging >= 0 && staging < baseline && baseline < fingerprint && fingerprint < combine);
  assert.ok(androidUpdate > combine && iosUpdate > combine);
  assert.match(workflow, /group: preview-dev-delivery\n\s+cancel-in-progress: true/);
  assert.match(workflow, /summary:\n\s+name: Preview visual availability\n\s+if: always\(\)/);
  assert.doesNotMatch(workflow, /Require every selected delivery action to succeed/);
  assert.match(workflow, /Preview lane issue detected/);
  assert.match(workflow, /if: needs\.evaluate\.outputs\.android == 'OTA'/);
  assert.match(workflow, /if: needs\.evaluate\.outputs\.ios == 'BUILD'/);
  assert.match(workflow, /update:list --branch preview --limit 50 --offset "\$offset" --json --non-interactive/g);
  assert.match(workflow, /build:view "\$reviewed_id" --json/);
  assert.doesNotMatch(workflow, /build:view "\$reviewed_id" --json --non-interactive/);
  assert.match(workflow, /release-baselines\/preview-builds\.json/);
  assert.match(workflow, /PREVIEW_PLATFORM: android/);
  assert.match(workflow, /PREVIEW_PLATFORM: ios/);
  assert.match(workflow, /if: steps\.replay\.outputs\.already_published != 'true'/g);
  assert.doesNotMatch(workflow, /continue-on-error/);
});
test('Preview evaluation audit includes trigger, replay, staging, classifier, and delivery evidence', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'kurioticket-preview-auto-audit-'));
  try {
    for (const [name, value] of Object.entries({ trigger: { triggerType: 'validated-dev-push' }, replay: { alreadyPublished: false }, staging: { ready: true }, classifier: { classification: 'ota-compatible' }, delivery: [{ id: 'update-id' }] })) writeFileSync(resolve(directory, `${name}.json`), JSON.stringify(value));
    const audit = buildReleaseAudit({ WORKFLOW_RUN_ID: '123', RELEASE_ENVIRONMENT: 'preview', RELEASE_COMMIT: 'a'.repeat(40), RELEASE_PACKAGE: policy.preview.androidPackage, RELEASE_PROFILE: 'preview', RELEASE_RUNTIME: 'preview-0.3.0', RELEASE_CHANNEL: 'preview', TRIGGER_EVIDENCE_PATH: resolve(directory, 'trigger.json'), REPLAY_EVIDENCE_PATH: resolve(directory, 'replay.json'), STAGING_EVIDENCE_PATH: resolve(directory, 'staging.json'), CLASSIFIER_PATH: resolve(directory, 'classifier.json'), DELIVERY_RESULT_PATH: resolve(directory, 'delivery.json'), FINAL_STATUS: 'success' });
    assert.equal(audit.trigger.triggerType, 'validated-dev-push');
    assert.equal(audit.replay.alreadyPublished, false);
    assert.equal(audit.stagingReadiness.ready, true);
    assert.equal(audit.classifier.classification, 'ota-compatible');
    assert.equal(audit.easBuildId, 'update-id');
    assert.equal(audit.publicationDecision, 'published');
    assert.equal(JSON.stringify(audit).includes('EXPO_TOKEN'), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('EXPO_TOKEN is step scoped and updates publish through channels', () => {
  for (const name of ['android-preview-ota.yml', 'android-production-delivery.yml']) {
    const workflow = readFileSync(resolve(root, '../../.github/workflows', name), 'utf8');
    assert.match(workflow, /EXPO_TOKEN: "\$\{\{ secrets\.EXPO_TOKEN \}\}"/);
    assert.match(workflow, /test -n "\$EXPO_TOKEN"/);
    assert.match(workflow, /eas-cli@16\.17\.4 update --channel/);
    assert.doesNotMatch(workflow, /update --branch/);
  }
});

function previewBuild(platform, overrides = {}) {
  const android = platform === 'android';
  return {
    id: android ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222',
    status: 'FINISHED',
    platform: android ? 'ANDROID' : 'IOS',
    project: { id: '89f6fd88-c0d7-495a-9e2b-8301b09f407d' },
    buildProfile: 'preview',
    applicationIdentifier: 'com.kurioticket.app.preview',
    runtimeVersion: 'preview-0.3.0',
    channel: 'preview',
    appVersion: '0.3.0',
    appBuildVersion: android ? '4' : '3',
    distribution: android ? 'INTERNAL' : 'STORE',
    gitCommitHash: android ? 'a'.repeat(40) : 'b'.repeat(40),
    completedAt: android ? '2026-08-05T01:00:00Z' : '2026-08-05T02:00:00Z',
    artifacts: { applicationArchiveUrl: `https://example.invalid/app.${android ? 'apk' : 'ipa'}` },
    ...overrides,
  };
}

test('Preview baselines resolve from the latest exact finished EAS build on dev ancestry', () => {
  const target = 'f'.repeat(40);
  const android = previewBuild('android');
  const ios = previewBuild('ios');
  assert.equal(resolveLatestPreviewBaseline({ builds: [android], platform: 'android', targetSha: target, isAncestor: () => true }).easBuildId, android.id);
  assert.equal(resolveLatestPreviewBaseline({ builds: [ios], platform: 'ios', targetSha: target, isAncestor: () => true }).easBuildId, ios.id);
  assert.throws(() => resolveLatestPreviewBaseline({ builds: [{ ...android, applicationIdentifier: 'com.kurioticket.app' }], platform: 'android', targetSha: target, isAncestor: () => true }), /No finished/);
  assert.throws(() => resolveLatestPreviewBaseline({ builds: [android], platform: 'android', targetSha: target, isAncestor: () => false }), /No finished/);
});

test('reusable Preview builds bind automation to the trusted target input, not the inherited event name', () => {
  for (const name of ['android-preview-build.yml', 'ios-preview-build.yml']) {
    const workflow = readFileSync(resolve(root, '../../.github/workflows', name), 'utf8');
    assert.match(workflow, /TARGET_SHA: \$\{\{ inputs\.target_sha \|\| inputs\.commit_sha \}\}/);
    assert.match(workflow, /REUSABLE_TARGET_PRESENT: \$\{\{ inputs\.target_sha != '' \}\}/);
    assert.doesNotMatch(workflow, /github\.event_name == 'workflow_call'/);
  }
});

test('Preview native build verification matches authoritative EAS build:view metadata', () => {
  for (const [name, platform, distribution] of [
    ['android-preview-build.yml', 'ANDROID', 'INTERNAL'],
    ['ios-preview-build.yml', 'IOS', 'STORE'],
  ]) {
    const workflow = readFileSync(resolve(root, '../../.github/workflows', name), 'utf8');
    const start = workflow.indexOf(platform === 'IOS' ? '- name: Verify finished iOS Preview result' : '- name: Verify finished Preview APK result');
    const end = workflow.indexOf(platform === 'IOS' ? '- name: Upload automatic iOS Preview build to TestFlight' : '- name: Write consolidated release audit', start);
    const verification = workflow.slice(start, end);
    assert.match(verification, /b\?\.id === process\.env\.BUILD_ID/);
    assert.match(verification, new RegExp(`b\\?\\.platform === '${platform}'`));
    assert.match(verification, /b\?\.project\?\.id === '89f6fd88-c0d7-495a-9e2b-8301b09f407d'/);
    assert.match(verification, /b\?\.runtimeVersion === 'preview-0\.3\.0'/);
    assert.match(verification, /b\?\.channel === 'preview'/);
    assert.match(verification, /b\?\.appVersion === '0\.3\.0'/);
    assert.match(verification, new RegExp(`b\\?\\.distribution === '${distribution}'`));
    assert.match(verification, /artifactUrl\.startsWith\('https:\/\/'\)/);
    assert.doesNotMatch(verification, /applicationIdentifier|appIdentifier/);
  }
});

test('reviewed Preview baseline registry records both finished build 4 artifacts', () => {
  const registry = JSON.parse(readFileSync(resolve(root, 'release-baselines/preview-builds.json'), 'utf8'));
  const current = registry.builds.filter((build) => build.commitSha === 'baab5b0565383ae6c9d0799f8796b3f0dd18174c');
  assert.deepEqual(current.map((build) => build.platform).sort(), ['android', 'ios']);
  for (const build of current) {
    assert.equal(build.package, 'com.kurioticket.app.preview');
    assert.equal(build.runtime, 'preview-0.3.0');
    assert.equal(build.channel, 'preview');
    assert.equal(build.profile, 'preview');
    assert.equal(build.appVersion, '0.3.0');
    assert.equal(build.buildNumber, 4);
    assert.match(build.nativeFingerprint, /^[0-9a-f]{40}$/);
  }
});

test('reviewed Preview baseline selection chooses the newest build in target ancestry', () => {
  const registry = JSON.parse(readFileSync(resolve(root, 'release-baselines/preview-builds.json'), 'utf8'));
  const targetAncestors = new Set(['baab5b0565383ae6c9d0799f8796b3f0dd18174c', '34fa29bbfe3b969051f009c59643b2b8e3680507', '6bbef26ac6a3abd4652bc7d9d974bf21b6dd315e']);
  assert.equal(selectReviewedPreviewBuild({ reviewedBuilds: registry.builds, platform: 'android', ancestors: targetAncestors }).easBuildId, 'f545df86-7e9a-44f4-964f-f9e7ebee6743');
  assert.equal(selectReviewedPreviewBuild({ reviewedBuilds: registry.builds, platform: 'ios', ancestors: targetAncestors }).easBuildId, '5664863d-0831-4fae-82b4-3279cf70d1e4');

  const conflicting = [...registry.builds, { ...registry.builds.find((entry) => entry.platform === 'android' && entry.buildNumber === 4), easBuildId: 'conflicting-build' }];
  assert.throws(() => selectReviewedPreviewBuild({ reviewedBuilds: conflicting, platform: 'android', ancestors: targetAncestors }), /ambiguous/);
  assert.throws(() => selectReviewedPreviewBuild({ reviewedBuilds: registry.builds, platform: 'android', ancestors: new Set(['f'.repeat(40)]) }), /No reviewed/);
});

test('Preview baseline selection ignores valid unrelated history and resolves reviewed no-VCS evidence', () => {
  const target = 'f'.repeat(40);
  const reviewedCommit = 'c'.repeat(40);
  const legacy = previewBuild('android', { id: '179ae3b8-3e7a-404c-bcf0-44cbdc759cff', gitCommitHash: null, appBuildVersion: '3' });
  const unrelated = previewBuild('android', { id: '44444444-4444-4444-8444-444444444444', runtimeVersion: 'preview-0.2.0', appVersion: '0.2.0' });
  const reviewedBuilds = [{ platform: 'android', easBuildId: legacy.id, commitSha: reviewedCommit, nativeFingerprint: 'd'.repeat(40), projectId: '89f6fd88-c0d7-495a-9e2b-8301b09f407d', package: 'com.kurioticket.app.preview', profile: 'preview', runtime: 'preview-0.3.0', channel: 'preview', appVersion: '0.3.0', buildNumber: 3, distribution: 'INTERNAL' }];
  const result = resolveLatestPreviewBaseline({ builds: [unrelated, legacy], platform: 'android', targetSha: target, reviewedBuilds, isAncestor: (sha) => sha === reviewedCommit });
  assert.equal(result.easBuildId, legacy.id);
  assert.equal(result.commitSha, reviewedCommit);
  assert.throws(() => resolveLatestPreviewBaseline({ builds: [legacy], platform: 'android', targetSha: target, isAncestor: () => true }), /identity-mismatched/);
  assert.throws(() => resolveLatestPreviewBaseline({ builds: [legacy], platform: 'android', targetSha: target, reviewedBuilds: [...reviewedBuilds, ...reviewedBuilds], isAncestor: () => true }), /duplicated/);
  const sparseLegacy = { id: legacy.id, status: 'FINISHED', platform: 'ANDROID', buildProfile: 'preview', artifacts: legacy.artifacts, completedAt: legacy.completedAt };
  assert.equal(resolveLatestPreviewBaseline({ builds: [sparseLegacy], platform: 'android', targetSha: target, reviewedBuilds, isAncestor: () => true }).commitSha, reviewedCommit);
  assert.throws(() => resolveLatestPreviewBaseline({ builds: [{ ...sparseLegacy, runtimeVersion: 'production-0.3.0' }], platform: 'android', targetSha: target, reviewedBuilds, isAncestor: () => true }), /No finished/);
});

test('Preview baseline selection fails closed on ambiguous newest builds', () => {
  const build = previewBuild('android');
  assert.throws(() => resolveLatestPreviewBaseline({ builds: [build, { ...build, id: '33333333-3333-4333-8333-333333333333' }], platform: 'android', targetSha: 'f'.repeat(40), isAncestor: () => true }), /ambiguous/);
});

test('cross-platform Preview classifier produces OTA, single-platform, and dual-native outcomes', () => {
  const compatible = (platform) => classifyPreviewPlatform({ platform, files: ['apps/mobile/src/app.tsx'], baselineFingerprint: 'same', targetFingerprint: 'same' });
  const androidNative = classifyPreviewPlatform({ platform: 'android', files: ['apps/mobile/android/app/build.gradle'], baselineFingerprint: 'old', targetFingerprint: 'new' });
  const iosNative = classifyPreviewPlatform({ platform: 'ios', files: ['apps/mobile/ios/App/Info.plist'], baselineFingerprint: 'old', targetFingerprint: 'new' });
  assert.equal(combinePreviewDecisions({ mobileRelevant: false }).outcome, 'WEB_ONLY_SUCCESS');
  assert.deepEqual(combinePreviewDecisions({ mobileRelevant: true, android: compatible('android'), ios: compatible('ios') }), { outcome: 'OTA_SUCCESS', android: 'OTA', ios: 'OTA' });
  assert.deepEqual(combinePreviewDecisions({ mobileRelevant: true, android: androidNative, ios: compatible('ios') }), { outcome: 'ANDROID_NATIVE_BUILD_REQUIRED', android: 'BUILD', ios: 'OTA' });
  assert.deepEqual(combinePreviewDecisions({ mobileRelevant: true, android: compatible('android'), ios: iosNative }), { outcome: 'IOS_NATIVE_BUILD_REQUIRED', android: 'OTA', ios: 'BUILD' });
  assert.deepEqual(combinePreviewDecisions({ mobileRelevant: true, android: androidNative, ios: iosNative }), { outcome: 'BOTH_NATIVE_BUILDS_REQUIRED', android: 'BUILD', ios: 'BUILD' });
});

test('platform-specific and shared native paths fail closed without cross-platform overclassification', () => {
  const androidOnly = classifyPreviewPlatform({ platform: 'android', files: ['apps/mobile/android/app/src/main/AndroidManifest.xml'], baselineFingerprint: 'same', targetFingerprint: 'same' });
  const iosForAndroid = classifyPreviewPlatform({ platform: 'android', files: ['apps/mobile/ios/App/Info.plist'], baselineFingerprint: 'same', targetFingerprint: 'same' });
  const shared = classifyPreviewPlatform({ platform: 'ios', files: ['apps/mobile/app.config.ts'], baselineFingerprint: 'same', targetFingerprint: 'same' });
  assert.equal(androidOnly.decision, 'NATIVE_BUILD_REQUIRED');
  assert.equal(iosForAndroid.decision, 'OTA_COMPATIBLE');
  assert.equal(shared.decision, 'NATIVE_BUILD_REQUIRED');
  assert.equal(classifyPreviewPlatform({ platform: 'ios', files: ['apps/mobile/src/app.tsx'], baselineFingerprint: '', targetFingerprint: 'same' }).decision, 'INVALID');
});

