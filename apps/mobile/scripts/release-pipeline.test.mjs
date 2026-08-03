import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { classifyRelease } from './classify-release.mjs';
import { validateSourcePolicy, validateStaticDeliveryInputs } from './delivery-policy.mjs';
import { assertReleasePolicy, loadReleaseFiles } from './release-policy.mjs';
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
  for (const name of ['android-preview-delivery.yml', 'android-production-delivery.yml']) {
    const workflow = readFileSync(resolve(root, '../../.github/workflows', name), 'utf8');
    assert.doesNotMatch(workflow, /baseline_(?:sha|fingerprint)|current_fingerprint/);
    assert.match(workflow, /baseline_eas_build_id/);
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
test('uncertain or native-sensitive classification requires a build', () => {
  const common = { expectedRuntime: 'preview-0.3.0', actualRuntime: 'preview-0.3.0', expectedChannel: 'preview', actualChannel: 'preview' };
  assert.equal(classifyRelease({ files: ['apps/mobile/src/a.ts'], baselineFingerprint: '', currentFingerprint: '', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/app.config.ts'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/src/a.ts'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'ota-compatible');
});
test('EXPO_TOKEN is step scoped and updates publish through channels', () => {
  for (const name of ['android-preview-delivery.yml', 'android-production-delivery.yml']) {
    const workflow = readFileSync(resolve(root, '../../.github/workflows', name), 'utf8');
    assert.match(workflow, /EXPO_TOKEN: "\$\{\{ secrets\.EXPO_TOKEN \}\}"/);
    assert.match(workflow, /test -n "\$EXPO_TOKEN"/);
    assert.match(workflow, /eas-cli@16\.17\.4 update --channel/);
    assert.doesNotMatch(workflow, /update --branch/);
  }
});
