import assert from "node:assert/strict";
import test from "node:test";
import { failureMentionsPlatform } from "./build-notifications.mjs";

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
