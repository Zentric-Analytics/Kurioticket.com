import * as assert from "node:assert/strict";
import { test } from "node:test";
import createAppConfig from "../../app.config";

test("production runtime isolates native changes and waits for launch updates", () => {
  const previous = { ...process.env };
  try {
    process.env.APP_VARIANT = "production";
    process.env.APP_BUILD_MODE = "release";
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://kurioticket.com";
    const appConfig = createAppConfig({ config: {} } as never);
    assert.equal(appConfig.version, "0.2.0");
    assert.deepEqual(appConfig.runtimeVersion, { policy: "appVersion" });
    assert.equal(appConfig.updates?.checkAutomatically, "ON_LOAD");
    assert.equal(appConfig.updates?.fallbackToCacheTimeout, 10_000);
  } finally {
    process.env = previous;
  }
});
