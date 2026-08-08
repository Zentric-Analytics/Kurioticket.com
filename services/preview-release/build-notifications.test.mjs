import assert from "node:assert/strict";
import test from "node:test";
import { failureMentionsPlatform, notifySuccessfulNativeBuilds } from "./build-notifications.mjs";

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

test("a finished Android build can notify independently of another platform", async () => {
  const ledger = {
    async releaseBySha() { return { classification: "ANDROID_NATIVE+IOS_NATIVE" }; },
    async getAction(kind) {
      if (kind === "ANDROID_BUILD") return { remote_id: "android-build-2", state: "FINISHED" };
      return null;
    },
  };
  const eas = {
    async viewBuild() {
      return {
        id: "android-build-2",
        artifacts: { buildUrl: "https://expo.dev/artifacts/kurioticket-preview-2.apk" },
        buildDetailsPageUrl: "https://expo.dev/build/android-build-2",
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
});
