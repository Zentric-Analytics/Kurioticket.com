import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { classifyChangeSet } from "./classifier.mjs";
import { PREVIEW_IDENTITY, PREVIEW_WORKER_BUILD_PATHS, assertExactSha, assertPreviewIdentity, requirePreviewEnvironment } from "./config.mjs";
import { reconcileBuilds, reconcileSubmission, reconcileSubmissionHistory } from "./eas-state.mjs";
import { PreviewOrchestrator, applyCutoverBaseline, applyIosNativeBackfill, assertCoalescedOtaCompatibility, enforceDeliveredNativeBaseline, maintainLease, nativeBuildIdentityKey, nativeDriftTargets, retry } from "./orchestrator.mjs";
import { createExactCheckoutDirectory, easCommandEnvironment, EasClient, EasRemoteObjectUnavailableError, EasUpdateRuntimeMismatchError, RenderClient, gitAuthEnvironment, prepareCheckout } from "./remote-clients.mjs";
import { redactPreflightError, runPreviewPreflight } from "./preflight.mjs";
import { AppStoreConnectClient } from "./app-store-connect.mjs";
import { PreviewLedger } from "./ledger.mjs";
import { runWorkerCycle } from "./worker-cycle.mjs";
import { fetchWithDeadline, withDeadline } from "./deadlines.mjs";
import { normalizePreviewUpdatePage } from "../../apps/mobile/scripts/preview-ota-automation.mjs";

const sha = "a".repeat(40);
const appleEnv = { APP_STORE_CONNECT_ISSUER_ID: "issuer", APP_STORE_CONNECT_KEY_ID: "key", APP_STORE_CONNECT_PRIVATE_KEY: "private-key", APP_STORE_CONNECT_PREVIEW_APP_ID: "6797447471", APP_STORE_CONNECT_PREVIEW_BETA_GROUP_ID: "group-preview" };
const repositoryRoot = resolve(import.meta.dirname, "../..");
const build = (overrides = {}) => ({ id: "build-1", status: "IN_PROGRESS", gitCommitHash: sha, project: { id: PREVIEW_IDENTITY.easProjectId }, platform: "IOS", buildProfile: "preview", appIdentifier: PREVIEW_IDENTITY.bundleIdentifier, runtimeVersion: PREVIEW_IDENTITY.runtime, channel: PREVIEW_IDENTITY.channel, ...overrides });
const appleContext = { app: { type: "apps", id: "6797447471", attributes: { bundleId: PREVIEW_IDENTITY.bundleIdentifier } }, group: { type: "betaGroups", id: "group-preview", attributes: { name: "Kurioticket Preview Internal", isInternalGroup: true } } };
const finishedApple = (overrides = {}) => ({ previewContext: async () => appleContext, resolveBuild: async () => ({ state: "VALID", build: { id: "apple-build-9", attributes: { version: "9", processingState: "VALID" } } }), isAssociated: async () => true, associate: async () => {}, ...overrides });
const applePrivateKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" });
const appleClient = (fetchImpl) => new AppStoreConnectClient({ issuerId: "issuer", keyId: "key", privateKey: applePrivateKey, appId: "6797447471", betaGroupId: "group-preview", betaGroupName: "Kurioticket Preview Internal", fetchImpl });

test("provider and cycle deadlines fail closed instead of hanging forever", async () => {
  await assert.rejects(
    () => fetchWithDeadline((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason))), "https://example.test", {}, { timeoutMs: 10, label: "test provider" }),
    /test provider exceeded 10ms/,
  );
  await assert.rejects(() => withDeadline(() => new Promise(() => {}), 10, "test cycle"), /test cycle exceeded 10ms/);
});

test("one native change plus four source advances coalesces to one build per platform", () => {
  const fingerprints = { android: "a".repeat(40), ios: "i".repeat(40) };
  const durableBuildReservations = new Set();
  const builds = { android: 0, ios: 0 };
  for (const sourceSha of ["a", "b", "c", "d", "e"].map((value) => value.repeat(40))) {
    for (const platform of ["android", "ios"]) {
      const identity = nativeBuildIdentityKey(platform, fingerprints[platform]);
      if (!durableBuildReservations.has(identity)) {
        durableBuildReservations.add(identity);
        builds[platform] += 1;
      }
      assert.ok(sourceSha); // source advancement does not participate in artifact identity
    }
  }
  assert.deepEqual(builds, { android: 1, ios: 1 });
});

test("Preview identity is immutable", () => {
  assert.equal(assertPreviewIdentity({ appName: "Kurioticket Preview", bundleIdentifier: "com.kurioticket.app.preview", scheme: "kurioticket-preview", projectId: PREVIEW_IDENTITY.easProjectId, profile: "preview", channel: "preview", runtimePolicy: "fingerprint", apiOrigin: "https://staging.kurioticket.com" }), true);
  for (const [key, value] of [["bundleIdentifier", "com.kurioticket.app"], ["profile", "production"], ["channel", "production"], ["runtimePolicy", "appVersion"], ["apiOrigin", "https://kurioticket.com"]]) {
    const valid = { appName: "Kurioticket Preview", bundleIdentifier: "com.kurioticket.app.preview", scheme: "kurioticket-preview", projectId: PREVIEW_IDENTITY.easProjectId, profile: "preview", channel: "preview", runtimePolicy: "fingerprint", apiOrigin: "https://staging.kurioticket.com", [key]: value };
    assert.throws(() => assertPreviewIdentity(valid), /mismatch|forbidden/i);
  }
});

test("environment defaults to non-mutating dry-run and rejects missing secrets", () => {
  assert.throws(() => requirePreviewEnvironment({}), /Missing/);
  const config = requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "x", RENDER_API_KEY: "y", RENDER_STAGING_SERVICE_ID: PREVIEW_IDENTITY.renderStagingServiceId, EXPO_TOKEN: "z", ...appleEnv });
  assert.equal(config.mode, "dry-run");
  assert.equal(config.cutoverBaselineSha, null);
  assert.equal(config.iosNativeBackfillSha, null);
  assert.equal(config.pollIntervalMs, 60_000);
  assert.equal(config.leaseMs, 90_000);
  assert.throws(() => requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "x", RENDER_API_KEY: "y", RENDER_STAGING_SERVICE_ID: "srv-other", EXPO_TOKEN: "z", ...appleEnv }), /approved Preview staging service/);
});

test("iOS native backfill is exact-SHA, active-only, and iOS-only", () => {
  const target = "c".repeat(40);
  const baseEnv = { DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "token-read", RENDER_API_KEY: "render-key", RENDER_STAGING_SERVICE_ID: PREVIEW_IDENTITY.renderStagingServiceId, EXPO_TOKEN: "expo-token", PREVIEW_RELEASE_MODE: "active", PREVIEW_IOS_NATIVE_BACKFILL_SHA: target, ...appleEnv };
  const config = requirePreviewEnvironment(baseEnv);
  assert.equal(config.iosNativeBackfillSha, target);
  assert.throws(() => requirePreviewEnvironment({ ...baseEnv, PREVIEW_IOS_NATIVE_BACKFILL_SHA: "dev" }), /iOS native backfill SHA/);
  const ordinary = { classification: "NO_DELIVERY", reason: "repository-only", files: [] };
  assert.deepEqual(applyIosNativeBackfill({ classification: ordinary, files: [], sha, config }), ordinary);
  assert.deepEqual(applyIosNativeBackfill({ classification: ordinary, files: [], sha: target, config }), { classification: "IOS_NATIVE", reason: "approved-ios-native-backfill", files: [] });
  assert.throws(() => applyIosNativeBackfill({ classification: ordinary, files: [], sha: target, config: { ...config, mode: "dry-run" } }), /requires active Preview release mode/);
});

test("cutover baseline is immutable and dry-run only", async () => {
  const baselineSha = "b".repeat(40);
  const config = requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "token-read", RENDER_API_KEY: "render-key", RENDER_STAGING_SERVICE_ID: PREVIEW_IDENTITY.renderStagingServiceId, EXPO_TOKEN: "expo-token", PREVIEW_CUTOVER_BASELINE_SHA: baselineSha, ...appleEnv });
  assert.equal(config.cutoverBaselineSha, baselineSha);
  assert.throws(() => requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "token-read", RENDER_API_KEY: "render-key", RENDER_STAGING_SERVICE_ID: PREVIEW_IDENTITY.renderStagingServiceId, EXPO_TOKEN: "expo-token", PREVIEW_CUTOVER_BASELINE_SHA: "dev", ...appleEnv }), /Cutover baseline SHA/);
  const ordinary = { classification: "OTA", reason: "classified", files: ["apps/mobile/src/a.ts"] };
  assert.deepEqual(applyCutoverBaseline({ classification: ordinary, files: ordinary.files, sha, config: { mode: "dry-run", cutoverBaselineSha: null } }), ordinary);
  assert.deepEqual(applyCutoverBaseline({ classification: ordinary, files: ordinary.files, sha, config: { mode: "dry-run", cutoverBaselineSha: sha } }), { classification: "NO_DELIVERY", reason: "approved-cutover-baseline", files: ordinary.files });
  assert.throws(() => applyCutoverBaseline({ classification: ordinary, files: ordinary.files, sha, config: { mode: "active", cutoverBaselineSha: sha } }), /Cutover baseline may only be established in dry-run mode/);
});

test("Render preflight reads only the approved staging service", async () => {
  const requests = [];
  const client = new RenderClient({
    apiKey: "render-secret",
    serviceId: PREVIEW_IDENTITY.renderStagingServiceId,
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method });
      const body = url.includes("deploys") ? [{ deploy: { id: "dep-stage", status: "live" } }] : { id: PREVIEW_IDENTITY.renderStagingServiceId, name: "Kurioticket.com-staging" };
      return { ok: true, text: async () => JSON.stringify(body) };
    },
  });
  assert.equal((await client.getService()).id, PREVIEW_IDENTITY.renderStagingServiceId);
  assert.equal((await client.latestDeploy()).id, "dep-stage");
  assert.deepEqual(requests.map(({ method }) => method), ["GET", "GET"]);
  assert.equal(requests.every(({ url }) => url.includes(PREVIEW_IDENTITY.renderStagingServiceId)), true);
});

test("Render preflight rejects wrong identity, authentication failure, and malformed responses", async () => {
  const wrong = new RenderClient({ apiKey: "x", serviceId: "srv-other", fetchImpl: async () => ({ ok: true, text: async () => "{}" }) });
  await assert.rejects(wrong.getService(), /Unapproved/);
  const unauthorized = new RenderClient({ apiKey: "x", serviceId: PREVIEW_IDENTITY.renderStagingServiceId, fetchImpl: async () => ({ ok: false, status: 401 }) });
  await assert.rejects(unauthorized.getService(), /HTTP 401/);
  const malformed = new RenderClient({ apiKey: "x", serviceId: PREVIEW_IDENTITY.renderStagingServiceId, fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify({ id: "wrong" }) }) });
  await assert.rejects(malformed.getService(), /malformed or mismatched/);
});

test("Render deploy creation reconciles an accepted mutation after an empty response", async () => {
  let requests = 0;
  let historyReads = 0;
  const deploy = { id: "dep-reconciled", status: "build_in_progress", commit: { id: sha } };
  const client = new RenderClient({
    apiKey: "render-secret",
    serviceId: PREVIEW_IDENTITY.renderStagingServiceId,
    fetchImpl: async (_url, options) => {
      requests += 1;
      if (options.method === "POST") return { ok: true, text: async () => "" };
      historyReads += 1;
      return { ok: true, text: async () => JSON.stringify(historyReads === 1 ? [] : [{ deploy }]) };
    },
  });
  assert.equal((await client.createDeploy(sha, { sleep: async () => {} })).id, deploy.id);
  assert.equal(requests, 3);
});

test("Render deploy reconciliation excludes every deployment that existed before the POST", async () => {
  const terminal = { id: "dep-terminal", status: "build_failed", commit: { id: sha } };
  const replacement = { id: "dep-replacement", status: "build_in_progress", commit: { id: sha } };
  let historyReads = 0;
  const client = new RenderClient({
    apiKey: "render-secret",
    serviceId: PREVIEW_IDENTITY.renderStagingServiceId,
    fetchImpl: async (_url, options) => {
      if (options.method === "POST") return { ok: true, text: async () => "" };
      historyReads += 1;
      const deploys = historyReads === 1 ? [terminal] : [replacement, terminal];
      return { ok: true, text: async () => JSON.stringify(deploys.map((deploy) => ({ deploy }))) };
    },
  });
  assert.equal((await client.createDeploy(sha, { excludeIds: [terminal.id], sleep: async () => {} })).id, replacement.id);
});

test("EAS preflight accepts only the exact Preview project and readable history", async () => {
  const client = new EasClient({ expoToken: "expo-secret", cwd: repositoryRoot, command: "unused" });
  const calls = [];
  client.runText = async (args) => { calls.push(args); return `fullName  ${PREVIEW_IDENTITY.easProjectFullName}
ID        ${PREVIEW_IDENTITY.easProjectId}
`; };
  client.run = async (args) => { calls.push(args); return []; };
  assert.equal((await client.projectInfo()).projectId, PREVIEW_IDENTITY.easProjectId);
  assert.deepEqual(await client.previewBuildHistory(), []);
  assert.deepEqual(await client.previewUpdateHistoryProbe(), []);
  assert.deepEqual(calls[0], ["eas-cli@16.17.4", "project:info"]);
  assert.deepEqual(calls.at(-1), ["eas-cli@16.17.4", "update:list", "--branch", "preview", "--limit", "1", "--offset", "0", "--json", "--non-interactive"]);
});

test("EAS update reads stay bounded when Preview history exceeds 500 records", async () => {
  const client = new EasClient({ expoToken: "expo-secret", cwd: repositoryRoot, command: "unused" });
  const calls = [];
  client.run = async (args) => {
    calls.push(args);
    const limit = Number(args[args.indexOf("--limit") + 1]);
    return Array.from({ length: limit }, (_, index) => ({
      branch: "preview", runtimeVersion: "preview-0.3.0", group: `group-${calls.length}-${index}`,
      platforms: ["ios"], message: "historical update",
    }));
  };
  assert.equal((await client.previewUpdateHistoryProbe()).length, 1);
  assert.equal((await client.listUpdates()).length, 100);
  assert.equal(calls.length, 3, "one probe page and exactly two reconciliation pages are permitted");
  assert.equal(calls.some((args) => Number(args[args.indexOf("--offset") + 1]) >= 100), false);
});

test("EAS preflight rejects wrong projects, authentication errors, and malformed history", async () => {
  const client = new EasClient({ expoToken: "x", cwd: repositoryRoot, command: "unused" });
  client.runText = async () => `fullName  @other/project
ID        ${PREVIEW_IDENTITY.easProjectId}
`;
  await assert.rejects(client.projectInfo(), /mismatched/);
  client.runText = async () => { throw new Error("Expo authentication failed"); };
  await assert.rejects(client.projectInfo(), /authentication failed/);
  client.run = async () => ({ unexpected: true });
  await assert.rejects(client.previewBuildHistory(), /malformed/);
});

test("provider preflight validates all read-only identities without mutation in dry-run and active modes", async () => {
  for (const mode of ["dry-run", "active"]) {
    let mutations = 0;
    const result = await runPreviewPreflight({
      config: { mode },
      ledger: { healthCheck: async () => ({ connected: true }) },
      github: { latestDevSha: async () => sha },
      render: { getService: async () => ({ id: PREVIEW_IDENTITY.renderStagingServiceId, name: "Kurioticket.com-staging" }), latestDeploy: async () => ({ id: "dep-stage", status: "live" }), createDeploy: async () => { mutations += 1; } },
      renderWorker: { getPreviewWorkerService: async () => ({ id: PREVIEW_IDENTITY.renderWorkerServiceId, autoDeployOnCommit: true, branch: "dev" }) },
      eas: { projectInfo: async () => ({ projectId: PREVIEW_IDENTITY.easProjectId }), previewBuildHistory: async () => [], previewUpdateHistoryProbe: async () => [], createIosBuild: async () => { mutations += 1; }, publishUpdate: async () => { mutations += 1; } },
      apple: { previewContext: async () => ({ app: { id: "6797447471" }, group: { id: "group-preview", attributes: { isInternalGroup: true } } }) },
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.mode, mode);
    assert.equal(result.submissionPerformed, false);
    assert.equal(result.renderWorkerAutoDeploy, true);
    assert.equal(mutations, 0);
  }
});

test("Render worker preflight requires automatic dev deployments", async () => {
  const valid = {
    id: PREVIEW_IDENTITY.renderWorkerServiceId,
    type: "background_worker",
    branch: PREVIEW_IDENTITY.branch,
    repo: `https://github.com/${PREVIEW_IDENTITY.repository}.git`,
    autoDeploy: false,
    autoDeployTrigger: "commit",
    buildFilter: { paths: [...PREVIEW_WORKER_BUILD_PATHS], ignoredPaths: [] },
  };
  const client = new RenderClient({ apiKey: "render-secret", serviceId: PREVIEW_IDENTITY.renderWorkerServiceId, fetchImpl: async () => ({
    ok: true,
    text: async () => JSON.stringify(valid),
  }) });
  assert.equal((await client.getPreviewWorkerService()).autoDeployOnCommit, true);
  for (const service of [
    { ...valid, autoDeployTrigger: "off" },
    { ...valid, autoDeployTrigger: "checksPass" },
    { ...valid, branch: "main" },
    { ...valid, repo: "https://github.com/other/repository" },
    { ...valid, buildFilter: { paths: [], ignoredPaths: [] } },
  ]) {
    client.fetch = async () => ({ ok: true, text: async () => JSON.stringify(service) });
    await assert.rejects(client.getPreviewWorkerService(), /Render Preview worker/);
  }
  client.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ ...valid, autoDeployTrigger: undefined, autoDeploy: true }) });
  assert.equal((await client.getPreviewWorkerService()).autoDeployOnCommit, true);
});

test("provider preflight rejects invalid mode and redacts credentials", async () => {
  await assert.rejects(runPreviewPreflight({ config: { mode: "invalid" } }), /mode is invalid/);
  assert.equal(redactPreflightError(new Error("failed token-secret database-secret"), ["token-secret", "database-secret"]), "failed [REDACTED] [REDACTED]");
});

test("worker preflight failure redacts secrets and exits before the polling loop", () => {
  const worker = readFileSync(resolve(repositoryRoot, "services/preview-release/worker.mjs"), "utf8");
  assert.match(worker, /preview-release-preflight-failed/);
  assert.match(worker, /redactPreflightError/);
  assert.match(worker, /process\.exit\(1\)/);
  assert.ok(worker.indexOf("runPreviewPreflight") < worker.indexOf("while (!stopping)"));
  assert.match(worker, /unresolvedNativeNotificationCandidates/);
  assert.doesNotMatch(worker, /notificationCandidateSourceShas/);
  assert.doesNotMatch(worker, /result\.state\s*!==\s*["']LOCKED_OR_COMPLETE["']/);
});

const classifications = [
  [["src/app/page.tsx"], "WEB"],
  [["apps/mobile/src/screens/Explore.tsx"], "OTA"],
  [["apps/mobile/assets/kurioticket-icon-ios.png"], "ANDROID_NATIVE+IOS_NATIVE"],
  [["apps/mobile/app.config.ts"], "ANDROID_NATIVE+IOS_NATIVE"],
  [["apps/mobile/ios/Podfile"], "IOS_NATIVE"],
  [["apps/mobile/android/app/build.gradle"], "ANDROID_NATIVE"],
  [["package-lock.json"], "ANDROID_NATIVE+IOS_NATIVE+WEB"],
  [["src/app/page.tsx", "apps/mobile/src/a.ts"], "OTA+WEB"],
  [["src/app/page.tsx", "apps/mobile/ios/a.swift"], "IOS_NATIVE+WEB"],
  [["docs/readme.md"], "NO_DELIVERY"],
  [["apps/mobile/unknown.bin"], "UNSAFE"],
];
for (const [files, expected] of classifications) test(`classifies ${files.join(",")}`, () => assert.equal(classifyChangeSet(files).classification, expected));
test("classification is deterministic and rejects malformed paths", () => {
  assert.deepEqual(classifyChangeSet(["src/a.ts", "src/a.ts"]), classifyChangeSet(["src/a.ts"]));
  assert.equal(classifyChangeSet(["apps\\mobile\\a.ts"]).classification, "UNSAFE");
});

for (const [status, expected] of [["IN_QUEUE", "ACTIVE_MATCH"], ["IN_PROGRESS", "ACTIVE_MATCH"], ["FINISHED", "FINISHED_MATCH"], ["ERRORED", "FAILED_MATCH"], ["CANCELED", "CANCELED_MATCH"]]) {
  test(`EAS reconciliation maps ${status}`, () => assert.equal(reconcileBuilds([build({ status })], sha).decision, expected));
}
test("EAS reconciliation returns NONE for unrelated SHAs", () => assert.equal(reconcileBuilds([build({ gitCommitHash: "b".repeat(40) })], sha).decision, "NONE"));
test("EAS reconciliation fails closed on identity conflict", () => assert.equal(reconcileBuilds([build({ buildProfile: "production" })], sha).decision, "CONFLICT"));
test("EAS reconciliation accepts omitted CLI bundle identity only when immutable source identity is attested", () => {
  const value = build({ appIdentifier: undefined, sourceAttestedAppIdentifier: PREVIEW_IDENTITY.bundleIdentifier });
  assert.equal(reconcileBuilds([value], sha).decision, "ACTIVE_MATCH");
  assert.equal(reconcileBuilds([{ ...value, sourceAttestedAppIdentifier: undefined }], sha).decision, "CONFLICT");
});
test("EAS reconciliation rejects a sparse build:view result when provider runtime identity is absent", () => {
  const sparse = build({
    project: undefined,
    platform: undefined,
    buildProfile: undefined,
    appIdentifier: undefined,
    runtimeVersion: undefined,
    channel: undefined,
    sourceAttestedProjectId: PREVIEW_IDENTITY.easProjectId,
    sourceAttestedPlatform: "ios",
    sourceAttestedBuildProfile: "preview",
    sourceAttestedAppIdentifier: PREVIEW_IDENTITY.bundleIdentifier,
    sourceAttestedChannel: PREVIEW_IDENTITY.channel,
  });
  assert.equal(reconcileBuilds([sparse], sha).decision, "CONFLICT");
  assert.equal(reconcileBuilds([{ ...sparse, sourceAttestedChannel: undefined }], sha).decision, "CONFLICT");
  assert.equal(reconcileBuilds([{ ...sparse, channel: "production" }], sha).decision, "CONFLICT");
});
test("EAS reconciliation fails closed on duplicate exact matches", () => assert.equal(reconcileBuilds([build(), build({ id: "build-2" })], sha).decision, "CONFLICT"));
test("EAS reconciliation fails closed on malformed history", () => assert.equal(reconcileBuilds([{ nope: true }], sha).decision, "MALFORMED_RESPONSE"));
test("EAS reconciliation supports exact Android Preview identity", () => {
  assert.equal(reconcileBuilds([build({ platform: "ANDROID" })], sha, "android").decision, "ACTIVE_MATCH");
  assert.equal(reconcileBuilds([build({ platform: "IOS" })], sha, "android").decision, "CONFLICT");
});

for (const [status, expected] of [["CREATED", "CREATED"], ["IN_PROGRESS", "IN_PROGRESS"], ["FINISHED", "FINISHED"], ["ERRORED", "FAILED"]]) {
  test(`submission reconciliation maps ${status}`, () => assert.equal(reconcileSubmission({ status: "FINISHED", submission: { id: "sub-1", status } }).state, expected));
}
test("finished build without submission is explicit NOT_CREATED", () => assert.equal(reconcileSubmission({ status: "FINISHED" }).state, "NOT_CREATED"));
test("duplicate submissions fail closed", () => assert.equal(reconcileSubmission({ submissions: [{ id: "1" }, { id: "2" }] }).state, "CONFLICT"));
const submission = (overrides = {}) => ({ id: "sub-1", status: "FINISHED", platform: "IOS", app: { id: PREVIEW_IDENTITY.easProjectId }, submittedBuild: { id: "build-1" }, ...overrides });
test("submission history adopts the unique exact-build Preview submission", () => assert.equal(reconcileSubmissionHistory([submission()], "build-1").state, "FINISHED"));
test("submission history ignores valid submissions for other builds", () => assert.equal(reconcileSubmissionHistory([submission({ submittedBuild: { id: "other-build" } })], "build-1").state, "NOT_CREATED"));
test("submission history ignores valid legacy rows without a submitted build", () => assert.equal(reconcileSubmissionHistory([
  submission({ id: "legacy", submittedBuild: null }),
  submission(),
], "build-1").state, "FINISHED"));
test("submission history fails closed on duplicates, wrong projects, and malformed entries", () => {
  assert.equal(reconcileSubmissionHistory([submission(), submission({ id: "sub-2" })], "build-1").state, "CONFLICT");
  assert.equal(reconcileSubmissionHistory([submission({ app: { id: "wrong-project" } })], "build-1").state, "UNKNOWN");
  assert.equal(reconcileSubmissionHistory([{ id: "sub-1" }], "build-1").state, "UNKNOWN");
});

test("EAS build history uses exact Preview platform, profile, and SHA filters without excluding valid sparse CLI records", async () => {
  const calls = [];
  const client = new EasClient({ expoToken: "x", cwd: repositoryRoot, command: "unused" });
  client.run = async (args) => { calls.push(args); return []; };
  assert.deepEqual(await client.listIosBuilds(sha), []);
  assert.deepEqual(calls[0].slice(0, 6), ["eas-cli@16.17.4", "build:list", "--platform", "ios", "--profile", "preview"]);
  assert.ok(calls[0].includes("--git-commit-hash"));
  assert.ok(!calls[0].includes("--app-identifier"));
});

test("EAS submission history uses authenticated bounded GraphQL and exact project identity", async () => {
  const requests = [];
  const client = new EasClient({
    expoToken: "expo-secret", cwd: repositoryRoot, command: "unused",
    fetchImpl: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true, text: async () => JSON.stringify({ data: { app: { byId: { id: PREVIEW_IDENTITY.easProjectId, submissions: [submission()] } } } }) };
    },
  });
  assert.deepEqual(await client.listIosSubmissions(), [submission()]);
  assert.equal(requests[0].variables.appId, PREVIEW_IDENTITY.easProjectId);
  assert.equal(requests[0].variables.offset, 0);
});

test("EAS submission history fails closed on HTTP, JSON, GraphQL, and project errors", async () => {
  for (const [response, pattern] of [
    [{ ok: false, status: 503, text: async () => "" }, /HTTP 503/],
    [{ ok: true, text: async () => "not-json" }, /malformed JSON/],
    [{ ok: true, text: async () => JSON.stringify({ errors: [{ message: "unauthorized" }] }) }, /returned errors/],
    [{ ok: true, text: async () => JSON.stringify({ data: { app: { byId: { id: "wrong", submissions: [] } } } }) }, /project-mismatched/],
  ]) {
    const client = new EasClient({ expoToken: "x", cwd: repositoryRoot, command: "unused", fetchImpl: async () => response });
    await assert.rejects(client.listIosSubmissions(), pattern);
  }
});

test("bounded retr…322 tokens truncated…ed Basic credentials without exposing the token in arguments", () => {
  const token = "github_pat_example_read_only";
  const environment = gitAuthEnvironment(token, { PATH: "test" });
  assert.equal(environment.GIT_CONFIG_COUNT, "1");
  assert.equal(environment.GIT_CONFIG_KEY_0, "http.extraHeader");
  assert.match(environment.GIT_CONFIG_VALUE_0, /^Authorization: Basic [A-Za-z0-9+/=]+$/);
  assert.equal(Buffer.from(environment.GIT_CONFIG_VALUE_0.replace("Authorization: Basic ", ""), "base64").toString("utf8"), `x-access-token:${token}`);
  assert.equal(JSON.stringify(["fetch", "--quiet", "origin"]).includes(token), false);
});

test("dry-run detects exact SHA and crosses no mutation boundary", async () => {
  const transitions = [];
  const reports = [];
  const ledger = {
    lastSuccessful: async () => ({ source_sha: "b".repeat(40) }),
    claim: async () => ({ source_sha: sha, previous_sha: "b".repeat(40), state: "DETECTED" }),
    transition: async (sourceSha, worker, from, state, patch = {}) => { transitions.push({ sourceSha, state, patch }); return { source_sha: sourceSha, state, ...patch }; },
  };
  const github = {
    latestDevSha: async () => sha,
    compare: async () => ["docs/preview.md"],
    report: async (...args) => reports.push(args),
  };
  let mutations = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "dry-run", workerId: "test", leaseMs: 60_000, repository: PREVIEW_IDENTITY.repository, githubReadToken: "token" },
    ledger,
    github,
    render: { createDeploy: async () => { mutations += 1; } },
    easFactory: () => ({ publishUpdate: async () => { mutations += 1; }, createIosBuild: async () => { mutations += 1; } }),
    sleep: async () => {},
  });
  orchestrator.process = async (record) => {
    await ledger.transition(record.source_sha, "test", ["DETECTED"], "VALIDATING");
    await ledger.transition(record.source_sha, "test", ["VALIDATING"], "COMPLETE", { evidence: { submissionPerformed: false } });
    return { source_sha: record.source_sha, state: "COMPLETE" };
  };
  const result = await orchestrator.cycle();
  assert.equal(result.state, "COMPLETE");
  assert.equal(mutations, 0);
  assert.equal(reports[0][0], sha);
  assert.deepEqual(transitions.map(({ state }) => state), ["VALIDATING", "COMPLETE"]);
});

test("polling API failure never becomes a no-change result", async () => {
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "dry-run" }, ledger: {},
    github: { latestDevSha: async () => { throw new Error("GitHub unavailable"); } }, render: {}, sleep: async () => {},
  });
  await assert.rejects(orchestrator.cycle(), /GitHub unavailable/);
});

test("native splash change remains native when its complete merge range includes mobile tooling and tests", () => {
  const result = classifyChangeSet([
    "apps/mobile/app.config.ts",
    "apps/mobile/scripts/verify-ios-icon-contract.mjs",
    "apps/mobile/src/__tests__/releaseArchitecture.test.ts",
    "apps/mobile/src/features/home/DiscoverNextAdventure.tsx",
  ]);
  assert.equal(result.classification, "ANDROID_NATIVE+IOS_NATIVE");
  assert.deepEqual(result.mobileTooling, [
    "apps/mobile/scripts/verify-ios-icon-contract.mjs",
    "apps/mobile/src/__tests__/releaseArchitecture.test.ts",
  ]);
  assert.equal(classifyChangeSet(["apps/mobile/src/a.test.ts"]).classification, "NO_DELIVERY");
});

test("last delivered native binary remains authoritative after web or OTA completion", () => {
  const deliveredNative = { ios: { sourceSha: "a".repeat(40), buildId: "ios-build-5", fingerprint: "old-ios" } };
  const ota = { classification: "OTA", reason: "classified", files: ["apps/mobile/src/a.ts"] };
  const result = enforceDeliveredNativeBaseline({ classification: ota, fingerprints: { ios: "new-ios", android: "same" }, deliveredNative });
  assert.equal(result.classification, "IOS_NATIVE+OTA");
  assert.deepEqual(result.nativeDrift, ["IOS_NATIVE"]);
  assert.deepEqual(nativeDriftTargets({ ios: "new-ios" }, deliveredNative), ["IOS_NATIVE"]);
});

test("completed latest SHA is reopened when web or OTA completion left native drift pending", async () => {
  let driftClaims = 0;
  let ordinaryClaims = 0;
  const previous = { source_sha: sha, evidence: { fingerprints: { ios: "new-ios", android: "same-android" } } };
  const record = { source_sha: sha, previous_sha: sha, state: "DETECTED" };
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => previous,
      lastSuccessfulNative: async (platform) => platform === "ios"
        ? { source_sha: "b".repeat(40), native_build_id: "ios-build-5", native_fingerprint: "old-ios" }
        : { source_sha: "b".repeat(40), native_build_id: "android-build", native_fingerprint: "same-android" },
      claimNativeDrift: async () => { driftClaims += 1; return record; },
      claim: async () => { ordinaryClaims += 1; return record; },
    },
    github: { latestDevSha: async () => sha, compare: async () => [], report: async () => {} }, render: {}, sleep: async () => {},
  });
  orchestrator.process = async (_record, _previous, _lease, deliveredNative) => {
    assert.equal(deliveredNative.ios.buildId, "ios-build-5");
    return { source_sha: sha, state: "COMPLETE" };
  };
  assert.equal((await orchestrator.cycle()).state, "COMPLETE");
  assert.equal(driftClaims, 1);
  assert.equal(ordinaryClaims, 0);
});

test("completed current SHA can be claimed once for approved iOS native backfill", async () => {
  let ordinaryClaims = 0;
  let backfillClaims = 0;
  let processed = 0;
  const record = { source_sha: sha, previous_sha: sha, state: "DETECTED" };
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: sha, workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => ({ source_sha: sha }),
      claim: async () => { ordinaryClaims += 1; return record; },
      claimIosNativeBackfill: async ({ identityKey }) => {
        backfillClaims += 1;
        assert.equal(identityKey, `${sha}:${PREVIEW_IDENTITY.easProjectId}:ios:preview`);
        return record;
      },
    },
    github: { latestDevSha: async () => sha, report: async () => {} },
    render: {},
    sleep: async () => {},
  });
  orchestrator.process = async () => { processed += 1; return { source_sha: sha, state: "COMPLETE" }; };
  assert.equal((await orchestrator.cycle()).state, "COMPLETE");
  assert.equal(ordinaryClaims, 0);
  assert.equal(backfillClaims, 1);
  assert.equal(processed, 1);
});

test("approved iOS backfill resumes its exact ancestor after dev advances", async () => {
  const currentDevSha = "b".repeat(40);
  const comparisons = [];
  const record = { source_sha: sha, previous_sha: null, state: "FAILED" };
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: sha, workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => ({ source_sha: currentDevSha }),
      claimIosNativeBackfill: async ({ sourceSha, previousSha }) => {
        assert.equal(sourceSha, sha);
        assert.equal(previousSha, currentDevSha);
        return record;
      },
    },
    github: {
      latestDevSha: async () => currentDevSha,
      compare: async (base, head) => { comparisons.push([base, head]); return []; },
      report: async () => {},
    },
    render: {}, sleep: async () => {},
  });
  orchestrator.process = async (_record, previous) => {
    assert.equal(previous, null);
    return { source_sha: sha, state: "COMPLETE" };
  };
  assert.equal((await orchestrator.cycle()).state, "COMPLETE");
  assert.deepEqual(comparisons, [[sha, currentDevSha]]);
});

test("existing iOS build action prevents duplicate native backfill processing", async () => {
  let processed = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: sha, workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => ({ source_sha: sha }),
      claimIosNativeBackfill: async () => null,
    },
    github: { latestDevSha: async () => sha }, render: {}, sleep: async () => {},
  });
  orchestrator.process = async () => { processed += 1; };
  assert.equal((await orchestrator.cycle()).state, "LOCKED_OR_COMPLETE");
  assert.equal(processed, 0);
});

test("iOS delivery adopts a finished build and waits for its server-owned auto-submit without duplicating either", async () => {
  let buildCreates = 0;
  let historyReads = 0;
  const actions = [];
  const finishedBuild = build({ status: "FINISHED", appVersion: "0.3.0", appBuildVersion: "5" });
  const orchestrator = new PreviewOrchestrator({
    config: {}, github: {}, render: {}, sleep: async () => {},
    ledger: {
      getAction: async () => ({ remote_id: finishedBuild.id }),
      recordAction: async (action) => { actions.push(action); return action; },
    },
    easFactory: () => ({
      listIosBuilds: async () => { throw new Error("history must not run when the ledger has a build ID"); },
      createIosBuild: async () => { buildCreates += 1; return finishedBuild; },
      viewBuild: async () => finishedBuild,
      listIosSubmissions: async () => {
        historyReads += 1;
        return historyReads === 1 ? [] : [submission()];
      },
    }),
    appleFactory: () => finishedApple(),
  });
  const result = await orchestrator.deliverIos(sha, repositoryRoot, { checkpoint: async () => {} });
  assert.equal(buildCreates, 0);
  assert.equal(historyReads, 2);
  assert.equal(result.buildId, "build-1");
  assert.equal(result.submissionId, "sub-1");
  assert.equal(actions.filter(({ kind }) => kind === "IOS_SUBMISSION").length, 1);
});

test("coalesced iOS delivery preserves the native artifact owner through submission and TestFlight", async () => {
  const artifactSha = "c".repeat(40);
  const latestSha = "d".repeat(40);
  const fingerprint = "f".repeat(40);
  const finishedBuild = build({ status: "FINISHED", appVersion: "0.3.0", appBuildVersion: "34", gitCommitHash: artifactSha, runtimeVersion: fingerprint });
  const actions = [];
  const orchestrator = new PreviewOrchestrator({
    config: {}, github: {}, render: {}, sleep: async () => {},
    ledger: {
      reserveNativeBuild: async () => ({ created: false, action: { source_sha: artifactSha, remote_id: finishedBuild.id } }),
      recordAction: async (action) => { actions.push(action); return action; },
      advanceDeliveredNative: async (delivery) => { assert.equal(delivery.sourceSha, artifactSha); },
    },
    easFactory: () => ({
      viewBuild: async () => finishedBuild,
      listIosSubmissions: async () => [submission({ status: "FINISHED" })],
    }),
    appleFactory: () => finishedApple(),
  });

  const result = await orchestrator.deliverIos(latestSha, repositoryRoot, { checkpoint: async () => {} }, fingerprint);
  assert.equal(result.nativeArtifactSourceSha, artifactSha);
  assert.equal(actions.find(({ kind }) => kind === "IOS_SUBMISSION").sourceSha, artifactSha);
  assert.equal(actions.find(({ kind }) => kind === "IOS_TESTFLIGHT_DISTRIBUTION").sourceSha, artifactSha);
  assert.equal(actions.find(({ kind }) => kind === "IOS_SUBMISSION").evidence.latestCompatibleSourceSha, latestSha);
});

test("iOS delivery fails closed on a failed auto-submit and never invokes manual submission", async () => {
  let manualSubmissions = 0;
  const finishedBuild = build({ status: "FINISHED", appBuildVersion: "5" });
  const orchestrator = new PreviewOrchestrator({
    config: {}, github: {}, render: {}, sleep: async () => {},
    ledger: { getAction: async () => null, recordAction: async (action) => action },
    easFactory: () => ({
      listIosBuilds: async () => [finishedBuild], createIosBuild: async () => finishedBuild,
      viewBuild: async () => finishedBuild,
      listIosSubmissions: async () => [submission({ status: "ERRORED" })],
      submitIosBuild: async () => { manualSubmissions += 1; },
    }),
  });
  await assert.rejects(orchestrator.deliverIos(sha, repositoryRoot, { checkpoint: async () => {} }), /state is FAILED/);
  assert.equal(manualSubmissions, 0);
});

test("historical TestFlight recovery remains iOS-only after newer Android native drift", async () => {
  const newerDev = "d".repeat(40);
  const comparisons = [];
  let distributionReconciliations = 0;
  let ordinaryProcesses = 0;
  let androidDeliveries = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: null, workerId: "test", leaseMs: 60_000 },
    ledger: {
      pendingIosDistribution: async () => ({ source_sha: sha, ios_build_id: "build-1" }),
      lastSuccessful: async () => ({ source_sha: newerDev, evidence: { fingerprints: { android: "new-android" } } }),
      lastSuccessfulNative: async (platform) => ({ source_sha: newerDev, native_build_id: `${platform}-build`, native_fingerprint: `new-${platform}`, build_number: "10" }),
      requiresIosDistribution: async () => true,
      claimIosDistribution: async () => ({ source_sha: sha, state: "DETECTED" }),
      transition: async () => {},
    },
    github: { latestDevSha: async () => newerDev, compare: async (...args) => { comparisons.push(args); }, report: async () => {} }, render: {}, sleep: async () => {},
  });
  orchestrator.reconcileIosDistribution = async () => { distributionReconciliations += 1; return { state: "COMPLETE" }; };
  orchestrator.process = async () => { ordinaryProcesses += 1; throw new Error("historical distribution entered ordinary release processing"); };
  orchestrator.deliverAndroid = async () => { androidDeliveries += 1; throw new Error("historical distribution attempted Android delivery"); };
  const result = await orchestrator.cycle();
  assert.equal(result.state, "COMPLETE");
  assert.equal(distributionReconciliations, 1);
  assert.equal(ordinaryProcesses, 0);
  assert.equal(androidDeliveries, 0);
  assert.deepEqual(comparisons, [[sha, newerDev]]);
});

test("native revert is compared with the latest delivered platform source even when its fingerprint is historical", async () => {
  const temporarySha = "b".repeat(40);
  const cleanupSha = "c".repeat(40);
  const comparisons = [];
  let claimed = 0;
  const previous = { source_sha: cleanupSha, evidence: { fingerprints: { ios: "same-ios", android: "same-android" } } };
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => previous,
      lastSuccessfulNative: async (platform) => ({ source_sha: temporarySha, native_build_id: `${platform}-temporary`, native_fingerprint: `same-${platform}` }),
      claimNativeDrift: async () => { claimed += 1; return { source_sha: cleanupSha, state: "DETECTED" }; },
    },
    github: {
      latestDevSha: async () => cleanupSha,
      compare: async (base, head) => { comparisons.push([base, head]); return ["apps/mobile/app.config.ts"]; },
      report: async () => {},
    },
    render: {}, sleep: async () => {},
  });
  orchestrator.process = async (_record, _previous, _lease, _baselines, targets) => {
    assert.deepEqual(targets.sort(), ["ANDROID_NATIVE", "IOS_NATIVE"]);
    return { source_sha: cleanupSha, state: "COMPLETE" };
  };
  assert.equal((await orchestrator.cycle()).state, "COMPLETE");
  assert.equal(claimed, 1);
  assert.deepEqual(comparisons, [[temporarySha, cleanupSha], [temporarySha, cleanupSha]]);
});

test("unchanged delivered native source does not schedule a duplicate build", async () => {
  const previous = { source_sha: sha, evidence: { fingerprints: { ios: "same-ios", android: "same-android" } } };
  let claims = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => previous,
      lastSuccessfulNative: async (platform) => ({ source_sha: sha, native_build_id: `${platform}-build`, native_fingerprint: `same-${platform}` }),
      claimNativeDrift: async () => { claims += 1; },
    },
    github: { latestDevSha: async () => sha }, render: {}, sleep: async () => {},
  });
  assert.equal((await orchestrator.cycle()).state, "NO_CHANGE");
  assert.equal(claims, 0);
});

test("platform native baselines remain independent for a one-platform revert", async () => {
  const cleanupSha = "c".repeat(40);
  const orchestrator = new PreviewOrchestrator({
    config: {}, ledger: {}, render: {},
    github: { compare: async (base) => base.startsWith("i") ? ["apps/mobile/app.config.ts"] : ["apps/web/app/page.tsx"] },
  });
  const targets = await orchestrator.nativeChangeTargets(cleanupSha, {
    ios: { sourceSha: `i${"a".repeat(39)}` },
    android: { sourceSha: `a${"a".repeat(39)}` },
  });
  assert.deepEqual(targets, ["IOS_NATIVE"]);
});

test("required native revert targets augment NO_DELIVERY without weakening same-SHA reconciliation", () => {
  const result = enforceDeliveredNativeBaseline({
    classification: { classification: "NO_DELIVERY", reason: "repository-only", files: [] },
    fingerprints: { ios: "historical", android: "historical" },
    deliveredNative: { ios: { fingerprint: "historical" }, android: { fingerprint: "historical" } },
    requiredNativeTargets: ["IOS_NATIVE"],
  });
  assert.equal(result.classification, "IOS_NATIVE");
  assert.deepEqual(result.nativeDrift, ["IOS_NATIVE"]);
});

test("historical TestFlight reconciliation adopts only the recorded finished iOS build and submission", async () => {
  const expectedIosRuntime = "i".repeat(40);
  const finishedBuild = build({ status: "FINISHED", appVersion: "0.3.0", appBuildVersion: "9", runtimeVersion: expectedIosRuntime });
  const finishedSubmission = submission();
  const actionKinds = [];
  let buildCreates = 0;
  let androidCreates = 0;
  let completed = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { repository: "Zentric-Analytics/Kurioticket.com", githubReadToken: "redacted", workerId: "test" },
    ledger: {
      getAction: async (kind) => {
        actionKinds.push(kind);
        if (kind === "IOS_BUILD") return { remote_id: finishedBuild.id, state: "FINISHED", evidence: { nativeFingerprint: expectedIosRuntime } };
        if (kind === "IOS_SUBMISSION") return { remote_id: finishedSubmission.id, state: "FINISHED" };
        return null;
      },
      recordAction: async (action) => action,
      completeIosDistribution: async () => { completed += 1; return { source_sha: sha, state: "COMPLETE" }; },
    },
    github: { report: async () => {} }, render: {}, sleep: async () => {},
    checkoutFactory: async ({ sha: requestedSha }) => {
      assert.equal(requestedSha, sha);
      return { directory: repositoryRoot, cleanup: async () => {} };
    },
    prepareCheckoutFactory: async () => {},
    identityFactory: async () => ({ appName: "Kurioticket Preview", bundleIdentifier: PREVIEW_IDENTITY.bundleIdentifier, scheme: "kurioticket-preview", projectId: PREVIEW_IDENTITY.easProjectId, profile: "preview", channel: PREVIEW_IDENTITY.channel, runtimePolicy: PREVIEW_IDENTITY.runtimePolicy, apiOrigin: PREVIEW_IDENTITY.apiOrigin }),
    fingerprintsFactory: async () => ({ ios: expectedIosRuntime, android: "a".repeat(40) }),
    easFactory: () => ({
      viewBuild: async (id) => { assert.equal(id, finishedBuild.id); return finishedBuild; },
      listIosSubmissions: async () => [finishedSubmission],
      createIosBuild: async () => { buildCreates += 1; throw new Error("historical reconciliation created an iOS build"); },
      createAndroidBuild: async () => { androidCreates += 1; throw new Error("historical reconciliation created an Android build"); },
    }),
    appleFactory: () => finishedApple(),
  });
  const result = await orchestrator.reconcileIosDistribution({ source_sha: sha, state: "DETECTED" }, { checkpoint: async () => {} });
  assert.equal(result.state, "COMPLETE");
  assert.deepEqual(actionKinds, ["IOS_BUILD", "IOS_SUBMISSION"]);
  assert.equal(buildCreates, 0);
  assert.equal(androidCreates, 0);
  assert.equal(completed, 1);
});

test("failed TestFlight distribution is reclaimed through its dedicated lease-safe claim", async () => {
  const queries = [];
  const failed = { source_sha: sha, state: "DETECTED" };
  const ledger = new PreviewLedger("postgres://localhost/test", {
    pool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [failed], rowCount: 1 }; } },
  });
  assert.equal((await ledger.claimIosDistribution({ sourceSha: sha, workerId: "worker-2", leaseMs: 60_000, mode: "active" })).state, "DETECTED");
  assert.match(queries[0].sql, /'FAILED'/);
  assert.match(queries[0].sql, /lock_expires_at < now\(\)/);
  assert.doesNotMatch(queries[0].sql, /completed_at\s*=\s*NULL/i);
  assert.match(queries[0].sql, /IOS_BUILD'[\s\S]*IOS_SUBMISSION'[\s\S]*IOS_TESTFLIGHT_DISTRIBUTION'[\s\S]*state='FINISHED'/);
  assert.deepEqual(queries[0].values, [sha, "worker-2", 60_000, "active"]);
});

test("permanently unavailable notification candidates become terminal and stop retrying", async () => {
  const queries = [];
  const ledger = new PreviewLedger("postgres://localhost/test", {
    pool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [], rowCount: 1 }; } },
  });
  await ledger.markNativeNotificationTerminalUnavailable({ platform: "ios", build_id: "missing-build" }, "permanently unavailable");
  assert.match(queries[0].sql, /TERMINAL_UNAVAILABLE/);
  assert.match(queries[0].sql, /PENDING','RETRYABLE_FAILURE/);
  assert.equal(queries[0].values[0], "ios");
  assert.equal(queries[0].values[1], "missing-build");
});

test("historical distribution completion preserves the monotonic ordinary progression order", async () => {
  const queries = [];
  const older = { source_sha: sha, state: "COMPLETE", progression_order: 7 };
  const newer = { source_sha: "b".repeat(40), state: "COMPLETE", progression_order: 8 };
  const ledger = new PreviewLedger("postgres://localhost/test", {
    pool: { query: async (sql, values) => {
      queries.push({ sql, values });
      if (sql.includes("ORDER BY progression_order")) return { rows: [newer], rowCount: 1 };
      return { rows: [older], rowCount: 1 };
    } },
  });
  assert.equal((await ledger.completeIosDistribution({ sourceSha: sha, workerId: "worker-2" })).source_sha, sha);
  assert.doesNotMatch(queries[0].sql, /completed_at\s*=/i);
  assert.doesNotMatch(queries[0].sql, /progression_order\s*=/i);
  assert.match(queries[0].sql, /IOS_TESTFLIGHT_DISTRIBUTION'[\s\S]*state='FINISHED'/);
  assert.equal((await ledger.lastSuccessful()).source_sha, newer.source_sha);
  assert.match(queries[1].sql, /progression_order IS NOT NULL ORDER BY progression_order DESC/);
});

test("latest delivered native baseline follows platform completion rather than aggregate release completion", async () => {
  const queries = [];
  const delivered = { source_sha: "b".repeat(40), state: "DELIVERING", native_build_id: "ios-build-10", native_fingerprint: "f".repeat(40) };
  const ledger = new PreviewLedger("postgres://localhost/test", {
    pool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [delivered], rowCount: 1 }; } },
  });
  assert.equal((await ledger.lastSuccessfulNative("ios")).source_sha, delivered.source_sha);
  assert.match(queries[0].sql, /preview_delivered_native_state/);
  assert.doesNotMatch(queries[0].sql, /ORDER BY/);
  assert.deepEqual(queries[0].values, ["ios"]);
});

test("current dev native drift outranks a stale historical TestFlight distribution", async () => {
  const current = "c".repeat(40);
  const historical = "a".repeat(40);
  let nativeClaims = 0;
  let distributionClaims = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: null, workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => ({ source_sha: current, evidence: { fingerprints: { ios: "f".repeat(40), android: "e".repeat(40) } } }),
      releaseBySha: async () => ({ source_sha: current, evidence: { fingerprints: { ios: "f".repeat(40), android: "e".repeat(40) } } }),
      lastSuccessfulNative: async (platform) => ({ source_sha: "b".repeat(40), native_build_id: `${platform}-10`, native_fingerprint: platform === "ios" ? "d".repeat(40) : "e".repeat(40), build_number: "10" }),
      pendingIosDistribution: async () => ({ source_sha: historical, ios_build_id: "missing-build-9" }),
      claimNativeDrift: async ({ sourceSha }) => { nativeClaims += 1; return { source_sha: sourceSha, state: "COMPLETE" }; },
      claimIosDistribution: async () => { distributionClaims += 1; }, transition: async () => {},
    },
    github: { latestDevSha: async () => current, compare: async (base) => base === "b".repeat(40) ? ["apps/mobile/app.config.ts"] : [] , report: async () => {} },
    render: {}, sleep: async () => {},
  });
  orchestrator.process = async (record, previous, lease, delivered, targets) => ({ state: "COMPLETE", source_sha: record.source_sha, targets });
  const result = await orchestrator.cycle();
  assert.equal(result.source_sha, current);
  assert.deepEqual(result.targets, ["IOS_NATIVE", "ANDROID_NATIVE"]);
  assert.equal(nativeClaims, 1);
  assert.equal(distributionClaims, 0);
});

test("mixed-version deploy promotes only the completed current dev row before historical distribution recovery", async () => {
  const historical = sha;
  const previousSha = "b".repeat(40);
  const currentDevSha = "c".repeat(40);
  let reconciliations = 0;
  let distributionClaims = 0;
  const ledger = {
    lastSuccessful: async () => ({ source_sha: previousSha, progression_order: 20 }),
    completedCurrentDevProgressionCandidate: async (sourceSha) => {
      assert.equal(sourceSha, currentDevSha);
      return { source_sha: currentDevSha, previous_sha: "a".repeat(40), state: "COMPLETE", progression_order: null };
    },
    reconcileCompletedCurrentDevProgression: async ({ sourceSha, storedPreviousSha, latestProgressionSha }) => {
      reconciliations += 1;
      assert.equal(sourceSha, currentDevSha);
      assert.equal(storedPreviousSha, "a".repeat(40));
      assert.equal(latestProgressionSha, previousSha);
      return { source_sha: currentDevSha, previous_sha: storedPreviousSha, state: "COMPLETE", progression_order: 21 };
    },
    pendingIosDistribution: async () => ({ source_sha: historical, ios_build_id: "build-9" }),
    requiresIosDistribution: async (sourceSha) => sourceSha === historical,
    claimIosDistribution: async ({ sourceSha }) => {
      distributionClaims += 1;
      assert.equal(sourceSha, historical);
      return { source_sha: historical, state: "DETECTED" };
    },
    transition: async () => {},
  };
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: null, workerId: "test", leaseMs: 60_000 },
    ledger,
    github: {
      latestDevSha: async () => currentDevSha,
      compare: async (base, head) => {
        assert.ok(["a".repeat(40), previousSha].includes(base));
        assert.equal(head, currentDevSha);
        return [];
      },
      report: async () => {},
    },
    render: {}, sleep: async () => {},
  });
  orchestrator.reconcileIosDistribution = async (record) => ({ ...record, state: "COMPLETE" });

  const result = await orchestrator.cycle();
  assert.equal(result.source_sha, historical);
  assert.equal(reconciliations, 1);
  assert.equal(distributionClaims, 1);
});

test("current-dev progression repair is chain-bound and cannot promote a delayed historical side effect", async () => {
  const queries = [];
  const ledger = new PreviewLedger("postgres://localhost/test", {
    pool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [], rowCount: 0 }; } },
  });
  assert.equal(await ledger.completedCurrentDevProgressionCandidate("c".repeat(40)), null);
  assert.match(queries[0].sql, /release\.source_sha=\$1 AND release\.state='COMPLETE'/);
  assert.match(queries[0].sql, /release\.progression_order IS NULL/);
  assert.match(queries[0].sql, /IOS_TESTFLIGHT_DISTRIBUTION'[\s\S]*state='FINISHED'/);
  assert.deepEqual(queries[0].values, ["c".repeat(40)]);
});

test("current-dev progression repair is atomic against baseline movement and excludes finished distribution rows", async () => {
  const queries = [];
  const ledger = new PreviewLedger("postgres://localhost/test", {
    pool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [], rowCount: 0 }; } },
  });
  assert.equal(await ledger.reconcileCompletedCurrentDevProgression({
    sourceSha: "d".repeat(40),
    storedPreviousSha: "b".repeat(40),
    latestProgressionSha: "c".repeat(40),
  }), null);
  assert.match(queries[0].sql, /release\.source_sha=\$1/);
  assert.match(queries[0].sql, /release\.previous_sha=\$2/);
  assert.match(queries[0].sql, /\$3=\([\s\S]*ORDER BY latest\.progression_order DESC LIMIT 1/);
  assert.match(queries[0].sql, /IOS_TESTFLIGHT_DISTRIBUTION'[\s\S]*state='FINISHED'/);
  assert.deepEqual(queries[0].values, ["d".repeat(40), "b".repeat(40), "c".repeat(40)]);
});

test("progression repair rejects a non-ancestor stored baseline before mutating the ledger", async () => {
  const currentDevSha = "d".repeat(40);
  let repairs = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: null, workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => ({ source_sha: "c".repeat(40), progression_order: 21 }),
      completedCurrentDevProgressionCandidate: async () => ({ source_sha: currentDevSha, previous_sha: "b".repeat(40), state: "COMPLETE" }),
      reconcileCompletedCurrentDevProgression: async () => { repairs += 1; return null; },
    },
    github: {
      latestDevSha: async () => currentDevSha,
      compare: async (base) => { if (base === "b".repeat(40)) throw new Error("Target SHA is not a forward dev descendant."); return []; },
    },
    render: {}, sleep: async () => {},
  });
  await assert.rejects(orchestrator.cycle(), /not a forward dev descendant/);
  assert.equal(repairs, 0);
});

test("progression repair rejects a latest ordinary baseline outside current dev ancestry", async () => {
  const currentDevSha = "d".repeat(40);
  let repairs = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: null, workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => ({ source_sha: "c".repeat(40), progression_order: 21 }),
      completedCurrentDevProgressionCandidate: async () => ({ source_sha: currentDevSha, previous_sha: "b".repeat(40), state: "COMPLETE" }),
      reconcileCompletedCurrentDevProgression: async () => { repairs += 1; return null; },
    },
    github: {
      latestDevSha: async () => currentDevSha,
      compare: async (base) => { if (base === "c".repeat(40)) throw new Error("Target SHA is not a forward dev descendant."); return []; },
    },
    render: {}, sleep: async () => {},
  });
  await assert.rejects(orchestrator.cycle(), /not a forward dev descendant/);
  assert.equal(repairs, 0);
});

test("processing timeout retries the same durable TestFlight distribution action", async () => {
  let claims = 0;
  let processed = 0;
  const record = { source_sha: sha, state: "FAILED" };
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: null, workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => ({ source_sha: sha, evidence: { fingerprints: {} } }),
      pendingIosDistribution: async () => ({ source_sha: sha, ios_build_id: "build-1" }),
      lastSuccessfulNative: async () => null,
      requiresIosDistribution: async () => true,
      claimIosDistribution: async () => { claims += 1; return record; },
      transition: async () => {},
    },
    github: { latestDevSha: async () => sha, report: async () => {} }, render: {}, sleep: async () => {},
  });
  orchestrator.reconcileIosDistribution = async () => { processed += 1; return { state: "COMPLETE" }; };
  assert.equal((await orchestrator.cycle()).state, "COMPLETE");
  assert.equal(claims, 1);
  assert.equal(processed, 1);
});

test("Apple request failure marks the release failed and the next cycle reclaims it", async () => {
  let state = "DELIVERING";
  let processAttempts = 0;
  let distributionClaims = 0;
  const ledger = {
    lastSuccessful: async () => ({ source_sha: sha, evidence: { fingerprints: {} } }),
    pendingIosDistribution: async () => ({ source_sha: sha, ios_build_id: "build-1" }),
    lastSuccessfulNative: async () => null,
    requiresIosDistribution: async () => true,
    claimIosDistribution: async () => { distributionClaims += 1; state = "DETECTED"; return { source_sha: sha, state }; },
    transition: async (_sourceSha, _workerId, _fromStates, next) => { state = next; return { source_sha: sha, state }; },
  };
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: null, workerId: "test", leaseMs: 60_000 },
    ledger, github: { latestDevSha: async () => sha, report: async () => {} }, render: {}, sleep: async () => {},
  });
  orchestrator.reconcileIosDistribution = async () => {
    processAttempts += 1;
    if (processAttempts === 1) throw new Error("Apple HTTP 503");
    return { source_sha: sha, state: "COMPLETE" };
  };
  await assert.rejects(orchestrator.cycle(), /Apple HTTP 503/);
  assert.equal(state, "FAILED");
  assert.equal((await orchestrator.cycle()).state, "COMPLETE");
  assert.equal(distributionClaims, 2);
});

test("delayed distribution for A cannot displace B as the baseline for new SHA C", async () => {
  const older = sha;
  const newer = "b".repeat(40);
  const next = "c".repeat(40);
  let currentDev = newer;
  let pending = { source_sha: older, ios_build_id: "build-1" };
  const ordinaryBaseline = { source_sha: newer, evidence: { fingerprints: {} } };
  const observedBaselines = [];
  const claims = [];
  const ledger = {
    lastSuccessful: async () => ordinaryBaseline,
    pendingIosDistribution: async () => pending,
    requiresIosDistribution: async (sourceSha) => sourceSha === older && pending !== null,
    lastSuccessfulNative: async () => null,
    claimIosDistribution: async () => ({ source_sha: older, state: "DETECTED" }),
    claim: async ({ sourceSha }) => { claims.push(sourceSha); return { source_sha: sourceSha, state: "DETECTED" }; },
    transition: async () => {},
  };
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: null, workerId: "test", leaseMs: 60_000 },
    ledger,
    github: { latestDevSha: async () => currentDev, compare: async () => {}, report: async () => {} }, render: {}, sleep: async () => {},
  });
  orchestrator.reconcileIosDistribution = async () => { pending = null; return { source_sha: older, state: "COMPLETE" }; };
  orchestrator.process = async (record, previous) => { observedBaselines.push(previous?.source_sha); return { source_sha: record.source_sha, state: "COMPLETE" }; };

  assert.equal((await orchestrator.cycle()).source_sha, older);
  currentDev = next;
  assert.equal((await orchestrator.cycle()).source_sha, next);
  assert.deepEqual(observedBaselines, [newer]);
  assert.deepEqual(claims, [next]);
});

test("an older failed distribution does not block evaluation of a newer dev SHA", async () => {
  const newerDev = "d".repeat(40);
  let distributionClaims = 0;
  let ordinaryClaims = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", iosNativeBackfillSha: null, workerId: "test", leaseMs: 60_000 },
    ledger: {
      lastSuccessful: async () => ({ source_sha: "b".repeat(40), evidence: { fingerprints: {} } }),
      pendingIosDistribution: async () => ({ source_sha: sha, ios_build_id: "build-1" }),
      lastSuccessfulNative: async () => null,
      requiresIosDistribution: async () => false,
      claimIosDistribution: async () => { distributionClaims += 1; return null; },
      claim: async () => { ordinaryClaims += 1; return { source_sha: newerDev, state: "DETECTED" }; },
      transition: async () => {},
    },
    github: { latestDevSha: async () => newerDev, report: async () => {} }, render: {}, sleep: async () => {},
  });
  orchestrator.process = async (record) => ({ source_sha: record.source_sha, state: "COMPLETE" });
  assert.equal((await orchestrator.cycle()).source_sha, newerDev);
  assert.equal(ordinaryClaims, 1);
  assert.equal(distributionClaims, 0);
});

test("App Store Connect resolves the exact Preview app, internal group, and version/build identity", async () => {
  const responses = [
    { data: appleContext.app },
    { data: [appleContext.group] },
    { data: [{ type: "builds", id: "apple-build-9", attributes: { version: "9", processingState: "VALID" }, relationships: { preReleaseVersion: { data: { type: "preReleaseVersions", id: "pre-1" } } } }], included: [{ type: "preReleaseVersions", id: "pre-1", attributes: { version: "0.3.0", platform: "IOS" } }] },
  ];
  const client = appleClient(async () => ({ ok: true, status: 200, text: async () => JSON.stringify(responses.shift()) }));
  assert.equal((await client.previewContext()).group.id, "group-preview");
  assert.equal((await client.resolveBuild({ version: "0.3.0", buildNumber: "9" })).build.id, "apple-build-9");
});

test("App Store Connect fails closed for the wrong group/app and ambiguous exact builds", async () => {
  const wrongApp = appleClient(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ data: { ...appleContext.app, attributes: { bundleId: "com.kurioticket.app" } } }) }));
  await assert.rejects(wrongApp.previewContext(), /identity mismatch/);
  const responses = [{ data: appleContext.app }, { data: [{ ...appleContext.group, attributes: { ...appleContext.group.attributes, isInternalGroup: false } }] }];
  const wrongGroup = appleClient(async () => ({ ok: true, status: 200, text: async () => JSON.stringify(responses.shift()) }));
  await assert.rejects(wrongGroup.previewContext(), /missing, ambiguous, or mismatched/);
  const duplicate = { type: "builds", id: "one", attributes: { version: "9", processingState: "VALID" }, relationships: { preReleaseVersion: { data: { id: "pre-1" } } } };
  const ambiguous = appleClient(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ data: [duplicate, { ...duplicate, id: "two" }], included: [{ type: "preReleaseVersions", id: "pre-1", attributes: { version: "0.3.0", platform: "IOS" } }] }) }));
  await assert.rejects(ambiguous.resolveBuild({ version: "0.3.0", buildNumber: "9" }), /multiple exact/);
});

test("processed Apple build missing from the internal group is associated once and verified", async () => {
  let associated = false;
  let posts = 0;
  const actions = [];
  const orchestrator = new PreviewOrchestrator({ config: {}, ledger: { recordAction: async (action) => { actions.push(action); return action; } }, github: {}, render: {}, sleep: async () => {}, appleFactory: () => finishedApple({ isAssociated: async () => associated, associate: async () => { posts += 1; associated = true; } }) });
  const result = await orchestrator.distributeIosToInternalGroup({ sha, build: { id: "build-1", appVersion: "0.3.0", appBuildVersion: "9" }, current: { appVersion: "0.3.0", appBuildVersion: "9" }, submission: { id: "sub-1" }, lease: { checkpoint: async () => {} } });
  assert.equal(posts, 1);
  assert.equal(result.state, "FINISHED");
  assert.deepEqual(actions.map(({ state }) => state), ["PLANNED", "FINISHED"]);
});

test("existing group membership is adopted without a duplicate POST", async () => {
  let posts = 0;
  const actions = [];
  const orchestrator = new PreviewOrchestrator({ config: {}, ledger: { recordAction: async (action) => { actions.push(action); return action; } }, github: {}, render: {}, sleep: async () => {}, appleFactory: () => finishedApple({ associate: async () => { posts += 1; } }) });
  await orchestrator.distributeIosToInternalGroup({ sha, build: { id: "build-1", appVersion: "0.3.0", appBuildVersion: "9" }, current: { appVersion: "0.3.0", appBuildVersion: "9" }, submission: { id: "sub-1" }, lease: { checkpoint: async () => {} } });
  assert.equal(posts, 0);
  assert.deepEqual(actions.map(({ state }) => state), ["FINISHED"]);
});

test("accepted Apple association with a lost response is reconciled on readback", async () => {
  let reads = 0;
  const orchestrator = new PreviewOrchestrator({ config: {}, ledger: { recordAction: async (action) => action }, github: {}, render: {}, sleep: async () => {}, appleFactory: () => finishedApple({ isAssociated: async () => ++reads > 1, associate: async () => { throw new Error("connection reset"); } }) });
  const result = await orchestrator.distributeIosToInternalGroup({ sha, build: { id: "build-1", appVersion: "0.3.0", appBuildVersion: "9" }, current: { appVersion: "0.3.0", appBuildVersion: "9" }, submission: { id: "sub-1" }, lease: { checkpoint: async () => {} } });
  assert.equal(result.state, "FINISHED");
});

test("distribution retry keeps one durable action and adopts membership before writing again", async () => {
  let associated = false;
  let posts = 0;
  const durableActions = new Map();
  const ledger = { recordAction: async (action) => { durableActions.set(`${action.kind}:${action.identityKey}`, action); return action; } };
  const orchestrator = new PreviewOrchestrator({
    config: {}, ledger, github: {}, render: {}, sleep: async () => {},
    appleFactory: () => finishedApple({
      isAssociated: async () => associated,
      associate: async () => {
        posts += 1;
        if (posts === 1) throw new Error("Apple HTTP 503");
        associated = true;
      },
    }),
  });
  const input = { sha, build: { id: "build-1", appVersion: "0.3.0", appBuildVersion: "9" }, current: { appVersion: "0.3.0", appBuildVersion: "9" }, submission: { id: "sub-1" }, lease: { checkpoint: async () => {} } };
  await assert.rejects(orchestrator.distributeIosToInternalGroup(input), /Apple HTTP 503/);
  await orchestrator.distributeIosToInternalGroup(input);
  assert.equal(posts, 2);
  assert.equal(durableActions.size, 1);
  assert.equal([...durableActions.values()][0].state, "FINISHED");
  await orchestrator.distributeIosToInternalGroup(input);
  assert.equal(posts, 2);
  assert.equal(durableActions.size, 1);
});

test("submission completion alone cannot satisfy the iOS native baseline", () => {
  const sql = readFileSync(resolve(repositoryRoot, "services/preview-release/ledger.mjs"), "utf8");
  assert.match(sql, /IOS_TESTFLIGHT_DISTRIBUTION'[\s\S]*?state='FINISHED'/);
});

test("exact-checkout preparation reuses the immutable build dependency trees", async () => {
  const copies = [];
  await prepareCheckout(repositoryRoot, {
    dependencyRoot: repositoryRoot,
    commandRunner: async (...args) => { copies.push(args); },
  });
  assert.deepEqual(copies.map(([command, args]) => [command, args]), [
    ["cp", ["-al", "--", resolve(repositoryRoot, "apps/mobile/node_modules"), resolve(repositoryRoot, "apps/mobile/node_modules")]],
  ]);
});

test("exact checkouts are created on the selected worker artifact filesystem", async () => {
  const workspace = await mkdtemp(resolve(tmpdir(), "preview-workspace-"));
  try {
    const checkout = await createExactCheckoutDirectory(workspace);
    assert.equal(resolve(checkout, ".."), resolve(workspace));
    assert.match(checkout, /\.kurioticket-preview-/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("exact change-set history fetch is repeatable after a checkout becomes complete", () => {
  const source = readFileSync(resolve(repositoryRoot, "services/preview-release/remote-clients.mjs"), "utf8");
  assert.match(source, /rev-parse", "--is-shallow-repository/);
  assert.match(source, /shallowOutput\.trim\(\) === "true"/);
  assert.match(source, /\["fetch", "--quiet", "origin", PREVIEW_IDENTITY\.branch\]/);
});

test("exact-checkout preparation fails closed when dependency manifests differ", async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), "preview-dependencies-"));
  try {
    await mkdir(resolve(temporary, "apps/mobile"), { recursive: true });
    for (const manifest of ["package.json", "package-lock.json", "apps/mobile/package.json", "apps/mobile/package-lock.json"]) {
      await copyFile(resolve(repositoryRoot, manifest), resolve(temporary, manifest));
    }
    await writeFile(resolve(temporary, "apps/mobile/package.json"), "{}\n");
    await assert.rejects(
      prepareCheckout(temporary, { dependencyRoot: repositoryRoot, commandRunner: async () => {} }),
      /dependency manifest differs.*apps\/mobile\/package\.json/,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("web recovery adopts the recorded Render deploy without creating a duplicate", async () => {
  let creates = 0;
  const actions = [];
  const deploy = { id: "dep-existing", status: "live", commit: { id: sha } };
  const orchestrator = new PreviewOrchestrator({
    config: {},
    ledger: {
      getAction: async () => ({ remote_id: deploy.id }),
      recordAction: async (action) => { actions.push(action); return action; },
    },
    github: {},
    render: {
      createDeploy: async () => { creates += 1; return deploy; },
      getDeploy: async (id) => ({ ...deploy, id }),
    },
    stagingWait: async ({ targetSha }) => ({ ready: true, commitSha: targetSha }),
    sleep: async () => {},
  });
  const result = await orchestrator.deliverWeb(sha, { checkpoint: async () => {} });
  assert.equal(creates, 0);
  assert.equal(result.deployId, deploy.id);
  assert.equal(result.deployedSha, sha);
  assert.deepEqual(actions.map(({ remoteId }) => remoteId), [deploy.id, deploy.id]);
  assert.equal(actions.at(-1).state, "LIVE");
});

test("web recovery replaces one terminal recorded deploy through an atomic ledger rollover", async () => {
  let creates = 0;
  const recorded = { id: "dep-failed", status: "build_failed", commit: { id: sha } };
  const replacement = { id: "dep-replacement", status: "live", commit: { id: sha } };
  const actions = [];
  const replacements = [];
  const orchestrator = new PreviewOrchestrator({
    config: {},
    ledger: {
      getAction: async () => ({ remote_id: recorded.id }),
      recordAction: async (action) => { actions.push(action); return action; },
      replaceTerminalAction: async (action) => { replacements.push(action); return action; },
    },
    github: {},
    render: {
      createDeploy: async () => { creates += 1; return replacement; },
      findDeploysBySha: async () => [recorded],
      getDeploy: async (id) => id === recorded.id ? recorded : replacement,
    },
    stagingWait: async ({ targetSha }) => ({ ready: true, commitSha: targetSha }),
    sleep: async () => {},
  });
  const result = await orchestrator.deliverWeb(sha, { checkpoint: async () => {} });
  assert.equal(creates, 1);
  assert.equal(actions[0].state, "BUILD_FAILED");
  assert.equal(replacements.length, 1);
  assert.equal(replacements[0].expectedRemoteId, recorded.id);
  assert.equal(replacements[0].remoteId, replacement.id);
  assert.equal(result.deployId, replacement.id);
});

test("legacy Preview deployment workflows are absent and Production delivery is preserved", () => {
  const removed = ["preview-dev-delivery.yml", "ios-preview-build.yml", "ios-preview-testflight-submit.yml", "mobile-preview-update.yml", "android-preview-build.yml", "android-preview-ota.yml"];
  for (const file of removed) assert.equal(existsSync(resolve(repositoryRoot, ".github/workflows", file)), false, file);
  assert.equal(existsSync(resolve(repositoryRoot, ".github/workflows/pr-required-gates.yml")), true);
  assert.equal(existsSync(resolve(repositoryRoot, ".github/workflows/android-production-delivery.yml")), true);
  assert.equal(existsSync(resolve(repositoryRoot, ".github/workflows/mobile-production-update.yml")), true);
});

test("Render blueprint matches the active auto-deployed worker and keeps staging deployment orchestrated", () => {
  const render = readFileSync(resolve(repositoryRoot, "render.yaml"), "utf8");
  assert.match(render, /type: worker\s+[\s\S]*?name: kurioticket-preview-release-worker/);
  assert.match(render, /name: kurioticket-preview-release-worker[\s\S]*?autoDeploy: true/);
  assert.match(render, /PREVIEW_RELEASE_MODE\s+value: active/);
  assert.match(render, /PREVIEW_POLL_INTERVAL_MS\s+value: 60000/);
  assert.match(render, /PREVIEW_LEASE_MS\s+value: 90000/);
  assert.match(render, /name: kurioticket-preview-release-db/);
  assert.match(render, /name: kurioticket-web-staging[\s\S]*?autoDeploy: false/);
  for (const path of PREVIEW_WORKER_BUILD_PATHS) assert.match(render, new RegExp(`- ${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("ledger schema enforces per-SHA and per-remote-operation uniqueness", () => {
  const sql = readFileSync(resolve(repositoryRoot, "services/preview-release/sql/001_init.sql"), "utf8");
  assert.match(sql, /source_sha text PRIMARY KEY/);
  assert.match(sql, /UNIQUE \(kind, identity_key\)/);
  assert.match(sql, /one_render_per_sha/);
  assert.match(sql, /one_ota_per_sha/);
  assert.match(sql, /one_ios_build_per_sha/);
  assert.match(sql, /one_submission_per_build/);
  assert.match(sql, /preview_release_progression_order_seq/);
  assert.match(sql, /progression_order_unique/);
});

test("new release service pins supported no-wait auto-submit and exact-SHA reconciliation commands", () => {
  const client = readFileSync(resolve(repositoryRoot, "services/preview-release/remote-clients.mjs"), "utf8");
  assert.match(client, /eas-cli@16\.17\.4/);
  assert.match(client, /"--git-commit-hash", targetSha/);
  assert.match(client, /"--freeze-credentials", "--no-wait", "--auto-submit-with-profile", "preview"/);
  assert.match(client, /"--platform", "android"[\s\S]*?"--freeze-credentials", "--no-wait"/);
  assert.match(client, /"update:list", "--branch", "preview"/);
  assert.match(client, /APP_VARIANT: "preview"/);
  assert.match(client, /APP_BUILD_MODE: "release"/);
  assert.match(client, /EXPO_PUBLIC_API_BASE_URL: PREVIEW_IDENTITY\.apiOrigin/);
  assert.match(client, /process\.platform === "win32" \? "npx\.cmd" : "npx"/);
  assert.match(client, /"env:exec", "preview", fingerprintCommand/);
  assert.match(client, /fingerprint:generate --build-profile preview --platform \$\{platform\}/);
  assert.match(client, /"fingerprint:compare", "--build-id", buildId, "--build-id", buildId/);
  assert.match(client, /EXPO_TOKEN: expoToken,[\s\S]*?APP_VARIANT: "preview",[\s\S]*?NODE_OPTIONS: "--max-old-space-size=192",[\s\S]*?MALLOC_ARENA_MAX: "2"/);
  assert.match(client, /preview-release-fingerprint-started/);
  assert.match(client, /preview-release-fingerprint-complete/);
  assert.match(client, /const isUpdatePublish = args\[1\] === "update"/);
  assert.match(client, /--max-old-space-size=\$\{isUpdatePublish \? 512 : 128\}/);
  assert.match(client, /timeout: isUpdatePublish \? 20 \* 60 \* 1000 : 5 \* 60 \* 1000/);
  assert.match(client, /MALLOC_ARENA_MAX: "2"/);
  assert.match(client, /preview-release-eas-command-started/);
  assert.match(client, /preview-release-eas-command-complete/);
  assert.match(client, /timeout: 5 \* 60 \* 1000/);
  assert.doesNotMatch(client, /exec\(command, \["fingerprint", "fingerprint:generate"/);
  assert.doesNotMatch(client, /production-0\.3\.0|com\.kurioticket\.app["']/);
});

test("EAS commands isolate every temporary path inside the command-owned directory", () => {
  const environment = easCommandEnvironment({
    baseEnvironment: { PATH: "test-path", TMPDIR: "/stale/tmp", TMP: "/stale/tmp", TEMP: "/stale/tmp" },
    directory: "/tmp/kurioticket-eas-owned",
    expoToken: "expo-token",
    isUpdatePublish: true,
  });

  assert.equal(environment.PATH, "test-path");
  assert.equal(environment.CI, "1");
  assert.equal(environment.TMPDIR, "/tmp/kurioticket-eas-owned");
  assert.equal(environment.TMP, "/tmp/kurioticket-eas-owned");
  assert.equal(environment.TEMP, "/tmp/kurioticket-eas-owned");
  assert.equal(environment.NODE_OPTIONS, "--max-old-space-size=512");
  assert.equal(environment.EXPO_TOKEN, "expo-token");
});

test("OTA delivery publishes platforms sequentially and resumes only a missing platform", async () => {
  const published = [];
  const actions = [];
  const iosHistory = { branch: "preview", runtimeVersion: "preview-0.3.0", group: "ios-existing", platforms: ["ios"], message: `Automatic Preview iOS OTA for ${sha}; audit run 0` };
  const orchestrator = new PreviewOrchestrator({
    config: {},
    ledger: { recordAction: async (action) => { actions.push(action); return action; } },
    github: {}, render: {},
    easFactory: () => ({
      listUpdates: async () => [iosHistory],
      publishUpdate: async (message, platform, expectedRuntime) => {
        published.push(platform);
        return [{ id: `${platform}-new`, group: `${platform}-group`, branch: "preview", runtimeVersion: expectedRuntime, platforms: [platform], message }];
      },
    }),
  });
  const result = await orchestrator.deliverOta(sha, repositoryRoot, { checkpoint: async () => {} });
  assert.deepEqual(published, ["android"]);
  assert.deepEqual(result.updateIds, ["ios-existing", "android-new"]);
  assert.equal(actions[0].state, "PUBLISHED");
  assert.equal(actions[0].remoteId, "ios=ios-existing,android=android-group");
});

test("OTA publication and normalized history replay use one durable identity without republishing", async () => {
  const durable = new Map();
  const published = [];
  let history = [];
  const ledger = {
    getAction: async (_kind, identityKey) => durable.get(identityKey) ?? null,
    recordAction: async (action) => {
      const existing = durable.get(action.identityKey);
      if (existing?.remoteId && existing.remoteId !== action.remoteId) throw new Error(`Conflicting remote identity for OTA:${action.identityKey}.`);
      durable.set(action.identityKey, action);
      return action;
    },
  };
  const orchestrator = new PreviewOrchestrator({
    config: {}, ledger, github: {}, render: {},
    easFactory: () => ({
      listUpdates: async () => history,
      publishUpdate: async (message, platform, expectedRuntime) => {
        published.push(platform);
        return [{ id: `${platform}-update`, group: `${platform}-group`, branch: "preview", runtimeVersion: expectedRuntime, platform, platforms: [platform], message }];
      },
    }),
  });

  await orchestrator.deliverOta(sha, repositoryRoot, { checkpoint: async () => {} });
  history = normalizePreviewUpdatePage({ name: "preview", currentPage: [
    { branch: "preview", runtimeVersion: "preview-0.3.0", group: "ios-group", platforms: "ios", message: `Automatic Preview iOS OTA for ${sha}; audit run 0` },
    { branch: "preview", runtimeVersion: "preview-0.3.0", group: "android-group", platforms: "android", message: `Automatic Preview Android OTA for ${sha}; audit run 0` },
  ] });
  await orchestrator.deliverOta(sha, repositoryRoot, { checkpoint: async () => {} });

  assert.deepEqual(published, ["ios", "android"]);
  assert.equal([...durable.values()][0].remoteId, "ios=ios-group,android=android-group");

  history = [
    { ...history[0], group: "different-ios-group" },
    history[1],
  ];
  await assert.rejects(
    orchestrator.deliverOta(sha, repositoryRoot, { checkpoint: async () => {} }),
    /Conflicting remote identity/,
  );
  assert.deepEqual(published, ["ios", "android"]);
});

test("coalesced native delivery can publish an OTA overlay only to affected platforms", async () => {
  const published = [];
  const orchestrator = new PreviewOrchestrator({
    config: {},
    ledger: { recordAction: async (action) => action },
    github: {}, render: {},
    easFactory: () => ({
      listUpdates: async () => [],
      publishUpdate: async (_message, platform, expectedRuntime) => {
        published.push(platform);
        return [{ id: `${platform}-overlay`, group: `${platform}-overlay-group`, branch: "preview", runtimeVersion: expectedRuntime, platforms: [platform], message: `Automatic Preview ${platform === "ios" ? "iOS" : "Android"} OTA for ${sha}; audit run 0` }];
      },
    }),
  });
  const result = await orchestrator.deliverOta(sha, repositoryRoot, { checkpoint: async () => {} }, ["ios"]);
  assert.deepEqual(published, ["ios"]);
  assert.deepEqual(result.updateIds, ["ios-overlay"]);
});

test("conservative native range coalesces onto fingerprint-compatible builds and completes OTA delivery", async () => {
  const targetSha = "f".repeat(40);
  const previousSha = "3".repeat(40);
  const artifactSha = "6".repeat(40);
  const fingerprints = { ios: "a".repeat(40), android: "e".repeat(40) };
  const rangeFiles = ["package.json", "apps/mobile/src/features/home/HomepageAdventureDiscovery.tsx"];
  const classification = classifyChangeSet(rangeFiles);
  assert.equal(classification.classification, "ANDROID_NATIVE+IOS_NATIVE+WEB");
  assert.deepEqual(classification.otaCandidates, ["apps/mobile/src/features/home/HomepageAdventureDiscovery.tsx"]);

  const transitions = [];
  const published = [];
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "active", workerId: "test", repository: PREVIEW_IDENTITY.repository, githubReadToken: "token" },
    ledger: {
      transition: async (sourceSha, _workerId, _from, state, patch = {}) => {
        const value = { source_sha: sourceSha, state, ...patch };
        transitions.push(value);
        return value;
      },
    },
    github: { report: async () => {} },
    render: {},
    checkoutFactory: async () => ({ directory: repositoryRoot, cleanup: async () => {} }),
    changeSetFactory: async ({ previousSha: base }) => {
      assert.ok([previousSha, artifactSha].includes(base));
      return rangeFiles;
    },
    prepareCheckoutFactory: async () => {},
    identityFactory: async () => ({ appName: PREVIEW_IDENTITY.appName, bundleIdentifier: PREVIEW_IDENTITY.bundleIdentifier, scheme: PREVIEW_IDENTITY.scheme, projectId: PREVIEW_IDENTITY.easProjectId, profile: PREVIEW_IDENTITY.buildProfile, channel: PREVIEW_IDENTITY.channel, runtimePolicy: PREVIEW_IDENTITY.runtimePolicy, apiOrigin: PREVIEW_IDENTITY.apiOrigin }),
    fingerprintsFactory: async () => fingerprints,
  });
  orchestrator.deliverWeb = async () => ({ deployId: "staging-deploy", deployedSha: targetSha, status: "live" });
  orchestrator.deliverIos = async (_sha, _cwd, _lease, fingerprint) => ({ buildId: "ios-build", nativeArtifactSourceSha: artifactSha, nativeFingerprint: fingerprint });
  orchestrator.deliverAndroid = async (_sha, _cwd, _lease, fingerprint) => ({ buildId: "android-build", nativeArtifactSourceSha: artifactSha, nativeFingerprint: fingerprint });
  orchestrator.deliverOta = async (_sha, _cwd, _lease, platforms, runtimeByPlatform) => {
    published.push(...platforms.map((platform) => ({ platform, runtime: runtimeByPlatform[platform] })));
    return { updateIds: platforms.map((platform) => `${platform}-update`), runtimes: runtimeByPlatform, channel: "preview" };
  };

  const result = await orchestrator.process(
    { source_sha: targetSha, state: "DETECTED" },
    { source_sha: previousSha, evidence: { fingerprints } },
    { checkpoint: async () => {} },
    {
      ios: { sourceSha: artifactSha, buildId: "ios-build", fingerprint: fingerprints.ios },
      android: { sourceSha: artifactSha, buildId: "android-build", fingerprint: fingerprints.android },
    },
  );

  assert.equal(result.state, "COMPLETE");
  assert.deepEqual(published, [
    { platform: "ios", runtime: fingerprints.ios },
    { platform: "android", runtime: fingerprints.android },
  ]);
  assert.deepEqual(result.evidence.coalescedOtaPlatforms, ["ios", "android"]);
  assert.deepEqual(transitions.map(({ state }) => state), ["VALIDATING", "PLANNED", "DELIVERING", "COMPLETE"]);
});

test("coalesced OTA compatibility fails closed without exact valid fingerprint equality", () => {
  const valid = "a".repeat(40);
  const base = {
    platform: "ios",
    artifactSourceSha: "6".repeat(40),
    targetSourceSha: "f".repeat(40),
    artifactFingerprint: valid,
    targetFingerprint: valid,
    overlay: classifyChangeSet(["package.json", "apps/mobile/src/features/home/HomepageAdventureDiscovery.tsx"]),
  };
  assert.equal(assertCoalescedOtaCompatibility(base), true);
  assert.throws(() => assertCoalescedOtaCompatibility({ ...base, targetFingerprint: "b".repeat(40) }), /does not match/);
  assert.throws(() => assertCoalescedOtaCompatibility({ ...base, platform: "android", targetFingerprint: "b".repeat(40) }), /does not match/);
  assert.throws(() => assertCoalescedOtaCompatibility({ ...base, targetFingerprint: undefined }), /target .* no valid canonical fingerprint/);
  assert.throws(() => assertCoalescedOtaCompatibility({ ...base, artifactFingerprint: undefined }), /artifact .* no valid canonical fingerprint/);
  assert.throws(() => assertCoalescedOtaCompatibility({ ...base, targetFingerprint: "not-a-fingerprint" }), /target .* no valid canonical fingerprint/);
  assert.throws(() => assertCoalescedOtaCompatibility({ ...base, overlay: classifyChangeSet(["package.json"]) }), /cannot receive a safe OTA overlay/);
  assert.throws(() => assertCoalescedOtaCompatibility({ ...base, overlay: classifyChangeSet(["apps/mobile/unknown.file"]) }), /cannot receive a safe OTA overlay/);
});

test("OTA client rejects all-platform publication and uses bounded sequential export memory", async () => {
  const client = new EasClient({ expoToken: "x", cwd: repositoryRoot, command: "unused" });
  const calls = [];
  client.run = async (args) => { calls.push(args); return [{ id: "update-id", runtimeVersion: "a".repeat(40) }]; };
  await client.publishUpdate("message", "ios", "a".repeat(40));
  assert.equal(calls[0][calls[0].indexOf("--platform") + 1], "ios");
  assert.equal(calls[0][calls[0].indexOf("--environment") + 1], "preview");
  await assert.rejects(client.publishUpdate("message", "all", "a".repeat(40)), /platform is invalid/);
  client.run = async () => [{ id: "wrong-runtime", runtimeVersion: "b".repeat(40) }];
  await assert.rejects(client.publishUpdate("message", "ios", "a".repeat(40)), /runtime does not match/);
  const source = readFileSync(resolve(repositoryRoot, "services/preview-release/remote-clients.mjs"), "utf8");
  assert.match(source, /isUpdatePublish \? 512 : 128/);
});

test("OTA runtime mismatch is recorded once and blocks automatic republication", async () => {
  let action = null;
  let publishes = 0;
  const expectedRuntime = "a".repeat(40);
  const mismatched = { id: "wrong-runtime", group: "wrong-runtime-group", platform: "ios", runtimeVersion: "b".repeat(40) };
  const orchestrator = new PreviewOrchestrator({
    config: {},
    ledger: {
      getAction: async () => action,
      recordAction: async (value) => { action = value; return value; },
    },
    github: {}, render: {},
    easFactory: () => ({
      listUpdates: async () => [],
      publishUpdate: async () => {
        publishes += 1;
        throw new EasUpdateRuntimeMismatchError("ios", expectedRuntime, [mismatched]);
      },
    }),
  });

  await assert.rejects(
    orchestrator.deliverOta(sha, repositoryRoot, { checkpoint: async () => {} }, ["ios"], { ios: expectedRuntime }),
    /runtime does not match/,
  );
  assert.equal(action.state, "RUNTIME_MISMATCH");
  assert.equal(action.remoteId, "ios=wrong-runtime-group");
  assert.deepEqual(action.evidence.updates, [mismatched]);

  await assert.rejects(
    orchestrator.deliverOta(sha, repositoryRoot, { checkpoint: async () => {} }, ["ios"], { ios: expectedRuntime }),
    /automatic republication is blocked/,
  );
  assert.equal(publishes, 1);
});

test("web recovery replaces a terminal exact-SHA deploy discovered before the ledger action exists", async () => {
  let creates = 0;
  const deactivated = { id: "dep-deactivated", status: "deactivated", commit: { id: sha } };
  const replacement = { id: "dep-replacement", status: "live", commit: { id: sha } };
  const actions = [];
  const replacements = [];
  const orchestrator = new PreviewOrchestrator({
    config: {},
    ledger: {
      getAction: async () => null,
      recordAction: async (action) => { actions.push(action); return action; },
      replaceTerminalAction: async (action) => { replacements.push(action); return action; },
    },
    github: {},
    render: {
      createDeploy: async () => { creates += 1; return replacement; },
      findDeploysBySha: async () => [deactivated],
      getDeploy: async (id) => id === deactivated.id ? deactivated : replacement,
    },
    stagingWait: async ({ targetSha }) => ({ ready: true, commitSha: targetSha }),
    sleep: async () => {},
  });
  const result = await orchestrator.deliverWeb(sha, { checkpoint: async () => {} });
  assert.equal(creates, 1);
  assert.equal(actions[0].state, "DEACTIVATED");
  assert.equal(replacements.length, 1);
  assert.equal(replacements[0].expectedRemoteId, deactivated.id);
  assert.equal(result.deployId, replacement.id);
});

test("web delivery adopts exact-SHA Render history before creating a duplicate", async () => {
  let creates = 0;
  const actions = [];
  const deploy = { id: "dep-remote", status: "live", commit: { id: sha } };
  const orchestrator = new PreviewOrchestrator({
    config: {},
    ledger: {
      getAction: async () => null,
      recordAction: async (action) => { actions.push(action); return action; },
    },
    github: {},
    render: {
      findDeploysBySha: async () => [deploy],
      createDeploy: async () => { creates += 1; return deploy; },
      getDeploy: async () => deploy,
    },
    stagingWait: async ({ targetSha }) => ({ ready: true, commitSha: targetSha }),
    sleep: async () => {},
  });
  const result = await orchestrator.deliverWeb(sha, { checkpoint: async () => {} });
  assert.equal(creates, 0);
  assert.equal(result.deployId, deploy.id);
  assert.equal(actions.at(-1).remoteId, deploy.id);
});

test("canonical recovery may reuse dependencies when only root operator scripts differ", async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), "preview-recovery-dependencies-"));
  try {
    await mkdir(resolve(temporary, "apps/mobile"), { recursive: true });
    for (const manifest of ["package.json", "package-lock.json", "apps/mobile/package.json", "apps/mobile/package-lock.json"]) {
      await copyFile(resolve(repositoryRoot, manifest), resolve(temporary, manifest));
    }
    const rootPackagePath = resolve(temporary, "package.json");
    const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
    delete rootPackage.scripts["preview-release:recover-native"];
    await writeFile(rootPackagePath, `${JSON.stringify(rootPackage, null, 2)}\n`);
    await prepareCheckout(temporary, {
      dependencyRoot: repositoryRoot,
      allowRootScriptDrift: true,
      commandRunner: async () => {},
    });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("permanent historical iOS absence is isolated while Android recipients and newer iOS remain eligible", async () => {
  const oldBuildId = "0c750d4a-79e1-42fe-8d1d-6f16e5dab1f6";
  let unavailable = false;
  let oldLookups = 0;
  let cleanup = 0;
  const ledger = {
    getNativeBuildActionForRelease: async () => ({ identity_key: "old-ios", remote_id: oldBuildId }),
    markRemoteObjectUnavailable: async () => { unavailable = true; },
    transition: async () => ({ state: "FAILED" }),
  };
  const historical = new PreviewOrchestrator({
    config: { repository: PREVIEW_IDENTITY.repository, githubReadToken: "x", workerId: "worker" }, ledger, github: {}, render: {},
    checkoutFactory: async () => ({ directory: repositoryRoot, cleanup: async () => { cleanup += 1; } }),
    prepareCheckoutFactory: async () => {}, identityFactory: async () => ({ appName: PREVIEW_IDENTITY.appName, bundleIdentifier: PREVIEW_IDENTITY.bundleIdentifier, scheme: PREVIEW_IDENTITY.scheme, projectId: PREVIEW_IDENTITY.easProjectId, profile: PREVIEW_IDENTITY.buildProfile, channel: PREVIEW_IDENTITY.channel, runtimePolicy: PREVIEW_IDENTITY.runtimePolicy, apiOrigin: PREVIEW_IDENTITY.apiOrigin }),
    fingerprintsFactory: async () => ({ ios: "ios-fingerprint", android: "android-fingerprint" }),
    easFactory: () => ({ viewBuild: async () => { oldLookups += 1; throw new EasRemoteObjectUnavailableError("build", oldBuildId, new Error("exact absence")); } }),
  });
  const recipients = ["tester", "developer"];
  const emitted = [];
  let newerIosEligible = 0;
  const orchestrator = {
    reconcileNativeOwnership: async () => {},
    cycle: async () => unavailable
      ? { state: "NEWER_IOS_ELIGIBLE", sourceSha: sha }
      : historical.reconcileIosDistribution({ source_sha: sha, state: "DETECTED" }, { checkpoint: async () => {} }),
  };
  const reconcileNotifications = async () => {
    emitted.push(...recipients.map((memberId) => `android-build:${memberId}`));
    newerIosEligible += 1;
  };
  const log = { log() {}, error() {}, warn() {} };

  const first = await runWorkerCycle({ mode: "active", github: { latestDevSha: async () => sha }, orchestrator, reconcileNotifications, log });
  assert.equal(first.releaseResult.state, "OPERATOR_ATTENTION_REQUIRED");
  assert.equal(unavailable, true);
  assert.deepEqual(emitted, ["android-build:tester", "android-build:developer"]);
  assert.equal(newerIosEligible, 1);
  assert.equal(cleanup, 0, "historical provider reconciliation must not create a dependency checkout");

  await runWorkerCycle({ mode: "active", github: { latestDevSha: async () => sha }, orchestrator, reconcileNotifications: async () => { newerIosEligible += 1; }, log });
  assert.equal(oldLookups, 1, "terminal historical absence must not hot-loop on the next polling cycle");
  assert.equal(newerIosEligible, 2);
});

test("current Android provider failure does not suppress eligible iOS notification reconciliation", async () => {
  let iosNotifications = 0;
  await runWorkerCycle({
    mode: "active", github: { latestDevSha: async () => sha },
    orchestrator: { reconcileNativeOwnership: async () => {}, cycle: async () => { throw new Error("Android provider unavailable"); } },
    reconcileNotifications: async () => { iosNotifications += 1; },
    log: { log() {}, error() {} },
  });
  assert.equal(iosNotifications, 1);
});

test("canonical incident replacement corrects planning once, reserves before creation, and is idempotent", async () => {
  const canonical = "c".repeat(40);
  const old = "d".repeat(40);
  const buildId = "11111111-1111-4111-8111-111111111111";
  let action = { source_sha: sha, identity_key: `native-build:android:${PREVIEW_IDENTITY.easProjectId}:${canonical}`, remote_id: null };
  const order = [];
  let creates = 0;
  let corrections = 0;
  let durableFingerprint = old;
  const finished = { id: buildId, platform: "ANDROID", status: "FINISHED", buildProfile: "preview", applicationIdentifier: PREVIEW_IDENTITY.bundleIdentifier, gitCommitHash: sha, fingerprint: { hash: canonical }, appVersion: "0.3.0", appBuildVersion: "30", project: { id: PREVIEW_IDENTITY.easProjectId }, artifacts: { buildUrl: "https://expo.dev/artifacts/eas/replacement.apk" } };
  const ledger = {
    releaseBySha: async () => ({ evidence: { fingerprints: { android: durableFingerprint } } }),
    rejectedNativeOwnershipIncidents: async () => [{ build_id: "incident-build" }],
    correctPlannedNativeFingerprint: async () => { corrections += 1; durableFingerprint = canonical; order.push("correct"); },
    reserveNativeBuild: async () => { order.push("reserve"); return { action, created: !action.remote_id }; },
    recordAction: async (input) => { order.push("record"); action = { source_sha: sha, identity_key: input.identityKey, remote_id: input.remoteId }; return action; },
  };
  const orchestrator = new PreviewOrchestrator({
    config: { repository: PREVIEW_IDENTITY.repository, githubReadToken: "x" }, ledger,
    github: { latestDevSha: async () => sha }, render: {},
    checkoutFactory: async () => ({ directory: repositoryRoot, cleanup: async () => {} }), prepareCheckoutFactory: async () => {},
    identityFactory: async () => ({ appName: PREVIEW_IDENTITY.appName, bundleIdentifier: PREVIEW_IDENTITY.bundleIdentifier, scheme: PREVIEW_IDENTITY.scheme, projectId: PREVIEW_IDENTITY.easProjectId, profile: PREVIEW_IDENTITY.buildProfile, channel: PREVIEW_IDENTITY.channel, runtimePolicy: PREVIEW_IDENTITY.runtimePolicy, apiOrigin: PREVIEW_IDENTITY.apiOrigin }),
    fingerprintsFactory: async () => ({ android: canonical, ios: "e".repeat(40) }),
    easFactory: () => ({
      createAndroidBuild: async () => { creates += 1; order.push("create"); return { id: buildId }; },
      viewBuild: async () => finished,
      compareBuildFingerprint: async () => ({ expectedHash: canonical, buildHash: canonical }),
    }),
  });
  orchestrator.deliverAndroid = async () => ({ buildId, buildNumber: "30", status: "FINISHED" });
  await orchestrator.recoverCanonicalNativeBuild({ sourceSha: sha, platform: "android" });
  await orchestrator.recoverCanonicalNativeBuild({ sourceSha: sha, platform: "android" });
  assert.equal(creates, 1);
  assert.equal(corrections, 1);
  assert.ok(order.indexOf("reserve") < order.indexOf("create"));
  assert.ok(order.indexOf("create") < order.indexOf("record"));
});

