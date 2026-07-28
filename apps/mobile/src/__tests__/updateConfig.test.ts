import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("production runtime isolates native changes and waits for launch updates", () => {
  const appConfig = JSON.parse(readFileSync(join(process.cwd(), "app.json"), "utf8")).expo;
  assert.equal(appConfig.version, "0.2.0");
  assert.deepEqual(appConfig.runtimeVersion, { policy: "appVersion" });
  assert.equal(appConfig.updates.checkAutomatically, "ON_LOAD");
  assert.equal(appConfig.updates.fallbackToCacheTimeout, 10_000);
});
