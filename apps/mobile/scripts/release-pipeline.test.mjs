import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { classifyRelease } from './classify-release.mjs';
import { validateSourcePolicy, validateStaticDeliveryInputs } from './delivery-policy.mjs';
import { assertReleasePolicy, loadReleaseFiles } from './release-policy.mjs';
import { resolvePreviewVersionEvidence } from './resolve-preview-version-code.mjs';
import { verifyBaseline, verifyChannelMapping, verifyPlayVersion } from './verify-release-evidence.mjs';

const { policy, eas, root } = loadReleaseFiles();
const valid = (variant = 'preview', overrides = {}) => ({ variant, sha: 'a'.repeat(40), runtime: policy[variant].runtimeVersion, packageName: policy[variant].androidPackage, channel: policy[variant].channel, profile: policy[variant].profile, apiBaseUrl: policy[variant].apiBaseUrl, confirmation: variant === 'preview' ? 'DELIVER ANDROID PREVIEW' : 'DELIVER ANDROID PRODUCTION', action: 'build', releaseReason: 'approved release', baselineBuildId: 'NONE', policy, eas, ...overrides });

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
    if (name !== 'android-preview-build.yml') assert.match(workflow, /baseline_eas_build_id/);
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
  for (const name of ['android-preview-ota.yml', 'android-preview-build.yml']) {
    const workflow = readFileSync(resolve(root, '../../.github/workflows', name), 'utf8');
    assert.match(workflow, /body\.data\?\.environment !== 'staging'/);
    assert.doesNotMatch(workflow, /body\.environment !== 'staging'/);
  }
});
test('Preview build verifies first-binary history for the exact package and profile', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-build.yml'), 'utf8');
  assert.match(workflow, /build:list --platform android --build-profile preview --app-identifier com\.kurioticket\.app\.preview --limit 1 --json --non-interactive/);
  assert.match(workflow, /resolve-preview-version-code\.mjs/);
  assert.doesNotMatch(workflow, /build:list[^\n]*(?:production|com\.kurioticket\.mobile)/);
});
test('delivery workflows require their protected environment token without repository fallback syntax', () => {
  const names = ['android-preview-ota.yml', 'android-preview-build.yml', 'android-production-delivery.yml'];
  for (const name of names) {
    const workflow = readFileSync(resolve(root, '../../.github/workflows', name), 'utf8');
    assert.match(workflow, /environment:\s*mobile-(?:preview-ota|preview-build|production)/);
    assert.match(workflow, /EXPO_TOKEN: "\$\{\{ secrets\.EXPO_TOKEN \}\}"/);
    assert.doesNotMatch(workflow, /vars\.EXPO_TOKEN|EXPO_TOKEN\s*\|\||github\.token/);
  }
});
test('approved EAS build and protected manifest must match', () => {
  const manifest = { schemaVersion: 1, environment: 'preview', easBuildId: 'id', commitSha: 'b'.repeat(40), package: policy.preview.androidPackage, profile: 'preview', platform: 'ANDROID', runtime: 'preview-0.3.0', channel: 'preview', nativeFingerprint: 'f'.repeat(64) };
  const build = { id: 'id', gitCommitHash: 'b'.repeat(40), applicationIdentifier: policy.preview.androidPackage, buildProfile: 'preview', platform: 'ANDROID', runtimeVersion: 'preview-0.3.0', channel: 'preview', status: 'FINISHED' };
  assert.equal(verifyBaseline({ manifest, build, variant: 'preview', policy }).verified, true);
  assert.throws(() => verifyBaseline({ manifest, build: { ...build, channel: 'production' }, variant: 'preview', policy }), /channel/);
});
test('channel mapping is exact and unambiguous', () => {
  assert.deepEqual(verifyChannelMapping({ document: { name: 'preview', updateBranches: [{ name: 'preview' }] }, expectedChannel: 'preview', expectedBranch: 'preview' }).branches, ['preview']);
  assert.throws(() => verifyChannelMapping({ document: { name: 'preview', updateBranches: [{ name: 'production' }] }, expectedChannel: 'preview', expectedBranch: 'preview' }), /mapping/);
  assert.throws(() => verifyChannelMapping({ document: { name: 'preview', updateBranches: [{ name: 'preview' }, { name: 'other' }] }, expectedChannel: 'preview', expectedBranch: 'preview' }), /ambiguous/);
});
test('Google Play versionCode must be exceeded and absent record is explicit', () => {
  const evidence = { schemaVersion: 1, package: 'com.kurioticket.app', verifiedAt: new Date().toISOString(), evidenceReference: 'approved-audit' };
  assert.equal(verifyPlayVersion({ currentRemoteVersionCode: 4, history: { ...evidence, recordStatus: 'absent' } }).playRecordStatus, 'absent');
  assert.throws(() => verifyPlayVersion({ currentRemoteVersionCode: 4, history: { ...evidence, recordStatus: 'present', highestUploadedVersionCode: 5 } }), /does not exceed/);
  assert.throws(() => verifyPlayVersion({ currentRemoteVersionCode: 4, history: { ...evidence, verifiedAt: '2020-01-01T00:00:00Z', recordStatus: 'absent' } }), /current reviewed audit/);
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
test('mutable or unsigned Production tags fail closed', () => {
  const base = { variant: 'production', isReachableFromApprovedBranch: false, refType: 'tag', isDispatchRefTag: true, tagResolvesToSha: true, tagName: 'mobile-prod-v0.3.0', tagObjectType: 'tag', tagSignatureValid: true };
  assert.doesNotThrow(() => validateSourcePolicy(base));
  assert.throws(() => validateSourcePolicy({ ...base, tagName: 'latest' }), /immutable signed/);
  assert.throws(() => validateSourcePolicy({ ...base, tagSignatureValid: false }), /immutable signed/);
});
test('Production rejects a commit not reachable from main', () => {
  assert.throws(() => validateSourcePolicy({ variant: 'production', refType: 'main', isReachableFromApprovedBranch: false }), /not reachable from main/);
});
test('uncertain or native-sensitive classification requires a build', () => {
  const common = { expectedRuntime: 'preview-0.3.0', actualRuntime: 'preview-0.3.0', expectedChannel: 'preview', actualChannel: 'preview' };
  assert.equal(classifyRelease({ files: ['apps/mobile/src/a.ts'], baselineFingerprint: '', currentFingerprint: '', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/app.config.ts'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/src/a.ts'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'ota-compatible');
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
