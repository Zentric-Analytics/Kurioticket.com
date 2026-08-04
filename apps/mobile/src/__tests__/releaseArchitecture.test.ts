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
  assert.equal(eas.build.preview.android.autoIncrement, true);
  assert.equal(eas.build.preview.autoIncrement, undefined);
  assert.equal(eas.build.preview.channel, "preview");
});

test("Production release profile produces a store AAB", () => {
  assert.equal(eas.build.production.distribution, "store");
  assert.equal(eas.build.production.android.distribution, "store");
  assert.equal(eas.build.production.android.buildType, "app-bundle");
  assert.equal(eas.build.production.android.autoIncrement, true);
  assert.equal(eas.build.production.autoIncrement, undefined);
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

test("native and Production delivery workflows are manual-only, protected, and never submit", () => {
  for (const [name, environment] of [["android-preview-build.yml", "mobile-preview-build"], ["android-production-delivery.yml", "mobile-production"]]) {
    const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows", name), "utf8");
    assert.match(workflow, /^\s*workflow_dispatch:/m);
    assert.doesNotMatch(workflow, /^\s*(?:push|pull_request|schedule):/m);
    assert.match(workflow, new RegExp(`environment: ${environment}`));
    assert.match(workflow, /validate-delivery-inputs\.mjs/);
    assert.match(workflow, /classify-release\.mjs/);
    assert.doesNotMatch(workflow, /\beas(?:-cli@[^\s]+)?\s+submit\b|--auto-submit|upload.*google play/i);
  }
});

test("Preview OTA is reusable only after validation and retains a protected manual break-glass path", () => {
  const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows/android-preview-ota.yml"), "utf8");
  assert.match(workflow, /^\s*workflow_call:/m);
  assert.match(workflow, /^\s*workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s*(?:push|pull_request|schedule):/m);
  assert.match(workflow, /environment: mobile-preview-ota/);
  assert.match(workflow, /PREVIEW_TRIGGER_MODE/);
  assert.match(workflow, /Resolve trusted Preview target/);
  assert.match(workflow, /BREAK_GLASS_CONFIRMATION/);
  assert.doesNotMatch(workflow, /\beas(?:-cli@[^\s]+)?\s+(?:build|submit)\s|--auto-submit|upload.*google play/i);
});

test("push and pull-request workflows remain validation-only", () => {
  const workflows = ["mobile-preview-update.yml", "mobile-production-update.yml"];
  for (const name of workflows) {
    const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows", name), "utf8");
    assert.doesNotMatch(workflow, /\beas(?:-cli@[^\s]+)?\s+(?:build|update|submit)\b/i);
  }
});

test("required Preview validation is always conclusive and conditionally runs the full suite", () => {
  const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows/mobile-preview-update.yml"), "utf8");
  assert.match(workflow, /name: Validate mobile preview/);
  assert.doesNotMatch(workflow, /^\s+paths:/m);
  assert.match(workflow, /name: Classify mobile-relevant changes/);
  assert.match(workflow, /name: Mobile validation not applicable/);
  assert.match(workflow, /if: steps\.changes\.outputs\.mobile_relevant == 'false'/);
  assert.match(workflow, /name: Evaluate automatic Android Preview OTA/);
  assert.match(workflow, /needs: validate-preview/);
  assert.match(workflow, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/dev' && needs\.validate-preview\.result == 'success'/);
  assert.match(workflow, /target_sha: \$\{\{ github\.sha \}\}/);
  for (const step of [
    "Setup Node.js",
    "Install mobile dependencies",
    "Type-check mobile app",
    "Test mobile app",
    "Validate Expo project",
    "Resolve Preview public configuration",
    "Validate Preview iOS prebuild configuration",
    "Resolve Production public configuration",
    "Validate resolved application identities",
    "Validate Metro export",
    "Confirm delivery remains gated",
  ]) {
    assert.match(workflow, new RegExp(`name: ${step}\\r?\\n\\s+if: steps\\.changes\\.outputs\\.mobile_relevant == 'true'`));
  }
  assert.doesNotMatch(workflow, /continue-on-error/);
});
