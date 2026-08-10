import assert from "node:assert/strict";
import test from "node:test";
import { canonicalExpoBuildPageUrl, failureMentionsPlatform, notifySuccessfulNativeBuilds } from "./build-notifications.mjs";

test("Android failures are routed only to Android notification handling", () => {
  assert.equal(failureMentionsPlatform("EAS Android build abc ended in FAILED.", "android"), true);
  assert.equal(failureMentionsPlatform("EAS Android build abc ended in FAILED.", "ios"), false);
});

test("iOS submission and TestFlight failures are routed to iOS notifications", () => {
  assert.equal(failureMentionsPlatform("TestFlight auto-submit state is FAILED", "ios"), true);
  assert.equal(failureMentionsPlatform("Apple build processing exceeded its bounded polling window.", "ios"), true);
  assert.equal(failureMentionsPlatform("TestFlight auto-submit state is FAILED", "android"), false);
});

test("parallel native failures can route both platform notifications", () => {
  const reason = "Parallel delivery failed for ios, android: IOS_NATIVE submission failed; ANDROID_NATIVE build failed";
  assert.equal(failureMentionsPlatform(reason, "ios"), true);
  assert.equal(failureMentionsPlatform(reason, "android"), true);
});

test("canonical Expo build page is derived from Preview project identity and exact build ID", () => {
  assert.equal(
    canonicalExpoBuildPageUrl("7666bec3-8c77-4db7-9e50-3e9445977bcf"),
    "https://expo.dev/accounts/zentric-analytics/projects/kurioticket-mobile/builds/7666bec3-8c77-4db7-9e50-3e9445977bcf",
  );
});

test("partial recipient delivery remains retryable", async () => {
  const ledger = {
    async releaseBySha() { return { classification: "ANDROID_NATIVE" }; },
    async getAction(kind) {
      return kind === "ANDROID_BUILD" ? { remote_id: "android-build-1", state: "FINISHED" } : null;
    },
  };
  const eas = {
    async viewBuild() {
      return {
        id: "android-build-1",
        appBuildVersion: "42",
        appVersion: "0.3.0",
        artifacts: { buildUrl: "https://expo.dev/artifacts/kurioticket-preview.apk" },
        buildDetailsPageUrl: "https://expo.dev/accounts/zentric-analytics/projects/kurioticket-mobile/builds/android-build-1",
        completedAt: "2026-08-08T16:00:00.000Z",
      };
    },
  };
  const fetchImpl = async () => ({
    ok: true,
    status: 207,
    async text() { return JSON.stringify({ recipients: 2, sent: 1, failed: 1 }); },
  });
  await assert.rejects(
    () => notifySuccessfulNativeBuilds({ sourceSha: "a".repeat(40), ledger, eas, secret: "test-secret", fetchImpl }),
    /remains retryable/,
  );
});

test("finished Android build sends canonical Expo page and never sends raw artifact URL", async () => {
  const ledger = {
    async releaseBySha() { return { classification: "ANDROID_NATIVE" }; },
    async getAction(kind) {
      return kind === "ANDROID_BUILD" ? { remote_id: "android-build-2", state: "FINISHED" } : null;
    },
  };
  const eas = {
    async viewBuild() {
      return {
        id: "android-build-2",
        artifacts: { buildUrl: "https://expo.dev/artifacts/kurioticket-preview-2.apk" },
        buildDetailsPageUrl: "https://expo.dev/accounts/zentric-analytics/projects/kurioticket-mobile/builds/android-build-2",
      };
    },
  };
  const requests = [];
  const fetchImpl = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return { ok: true, status: 200, async text() { return JSON.stringify({ recipients: 1, sent: 1, failed: 0 }); } };
  };
  const result = await notifySuccessfulNativeBuilds({ sourceSha: "b".repeat(40), ledger, eas, secret: "test-secret", fetchImpl });
  assert.equal(result.length, 1);
  assert.equal(requests[0].platform, "android");
  assert.equal(requests[0].status, "SUCCESS");
  assert.equal(requests[0].installUrl, "https://expo.dev/accounts/zentric-analytics/projects/kurioticket-mobile/builds/android-build-2");
  assert.equal(requests[0].buildDetailsUrl, requests[0].installUrl);
  assert.equal(requests[0].buildUrl, undefined);
});

test("mismatched Expo build page is rejected instead of emailing a wrong build", async () => {
  const ledger = {
    async releaseBySha() { return { classification: "ANDROID_NATIVE" }; },
    async getAction(kind) {
      return kind === "ANDROID_BUILD" ? { remote_id: "android-build-3", state: "FINISHED" } : null;
    },
  };
  const eas = {
    async viewBuild() {
      return {
        id: "android-build-3",
        artifacts: { buildUrl: "https://expo.dev/artifacts/kurioticket-preview-3.apk" },
        buildDetailsPageUrl: "https://expo.dev/accounts/zentric-analytics/projects/kurioticket-mobile/builds/wrong-build",
      };
    },
  };
  await assert.rejects(
    () => notifySuccessfulNativeBuilds({ sourceSha: "c".repeat(40), ledger, eas, secret: "test-secret", fetchImpl: async () => { throw new Error("should not send"); } }),
    /does not match exact Preview build/,
  );
});

test("iOS success waits for verified TestFlight group association", async () => {
  let distributed = false;
  const ledger = {
    async releaseBySha() { return { classification: "IOS_NATIVE" }; },
    async getAction(kind) {
      if (kind === "IOS_BUILD") return { remote_id: "ios-build-1", state: "FINISHED" };
      if (kind === "IOS_SUBMISSION") return { remote_id: "submission-1", state: "FINISHED" };
      return null;
    },
    async getFinishedIosDistributionForBuild() { return distributed ? { state: "FINISHED" } : null; },
  };
  const eas = { async viewBuild() { return { id: "ios-build-1", buildDetailsPageUrl: canonicalExpoBuildPageUrl("ios-build-1") }; } };
  const requests = [];
  const fetchImpl = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return { ok: true, status: 200, async text() { return JSON.stringify({ recipients: 1, sent: 1, failed: 0 }); } };
  };
  assert.deepEqual(await notifySuccessfulNativeBuilds({ sourceSha: "d".repeat(40), ledger, eas, secret: "test-secret", fetchImpl }), []);
  distributed = true;
  assert.equal((await notifySuccessfulNativeBuilds({ sourceSha: "d".repeat(40), ledger, eas, secret: "test-secret", fetchImpl })).length, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].platform, "ios");
});

test("worker restart reconciles a stale in-progress Android ledger action before notifying", async () => {
  const writes = [];
  const ledger = {
    async releaseBySha() { return { classification: "ANDROID_NATIVE" }; },
    async getNativeBuildActionForRelease(_sourceSha, platform) {
      return platform === "android"
        ? { source_sha: "e".repeat(40), identity_key: "legacy:android:preview", remote_id: "android-build-restart", state: "IN_PROGRESS" }
        : null;
    },
    async recordAction(action) { writes.push(action); return { ...action, remote_id: action.remoteId, identity_key: action.identityKey }; },
  };
  const eas = { async viewBuild(id) { return { id, status: "FINISHED", artifacts: { buildUrl: "https://expo.dev/artifacts/restart.apk" }, buildDetailsPageUrl: canonicalExpoBuildPageUrl(id) }; } };
  const requests = [];
  const fetchImpl = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return { ok: true, status: 200, async text() { return JSON.stringify({ recipients: 2, sent: 2, failed: 0 }); } };
  };
  const result = await notifySuccessfulNativeBuilds({ sourceSha: "e".repeat(40), ledger, eas, secret: "test-secret", fetchImpl });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].state, "FINISHED");
  assert.equal(requests.length, 1);
  assert.equal(result[0].buildId, "android-build-restart");
});
