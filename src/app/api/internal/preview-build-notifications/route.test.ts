import assert from "node:assert/strict";
import test from "node:test";
import { emailFor } from "./route";

test("Android Preview email uses Expo build page as primary install action", () => {
  const message = emailFor({
    platform: "android",
    status: "SUCCESS",
    sourceSha: "a".repeat(40),
    buildId: "android-build-123",
    buildNumber: "42",
    appVersion: "0.3.0",
    runtimeVersion: "preview-0.3.0",
    buildUrl: "https://expo.dev/artifacts/eas/example.apk",
    buildDetailsUrl: "https://expo.dev/accounts/zentric-analytics/projects/kurioticket-mobile/builds/android-build-123",
  });

  assert.match(message.html, /Install Android Preview/);
  assert.match(message.html, /href="https:\/\/expo\.dev\/accounts\/zentric-analytics\/projects\/kurioticket-mobile\/builds\/android-build-123"/);
  assert.match(message.html, /try the direct APK download/);
  assert.match(message.html, /href="https:\/\/expo\.dev\/artifacts\/eas\/example\.apk"/);
  assert.match(message.text, /tap Install to download the APK/);
  assert.match(message.text, /Direct APK fallback: https:\/\/expo\.dev\/artifacts\/eas\/example\.apk/);
});
