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

test('required Preview validation always concludes and gates automatic OTA after a successful dev push', () => {
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
  assert.match(workflow, /uses: \.\/\.github\/workflows\/android-preview-ota\.yml/);
  assert.match(workflow, /target_sha: \$\{\{ github\.sha \}\}/);
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
test('Preview OTA and native build are separate manual-only approval paths', () => {
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
  const redirected = async (body, contentType = 'application/zip') => {
    let call = 0;
    return downloadArtifactArchive('https://api.github.com/archive', 'secret', async () => (++call === 1
      ? response(null, { status: 302, headers: { location: 'https://signed.example.test/archive.zip' } })
      : response(body, { headers: { 'content-type': contentType } })));
  };
  await assert.rejects(() => redirected(Buffer.alloc(0)), /empty/);
  await assert.rejects(() => redirected('not zip', 'text/html'), /content type/);
  await assert.rejects(() => redirected('not zip'), /not a ZIP/);
});
test('reviewed artifact digest is verified before safe extraction', async () => {
  const archive = testZip('{"workflowRunId":"123"}');
  const digest = `sha256:${createHash('sha256').update(archive).digest('hex')}`;
  const manifest = { schemaVersion: 2, sourceAttestation: { type: 'github-actions-build', repository: 'Zentric-Analytics/Kurioticket.com', workflowRunId: '123', artifactId: 456, artifactDigest: digest } };
  const directory = mkdtempSync(resolve(tmpdir(), 'kurioticket-attestation-'));
  let request = 0;
  const fetchImpl = async () => {
    request += 1;
    if (request === 1) return response(JSON.stringify({ id: 123 }), { headers: { 'content-type': 'application/json' } });
    if (request === 2) return response(JSON.stringify({ id: 456, digest, expired: false }), { headers: { 'content-type': 'application/json' } });
    if (request === 3) return response(null, { status: 302, headers: { location: 'https://signed.example.test/archive.zip' } });
    return response(archive, { headers: { 'content-type': 'application/zip' } });
  };
  try {
    const result = await fetchGithubBuildAttestation({ manifest, token: 'secret', outputDirectory: directory, fetchImpl });
    assert.equal(result.digest, digest);
    assert.deepEqual(JSON.parse(readFileSync(resolve(directory, 'audit/release-audit.json'), 'utf8')), { workflowRunId: '123' });
  } finally { rmSync(directory, { recursive: true, force: true }); }

  const badManifest = { ...manifest, sourceAttestation: { ...manifest.sourceAttestation, artifactDigest: `sha256:${'0'.repeat(64)}` } };
  request = 0;
  await assert.rejects(() => fetchGithubBuildAttestation({ manifest: badManifest, token: 'secret', outputDirectory: directory, fetchImpl }), /digest mismatch/);
});
test('corrupted, traversal, symlink, unexpected, and oversized ZIP content is rejected', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'kurioticket-zip-'));
  try {
    const corrupted = testZip();
    corrupted[30 + Buffer.byteLength('release-audit.json')] ^= 0xff;
    assert.throws(() => extractReviewedAudit(corrupted, directory), /integrity/);
    assert.throws(() => extractReviewedAudit(testZip('{}', '../release-audit.json'), directory), /unsafe path/);
    assert.throws(() => extractReviewedAudit(testZip('{}', 'release-audit.json', { externalAttributes: (0o120777 << 16) >>> 0 }), directory), /symbolic link/);
    assert.throws(() => extractReviewedAudit(testZip('{}', 'other.json'), directory), /unexpected or unsafe path/);
    const duplicate = testZip();
    duplicate.writeUInt16LE(2, duplicate.length - 14);
    duplicate.writeUInt16LE(2, duplicate.length - 12);
    assert.throws(() => extractReviewedAudit(duplicate, directory), /unexpected or duplicate/);
    assert.throws(() => extractReviewedAudit(testZip(`{"value":"${'x'.repeat(1024 * 1024)}"}`), directory), /size limit/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('artifact verification remains ordered before fingerprint, channel, and publication with no fail-open path', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  const download = workflow.indexOf('fetch-github-build-attestation.mjs');
  const composite = workflow.indexOf('verify-release-evidence.mjs --kind baseline');
  const fingerprint = workflow.indexOf('fingerprint fingerprint:generate');
  const channel = workflow.indexOf('channel:view preview');
  const publication = workflow.indexOf('update --channel preview');
  assert.ok(download >= 0 && download < composite && composite < fingerprint && fingerprint < channel && channel < publication);
  assert.doesNotMatch(workflow.slice(download, publication), /continue-on-error|if:\s*always\(\)/);
  assert.doesNotMatch(workflow, /\bunzip\b/);
});
test('Preview OTA native classification becomes a neutral build-required result before channel lookup', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  const classifier = workflow.indexOf('node scripts/classify-release.mjs');
  const failure = workflow.indexOf('PREVIEW BUILD REQUIRED');
  const channel = workflow.indexOf('channel:view preview');
  const publication = workflow.indexOf('update --channel preview');
  assert.ok(classifier >= 0 && classifier < failure && failure < channel && channel < publication);
  assert.match(workflow.slice(classifier, channel), /classifier_status=\$\?[\s\S]*decision=NATIVE_BUILD_REQUIRED/);
  assert.match(workflow, /fingerprint:generate[^\n]*\|\| \{[^\n]*exit 1/);
  assert.match(workflow.slice(channel, publication), /steps\.classify\.outputs\.decision == 'OTA_SAFE'/);
  assert.doesNotMatch(workflow.slice(classifier, channel), /\|\s*tee|continue-on-error/);
});
test('sanitized end-to-end Preview OTA dry run reaches but never crosses publication boundary', async () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  const fixture = JSON.parse(readFileSync(resolve(root, 'scripts/fixtures/preview-ota-dry-run.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(resolve(root, 'release-baselines/android/preview.json'), 'utf8'));
  const result = await runPreviewOtaDryRun({ fixture, workflow, manifest, policy, eas });
  assert.equal(result.status, 'publication-boundary-reached');
  assert.equal(result.published, false);
  assert.equal(result.stages.length, 24);
  assert.ok(result.stages.every(({ status }) => status === 'passed'));
  assert.equal(result.baseline.sourceVerification, 'github-actions-composite');
  assert.equal(result.artifactTransport.authorizationForwarded, false);
  assert.equal(result.artifactTransport.zipValidated, true);
  assert.equal(result.classifier.classification, 'ota-compatible');
  assert.deepEqual(result.channel.branches, ['preview']);
  assert.equal(result.staging.config.data.features.externalCheckout, false);
  assert.deepEqual(result.updateCommand, buildPreviewUpdateCommand(fixture.dispatch.releaseReason));
  assert.equal(result.historicalFailuresCovered.length, 7);
  assert.equal(fixture.failedRun.classifier.classification, 'native-build-required');
  assert.equal(fixture.failedRun.channelError, 'Channel name mismatch.');
  assert.equal(fixture.failedRun.publication, 'skipped');
});
test('Preview update command construction is fixed to Preview Android and rejects empty reasons', () => {
  const command = buildPreviewUpdateCommand('approved dry run');
  assert.deepEqual(command.slice(0, 7), ['npx', 'eas-cli@16.17.4', 'update', '--channel', 'preview', '--platform', 'android']);
  assert.ok(command.includes('--non-interactive'));
  assert.ok(command.includes('--json'));
  assert.ok(!command.includes('production') && !command.includes('build') && !command.includes('submit'));
  assert.throws(() => buildPreviewUpdateCommand('   '), /reason/);
});
test('future Preview builds preserve exact checkout and do not suppress EAS VCS metadata', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-build.yml'), 'utf8');
  assert.match(workflow, /actions\/checkout[^\n]*[\s\S]*ref: "\$\{\{ inputs\.commit_sha \}\}"/);
  assert.doesNotMatch(workflow, /EAS_NO_VCS|--no-vcs/);
  assert.match(workflow, /test "\$ACTUAL_SHA" = "\$APPROVED_SHA"/);
  assert.match(workflow, /test "\$GITHUB_SHA" = "\$APPROVED_SHA"/);
  assert.match(workflow, /WORKFLOW_HEAD_SHA: "\$\{\{ env\.CHECKED_OUT_SHA \}\}"/);
});
test('Production build preserves exact main checkout and normal EAS VCS metadata', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  assert.match(workflow, /actions\/checkout[^\n]*[\s\S]*ref: "\$\{\{ inputs\.commit_sha \}\}"/);
  assert.doesNotMatch(workflow, /EAS_NO_VCS|--no-vcs/);
  assert.match(workflow, /test "\$ACTUAL_SHA" = "\$APPROVED_SHA"/);
  assert.match(workflow, /test "\$WORKFLOW_SHA" = "\$APPROVED_SHA"/);
  assert.match(workflow, /WORKFLOW_HEAD_SHA: "\$\{\{ env\.CHECKED_OUT_SHA \}\}"/);
});
test('Production baseline lookup uses the supported build:view command', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  assert.match(workflow, /build:view "\$BASELINE_EAS_BUILD_ID" --json > /);
  assert.doesNotMatch(workflow, /build:view[^\n]*--non-interactive/);
  assert.match(workflow, /channel:view production --json --non-interactive/);
  assert.match(workflow, /update --channel production[^\n]*--non-interactive --json/);
});
test('channel mapping is exact and unambiguous', () => {
  const fixture = (overrides = {}) => ({
    currentPage: {
      id: 'channel-preview',
      isPaused: false,
      name: 'preview',
      branchMapping: JSON.stringify({ data: [{ branchId: 'branch-preview', branchMappingLogic: 'true' }], version: 0 }),
      updateBranches: [{ id: 'branch-preview', name: 'preview', updateGroups: [] }],
      ...overrides,
    },
  });
  assert.deepEqual(verifyChannelMapping({ document: fixture(), expectedChannel: 'preview', expectedBranch: 'preview' }).branches, ['preview']);
  assert.throws(() => verifyChannelMapping({ document: fixture({ name: 'production' }), expectedChannel: 'preview', expectedBranch: 'preview' }), /name mismatch/);
  assert.throws(() => verifyChannelMapping({ document: fixture({ updateBranches: [{ id: 'branch-preview', name: 'production' }] }), expectedChannel: 'preview', expectedBranch: 'preview' }), /unexpected branch/);
  assert.throws(() => verifyChannelMapping({ document: fixture({ updateBranches: [{ id: 'branch-preview', name: 'preview' }, { id: 'other', name: 'other' }] }), expectedChannel: 'preview', expectedBranch: 'preview' }), /ambiguous/);
  assert.throws(() => verifyChannelMapping({ document: fixture({ branchMapping: JSON.stringify({ data: [{ branchId: 'branch-preview', branchMappingLogic: 'rollout(0.5)' }], version: 0 }) }), expectedChannel: 'preview', expectedBranch: 'preview' }), /rollout/);
  assert.throws(() => verifyChannelMapping({ document: fixture({ isPaused: true }), expectedChannel: 'preview', expectedBranch: 'preview' }), /paused/);
  assert.throws(() => verifyChannelMapping({ document: { name: 'preview', updateBranches: [{ name: 'preview' }] }, expectedChannel: 'preview', expectedBranch: 'preview' }), /Unsupported/);
});
test('Google Play versionCode must be exceeded and absent record is explicit', () => {
  const evidence = { schemaVersion: 2, package: 'com.kurioticket.app', verifiedAt: new Date().toISOString(), evidenceReference: 'approved-audit' };
  const absent = { ...evidence, recordStatus: 'absent', playApplicationRecord: 'absent', uploadedBundles: [], highestUploadedVersionCode: null };
  assert.equal(verifyPlayVersion({ currentRemoteVersionCode: 4, history: absent }).playRecordStatus, 'absent');
  assert.throws(() => verifyPlayVersion({ currentRemoteVersionCode: 4, history: { ...evidence, recordStatus: 'present', playApplicationRecord: 'present', uploadedBundles: [5], highestUploadedVersionCode: 5 }, previousHistory: absent }), /does not exceed/);
  assert.throws(() => verifyPlayVersion({ currentRemoteVersionCode: 4, history: { ...absent, verifiedAt: '2020-01-01T00:00:00Z' } }), /stale/);
});
const productionHistory = (overrides = {}) => ({
  schemaVersion: 2,
  package: 'com.kurioticket.app',
  recordStatus: 'absent',
  playApplicationRecord: 'absent',
  uploadedBundles: [],
  highestUploadedVersionCode: null,
  verifiedAt: '2026-08-04T08:00:00.000Z',
  evidenceReference: 'reviewed read-only Play audit',
  ...overrides,
});
const productionPresentEmptyHistory = (overrides = {}) => productionHistory({
  recordStatus: 'present',
  playApplicationRecord: 'present',
  ...overrides,
});
const productionVersionInput = (overrides = {}) => ({
  versionOutput: '{}',
  versionExitCode: 0,
  buildsOutput: '[]',
  buildsExitCode: 0,
  history: productionHistory(),
  previousHistory: null,
  packageName: policy.production.androidPackage,
  profile: 'production',
  runtime: 'production-0.3.0',
  now: new Date('2026-08-04T08:30:00.000Z'),
  ...overrides,
});
test('first Production binary proposes versionCode 1 for a present-empty Play record', () => {
  assert.deepEqual(resolveProductionVersionEvidence(productionVersionInput({
    history: productionPresentEmptyHistory(),
    previousHistory: productionHistory(),
  })), {
    currentRemoteVersionCode: null,
    proposedVersionCode: 1,
    remoteVersionStatus: 'uninitialized',
    playRecordStatus: 'present',
    highestUploadedVersionCode: null,
    uploadedVersionCodes: [],
  });
});
test('absent, present-empty, and present-with-bundles Play states validate consistently', () => {
  assert.equal(validateProductionPlayHistory(productionHistory(), new Date('2026-08-04T08:30:00.000Z')).playRecordStatus, 'absent');
  const presentEmpty = validateProductionPlayHistory(productionPresentEmptyHistory(), new Date('2026-08-04T08:30:00.000Z'));
  assert.deepEqual(presentEmpty, { playRecordStatus: 'present', highestUploadedVersionCode: null, uploadedVersionCodes: [] });
  const presentBundled = validateProductionPlayHistory(productionPresentEmptyHistory({ uploadedBundles: [3, 1, 2], highestUploadedVersionCode: 3 }), new Date('2026-08-04T08:30:00.000Z'));
  assert.deepEqual(presentBundled, { playRecordStatus: 'present', highestUploadedVersionCode: 3, uploadedVersionCodes: [1, 2, 3] });
  assert.throws(() => validateProductionPlayHistory(productionPresentEmptyHistory({ highestUploadedVersionCode: 1 }), new Date('2026-08-04T08:30:00.000Z')), /must not claim/);
});
test('configured Production counters increment and never reset below Play history', () => {
  const result = resolveProductionVersionEvidence(productionVersionInput({
    versionOutput: '{"versionCode":"7"}',
    history: productionHistory({ recordStatus: 'present', playApplicationRecord: 'present', uploadedBundles: [7, 5, 7], highestUploadedVersionCode: 7 }),
    previousHistory: productionHistory(),
  }));
  assert.equal(result.currentRemoteVersionCode, 7);
  assert.equal(result.proposedVersionCode, 8);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({
    versionOutput: '{"versionCode":"4"}',
    history: productionHistory({ recordStatus: 'present', playApplicationRecord: 'present', uploadedBundles: [5], highestUploadedVersionCode: 5 }),
    previousHistory: productionHistory(),
  })), /does not exceed/);
});
test('Production version query accepts only the pinned structured EAS schema', () => {
  assert.doesNotThrow(() => resolveProductionVersionEvidence(productionVersionInput()));
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: 'warning\n{}' })), /parse structured/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"7","warning":"x"}' })), /unsupported schema/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":7}' })), /unsupported schema/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"-1"}' })), /unsupported schema/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '' })), /empty/);
  assert.equal(resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"8"}' })).proposedVersionCode, 9);
});
test('Production Play history is internally consistent, normalized, and monotonic', () => {
  const absent = productionHistory();
  const present = productionHistory({ recordStatus: 'present', playApplicationRecord: 'present', uploadedBundles: [3, 1, 3, 2], highestUploadedVersionCode: 3 });
  const result = resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"3"}', history: present, previousHistory: absent }));
  assert.deepEqual(result.uploadedVersionCodes, [1, 2, 3]);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"3"}', history: { ...present, highestUploadedVersionCode: 2 }, previousHistory: absent })), /does not match/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"3"}', history: { ...present, highestUploadedVersionCode: 4 }, previousHistory: absent })), /does not match/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"3"}', history: { ...present, uploadedBundles: [], highestUploadedVersionCode: 3 }, previousHistory: absent })), /must not claim/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"3"}', history: { ...present, playApplicationRecord: 'absent' }, previousHistory: absent })), /unknown or malformed/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"3"}', history: { ...absent, uploadedBundles: [1] } })), /Absent/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"3"}', history: { ...present, uploadedBundles: [1, '2', 3] }, previousHistory: absent })), /malformed/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"3"}', history: present })), /previous reviewed/);
  const previous = productionHistory({ recordStatus: 'present', playApplicationRecord: 'present', uploadedBundles: [1, 2, 3, 4], highestUploadedVersionCode: 4, verifiedAt: '2026-08-01T08:00:00.000Z' });
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"4"}', history: present, previousHistory: previous })), /cannot decrease|cannot remove/);
});
test('Production first-binary handling rejects existing builds, Preview, and legacy identities', () => {
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ buildsOutput: '[{"id":"existing","platform":"ANDROID","buildProfile":"production","applicationIdentifier":"com.kurioticket.app","runtimeVersion":"production-0.3.0","project":{"id":"89f6fd88-c0d7-495a-9e2b-8301b09f407d"}}]' })), /existing build/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ buildsOutput: '[{"id":"existing","platform":"ANDROID","buildProfile":"production","runtimeVersion":"production-0.3.0","project":{"id":"89f6fd88-c0d7-495a-9e2b-8301b09f407d"}}]' })), /identity metadata/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ buildsOutput: '[{"id":"existing","platform":"ANDROID","buildProfile":"production","applicationIdentifier":"com.kurioticket.app.preview","runtimeVersion":"production-0.3.0","project":{"id":"89f6fd88-c0d7-495a-9e2b-8301b09f407d"}}]' })), /identity metadata/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ packageName: policy.preview.androidPackage, profile: 'preview', runtime: 'preview-0.3.0' })), /restricted/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ packageName: 'com.kurioticket.mobile' })), /restricted/);
});
test('Production version resolution fails closed for errors, ambiguity, and stale or mismatched Play history', () => {
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '', versionExitCode: 0 })), /empty/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: 'Authentication failed', versionExitCode: 1 })), /query failed/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ versionOutput: '{"versionCode":"4"}\n{"versionCode":"5"}' })), /parse structured/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ history: productionHistory({ verifiedAt: '2026-08-01T00:00:00Z' }) })), /stale/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ history: productionHistory({ package: 'com.kurioticket.app.preview' }) })), /package-mismatched/);
  assert.throws(() => resolveProductionVersionEvidence(productionVersionInput({ history: productionHistory({ evidenceReference: '' }) })), /stale|evidence/);
});
test('Production build freezes credentials, propagates CLI failure, and retains safe audit evidence', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  assert.match(workflow, /set -o pipefail[\s\S]*eas-cli@16\.17\.4 build --platform android --profile production --non-interactive --freeze-credentials --json \| tee/);
  assert.match(workflow, /set -o pipefail[\s\S]*eas-cli@16\.17\.4 update --channel production/);
  assert.match(workflow, /if-no-files-found:\s*warn/);
  const deliverySteps = workflow.slice(workflow.indexOf('- name: Build approved Production AAB'), workflow.indexOf('- name: Write consolidated release audit'));
  assert.doesNotMatch(deliverySteps, /continue-on-error/);
  assert.doesNotMatch(workflow, /credentials:(?:configure|sync)|generate.*keystore|--auto-submit|eas-cli@[^\n]*submit/);
  const directory = mkdtempSync(resolve(tmpdir(), 'kurioticket-production-audit-'));
  try {
    const delivery = resolve(directory, 'delivery.json');
    writeFileSync(delivery, '');
    const audit = buildReleaseAudit({ WORKFLOW_RUN_ID: 'run', RELEASE_ENVIRONMENT: 'production', RELEASE_PACKAGE: policy.production.androidPackage, RELEASE_PROFILE: 'production', RELEASE_RUNTIME: 'production-0.3.0', RELEASE_CHANNEL: 'production', BASELINE_EAS_BUILD_ID: 'NONE', DELIVERY_RESULT_PATH: delivery, FINAL_STATUS: 'failure' }, '2026-08-04T09:00:00.000Z');
    assert.equal(audit.finalStatus, 'failure');
    assert.equal(audit.deliveryResult, null);
    assert.equal(audit.evidenceStatus.deliveryResult, 'empty');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('iOS Preview TestFlight submission is manual, identity-locked, and build-free', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/ios-preview-testflight-submit.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /(?:^|\n)\s*(?:push|pull_request|schedule|workflow_run):/);
  assert.match(workflow, /environment: mobile-preview-build/);
  assert.match(workflow, /with: \{ fetch-depth: 0 \}/);
  assert.doesNotMatch(workflow, /with: \{ ref: "\$\{\{ inputs\.commit_sha \}\}"/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$WORKFLOW_SHA"/);
  assert.match(workflow, /git merge-base --is-ancestor "\$APPROVED_SHA" "\$WORKFLOW_SHA"/);
  assert.match(workflow, /com\.kurioticket\.app\.preview/);
  assert.match(workflow, /preview-0\.3\.0/);
  assert.match(workflow, /eas\.submit\?\.preview\?\.ios\?\.ascAppId === '6797447471'/);
  assert.match(workflow, /build:view "\$EAS_BUILD_ID" --json/);
  assert.doesNotMatch(workflow, /build:view[^\n]*--non-interactive/);
  const buildValidation = workflow.slice(
    workflow.indexOf('- name: Verify the exact finished iOS Preview build'),
    workflow.indexOf('- name: Submit verified IPA to App Store Connect'),
  );
  assert.match(buildValidation, /b\.project\?\.id === '89f6fd88-c0d7-495a-9e2b-8301b09f407d'/);
  assert.match(buildValidation, /b\.gitCommitHash === process\.env\.APPROVED_SHA/);
  assert.doesNotMatch(buildValidation, /applicationIdentifier/);
  assert.match(workflow, /submit --platform ios --id "\$\{\{ inputs\.eas_build_id \}\}" --profile preview --non-interactive --no-wait/);
  assert.doesNotMatch(workflow, /eas-cli@[^\n]*\sbuild\s|eas-cli@[^\n]*\supdate\s|--auto-submit|production-0\.3\.0|com\.kurioticket\.app(?!\.preview)/);
});
test('Production classifier preserves every nonzero exit through tee and blocks downstream OTA work', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  const classifierStart = workflow.indexOf('- name: Classify native versus OTA delivery');
  const channelStart = workflow.indexOf('- name: Verify live channel mapping');
  const classifierStep = workflow.slice(classifierStart, channelStart);
  assert.match(classifierStep, /set -o pipefail/);
  assert.match(classifierStep, /CLASSIFIER_PIPE_STATUS=\("\$\{PIPESTATUS\[@\]\}"\)/);
  assert.match(classifierStep, /if \[ "\$\{CLASSIFIER_PIPE_STATUS\[0\]\}" -ne 0 \]; then exit "\$\{CLASSIFIER_PIPE_STATUS\[0\]\}"; fi/);
  assert.match(classifierStep, /if \[ "\$\{CLASSIFIER_PIPE_STATUS\[1\]\}" -ne 0 \]; then exit "\$\{CLASSIFIER_PIPE_STATUS\[1\]\}"; fi/);
  assert.doesNotMatch(classifierStep, /\|\|\s*true|continue-on-error/);
  assert.ok(channelStart > classifierStart);
  assert.doesNotMatch(workflow.slice(channelStart, workflow.indexOf('- name: Write consolidated release audit')), /if:\s*always\(\)/);
  assert.match(workflow, /- name: Write consolidated release audit\s+if: always\(\)/);
  assert.match(workflow, /- name: Preserve non-secret release evidence\s+if: always\(\)/);
});
test('Production delivery is manual-only, main-only, and requires the reviewed Play-history file', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /(?:^|\n)\s*(?:push|pull_request|schedule):/);
  assert.doesNotMatch(workflow, /source_kind:|options:\s*\[tag|mobile-prod-v/);
  assert.match(workflow, /validate-delivery-inputs\.mjs production[^\n]* main /);
  assert.match(workflow, /test -f release-baselines\/android\/production-play-history\.json/);
  assert.match(workflow, /resolve-production-play-history-lineage\.mjs/);
  assert.doesNotMatch(workflow, /\$APPROVED_SHA\^:\$HISTORY_PATH/);
  assert.doesNotMatch(workflow, /inputs\.(?:play_history|previous_play_history)|APPROVED_(?:PLAY|HISTORY)/i);
  const history = JSON.parse(readFileSync(resolve(root, 'release-baselines/android/production-play-history.json'), 'utf8'));
  assert.equal(history.schemaVersion, 2);
  assert.equal(history.package, policy.production.androidPackage);
  assert.equal(history.recordStatus, 'present');
  assert.equal(history.playApplicationRecord, 'present');
  assert.deepEqual(history.uploadedBundles, []);
  assert.equal(history.highestUploadedVersionCode, null);
  assert.ok(Date.parse(history.verifiedAt));
  assert.ok(history.evidenceReference.includes('9106799153088925304'));
});
test('Production EAS fixtures enforce finished AAB identity and source attestation', () => {
  const fixture = readFileSync(resolve(root, 'scripts/fixtures/production-eas/build-finished.json'), 'utf8');
  const submission = JSON.parse(fixture); delete submission[0].applicationIdentifier;
  const aabEvidence = JSON.stringify({ verified: true, signed: true, package: 'com.kurioticket.app', versionName: '0.3.0', versionCode: 1, forbiddenIdentityFound: false });
  const verify = (overrides = {}) => verifyProductionBuildResult({ source: JSON.stringify(submission), historySource: fixture, aabEvidenceSource: aabEvidence, approvedSha: 'd97d8e01245a1b77c77d3499d02d5f355b885025', proposedVersionCode: 1, remoteVersionStatus: 'configured', ...overrides });
  const verified = verify();
  assert.equal(verified.status, 'FINISHED');
  assert.equal(verified.artifactType, 'AAB');
  assert.equal(verified.aabInspected, true);
  const mutate = (callback) => { const value = JSON.parse(fixture); callback(value[0]); return JSON.stringify(value); };
  const initialized = verify({ historySource: mutate((build) => { build.appBuildVersion = '2'; }), aabEvidenceSource: JSON.stringify({ ...JSON.parse(aabEvidence), versionCode: 2 }), remoteVersionStatus: 'uninitialized' });
  assert.equal(initialized.versionCode, 2);
  assert.throws(() => verify({ source: '' }), /empty/);
  assert.throws(() => verify({ source: '{' }), /malformed/);
  assert.throws(() => verify({ historySource: '[]' }), /exactly one/);
  assert.throws(() => verify({ historySource: JSON.stringify([JSON.parse(fixture)[0], JSON.parse(fixture)[0]]) }), /exactly one/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.status = 'ERRORED'; }) }), /not FINISHED/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.status = 'CANCELED'; }) }), /not FINISHED/);
  assert.throws(() => verify({ historySource: mutate((build) => { delete build.artifacts; }) }), /AAB/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.artifacts.applicationArchiveUrl = 'https://example.test/application.apk'; }) }), /AAB/);
  assert.throws(() => verify({ historySource: mutate((build) => { delete build.applicationIdentifier; }) }), /package/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.applicationIdentifier = 'com.kurioticket.app.preview'; }) }), /package/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.distribution = 'INTERNAL'; }) }), /distribution/);
  assert.throws(() => verify({ historySource: mutate((build) => { delete build.gitCommitHash; }) }), /Git commit/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.gitCommitHash = 'a'.repeat(40); }) }), /Git commit/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.appBuildVersion = '2'; }) }), /versionCode/);
  assert.throws(() => verify({ aabEvidenceSource: JSON.stringify({ ...JSON.parse(aabEvidence), package: 'com.kurioticket.app.preview' }) }), /AAB package/);
});
test('Production AAB inspection requires exact package, version, signature, and isolation', () => {
  const manifest = '<manifest xmlns:android="http://schemas.android.com/apk/res/android" android:versionCode="2" android:versionName="0.3.0" package="com.kurioticket.app">';
  const input = { manifest, validation: 'App Bundle information', signing: 'jar verified.', contents: 'https://kurioticket.com' };
  assert.deepEqual(verifyProductionAab(input), { verified: true, signed: true, package: 'com.kurioticket.app', versionName: '0.3.0', versionCode: 2, forbiddenIdentityFound: false });
  assert.throws(() => verifyProductionAab({ ...input, manifest: manifest.replace('com.kurioticket.app', 'com.kurioticket.app.preview') }), /package/);
  assert.throws(() => verifyProductionAab({ ...input, manifest: manifest.replace('versionCode="2"', 'versionCode="3"').replace('versionName="0.3.0"', 'versionName="0.4.0"') }), /version/);
  assert.throws(() => verifyProductionAab({ ...input, signing: 'unsigned' }), /signature/);
  assert.throws(() => verifyProductionAab({ ...input, contents: 'https://staging.kurioticket.com' }), /forbidden/);
});
test('Production update JSON is strictly bound to Android Production runtime and source', () => {
  const fixture = readFileSync(resolve(root, 'scripts/fixtures/production-eas/update-published.json'), 'utf8');
  const sha = 'd97d8e01245a1b77c77d3499d02d5f355b885025';
  assert.equal(verifyProductionUpdateResult({ source: fixture, approvedSha: sha }).status, 'PUBLISHED');
  const value = JSON.parse(fixture); value[0].platform = 'IOS';
  assert.throws(() => verifyProductionUpdateResult({ source: JSON.stringify(value), approvedSha: sha }), /platform/);
});
test('Production non-mutating dry run verifies the frozen submission boundary', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  const credential = JSON.parse(readFileSync(resolve(root, 'release-baselines/android/production-credential.json'), 'utf8'));
  const result = validateProductionDryRun({ approvedSha: 'd97d8e01245a1b77c77d3499d02d5f355b885025', headSha: 'd97d8e01245a1b77c77d3499d02d5f355b885025', mainContainsSha: true, versionEvidence: { proposedVersionCode: 1, remoteVersionStatus: 'uninitialized', playRecordStatus: 'present', uploadedVersionCodes: [] }, credential, workflow, policy, eas });
  assert.equal(result.status, 'READY_TO_SUBMIT_PRODUCTION_BUILD');
  assert.equal(result.submissionPerformed, false);
  assert.throws(() => validateProductionDryRun({ approvedSha: result.approvedSha, headSha: result.approvedSha, mainContainsSha: true, versionEvidence: { proposedVersionCode: 1, remoteVersionStatus: 'uninitialized', playRecordStatus: 'present', uploadedVersionCodes: [] }, credential: { ...credential, package: 'com.kurioticket.app.preview' }, workflow, policy, eas }), /credential/);
});
test('Production workflow separates structured stdout, validates results, and never auto-submits', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  assert.match(workflow, /build:version:get --platform android --profile production --json --non-interactive > "\$RUNNER_TEMP\/production-version\.json" 2> "\$RUNNER_TEMP\/production-version\.stderr"/);
  assert.match(workflow, /verify-production-eas-result\.mjs --kind build/);
  assert.match(workflow, /build:list --platform android --build-profile production --app-identifier com\.kurioticket\.app --app-version 0\.3\.0 --app-build-version "\$EXPECTED_BUILT_VERSION" --runtime-version production-0\.3\.0 --channel production --git-commit-hash "\$CHECKED_OUT_SHA" --status finished --limit 2 --json --non-interactive/);
  assert.match(workflow, /bundletool-all-1\.18\.3\.jar/);
  assert.match(workflow, /a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29/);
  assert.match(workflow, /verify-production-aab\.mjs/);
  assert.match(workflow, /verify-production-eas-result\.mjs --kind update/);
  assert.doesNotMatch(workflow, /--auto-submit|eas-cli@[^\n]*submit/);
  assert.match(workflow, /options: \[build, update, dry-run\]/);
});
function lineageGit({ approved, main = approved, parents, histories }) {
  return (args, { allowFailure = false } = {}) => {
    if (args[0] === 'merge-base') return { status: approved === main ? 0 : 1, stdout: '', stderr: '' };
    if (args[0] === 'show' && args[1] === '-s') return { status: 0, stdout: `${(parents[args[3]] ?? []).join(' ')}\n`, stderr: '' };
    if (args[0] === 'show') {
      const commit = args[1].split(':', 1)[0];
      const raw = histories[commit];
      if (raw === undefined) return { status: allowFailure ? 1 : 1, stdout: '', stderr: 'missing' };
      return { status: 0, stdout: `${typeof raw === 'string' ? raw : JSON.stringify(raw)}\n`, stderr: '' };
    }
    throw new Error(`Unexpected git call: ${args.join(' ')}`);
  };
}
test('Production Play history resolves the reviewed second-parent release lineage', () => {
  const absent = { schemaVersion: 2, package: 'com.kurioticket.app', recordStatus: 'absent', playApplicationRecord: 'absent', uploadedBundles: [], highestUploadedVersionCode: null, verifiedAt: '2026-08-03T19:00:00Z', evidenceReference: 'reviewed absent state' };
  const present = { ...absent, recordStatus: 'present', playApplicationRecord: 'present', verifiedAt: '2026-08-04T19:00:00Z', evidenceReference: 'reviewed present-empty state' };
  const merge = 'a'.repeat(40); const mainParent = 'b'.repeat(40); const releaseParent = 'c'.repeat(40); const prior = 'd'.repeat(40);
  const result = resolveTrustedPreviousPlayHistory({ approvedSha: merge, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: lineageGit({ approved: merge, parents: { [merge]: [mainParent, releaseParent], [releaseParent]: [prior] }, histories: { [merge]: present, [mainParent]: absent, [releaseParent]: present, [prior]: absent } }) });
  assert.equal(result.sourceType, 'convergent-merge');
  assert.deepEqual(result.previousCommits, [prior]);
  const evidence = resolveProductionVersionEvidence({ versionOutput: '{}', versionExitCode: 0, buildsOutput: '[]', buildsExitCode: 0, history: present, previousHistory: JSON.parse(result.previousRaw), packageName: 'com.kurioticket.app', profile: 'production', runtime: 'production-0.3.0', now: new Date('2026-08-04T19:30:00Z') });
  assert.equal(evidence.proposedVersionCode, 1);
});
test('Production Play history supports ordinary single-parent main commits', () => {
  const prior = { schemaVersion: 2, package: 'com.kurioticket.app', recordStatus: 'absent', playApplicationRecord: 'absent', uploadedBundles: [], highestUploadedVersionCode: null, verifiedAt: '2026-08-03T19:00:00Z', evidenceReference: 'prior state' };
  const current = { ...prior, recordStatus: 'present', playApplicationRecord: 'present', verifiedAt: '2026-08-04T19:00:00Z', evidenceReference: 'current state' };
  const approved = 'a'.repeat(40); const parent = 'b'.repeat(40);
  const result = resolveTrustedPreviousPlayHistory({ approvedSha: approved, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: lineageGit({ approved, parents: { [approved]: [parent] }, histories: { [approved]: current, [parent]: prior } }) });
  assert.equal(result.previousCommit, parent);
  assert.equal(result.sourceType, 'single-parent');
});
test('Production Play lineage accepts duplicate current manifests only when every parent converges', () => {
  const absent = { schemaVersion: 2, package: 'com.kurioticket.app', recordStatus: 'absent', playApplicationRecord: 'absent', uploadedBundles: [], highestUploadedVersionCode: null, verifiedAt: '2026-08-03T19:00:00Z', evidenceReference: 'reviewed absent state' };
  const present = { ...absent, recordStatus: 'present', playApplicationRecord: 'present', verifiedAt: '2026-08-04T19:00:00Z', evidenceReference: 'reviewed present-empty state' };
  const merge = 'a'.repeat(40); const left = 'b'.repeat(40); const right = 'c'.repeat(40); const leftPrior = 'd'.repeat(40); const rightPrior = 'e'.repeat(40);
  const result = resolveTrustedPreviousPlayHistory({ approvedSha: merge, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: lineageGit({ approved: merge, parents: { [merge]: [left, right], [left]: [leftPrior], [right]: [rightPrior] }, histories: { [merge]: present, [left]: present, [right]: present, [leftPrior]: absent, [rightPrior]: absent } }) });
  assert.equal(result.sourceType, 'convergent-merge');
  assert.deepEqual(result.previousCommits, [leftPrior, rightPrior].sort());
});
test('Production Play lineage fails closed for divergent, malformed, missing, wrong-package, or untrusted paths', () => {
  const present = { schemaVersion: 2, package: 'com.kurioticket.app', recordStatus: 'present', playApplicationRecord: 'present', uploadedBundles: [], highestUploadedVersionCode: null, verifiedAt: '2026-08-04T19:00:00Z', evidenceReference: 'reviewed state' };
  const absent = { ...present, recordStatus: 'absent', playApplicationRecord: 'absent', verifiedAt: '2026-08-03T19:00:00Z' };
  const bundled = { ...present, uploadedBundles: [1], highestUploadedVersionCode: 1, evidenceReference: 'reviewed bundled state' };
  const merge = 'a'.repeat(40); const left = 'b'.repeat(40); const right = 'c'.repeat(40); const leftPrior = 'd'.repeat(40); const rightPrior = 'e'.repeat(40);
  const parents = { [merge]: [left, right], [left]: [leftPrior], [right]: [rightPrior] };
  assert.throws(() => resolveTrustedPreviousPlayHistory({ approvedSha: merge, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: lineageGit({ approved: merge, parents, histories: { [merge]: present, [left]: present, [right]: present, [leftPrior]: absent, [rightPrior]: bundled } }) }), /conflicting/);
  assert.throws(() => resolveTrustedPreviousPlayHistory({ approvedSha: merge, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: lineageGit({ approved: merge, parents, histories: { [merge]: present, [left]: present, [right]: present, [leftPrior]: absent, [rightPrior]: '{bad' } }) }), /malformed/);
  assert.throws(() => resolveTrustedPreviousPlayHistory({ approvedSha: merge, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: lineageGit({ approved: merge, parents, histories: { [merge]: present, [left]: present, [right]: present, [leftPrior]: absent } }) }), /missing/);
  assert.throws(() => resolveTrustedPreviousPlayHistory({ approvedSha: merge, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: lineageGit({ approved: merge, parents, histories: { [merge]: { ...present, package: 'com.kurioticket.app.preview' } } }) }), /package-mismatched/);
  assert.throws(() => resolveTrustedPreviousPlayHistory({ approvedSha: merge, historyPath: 'dispatcher/history.json', git: lineageGit({ approved: merge, parents, histories: {} }) }), /repository-owned/);
});
test('first Preview binary proposes versionCode 1 only with exact uninitialized state and no builds', () => {
  const result = resolvePreviewVersionEvidence({ versionOutput: 'No remote versions are configured for this project.\n', versionExitCode: 0, buildsOutput: '[]', buildsExitCode: 0, packageName: policy.preview.androidPackage, profile: 'preview', runtime: 'preview-0.3.0' });
  assert.deepEqual(result, { currentRemoteVersionCode: null, proposedVersionCode: 1, remoteVersionStatus: 'uninitialized', playRecordStatus: 'not-applicable-preview' });
});
test('configured Preview versionCode increments and is never reset to 1', () => {
  const result = resolvePreviewVersionEvidence({ versionOutput: 'Android versionCode - 7', versionExitCode: 0, buildsOutput: '[]', buildsExitCode: 0, packageName: policy.preview.androidPackage, profile: 'preview', runtime: 'preview-0.3.0' });
  assert.equal(result.currentRemoteVersionCode, 7);
  assert.equal(result.proposedVersionCode, 8);
});
test('initialized remote Preview state remains authoritative after a failed attempt', () => {
  const result = resolvePreviewVersionEvidence({ versionOutput: 'Android versionCode - 2', versionExitCode: 0, buildsOutput: '[]', buildsExitCode: 0, packageName: policy.preview.androidPackage, profile: 'preview', runtime: 'preview-0.3.0' });
  assert.equal(result.currentRemoteVersionCode, 2);
  assert.equal(result.proposedVersionCode, 3);
  assert.equal(result.remoteVersionStatus, 'configured');
});
test('Preview version resolution fails closed for malformed, empty, failed, or ambiguous output', () => {
  const base = { versionOutput: 'not a version response', versionExitCode: 0, buildsOutput: '[]', buildsExitCode: 0, packageName: policy.preview.androidPackage, profile: 'preview', runtime: 'preview-0.3.0' };
  assert.throws(() => resolvePreviewVersionEvidence(base), /Unrecognized/);
  assert.throws(() => resolvePreviewVersionEvidence({ ...base, versionOutput: '' }), /empty/);
  assert.throws(() => resolvePreviewVersionEvidence({ ...base, versionOutput: 'Authentication failed', versionExitCode: 1 }), /query failed/);
  assert.throws(() => resolvePreviewVersionEvidence({ ...base, versionOutput: 'versionCode: 4\nversionCode: 5' }), /conflicting/);
});
test('first-binary handling rejects Production, legacy package, and prior Preview builds', () => {
  const base = { versionOutput: 'No remote versions are configured for this project.', versionExitCode: 0, buildsOutput: '[]', buildsExitCode: 0, packageName: policy.preview.androidPackage, profile: 'preview', runtime: 'preview-0.3.0' };
  assert.throws(() => resolvePreviewVersionEvidence({ ...base, packageName: policy.production.androidPackage, profile: 'production', runtime: 'production-0.3.0' }), /restricted/);
  assert.throws(() => resolvePreviewVersionEvidence({ ...base, packageName: 'com.kurioticket.mobile' }), /restricted/);
  assert.throws(() => resolvePreviewVersionEvidence({ ...base, buildsOutput: '[{"id":"existing"}]' }), /existing build/);
});
test('input policy rejects whitespace reason, abbreviated SHA, bad actions, legacy and false baselines', () => {
  assert.throws(() => validateStaticDeliveryInputs(valid('preview', { releaseReason: '   ' })), /reason/);
  assert.throws(() => validateStaticDeliveryInputs(valid('preview', { sha: 'abc123' })), /40-character/);
  assert.throws(() => validateStaticDeliveryInputs(valid('preview', { action: 'submit' })), /Unsupported/);
  assert.throws(() => validateStaticDeliveryInputs(valid('preview', { packageName: 'com.kurioticket.mobile' })), /Package mismatch|Legacy/);
  assert.throws(() => validateStaticDeliveryInputs(valid('preview', { runtime: '0.2.0' })), /Runtime mismatch|Legacy/);
  assert.throws(() => validateStaticDeliveryInputs(valid('preview', { action: 'update', baselineBuildId: 'not-a-build' })), /approved EAS build ID/);
});
test('Preview and Production inputs cannot cross', () => {
  assert.throws(() => validateStaticDeliveryInputs(valid('preview', { runtime: policy.production.runtimeVersion })), /Runtime/);
  assert.throws(() => validateStaticDeliveryInputs(valid('production', { channel: 'preview' })), /Channel/);
});
test('Production accepts only protected main and rejects tags or dev', () => {
  assert.doesNotThrow(() => validateSourcePolicy({ variant: 'production', refType: 'main', isReachableFromApprovedBranch: true }));
  assert.throws(() => validateSourcePolicy({ variant: 'production', refType: 'tag', isReachableFromApprovedBranch: true }), /tags are disabled/);
  assert.throws(() => validateSourcePolicy({ variant: 'production', refType: 'dev', isReachableFromApprovedBranch: true }), /protected main/);
});
test('Production rejects a commit not reachable from main', () => {
  assert.throws(() => validateSourcePolicy({ variant: 'production', refType: 'main', isReachableFromApprovedBranch: false }), /not reachable from main/);
});
test('uncertain or native-sensitive classification requires a build', () => {
  const common = { expectedRuntime: 'preview-0.3.0', actualRuntime: 'preview-0.3.0', expectedChannel: 'preview', actualChannel: 'preview' };
  assert.equal(classifyRelease({ files: ['apps/mobile/src/a.ts'], baselineFingerprint: '', currentFingerprint: '', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/app.config.ts'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/android/app/src/main/AndroidManifest.xml'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/ios/Kurioticket/Info.plist'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/release-baselines/android/preview.json'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'ota-compatible');
  assert.equal(classifyRelease({ files: ['apps/mobile/release-baselines/android/binary-manifest.example.json'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'ota-compatible');
  assert.equal(classifyRelease({ files: ['apps/mobile/src/a.ts'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'ota-compatible');
});
test('automatic Preview target comes only from a non-forced dev push in the canonical repository', () => {
  const targetSha = 'a'.repeat(40);
  const event = { ref: 'refs/heads/dev', before: 'b'.repeat(40), after: targetSha, forced: false, deleted: false, repository: { full_name: 'Zentric-Analytics/Kurioticket.com' } };
  assert.deepEqual(resolveTrustedPreviewTarget({ mode: 'automatic', event, targetSha }), { triggerType: 'validated-dev-push', targetSha, baselineRef: 'b'.repeat(40) });
  assert.throws(() => resolveTrustedPreviewTarget({ mode: 'automatic', event: { ...event, ref: 'refs/heads/main' }, targetSha }), /dev push/);
  assert.throws(() => resolveTrustedPreviewTarget({ mode: 'automatic', event: { ...event, ref: 'refs/heads/feature' }, targetSha }), /dev push/);
  assert.throws(() => resolveTrustedPreviewTarget({ mode: 'automatic', event: { ...event, after: 'c'.repeat(40) }, targetSha }), /trusted push metadata/);
  assert.throws(() => resolveTrustedPreviewTarget({ mode: 'automatic', event: { ...event, forced: true }, targetSha }), /force-pushed/);
  assert.throws(() => resolveTrustedPreviewTarget({ mode: 'automatic', event, targetSha, repository: 'fork/Kurioticket.com' }), /repository mismatch/);
});
test('manual Preview retry cannot weaken automatic target or identity constants', () => {
  const targetSha = 'a'.repeat(40);
  assert.deepEqual(resolveTrustedPreviewTarget({ mode: 'manual', event: {}, targetSha }), { triggerType: 'manual-break-glass', targetSha, baselineRef: null });
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  assert.match(workflow, /workflow_call:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /expected_(?:package|channel|runtime)|baseline_eas_build_id:/);
  assert.match(workflow, /BASELINE_EAS_BUILD_ID.*preview\.json/);
  assert.match(workflow, /git merge-base --is-ancestor "\$BASE" "\$PREVIEW_TARGET_SHA"/);
});
function previewUpdatePage(entries = []) {
  return { name: 'preview', id: 'preview-branch-id', currentPage: entries };
}

function previewUpdate({ sha = 'a'.repeat(40), runtimeVersion = 'preview-0.3.0', platforms = 'android', branch = 'preview', message, group = 'update-group-id' } = {}) {
  return {
    branch,
    runtimeVersion,
    platforms,
    group,
    message: message ?? `"Automated safe Preview OTA for ${sha}; audit run 123" (Aug 4, 2026 by CI)`,
  };
}

test('duplicate Preview SHA is detected only for the exact Android Preview runtime and branch', () => {
  const targetSha = 'a'.repeat(40);
  const exact = normalizePreviewUpdatePage(previewUpdatePage([previewUpdate({ sha: targetSha })]));
  assert.equal(inspectPreviewUpdateHistory(exact, targetSha).alreadyPublished, true);
  assert.equal(inspectPreviewUpdateHistory(normalizePreviewUpdatePage(previewUpdatePage([])), targetSha).historyState, 'empty');
  assert.equal(inspectPreviewUpdateHistory(normalizePreviewUpdatePage(previewUpdatePage([previewUpdate({ sha: 'b'.repeat(40) })])), targetSha).alreadyPublished, false);
  assert.equal(inspectPreviewUpdateHistory(normalizePreviewUpdatePage(previewUpdatePage([previewUpdate({ sha: targetSha, platforms: 'ios' })])), targetSha).alreadyPublished, false);
  assert.equal(inspectPreviewUpdateHistory(normalizePreviewUpdatePage(previewUpdatePage([previewUpdate({ sha: targetSha, runtimeVersion: 'production-0.3.0' })])), targetSha).alreadyPublished, false);
  assert.equal(inspectPreviewUpdateHistory(normalizePreviewUpdatePage(previewUpdatePage([previewUpdate({ sha: targetSha, branch: 'production' })])), targetSha).alreadyPublished, false);
  assert.throws(() => normalizePreviewUpdatePage({ ...previewUpdatePage([previewUpdate({ sha: targetSha })]), name: 'production' }), /branch mismatch/);
  assert.throws(() => inspectPreviewUpdateHistory(normalizePreviewUpdatePage(previewUpdatePage([previewUpdate({ message: `Automated safe Preview OTA for ${targetSha}` })])), targetSha), /message is malformed/);
  assert.throws(() => inspectPreviewUpdateHistory('not-json-shape', targetSha), /malformed/);
});

test('mixed valid Preview history ignores unrelated entries and detects only the exact Android duplicate', () => {
  const targetSha = 'a'.repeat(40);
  const history = normalizePreviewUpdatePage(previewUpdatePage([
    previewUpdate({ sha: targetSha, runtimeVersion: 'preview-0.2.0' }),
    previewUpdate({ sha: targetSha, platforms: 'ios' }),
    previewUpdate({ sha: 'b'.repeat(40) }),
    previewUpdate({ sha: targetSha, branch: 'production' }),
  ]));
  assert.equal(inspectPreviewUpdateHistory(history, targetSha).alreadyPublished, false);
  history.push(...normalizePreviewUpdatePage(previewUpdatePage([previewUpdate({ sha: targetSha })])));
  assert.equal(inspectPreviewUpdateHistory(history, targetSha).alreadyPublished, true);
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
test('automatic Preview workflow is Android-only and structurally isolated from Production delivery', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  assert.match(workflow, /environment: mobile-preview-ota/);
  assert.match(workflow, /update --channel preview --platform android/);
  assert.match(workflow, /runtimeVersion!=='preview-0\.3\.0'/);
  assert.match(workflow, /android\.package!=='com\.kurioticket\.app\.preview'/);
  assert.match(workflow, /apiBaseUrl!=='https:\/\/staging\.kurioticket\.com'/);
  assert.doesNotMatch(workflow, /mobile-production|com\.kurioticket\.mobile|production-0\.3\.0|--channel production|eas-cli@[^\n]* (?:build|submit)(?:\s|$)|--auto-submit|google play/i);
  const production = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  assert.doesNotMatch(production, /workflow_call|(?:^|\n)\s*push:/);
});
test('automatic Preview publication remains ordered and every failed gate blocks update', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  const baseline = workflow.indexOf('Resolve approved binary baseline');
  const replay = workflow.indexOf('Prevent duplicate publication');
  const classifier = workflow.indexOf('Classify complete baseline-to-target range');
  const channel = workflow.indexOf('Verify live Preview channel mapping');
  const staging = workflow.indexOf('Wait for exact staging deployment and safety');
  const publish = workflow.indexOf('Publish one verified Android Preview OTA');
  assert.ok(baseline >= 0 && baseline < replay && replay < classifier && classifier < channel && channel < staging && staging < publish);
  assert.match(workflow, /update:list --branch preview --limit 50 --offset "\$offset" --json --non-interactive/);
  assert.doesNotMatch(workflow, /update:list[^\n]*(?:--platform|--runtime-version)/);
  const replayStep = workflow.slice(replay, classifier);
  assert.match(replayStep, /lookup_status=\$\?/);
  assert.match(replayStep, /diagnose-replay-failure/);
  assert.match(replayStep, /exit "\$lookup_status"/);
  assert.doesNotMatch(replayStep, /\|\|\s*true|continue-on-error/);
  assert.match(workflow, /group: android-preview-ota\n\s+cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /group: android-preview-ota-\$\{\{/);
  assert.match(workflow, /set -euo pipefail[\s\S]*update --channel preview[\s\S]*\| tee/);
  assert.doesNotMatch(workflow.slice(0, publish), /continue-on-error/);
  assert.match(workflow.slice(channel, publish), /steps\.replay\.outputs\.already_published != 'true' && steps\.classify\.outputs\.decision == 'OTA_SAFE'/);
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
