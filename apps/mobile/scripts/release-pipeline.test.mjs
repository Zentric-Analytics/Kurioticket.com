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
import { verifyBaseline, verifyChannelMapping, verifyPlayVersion } from './verify-release-evidence.mjs';
import { buildReleaseAudit } from './write-release-audit.mjs';

const { policy, eas, root } = loadReleaseFiles();
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
test('Preview OTA classification failure exits before channel lookup and publication', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-preview-ota.yml'), 'utf8');
  const classifier = workflow.indexOf('node scripts/classify-release.mjs');
  const failure = workflow.indexOf('Preview change is not OTA-compatible');
  const channel = workflow.indexOf('channel:view preview');
  const publication = workflow.indexOf('update --channel preview');
  assert.ok(classifier >= 0 && classifier < failure && failure < channel && channel < publication);
  assert.match(workflow.slice(classifier, channel), /> "\$RUNNER_TEMP\/release-classification\.json" \|\| \{[\s\S]*exit "\$status"/);
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
  assert.equal(classifyRelease({ files: ['apps/mobile/android/app/src/main/AndroidManifest.xml'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/ios/Kurioticket/Info.plist'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'native-build-required');
  assert.equal(classifyRelease({ files: ['apps/mobile/release-baselines/android/preview.json'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'ota-compatible');
  assert.equal(classifyRelease({ files: ['apps/mobile/release-baselines/android/binary-manifest.example.json'], baselineFingerprint: 'a', currentFingerprint: 'a', ...common }).classification, 'ota-compatible');
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
