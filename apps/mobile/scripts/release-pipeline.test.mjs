import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
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
import { verifyProductionIpa } from './verify-production-ipa.mjs';
import { verifyBaseline, verifyChannelMapping, verifyPlayVersion } from './verify-release-evidence.mjs';
import { buildReleaseAudit } from './write-release-audit.mjs';
import { classifyMobileValidationPaths, isMobileRelevantPath } from './classify-mobile-validation-paths.mjs';
import { canonicalPreviewOtaRemoteIdentity, classifyReplayLookupFailure, inspectPreviewUpdateHistory, normalizePreviewUpdatePage, resolveTrustedPreviewTarget, validateStagingReadiness, validateStagingVisualResponse, waitForStaging } from './preview-ota-automation.mjs';
import { classifyPreviewPlatform, combinePreviewDecisions, resolveLatestPreviewBaseline, selectReviewedPreviewBuild } from './preview-delivery-contract.mjs';
import { findCaseInsensitiveTypeScriptPathCollisions } from './validate-case-insensitive-paths.mjs';

const { policy, eas, root } = loadReleaseFiles();

test('web-only changes conclude without running the heavy mobile suite', () => {
  assert.deepEqual(classifyMobileValidationPaths(['src/components/search/DealsSearchForm.tsx']), {
    mobileRelevant: false,
    classification: 'not-mobile-relevant',
  });
});
test('uncertain mobile path classification fails closed to the full suite', () => {
  assert.equal(classifyMobileValidationPaths([]).mobileRelevant, true);
  assert.equal(classifyMobileValidationPaths(['../outside']).mobileRelevant, true);
  assert.equal(classifyMobileValidationPaths(['']).mobileRelevant, true);
});

test('required PR gateway always schedules exact protected contexts and classifies internally', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/pr-required-gates.yml'), 'utf8');
  assert.match(workflow, /^name: Required PR gates$/m);
  assert.match(workflow, /pull_request:\s*\n\s+branches:\s*\n\s+- dev/);
  assert.match(workflow, /types: \[opened, synchronize, reopened, ready_for_review\]/);
  assert.doesNotMatch(workflow, /^\s+paths(?:-ignore)?:/m);
  assert.match(workflow, /^\s+name: Validate mobile preview$/m);
  assert.match(workflow, /^\s+name: secret-scan$/m);
  assert.match(workflow, /Mobile validation not applicable/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read\s*\n\s+actions: read/);
  assert.match(workflow, /github\.event\.pull_request\.base\.sha/);
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
  assert.match(workflow, /classify-mobile-validation-paths\.mjs --stdin-null/);
  assert.match(workflow, /secret-scan:[\s\S]*npm run security:secrets/);
  assert.doesNotMatch(workflow, /secret-scan:[\s\S]*?\n\s+if:/);
  assert.doesNotMatch(workflow, /pull_request_target|workflow_dispatch|inputs\.(?:changed|path|mobile)/);
  assert.doesNotMatch(workflow, /continue-on-error|\beas(?:-cli@[^\s]+)?\s+(?:build|update|submit)\b/i);
});

test('security workflow preserves the required pull-request secret scan', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/security.yml'), 'utf8');
  assert.match(workflow, /^\s+pull_request:/m);
  assert.match(workflow, /^\s+push:/m);
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

test('Preview OTA durable identity uses stable platform-labelled groups', () => {
  const publication = {
    ios: [{ id: 'ios-update', group: 'ios-group', platform: 'ios' }],
    android: [{ id: 'android-update', group: 'android-group', platform: 'android' }],
  };
  const replay = {
    ios: [{ group: 'ios-group', platforms: ['ios'] }],
    android: [{ group: 'android-group', platforms: ['android'] }],
  };
  assert.equal(canonicalPreviewOtaRemoteIdentity(publication), 'ios=ios-group,android=android-group');
  assert.equal(canonicalPreviewOtaRemoteIdentity(replay), 'ios=ios-group,android=android-group');
  assert.throws(() => canonicalPreviewOtaRemoteIdentity({ ios: [{ group: 'one', platforms: ['ios'] }, { group: 'two', platforms: ['ios'] }] }), /groups conflict/);
  assert.throws(() => canonicalPreviewOtaRemoteIdentity({ ios: [{ id: 'only-an-update-id', platform: 'ios' }] }), /group is missing/);
});

test('approved matrix isolates runtimes and Android-only counters', () => {
  assert.doesNotThrow(() => assertReleasePolicy(policy, eas));
  assert.equal(policy.preview.runtimeVersion, 'preview-0.3.0');
  assert.equal(policy.production.runtimeVersion, 'production-0.3.0');
  assert.equal(policy.preview.googleIosClientId, '459496589401-gi52kj4fscgf092pasrelkth2mal0mph.apps.googleusercontent.com');
  assert.equal(policy.production.googleIosClientId, '459496589401-b4npe68m8c358rqr79edi7igvi3sauao.apps.googleusercontent.com');
  assert.notEqual(policy.preview.googleIosClientId, policy.production.googleIosClientId);
  assert.equal(eas.build.preview.autoIncrement, undefined);
  assert.equal(eas.build.preview.android.autoIncrement, true);
  assert.deepEqual(policy.production.supportedPlatforms, ['android', 'ios']);
  assert.equal(eas.build.production.ios.distribution, 'store');
  assert.equal(eas.build.production.ios.autoIncrement, true);
});

test('Production IPA verification enforces identity, version, schemes, and Preview isolation', () => {
  const plist = {
    CFBundleIdentifier: 'com.kurioticket.app',
    CFBundleDisplayName: 'Kurioticket',
    CFBundleShortVersionString: '0.3.0',
    CFBundleVersion: '1',
    ITSAppUsesNonExemptEncryption: false,
    CFBundleURLTypes: [{ CFBundleURLSchemes: ['kurioticket', 'com.googleusercontent.apps.459496589401-b4npe68m8c358rqr79edi7igvi3sauao'] }],
  };
  const provisioningProfile = {
    UUID: '6888380e-ad09-4383-9fe4-8d8924661765',
    Name: 'Kurioticket Production App Store',
    TeamIdentifier: ['N23R45R4CY'],
    Entitlements: {
      'application-identifier': 'N23R45R4CY.com.kurioticket.app',
      'com.apple.developer.team-identifier': 'N23R45R4CY',
    },
  };
  const appConfig = { name: 'Kurioticket', ios: { bundleIdentifier: 'com.kurioticket.app' }, runtimeVersion: 'production-0.3.0', extra: { environment: { apiBaseUrl: 'https://kurioticket.com', isPreview: false } } };
  const expoConfig = { EXUpdatesRuntimeVersion: 'production-0.3.0' };
  const validIpa = { plist, appConfig, expoConfig, provisioningProfile, certificateSerials: ['5D:4F:E2:35:AA:B1:68:16:14:F1:12:3D:5F:D9:C2:F7'], signerCertificateSerial: '5D:4F:E2:35:AA:B1:68:16:14:F1:12:3D:5F:D9:C2:F7' };
  assert.equal(verifyProductionIpa(validIpa).verified, true);
  for (const wrongScheme of [
    'com.googleusercontent.apps.459496589401-gi52kj4fscgf092pasrelkth2mal0mph',
    'com.googleusercontent.apps.arbitrary-valid-client',
  ]) {
    const wrong = { ...plist, CFBundleURLTypes: [{ CFBundleURLSchemes: ['kurioticket', wrongScheme] }] };
    assert.throws(() => verifyProductionIpa({ ...validIpa, plist: wrong }), /approved release identity/);
  }
  assert.throws(() => verifyProductionIpa({ ...validIpa, plist: { ...plist, CFBundleIdentifier: 'com.kurioticket.app.preview' } }), /bundle identifier/);
  assert.throws(() => verifyProductionIpa({ ...validIpa, appConfig: { ...appConfig, extra: { environment: { apiBaseUrl: 'https://staging.kurioticket.com', isPreview: true } } } }), /environment/);
  assert.throws(() => verifyProductionIpa({ ...validIpa, appConfig: { ...appConfig, runtimeVersion: 'preview-0.3.0' } }), /runtime/);
  assert.throws(() => verifyProductionIpa({ ...validIpa, expoConfig: { EXUpdatesRuntimeVersion: 'preview-0.3.0' } }), /runtime/);
  assert.throws(() => verifyProductionIpa({ ...validIpa, provisioningProfile: { ...provisioningProfile, UUID: 'wrong-profile' } }), /profile UUID/);
  assert.throws(() => verifyProductionIpa({ ...validIpa, provisioningProfile: { ...provisioningProfile, TeamIdentifier: ['WRONGTEAM'] } }), /Apple Team identity/);
  assert.throws(() => verifyProductionIpa({ ...validIpa, provisioningProfile: { ...provisioningProfile, Entitlements: { ...provisioningProfile.Entitlements, 'application-identifier': 'N23R45R4CY.com.kurioticket.app.preview' } } }), /application identifier/);
  assert.throws(() => verifyProductionIpa({ ...validIpa, certificateSerials: ['DEADBEEF'] }), /signing certificate/);
  assert.throws(() => verifyProductionIpa({ ...validIpa, signerCertificateSerial: 'DEADBEEF' }), /actual code-signing certificate/);
  assert.throws(() => verifyProductionIpa({ ...validIpa, provisioningProfile: undefined }), /profile UUID/);
});
test('Production IPA verification validates active configuration without scanning bundled policy literals', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/ios-production-delivery.yml'), 'utf8');
  const verifier = readFileSync(resolve(root, 'scripts/verify-production-ipa.mjs'), 'utf8');
  assert.doesNotMatch(workflow, /\bxargs\s+-0\s+strings\b|--contents\b/);
  assert.match(workflow, /EXConstants\.bundle\/app\.config/);
  assert.match(workflow, /--app-config\b/);
  assert.match(workflow, /--expo-config\b/);
  assert.match(workflow, /codesign --verify --deep --strict/);
  assert.doesNotMatch(workflow, /\bfind\b[^\n]*\s-maxdepth\b/);
  assert.match(workflow, /--extract-certificates="\$RUNNER_TEMP\/app-signer"/);
  assert.doesNotMatch(workflow, /--extract-certificates\s+"\$RUNNER_TEMP\/app-signer"/);
  assert.match(workflow, /--signer-certificate-serial\b/);
  assert.doesNotMatch(verifier, /contents\.includes\(|forbiddenIdentityFound/);
});

test('iOS Production EAS metadata guard tolerates only an omitted bundle identifier before authoritative IPA verification', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/ios-production-delivery.yml'), 'utf8');
  const guard = workflow.match(/IPA_URL=\$\(node -e "([^"\n]+)"\)/)?.[1];
  assert.ok(guard, 'iOS Production metadata guard is missing');
  const directory = mkdtempSync(resolve(tmpdir(), 'kurioticket-ios-eas-guard-'));
  const approvedSha = 'b'.repeat(40);
  const validBuild = {
    status: 'FINISHED',
    platform: 'IOS',
    project: { id: '89f6fd88-c0d7-495a-9e2b-8301b09f407d' },
    buildProfile: 'production',
    distribution: 'STORE',
    channel: 'production',
    runtimeVersion: 'production-0.3.0',
    appVersion: '0.3.0',
    appBuildVersion: '2',
    gitCommitHash: approvedSha,
    artifacts: { applicationArchiveUrl: 'https://example.test/production.ipa' },
  };
  const verify = (overrides = {}) => {
    writeFileSync(resolve(directory, 'build.json'), JSON.stringify({ ...validBuild, ...overrides }));
    return execFileSync(process.execPath, ['-e', guard], {
      encoding: 'utf8',
      env: { ...process.env, RUNNER_TEMP: directory, CHECKED_OUT_SHA: approvedSha },
    });
  };
  try {
    assert.equal(verify(), validBuild.artifacts.applicationArchiveUrl);
    assert.equal(verify({ applicationIdentifier: 'com.kurioticket.app' }), validBuild.artifacts.applicationArchiveUrl);
    assert.throws(() => verify({ applicationIdentifier: 'com.kurioticket.app.preview' }), /Finished build identity mismatch/);
    for (const invalid of [
      { status: 'IN_PROGRESS' }, { platform: 'ANDROID' }, { gitCommitHash: 'c'.repeat(40) },
      { project: { id: 'wrong-project' } }, { buildProfile: 'preview' }, { distribution: 'INTERNAL' },
      { channel: 'preview' }, { runtimeVersion: 'preview-0.3.0' }, { appVersion: '0.2.0' },
      { appBuildVersion: '0' }, { appBuildVersion: null },
      { artifacts: { applicationArchiveUrl: 'http://example.test/production.ipa' } },
    ]) assert.throws(() => verify(invalid));
    assert.match(workflow, /curl --fail[\s\S]*unzip -q[\s\S]*codesign --verify --deep --strict[\s\S]*verify-production-ipa\.mjs/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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
test('Preview update command construction is fixed to Preview Android and rejects empty reasons', () => {
  const command = buildPreviewUpdateCommand('approved dry run');
  assert.deepEqual(command.slice(0, 7), ['npx', 'eas-cli@16.17.4', 'update', '--channel', 'preview', '--platform', 'android']);
  assert.ok(command.includes('--non-interactive'));
  assert.ok(command.includes('--json'));
  assert.ok(!command.includes('production') && !command.includes('build') && !command.includes('submit'));
  assert.throws(() => buildPreviewUpdateCommand('   '), /reason/);
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
  assert.deepEqual(history.uploadedBundles, [2]);
  assert.equal(history.highestUploadedVersionCode, 2);
  assert.ok(Date.parse(history.verifiedAt));
  assert.ok(history.evidenceReference.includes('9106799153088925304'));
});
test('Production EAS fixtures enforce finished AAB identity and source attestation', () => {
  const fixture = readFileSync(resolve(root, 'scripts/fixtures/production-eas/build-finished.json'), 'utf8');
  const submission = JSON.parse(fixture); delete submission[0].applicationIdentifier;
  const aabEvidence = JSON.stringify({ verified: true, signed: true, package: 'com.kurioticket.app', versionName: '0.3.0', versionCode: 1, activeProductionIdentityVerified: true, activeApiOrigin: 'https://kurioticket.com', runtimeVersion: 'production-0.3.0', channel: 'production', isPreview: false, projectId: '89f6fd88-c0d7-495a-9e2b-8301b09f407d' });
  const verify = (overrides = {}) => verifyProductionBuildResult({ source: JSON.stringify(submission), historySource: fixture, aabEvidenceSource: aabEvidence, approvedSha: 'd97d8e01245a1b77c77d3499d02d5f355b885025', proposedVersionCode: 1, remoteVersionStatus: 'configured', ...overrides });
  const verified = verify();
  assert.equal(verified.status, 'FINISHED');
  assert.equal(verified.artifactType, 'AAB');
  assert.equal(verified.aabInspected, true);
  assert.equal(verified.easPackageMetadata, 'verified');
  const mutate = (callback) => { const value = JSON.parse(fixture); callback(value[0]); return JSON.stringify(value); };
  const omittedPackageHistory = mutate((build) => { delete build.applicationIdentifier; delete build.appIdentifier; });
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
  assert.equal(verify({ historySource: omittedPackageHistory }).easPackageMetadata, 'omitted');
  assert.equal(verify({ historySource: mutate((build) => { build.applicationIdentifier = null; }) }).easPackageMetadata, 'omitted');
  assert.equal(verify({ historySource: mutate((build) => { delete build.applicationIdentifier; build.appIdentifier = 'com.kurioticket.app'; }) }).easPackageMetadata, 'verified');
  for (const packageName of ['', 'com.kurioticket.app.preview', 'com.kurioticket.mobile', 'com.example.other']) {
    assert.throws(() => verify({ historySource: mutate((build) => { build.applicationIdentifier = packageName; }) }), /package metadata/);
  }
  assert.throws(() => verify({ historySource: mutate((build) => { build.appIdentifier = 'com.kurioticket.app.preview'; }) }), /package metadata/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.distribution = 'INTERNAL'; }) }), /distribution/);
  assert.throws(() => verify({ historySource: mutate((build) => { delete build.gitCommitHash; }) }), /Git commit/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.gitCommitHash = 'a'.repeat(40); }) }), /Git commit/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.appBuildVersion = '2'; }) }), /versionCode/);
  assert.throws(() => verify({ historySource: omittedPackageHistory, aabEvidenceSource: JSON.stringify({ ...JSON.parse(aabEvidence), package: 'com.kurioticket.app.preview' }) }), /AAB package/);
  assert.throws(() => verify({ historySource: omittedPackageHistory, aabEvidenceSource: JSON.stringify({ ...JSON.parse(aabEvidence), activeProductionIdentityVerified: false }) }), /active Production identity/);
  assert.throws(() => verify({ historySource: omittedPackageHistory, aabEvidenceSource: JSON.stringify({ ...JSON.parse(aabEvidence), activeApiOrigin: 'https://staging.kurioticket.com' }) }), /active Production configuration/);
  assert.throws(() => verify({ historySource: omittedPackageHistory, aabEvidenceSource: JSON.stringify({ ...JSON.parse(aabEvidence), runtimeVersion: 'preview-runtime', channel: 'preview' }) }), /active Production configuration/);
  assert.throws(() => verify({ historySource: omittedPackageHistory, aabEvidenceSource: JSON.stringify({ ...JSON.parse(aabEvidence), isPreview: true }) }), /active Production configuration/);
  assert.throws(() => verify({ aabEvidenceSource: JSON.stringify({ ...JSON.parse(aabEvidence), projectId: '00000000-0000-4000-8000-000000000000' }) }), /active Production configuration/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.project.id = '00000000-0000-4000-8000-000000000000'; delete build.applicationIdentifier; }) }), /project/);
  assert.throws(() => verify({ historySource: mutate((build) => { build.gitCommitHash = 'a'.repeat(40); delete build.applicationIdentifier; }) }), /Git commit/);
});
test('Production AAB inspection requires authoritative active Production identity', () => {
  const manifest = '<manifest xmlns:android="http://schemas.android.com/apk/res/android" android:versionCode="2" android:versionName="0.3.0" package="com.kurioticket.app">';
  const appConfig = { name: 'Kurioticket', version: '0.3.0', android: { package: 'com.kurioticket.app' }, scheme: 'kurioticket', runtimeVersion: 'production-0.3.0', extra: { eas: { projectId: '89f6fd88-c0d7-495a-9e2b-8301b09f407d' }, environment: { variant: 'production', buildMode: 'release', apiBaseUrl: 'https://kurioticket.com', channel: 'production', isPreview: false } }, updates: { url: 'https://u.expo.dev/89f6fd88-c0d7-495a-9e2b-8301b09f407d' } };
  const input = { manifest, validation: 'App Bundle information', signing: 'jar verified.', appConfigSource: JSON.stringify(appConfig) };
  assert.deepEqual(verifyProductionAab(input), { verified: true, signed: true, package: 'com.kurioticket.app', versionName: '0.3.0', versionCode: 2, activeProductionIdentityVerified: true, activeApiOrigin: 'https://kurioticket.com', runtimeVersion: 'production-0.3.0', channel: 'production', isPreview: false, projectId: '89f6fd88-c0d7-495a-9e2b-8301b09f407d' });
  assert.equal(verifyProductionAab({ ...input, javascriptBundle: 'com.kurioticket.app.preview' }).verified, true);
  assert.equal(verifyProductionAab({ ...input, javascriptBundle: 'https://staging.kurioticket.com' }).verified, true);
  assert.throws(() => verifyProductionAab({ ...input, manifest: manifest.replace('com.kurioticket.app', 'com.kurioticket.app.preview') }), /package/);
  assert.throws(() => verifyProductionAab({ ...input, manifest: manifest.replace('com.kurioticket.app', 'com.kurioticket.mobile') }), /package/);
  assert.throws(() => verifyProductionAab({ ...input, manifest: manifest.replace('versionCode="2"', 'versionCode="3"').replace('versionName="0.3.0"', 'versionName="0.4.0"') }), /version/);
  assert.throws(() => verifyProductionAab({ ...input, validation: 'invalid bundle' }), /bundletool/);
  assert.throws(() => verifyProductionAab({ ...input, signing: 'unsigned' }), /signature/);
  const withConfig = (mutate) => { const value = structuredClone(appConfig); mutate(value); return { ...input, appConfigSource: JSON.stringify(value) }; };
  assert.throws(() => verifyProductionAab(withConfig((value) => { value.android.package = 'com.kurioticket.app.preview'; })), /application identity/);
  assert.throws(() => verifyProductionAab(withConfig((value) => { value.extra.environment.apiBaseUrl = 'https://staging.kurioticket.com'; })), /Production environment/);
  assert.throws(() => verifyProductionAab(withConfig((value) => { value.extra.environment.isPreview = true; })), /Production environment/);
  assert.throws(() => verifyProductionAab(withConfig((value) => { value.runtimeVersion = 'preview-0.3.0'; })), /runtime/);
  assert.throws(() => verifyProductionAab(withConfig((value) => { value.extra.environment.channel = 'preview'; })), /Production environment/);
  assert.throws(() => verifyProductionAab({ ...input, appConfigSource: '' }), /missing or empty/);
  assert.throws(() => verifyProductionAab({ ...input, appConfigSource: '{' }), /malformed JSON/);
  assert.throws(() => verifyProductionAab(withConfig((value) => { value.extra.eas.projectId = '00000000-0000-4000-8000-000000000000'; })), /EAS project/);
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
  const approvedSha = 'd97d8e01245a1b77c77d3499d02d5f355b885025';
  const validate = (versionEvidence, credentialOverride = credential) => validateProductionDryRun({ approvedSha, headSha: approvedSha, mainContainsSha: true, versionEvidence, credential: credentialOverride, workflow, policy, eas });
  const firstBuild = { currentRemoteVersionCode: null, proposedVersionCode: 1, remoteVersionStatus: 'uninitialized', playRecordStatus: 'present', highestUploadedVersionCode: null, uploadedVersionCodes: [] };
  const initialized = { currentRemoteVersionCode: 2, proposedVersionCode: 3, remoteVersionStatus: 'configured', playRecordStatus: 'present', highestUploadedVersionCode: 2, uploadedVersionCodes: [2] };

  assert.equal(validate(firstBuild).proposedVersionCode, 1);
  const result = validate(initialized);
  assert.equal(result.status, 'READY_TO_SUBMIT_PRODUCTION_BUILD');
  assert.equal(result.proposedVersionCode, 3);
  assert.equal(result.submissionPerformed, false);
  assert.equal(validate({ currentRemoteVersionCode: 5, proposedVersionCode: 6, remoteVersionStatus: 'configured', playRecordStatus: 'present', highestUploadedVersionCode: 3, uploadedVersionCodes: [2, 3] }).proposedVersionCode, 6);

  assert.throws(() => validate({ ...initialized, proposedVersionCode: 4 }), /next EAS version/);
  assert.throws(() => validate({ ...initialized, proposedVersionCode: 2 }), /next EAS version/);
  assert.throws(() => validate({ ...initialized, highestUploadedVersionCode: 3, uploadedVersionCodes: [2, 3] }), /does not exceed reviewed Play history/);
  assert.throws(() => validate({ ...initialized, highestUploadedVersionCode: 2, uploadedVersionCodes: [2, 4] }), /internally inconsistent/);
  assert.throws(() => validate({ ...initialized, highestUploadedVersionCode: null }), /internally inconsistent/);
  assert.throws(() => validate({ ...initialized, uploadedVersionCodes: [2, '3'] }), /malformed/);
  assert.throws(() => validate({ ...initialized, currentRemoteVersionCode: null }), /configured EAS version evidence is malformed/);
  assert.throws(() => validate({ ...initialized, remoteVersionStatus: 'unknown' }), /unsupported remote state/);
  assert.throws(() => validate({ ...initialized, uploadedVersionCodes: [2, 2] }), /malformed/);
  assert.throws(() => validate(firstBuild, { ...credential, package: 'com.kurioticket.app.preview' }), /credential/);
});
test('Production workflow separates structured stdout, validates results, and never auto-submits', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/android-production-delivery.yml'), 'utf8');
  assert.match(workflow, /build:version:get --platform android --profile production --json --non-interactive > "\$RUNNER_TEMP\/production-version\.json" 2> "\$RUNNER_TEMP\/production-version\.stderr"/);
  assert.match(workflow, /verify-production-eas-result\.mjs --kind build/);
  assert.match(workflow, /build:list --platform android --build-profile production --app-identifier com\.kurioticket\.app --app-version 0\.3\.0 --app-build-version "\$EXPECTED_BUILT_VERSION" --runtime-version production-0\.3\.0 --channel production --git-commit-hash "\$CHECKED_OUT_SHA" --status finished --limit 2 --json --non-interactive/);
  assert.match(workflow, /bundletool-all-1\.18\.3\.jar/);
  assert.match(workflow, /a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29/);
  assert.match(workflow, /base\/assets\/app\.config > "\$RUNNER_TEMP\/aab-app-config\.json"/);
  assert.match(workflow, /--app-config "\$RUNNER_TEMP\/aab-app-config\.json"/);
  assert.doesNotMatch(workflow, /aab-contents\.txt|verify-production-aab\.mjs[^\n]*--contents\b/);
  assert.match(workflow, /verify-production-aab\.mjs/);
  assert.match(workflow, /verify-production-eas-result\.mjs --kind update/);
  assert.doesNotMatch(workflow, /--auto-submit|eas-cli@[^\n]*submit/);
  assert.match(workflow, /options: \[build, update, dry-run\]/);
});
function lineageGit({ approved, main = approved, parents, histories, relevantGraph, ancestral = true }) {
  return (args, { allowFailure = false } = {}) => {
    if (args[0] === 'merge-base') {
      const checkingProtectedMain = args[3] === 'refs/remotes/origin/main';
      return { status: checkingProtectedMain ? (approved === main ? 0 : 1) : (ancestral ? 0 : 1), stdout: '', stderr: '' };
    }
    if (args[0] === 'rev-list') {
      const relevantCommits = [...new Set([...Object.keys(parents), ...Object.values(parents).flat()])]
        .filter((commit) => commit !== approved);
      const lines = relevantGraph ?? relevantCommits.map((commit) => [commit, ...(parents[commit] ?? [])].join(' '));
      return { status: 0, stdout: `${lines.join('\n')}\n`, stderr: '' };
    }
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
  assert.deepEqual(result.previousCommits, [mainParent, prior].sort());
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
  assert.throws(() => resolveTrustedPreviousPlayHistory({ approvedSha: merge, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: lineageGit({ approved: merge, parents: { [merge]: [left] }, histories: { [merge]: present, [left]: absent }, ancestral: false }) }), /not ancestral/);
});
test('Production Play lineage skips more than 500 unrelated commits by querying only path-relevant history', () => {
  const prior = { schemaVersion: 2, package: 'com.kurioticket.app', recordStatus: 'absent', playApplicationRecord: 'absent', uploadedBundles: [], highestUploadedVersionCode: null, verifiedAt: '2026-08-03T19:00:00Z', evidenceReference: 'prior state' };
  const current = { ...prior, recordStatus: 'present', playApplicationRecord: 'present', verifiedAt: '2026-08-04T19:00:00Z', evidenceReference: 'current state' };
  const approved = 'a'.repeat(40); const transition = 'b'.repeat(40); const previous = 'c'.repeat(40);
  const unrelated = Array.from({ length: 1001 }, (_, index) => (index + 16).toString(16).padStart(40, '0'));
  const parents = { [approved]: [unrelated[0]], [transition]: [previous] };
  const git = lineageGit({ approved, parents, histories: { [approved]: current, [transition]: current, [previous]: prior }, relevantGraph: [`${transition} ${previous}`, previous] });
  const guardedGit = (args, options) => {
    assert.equal(args.some((argument) => unrelated.includes(argument)), false, 'unrelated commits must not be inspected individually');
    return git(args, options);
  };
  const result = resolveTrustedPreviousPlayHistory({ approvedSha: approved, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: guardedGit });
  assert.equal(result.previousCommit, previous);
});
test('Production Play lineage retains a finite bound on relevant history transitions', () => {
  const present = { schemaVersion: 2, package: 'com.kurioticket.app', recordStatus: 'present', playApplicationRecord: 'present', uploadedBundles: [], highestUploadedVersionCode: null, verifiedAt: '2026-08-04T19:00:00Z', evidenceReference: 'reviewed state' };
  const approved = 'a'.repeat(40); const parent = 'b'.repeat(40);
  const relevantGraph = Array.from({ length: 257 }, (_, index) => (index + 32).toString(16).padStart(40, '0'));
  assert.throws(() => resolveTrustedPreviousPlayHistory({ approvedSha: approved, historyPath: 'apps/mobile/release-baselines/android/production-play-history.json', git: lineageGit({ approved, parents: { [approved]: [parent] }, histories: { [approved]: present }, relevantGraph }) }), /bounded relevant-history/);
});
test('mobile TypeScript collision guard normalizes case and TypeScript module extensions', () => {
  assert.deepEqual(findCaseInsensitiveTypeScriptPathCollisions(['src/Foo.ts', 'src/foo.tsx']), [['src/Foo.ts', 'src/foo.tsx']]);
  assert.deepEqual(findCaseInsensitiveTypeScriptPathCollisions(['src/Foo.ts', 'src/foo.test.ts']), []);
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
  const html = `<aside data-staging-commit="${targetSha}">Staging build</aside>`;
  const fetchImpl = async (url) => {
    calls += 1;
    const stale = calls <= 4;
    if (url === 'https://staging.kurioticket.com/') return { ok: true, status: 200, headers: { get: () => 'no-store, max-age=0' }, text: async () => stale ? '<p>old</p>' : html };
    const body = url.endsWith('/health') ? health : config;
    return { ok: true, status: 200, json: async () => stale ? { ...body, data: { ...body.data, releaseReadiness: { ...readiness, commitSha: 'b'.repeat(40) } } } : body };
  };
  assert.equal((await waitForStaging({ origin: 'https://staging.kurioticket.com', targetSha, attempts: 2, delayMs: 0, fetchImpl, sleep: async () => {} })).attempt, 2);
});
test('staging visual probe rejects stale, cacheable, or viewport-incomplete HTML', () => {
  const targetSha = 'd'.repeat(40);
  const response = { ok: true, status: 200, headers: { get: () => 'no-store, max-age=0' } };
  const html = `<aside data-staging-commit="${targetSha}">Staging build</aside>`;
  assert.equal(validateStagingVisualResponse({ response, html, targetSha, viewport: 'desktop' }).rendered, true);
  assert.throws(() => validateStagingVisualResponse({ response: { ...response, headers: { get: () => 'public, max-age=3600' } }, html, targetSha, viewport: 'mobile' }), /cacheable/);
  assert.throws(() => validateStagingVisualResponse({ response, html: '<p>old deployment</p>', targetSha, viewport: 'desktop' }), /target SHA/);
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
