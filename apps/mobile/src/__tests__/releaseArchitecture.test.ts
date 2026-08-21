import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const eas = JSON.parse(readFileSync(resolve(process.cwd(), "eas.json"), "utf8"));

test("Preview uses platform-specific TestFlight and Android internal distribution", () => {
  assert.deepEqual(Object.keys(eas.build).sort(), ["preview", "production"]);
  assert.equal(eas.build.preview.ios.distribution, "store");
  assert.equal(eas.build.preview.ios.autoIncrement, true);
  assert.equal(eas.build.preview.android.distribution, "internal");
  assert.equal(eas.build.preview.android.buildType, "apk");
  assert.equal(eas.build.preview.android.autoIncrement, true);
  assert.equal(eas.build.preview.autoIncrement, undefined);
  assert.equal(eas.build.preview.channel, "preview");
});

test("Production release profile produces store Android and iOS binaries", () => {
  assert.equal(eas.build.production.distribution, "store");
  assert.equal(eas.build.production.android.distribution, "store");
  assert.equal(eas.build.production.android.buildType, "app-bundle");
  assert.equal(eas.build.production.android.autoIncrement, true);
  assert.equal(eas.build.production.ios.distribution, "store");
  assert.equal(eas.build.production.ios.autoIncrement, true);
  assert.equal(eas.build.production.autoIncrement, undefined);
  assert.equal(eas.build.production.channel, "production");
  assert.equal(eas.build.production.env.APP_VARIANT, "production");
  assert.equal(eas.build.production.env.EXPO_PUBLIC_API_BASE_URL, "https://kurioticket.com");
  assert.equal(eas.submit.production.ios.ascAppId, "6797446939");
  const credential = JSON.parse(readFileSync(resolve(process.cwd(), "release-baselines/ios/production-credential.json"), "utf8"));
  assert.equal(credential.bundleIdentifier, "com.kurioticket.app");
  assert.equal(credential.appleTeamId, "N23R45R4CY");
  assert.equal(credential.management, "eas-managed");
  assert.equal(credential.status, "complete");
  assert.equal(credential.buildPolicy, "freeze-credentials");
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

test("Production delivery remains manual-only and isolated", () => {
  const production = readFileSync(resolve(process.cwd(), "../../.github/workflows/android-production-delivery.yml"), "utf8");
  const iosProduction = readFileSync(resolve(process.cwd(), "../../.github/workflows/ios-production-delivery.yml"), "utf8");
  assert.match(production, /^\s*workflow_dispatch:/m);
  assert.doesNotMatch(production, /^\s*(?:workflow_call|push|pull_request|schedule):/m);
  assert.match(production, /environment: mobile-production/);
  assert.match(production, /validate-delivery-inputs\.mjs/);
  assert.match(production, /classify-release\.mjs/);
  assert.doesNotMatch(production, /\beas(?:-cli@[^\s]+)?\s+submit\b|--auto-submit|upload.*google play/i);
  assert.match(iosProduction, /^\s*workflow_dispatch:/m);
  assert.doesNotMatch(iosProduction, /^\s*(?:workflow_call|push|pull_request|schedule):/m);
  assert.match(iosProduction, /environment: mobile-production/);
  assert.match(iosProduction, /DELIVER IOS PRODUCTION/);
  assert.match(iosProduction, /--platform ios --profile production/);
  assert.match(iosProduction, /googleIosClientId/);
  assert.match(iosProduction, /plugin\?\.\[1\]\?\.iosUrlScheme!==expected/);
  assert.doesNotMatch(iosProduction, /p\.includes\('com\.googleusercontent\.apps\.'\)/);
  assert.doesNotMatch(iosProduction, /\beas(?:-cli@[^\s]+)?\s+submit\b|--auto-submit/i);
});

test("iOS Production shell bodies never interpolate dispatch inputs directly", () => {
  const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows/ios-production-delivery.yml"), "utf8");
  const shellBodies = [...workflow.matchAll(/^\s+run:\s*(?:\|\r?\n(?<block>(?:\s{10,}.*(?:\r?\n|$))*)|(?<inline>.*))$/gm)]
    .map(({ groups }) => groups?.block ?? groups?.inline ?? "")
    .join("\n");
  assert.doesNotMatch(shellBodies, /\$\{\{\s*inputs\./);
  for (const variable of [
    "APPROVED_SHA",
    "APPROVED_RUNTIME",
    "APPROVED_BUNDLE_IDENTIFIER",
    "APPROVED_CHANNEL",
    "APPROVED_CONFIRMATION",
    "DELIVERY_ACTION",
    "RELEASE_REASON",
    "BASELINE_EAS_BUILD_ID",
  ]) {
    assert.match(workflow, new RegExp(`${variable}: ".*inputs\\.`));
    assert.match(shellBodies, new RegExp(`"\\$${variable}"`));
  }
});

test("Preview iOS configuration declares truthful export compliance", async () => {
  process.env.APP_VARIANT = "preview";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://staging.kurioticket.com";
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "459496589401-gi52kj4fscgf092pasrelkth2mal0mph.apps.googleusercontent.com";
  const { default: createAppConfig } = await import("../../app.config");
  const config = createAppConfig({ config: {} } as never);
  assert.equal(config.ios?.infoPlist?.ITSAppUsesNonExemptEncryption, false);
  assert.equal(config.ios?.bundleIdentifier, "com.kurioticket.app.preview");
  assert.equal(config.runtimeVersion, "preview-0.3.0");
  assert.deepEqual(config.splash, {
    image: "./assets/kurioticket-logo-primary-light-bg.png",
    resizeMode: "contain",
    backgroundColor: "#F7FAFF",
  });
  assert.deepEqual(config.android?.splash, {
    image: "./assets/kurioticket-logo-primary-light-bg.png",
    resizeMode: "contain",
    backgroundColor: "#F7FAFF",
  });
  assert.deepEqual(config.android?.adaptiveIcon, {
    foregroundImage: "./assets/kurioticket-adaptive-foreground.png",
    backgroundColor: "#F2F6FA",
  });
  assert.deepEqual(config.plugins?.[1], ["react-native-nitro-google-signin", { iosUrlScheme: "com.googleusercontent.apps.459496589401-gi52kj4fscgf092pasrelkth2mal0mph" }]);
});

test("iOS EAS builds fail closed without an iOS OAuth client", async () => {
  process.env.APP_VARIANT = "preview";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://staging.kurioticket.com";
  process.env.EAS_BUILD = "true";
  process.env.EAS_BUILD_PLATFORM = "ios";
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const { default: createAppConfig } = await import("../../app.config");
  assert.throws(() => createAppConfig({ config: {} } as never), /require EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/);
  delete process.env.EAS_BUILD;
  delete process.env.EAS_BUILD_PLATFORM;
});

test("Production iOS configuration selects its own OAuth plugin and identity", async () => {
  process.env.APP_VARIANT = "production";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://kurioticket.com";
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "459496589401-b4npe68m8c358rqr79edi7igvi3sauao.apps.googleusercontent.com";
  const { default: createAppConfig } = await import("../../app.config");
  const config = createAppConfig({ config: {} } as never);
  assert.deepEqual(config.plugins, ["expo-router", ["react-native-nitro-google-signin", { iosUrlScheme: "com.googleusercontent.apps.459496589401-b4npe68m8c358rqr79edi7igvi3sauao" }]]);
  assert.equal(config.name, "Kurioticket");
  assert.equal(config.ios?.bundleIdentifier, "com.kurioticket.app");
  assert.equal(config.scheme, "kurioticket");
  assert.equal(config.runtimeVersion, "production-0.3.0");
  assert.equal(config.extra?.environment?.apiBaseUrl, "https://kurioticket.com");
  assert.deepEqual(config.splash, {
    image: "./assets/kurioticket-logo-primary-light-bg.png",
    resizeMode: "contain",
    backgroundColor: "#F7FAFF",
  });
  assert.deepEqual(config.android?.splash, {
    image: "./assets/kurioticket-logo-primary-light-bg.png",
    resizeMode: "contain",
    backgroundColor: "#F7FAFF",
  });
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
});

test("Production iOS EAS configuration fails closed without its OAuth client", async () => {
  process.env.APP_VARIANT = "production";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://kurioticket.com";
  process.env.EAS_BUILD = "true";
  process.env.EAS_BUILD_PLATFORM = "ios";
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const { default: createAppConfig } = await import("../../app.config");
  assert.throws(() => createAppConfig({ config: {} } as never), /Kurioticket iOS builds require EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/);
  delete process.env.EAS_BUILD;
  delete process.env.EAS_BUILD_PLATFORM;
});

test("Production iOS rejects Preview, arbitrary valid, and malformed OAuth clients", async () => {
  process.env.APP_VARIANT = "production";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://kurioticket.com";
  process.env.EAS_BUILD = "true";
  process.env.EAS_BUILD_PLATFORM = "ios";
  const { default: createAppConfig } = await import("../../app.config");
  for (const clientId of [
    "459496589401-gi52kj4fscgf092pasrelkth2mal0mph.apps.googleusercontent.com",
    "123456-arbitrary.apps.googleusercontent.com",
  ]) {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = clientId;
    assert.throws(() => createAppConfig({ config: {} } as never), /does not match the approved release identity/);
  }
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "not-a-google-client";
  assert.throws(() => createAppConfig({ config: {} } as never), /must be a valid Google iOS OAuth client ID/);
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  delete process.env.EAS_BUILD;
  delete process.env.EAS_BUILD_PLATFORM;
});

test("Production Android remains valid without an iOS OAuth client", async () => {
  process.env.APP_VARIANT = "production";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://kurioticket.com";
  process.env.EAS_BUILD = "true";
  process.env.EAS_BUILD_PLATFORM = "android";
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const { default: createAppConfig } = await import("../../app.config");
  assert.equal(createAppConfig({ config: {} } as never).android?.package, "com.kurioticket.app");
  delete process.env.EAS_BUILD;
  delete process.env.EAS_BUILD_PLATFORM;
});

test("Production Android does not apply the iOS OAuth native plugin even when EAS supplies the public client", async () => {
  process.env.APP_VARIANT = "production";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://kurioticket.com";
  process.env.EAS_BUILD = "true";
  process.env.EAS_BUILD_PLATFORM = "android";
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "459496589401-b4npe68m8c358rqr79edi7igvi3sauao.apps.googleusercontent.com";
  const { default: createAppConfig } = await import("../../app.config");
  const config = createAppConfig({ config: {} } as never);
  assert.equal(config.android?.package, "com.kurioticket.app");
  assert.doesNotMatch(JSON.stringify(config.plugins), /react-native-nitro-google-signin/);
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  delete process.env.EAS_BUILD;
  delete process.env.EAS_BUILD_PLATFORM;
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
