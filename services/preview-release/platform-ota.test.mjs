import assert from "node:assert/strict";
import test from "node:test";
import { pendingOtaPlatforms, planPlatformOta } from "./platform-ota.mjs";

const fingerprints = { ios: "new-ios", android: "same-android" };
const deliveredNative = { ios: { fingerprint: "new-ios" }, android: { fingerprint: "same-android" } };
const mixed = { classification: "IOS_NATIVE+WEB", otaCandidates: ["apps/mobile/src/screen.tsx"] };
const plan = (classification, extra = {}) => planPlatformOta({ classification, fingerprints, deliveredNative, ...extra });

test("iOS native release also delivers shared JS to compatible Android", () => {
  const result = plan(mixed);
  assert.equal(result.classification.classification, "IOS_NATIVE+OTA+WEB");
  assert.deepEqual(result.otaPlatforms, ["android"]);
});
test("Android native release delivers shared JS to compatible iOS", () => {
  assert.deepEqual(plan({ ...mixed, classification: "ANDROID_NATIVE" }).otaPlatforms, ["ios"]);
});
test("dual native changes do not send incompatible OTA", () => {
  assert.deepEqual(plan({ ...mixed, classification: "ANDROID_NATIVE+IOS_NATIVE" }).otaPlatforms, []);
});
test("missing or changed Android baseline requires native delivery", () => {
  for (const baseline of [{}, { android: { fingerprint: "old" } }]) {
    const result = plan(mixed, { deliveredNative: baseline });
    assert.deepEqual(result.otaPlatforms, []);
    assert.match(result.classification.classification, /ANDROID_NATIVE/);
  }
});
test("next source repairs completed release missing Android without replaying iOS", () => {
  const previous = { evidence: { classification: mixed, ios: { buildId: "delivered-ios" } } };
  assert.deepEqual(pendingOtaPlatforms(previous), ["android"]);
  const result = plan({ classification: "NO_DELIVERY" }, { previous });
  assert.equal(result.classification.classification, "OTA");
  assert.deepEqual(result.otaPlatforms, ["android"]);
});
test("published catch-up is not repeated on the next release", () => {
  const previous = { evidence: { pendingOtaPlatforms: ["android"], ota: { updates: [{ platform: "android" }] } } };
  assert.deepEqual(pendingOtaPlatforms(previous), []);
  assert.equal(plan({ classification: "NO_DELIVERY" }, { previous }).classification.classification, "NO_DELIVERY");
});

test("legacy successful OTA evidence with runtime and IDs is already covered", () => {
  assert.deepEqual(pendingOtaPlatforms({ evidence: { classification: mixed, ios: { buildId: "ios" }, ota: { updateIds: ["android-update"], runtimes: { android: "same-android" } } } }), []);
});
test("ordinary OTA uses each canonical native baseline", () => {
  assert.deepEqual(plan({ classification: "OTA" }).otaPlatforms, ["ios", "android"]);
});

test("historical ledger gap survives an intervening web-only completion", () => {
  const result = plan({ classification: "NO_DELIVERY" }, { previous: { evidence: {} }, pendingOta: ["android"] });
  assert.deepEqual(result.otaPlatforms, ["android"]);
});

test("current completed SHA is not NO_CHANGE when Android publication is missing", async () => {
  const { PreviewOrchestrator } = await import("./orchestrator.mjs");
  const sha = "a".repeat(40);
  const worker = new PreviewOrchestrator({
    config: {}, github: { latestDevSha: async () => sha }, render: {},
    ledger: { lastSuccessful: async () => ({ source_sha: sha, evidence: { fingerprints } }), pendingPlatformOta: async () => ["android"] },
  });
  worker.deliveredNativeBaselines = async () => ({});
  worker.nativeChangeTargets = async () => [];
  const result = await worker.deriveDecision();
  assert.equal(result.noChange, false);
  assert.equal(result.trace.selectedOperation, "CURRENT_OTA_RECONCILIATION");
  assert.deepEqual(result.pendingOta, ["android"]);
});

test("historical mixed release is repaired through the real orchestrator without native builds", async () => {
  const { PreviewOrchestrator } = await import("./orchestrator.mjs");
  const { PREVIEW_IDENTITY: identity } = await import("./config.mjs");
  const published = [];
  const worker = new PreviewOrchestrator({
    config: { mode: "active", workerId: "test" },
    ledger: { transition: async (source_sha, owner, from, state, patch) => ({ source_sha, state, ...patch }) },
    github: { report: async () => {} }, render: {},
    checkoutFactory: async () => ({ directory: ".", cleanup: async () => {} }),
    changeSetFactory: async () => ["services/preview-release/platform-ota.mjs"],
    prepareCheckoutFactory: async () => {},
    identityFactory: async () => ({ ...identity, projectId: identity.easProjectId, profile: identity.buildProfile }),
    fingerprintsFactory: async () => fingerprints,
  });
  worker.deliverIos = worker.deliverAndroid = async () => { assert.fail("no native rebuild expected"); };
  worker.deliverOta = async (sha, cwd, lease, targets) => {
    published.push(...targets);
    return { updates: targets.map((platform) => ({ platform, id: "update" })) };
  };
  const previous = { source_sha: "a".repeat(40), evidence: { classification: mixed, ios: { buildId: "ios" } } };
  const result = await worker.process({ source_sha: "b".repeat(40), state: "DETECTED" }, previous, { checkpoint: async () => {} }, deliveredNative);
  assert.equal(result.state, "COMPLETE");
  assert.deepEqual(published, ["android"]);
  assert.deepEqual(pendingOtaPlatforms(result), []);
});
