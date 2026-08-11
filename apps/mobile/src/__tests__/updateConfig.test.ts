import * as assert from "node:assert/strict";
import { test } from "node:test";
import createAppConfig from "../../app.config";

test("production uses the first new-identity runtime epoch and waits for launch updates", () => {
  const previous = { ...process.env };
  try {
    process.env.APP_VARIANT = "production";
    process.env.APP_BUILD_MODE = "release";
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://kurioticket.com";
    const appConfig = createAppConfig({ config: {} } as never);
    assert.equal(appConfig.version, "0.3.0");
    assert.equal(appConfig.runtimeVersion, "production-0.3.0");
    assert.equal(appConfig.updates?.checkAutomatically, "ON_LOAD");
    assert.equal(appConfig.updates?.fallbackToCacheTimeout, 10_000);
  } finally {
    process.env = previous;
  }
});

test("preview binds updates to the installed native fingerprint", () => {
  const previous = { ...process.env };
  try {
    process.env.APP_VARIANT = "preview";
    process.env.APP_BUILD_MODE = "release";
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://staging.kurioticket.com";
    const appConfig = createAppConfig({ config: {} } as never);
    assert.equal(appConfig.version, "0.3.0");
    assert.deepEqual(appConfig.runtimeVersion, { policy: "fingerprint" });
    assert.equal(appConfig.extra?.environment.channel, "preview");
  } finally {
    process.env = previous;
  }
});
