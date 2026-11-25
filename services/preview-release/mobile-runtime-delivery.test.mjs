import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { classifyChangeSet } from "./classifier.mjs";
import { mobileSharedRuntimeFiles } from "./mobile-runtime-graph.mjs";
import { PreviewOrchestrator } from "./orchestrator.mjs";
import { PREVIEW_IDENTITY, requirePreviewEnvironment } from "./config.mjs";
import { resolveRootDependencyEvaluation, planPlatformOta } from "./platform-ota.mjs";

test("every statically imported shared native runtime file schedules OTA evaluation", () => {
  const files = mobileSharedRuntimeFiles(resolve(import.meta.dirname, "../.."));
  assert.ok(files.length > 50, "walk the native entry points, not a fixture subset");
  for (const file of files) assert.equal(classifyChangeSet([file]).classification, "OTA+WEB", file);
  assert.equal(classifyChangeSet(["src/services/adminCmsService.ts"]).classification, "WEB");
});

test("active Preview mode does not implicitly authorize native delivery", () => {
  const env = Object.fromEntries(["DATABASE_URL", "GITHUB_READ_TOKEN", "RENDER_API_KEY", "EXPO_TOKEN", "APP_STORE_CONNECT_ISSUER_ID", "APP_STORE_CONNECT_KEY_ID", "APP_STORE_CONNECT_PRIVATE_KEY", "APP_STORE_CONNECT_PREVIEW_APP_ID", "APP_STORE_CONNECT_PREVIEW_BETA_GROUP_ID"].map((key) => [key, "fixture"]));
  env.RENDER_STAGING_SERVICE_ID = PREVIEW_IDENTITY.renderStagingServiceId;
  env.PREVIEW_RELEASE_MODE = "active";
  for (const value of [undefined, "false", "TRUE", "1"]) {
    assert.equal(requirePreviewEnvironment({ ...env, PREVIEW_NATIVE_DELIVERY_ALLOWED: value }).nativeDeliveryAllowed, false);
  }
  assert.equal(requirePreviewEnvironment({ ...env, PREVIEW_NATIVE_DELIVERY_ALLOWED: "true" }).nativeDeliveryAllowed, true);
});

test("native restriction stops before remote clients, reservations, builds or distribution", async () => {
  const worker = new PreviewOrchestrator({ config: { nativeDeliveryAllowed: false }, ledger: {}, github: {}, render: {}, easFactory: () => assert.fail("must not create remote client") });
  for (const method of ["deliverIos", "deliverAndroid"]) await assert.rejects(worker[method]("a".repeat(40), ".", {}), /separate operator authorization/);
  await assert.rejects(worker.reconcileIosDistribution({}, {}), /separate operator authorization/);
});

test("root dependency evaluation becomes OTA only for canonically compatible platforms", () => {
  const fingerprints = { ios: "a".repeat(40), android: "b".repeat(40) };
  const deliveredNative = { ios: { fingerprint: fingerprints.ios }, android: { fingerprint: fingerprints.android } };
  const root = classifyChangeSet(["package.json", "package-lock.json", "src/shared/search/lifecycle.ts"]);
  const resolved = resolveRootDependencyEvaluation(root, fingerprints, deliveredNative);
  assert.equal(resolved.classification, "OTA+WEB");
  assert.deepEqual(planPlatformOta({ classification: resolved, fingerprints, deliveredNative }).otaPlatforms, ["ios", "android"]);
  for (const baselines of [{}, { ios: deliveredNative.ios }]) {
    const result = resolveRootDependencyEvaluation(root, fingerprints, baselines);
    assert.match(result.classification, /ANDROID_NATIVE/);
  }
  const changed = resolveRootDependencyEvaluation(root, { ...fingerprints, android: "c".repeat(40) }, deliveredNative);
  assert.match(changed.classification, /ANDROID_NATIVE/);
  for (const file of ["apps/mobile/package.json", "apps/mobile/plugins/native.js", "apps/mobile/ios/App.swift"]) {
    assert.match(resolveRootDependencyEvaluation(classifyChangeSet(["package.json", file]), fingerprints, deliveredNative).classification, /IOS_NATIVE/, file);
  }
});

test("completed source does not repeatedly request native builds for compatible root dependency changes", async () => {
  const fingerprints = { ios: "a".repeat(40), android: "b".repeat(40) };
  const worker = new PreviewOrchestrator({ config: {}, ledger: {}, github: { compare: async () => ["package-lock.json"] }, render: {} });
  const baseline = Object.fromEntries(Object.entries(fingerprints).map(([platform, fingerprint]) => [platform, { sourceSha: "c".repeat(40), fingerprint }]));
  assert.deepEqual(await worker.nativeChangeTargets("d".repeat(40), baseline, fingerprints), []);
  assert.deepEqual(await worker.nativeChangeTargets("d".repeat(40), baseline), ["ios", "android"].map((p) => `${p.toUpperCase()}_NATIVE`));
});

test("mobile-only OTA waits for exact-source staging readiness and never publishes after backend failure", async () => {
  for (const fail of [false, true]) {
    let ready, rejectReady;
    const backend = new Promise((resolve, reject) => { ready = resolve; rejectReady = reject; });
    const calls = [];
    const fingerprints = { ios: "a".repeat(40), android: "b".repeat(40) };
    const worker = new PreviewOrchestrator({
      config: { mode: "active", workerId: "test", nativeDeliveryAllowed: false },
      ledger: { transition: async (source_sha, owner, from, state, patch) => ({ source_sha, state, ...patch }), recordDeliveryEvidence: async () => {} },
      github: { report: async () => {} }, render: {},
      checkoutFactory: async () => ({ directory: ".", cleanup: async () => {} }),
      changeSetFactory: async () => ["apps/mobile/src/screen.tsx"], prepareCheckoutFactory: async () => {},
      identityFactory: async () => ({ ...PREVIEW_IDENTITY, projectId: PREVIEW_IDENTITY.easProjectId, profile: PREVIEW_IDENTITY.buildProfile }),
      fingerprintsFactory: async () => fingerprints,
    });
    worker.deliverWeb = async () => { calls.push("web"); return backend; };
    worker.deliverOta = async () => { calls.push("ota"); return { updateIds: ["fixture"] }; };
    const baselines = Object.fromEntries(Object.entries(fingerprints).map(([platform, fingerprint]) => [platform, { fingerprint }]));
    const processing = worker.process({ source_sha: "c".repeat(40), state: "DETECTED" }, { source_sha: "d".repeat(40) }, { checkpoint: async () => {} }, baselines);
    const outcome = processing.then(value => ({ value }), error => ({ error }));
    // Let the real process reach the asynchronous backend prerequisite.
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, ["web"], "publication must not race the deployment");
    if (fail) rejectReady(new Error("staging exact-SHA health failed"));
    else ready({ status: "live", deployedSha: "c".repeat(40) });
    const result = await outcome;
    if (fail) { assert.match(result.error.message, /staging exact-SHA health failed/); assert.deepEqual(calls, ["web"]); }
    else { assert.equal(result.value.state, "COMPLETE"); assert.equal(result.value.evidence.classification.classification, "OTA+WEB"); assert.deepEqual(calls, ["web", "ota"]); }
  }
});
