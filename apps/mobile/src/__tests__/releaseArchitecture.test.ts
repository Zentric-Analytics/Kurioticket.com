import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const eas = JSON.parse(readFileSync(resolve(process.cwd(), "eas.json"), "utf8"));

test("Preview uses platform-specific TestFlight and Android internal distribution", () => {
  assert.deepEqual(Object.keys(eas.build).sort(), ["preview", "production"]);
  assert.equal(eas.build.preview.ios.distribution, "store");
  assert.equal(eas.build.preview.android.distribution, "internal");
  assert.equal(eas.build.preview.android.buildType, "apk");
  assert.equal(eas.build.preview.channel, "preview");
});

test("Production release profile remains unchanged", () => {
  assert.equal(eas.build.production.distribution, "store");
  assert.equal(eas.build.production.channel, "production");
  assert.equal(eas.build.production.env.APP_VARIANT, "production");
  assert.equal(eas.build.production.env.EXPO_PUBLIC_API_BASE_URL, "https://kurioticket.com");
});

test("repository workflows cannot build, update, submit, or upload mobile artifacts", () => {
  for (const name of ["mobile-preview-update.yml", "mobile-production-update.yml"]) {
    const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows", name), "utf8");
    assert.doesNotMatch(workflow, /\beas\s+(?:build|update|submit)\b/i);
    assert.doesNotMatch(workflow, /\bexpo\s+upload\b/i);
  }
});
