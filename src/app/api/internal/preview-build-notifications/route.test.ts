import assert from "node:assert/strict";
import test from "node:test";
import { emailFor } from "./route";

test("Android Preview email uses only the exact Expo build install page", () => {
  const message = emailFor({
    platform: "android",
    status: "SUCCESS",
    sourceSha: "a".repeat(40),
    buildId: "android-build-123",
    buildNumber: "42",
    appVersion: "0.3.0",
    runtimeVersion: "preview-0.3.0",
    installUrl: "https://expo.dev/accounts/zentric-analytics/projects/kurioticket-mobile/builds/android-build-123",
    buildDetailsUrl: "https://expo.dev/accounts/zentric-analytics/projects/kurioticket-mobile/builds/android-build-123",
  });

  assert.match(message.html, /Install Android Preview/);
  assert.match(message.html, /href="https:\/\/expo\.dev\/accounts\/zentric-analytics\/projects\/kurioticket-mobile\/builds\/android-build-123"/);
  assert.doesNotMatch(message.html, /artifacts\/eas/);
  assert.match(message.text, /verified Expo page/);
  assert.doesNotMatch(message.text, /Direct APK fallback/);
});
