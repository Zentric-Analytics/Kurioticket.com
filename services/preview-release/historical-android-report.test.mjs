import assert from "node:assert/strict";
import test from "node:test";
import { inspectHistoricalAndroidBuilds } from "./eas-state.mjs";
import { EasClient } from "./remote-clients.mjs";
import { PreviewOrchestrator, nativeBuildIdentityKey } from "./orchestrator.mjs";
import { PREVIEW_IDENTITY } from "./config.mjs";
import { classifyChangeSet } from "./classifier.mjs";

const sha = "f8cf3a18a8b31defe82953fba5d1d95f9357dd68";
const dev = "741d5452294b15a6d1d585c614eb072246cddd36";
const fingerprint = "0a082f2685713cea16a553eccfcaa687b36a340e";
const action = { id: 59139, source_sha: sha, identity_key: nativeBuildIdentityKey("android", fingerprint), remote_id: null, state: "RESERVED", created_at: "2026-09-05T17:02:57.752Z", evidence: { latestCompatibleSourceSha: dev } };
const build = (overrides = {}) => ({ id: "11111111-1111-4111-8111-111111111111", status: "FINISHED", project: { id: PREVIEW_IDENTITY.easProjectId }, platform: "ANDROID", buildProfile: "preview", appIdentifier: PREVIEW_IDENTITY.bundleIdentifier, channel: "preview", gitCommitHash: sha, fingerprint: { hash: fingerprint }, createdAt: "2026-09-05T17:03:05Z", ...overrides });
const inspect = (builds) => inspectHistoricalAndroidBuilds(builds, action, PREVIEW_IDENTITY.easProjectId);

for (const status of ["NEW", "IN_QUEUE", "IN_PROGRESS", "FINISHED", "FAILED", "ERRORED", "CANCELED"]) {
  test(`${status} exact provider identity is ONE_MATCH without requiring an artifact`, () => {
    const report = inspect([build({ status })]);
    assert.equal(report.outcome, "ONE_MATCH");
    assert.equal(report.candidates[0].status, status);
    assert.equal(report.candidates[0].artifactAvailable, false);
  });
}

test("zero and multiple candidates; timestamps alone never establish identity", () => {
  assert.equal(inspect([]).outcome, "NO_MATCH");
  assert.equal(inspect([build(), build({ id: "22222222-2222-4222-8222-222222222222" })]).outcome, "AMBIGUOUS");
  assert.equal(inspect([build({ gitCommitHash: dev })]).outcome, "NO_MATCH");
  assert.equal(inspect([build({ fingerprint: { hash: "b".repeat(40) } })]).outcome, "NO_MATCH");
  assert.equal(inspect([build({ createdAt: "2026-09-05T17:05:05Z" })]).outcome, "ONE_MATCH");
});

test("missing provider fields cannot be substituted with source-attested defaults", () => {
  for (const field of ["project", "platform", "buildProfile", "appIdentifier", "gitCommitHash", "fingerprint"]) {
    const candidate = build({ [field]: undefined, sourceAttestedProjectId: PREVIEW_IDENTITY.easProjectId,
      sourceAttestedPlatform: "android", sourceAttestedBuildProfile: "preview", sourceAttestedAppIdentifier: PREVIEW_IDENTITY.bundleIdentifier, sourceAttestedRuntimeVersion: fingerprint });
    assert.equal(inspect([candidate]).outcome, "INSUFFICIENT_EVIDENCE", field);
  }
  assert.equal(inspectHistoricalAndroidBuilds([], action, "wrong-project").outcome, "INSUFFICIENT_EVIDENCE");
  assert.equal(inspect([build({ channel: undefined })]).outcome, "ONE_MATCH");
  assert.equal(inspect([build({ channel: "production" })]).outcome, "NO_MATCH");
});

test("safe report omits provider secrets, artifact URLs and arbitrary fields", () => {
  const report = inspect([build({ artifacts: { buildUrl: "https://example.test/private.apk?token=secret" }, secret: "secret", logs: ["secret"] })]);
  assert.equal(report.candidates[0].artifactAvailable, true);
  assert.doesNotMatch(JSON.stringify(report), /secret|https:/);
});

test("authenticated history uses original action SHA and normal pagination", async () => {
  const eas = new EasClient({ expoToken: "not-used", cwd: "." });
  eas.projectInfo = async () => ({ projectId: PREVIEW_IDENTITY.easProjectId });
  const calls = [];
  eas.run = async (args) => {
    calls.push(args); assert.equal(args[1], "build:list");
    assert.equal(args[args.indexOf("--git-commit-hash") + 1], sha);
    assert.ok(!args.includes(dev));
    return [];
  };
  assert.deepEqual((await eas.historicalAndroidHistory(action)).builds, []);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes("--non-interactive"));
  // Existing bounded pagination still fails closed rather than returning partial data.
  eas.run = async () => Array.from({ length: 50 }, () => build());
  await assert.rejects(eas.historicalAndroidHistory(action), /pagination limit/);
});

test("uploaded fingerprint fallback is provider data, not a local expected value", async () => {
  const eas = new EasClient({ expoToken: "not-used", cwd: "." });
  eas.projectInfo = async () => ({ projectId: PREVIEW_IDENTITY.easProjectId });
  eas.listAndroidBuilds = async (value) => { assert.equal(value, sha); return [build({ fingerprint: undefined })]; };
  eas.compareBuildFingerprint = async (id, expected) => { assert.equal(id, build().id); assert.equal(expected, fingerprint); return { buildHash: fingerprint }; };
  const history = await eas.historicalAndroidHistory(action);
  assert.equal(inspect(history.builds).outcome, "ONE_MATCH");
});

for (const outcome of ["ONE_MATCH", "NO_MATCH", "AMBIGUOUS", "INSUFFICIENT_EVIDENCE"]) {
  test(`${outcome} historical delivery path always blocks without writes, adoption, recovery, OTA or creation`, async () => {
    let queries = 0;
    const eas = new Proxy({ historicalAndroidHistory: async (original) => {
      queries++; assert.equal(original.source_sha, sha);
      if (outcome === "INSUFFICIENT_EVIDENCE") throw new Error("private authentication error");
      return { projectId: PREVIEW_IDENTITY.easProjectId, builds: outcome === "NO_MATCH" ? [] : outcome === "ONE_MATCH" ? [build()] : [build(), build({ id: "22222222-2222-4222-8222-222222222222" })] };
    } }, { get(target, key) { if (key in target) return target[key]; return () => assert.fail(`forbidden EAS operation ${String(key)}`); } });
    const ledger = new Proxy({ getAction: async () => action }, { get(target, key) {
      // Exercise the existing-owner path, with every mutation forbidden.
      if (key === "reserveNativeBuild") return undefined;
      if (key in target) return target[key];
      return () => assert.fail(`forbidden ledger operation ${String(key)}`);
    } });
    const orchestrator = new PreviewOrchestrator({ config: {}, ledger, easFactory: () => eas, sleep: async () => {} });
    const logs = []; const originalLog = console.log;
    console.log = (value) => logs.push(JSON.parse(value));
    try {
      for (let i = 0; i < 2; i++) await assert.rejects(orchestrator.deliverAndroid(dev, ".", { checkpoint: async () => {} }, fingerprint), /automatic build creation is blocked/);
    } finally { console.log = originalLog; }
    assert.equal(queries, 1, "cooldown includes failures");
    const report = logs.find((entry) => entry.event === "historical-android-reservation-report");
    assert.equal(report.outcome, outcome);
    assert.equal(report.decision, "WAIT_FOR_DURABLE_OWNER");
    assert.equal(report.reportOnly, true);
    assert.doesNotMatch(JSON.stringify(logs), /private authentication/);
    assert.equal(action.remote_id, null); assert.equal(action.state, "RESERVED");
  });
}

test("worker report-only change is NO_DELIVERY", () => {
  assert.equal(classifyChangeSet(["services/preview-release/eas-state.mjs", "services/preview-release/remote-clients.mjs", "services/preview-release/orchestrator.mjs", "services/preview-release/historical-android-report.test.mjs"]).classification, "NO_DELIVERY");
});
