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
  assert.notEqual(eas.submit.production.ios.ascAppId, eas.submit.preview.ios.ascAppId);
  const credential = JSON.parse(readFileSync(resolve(process.cwd(), "release-baselines/ios/production-credential.json"), "utf8"));
  assert.equal(credential.bundleIdentifier, "com.kurioticket.app");
  assert.equal(credential.appleTeamId, "N23R45R4CY");
  assert.equal(credential.management, "eas-managed");
  assert.equal(credential.status, "complete");
  assert.equal(credential.buildPolicy, "freeze-credentials");
});

test("GitHub Actions has no Preview delivery owner", () => {
  const workflowRoot = resolve(process.cwd(), "../../.github/workflows");
  for (const removed of ["mobile-preview-update.yml", "preview-dev-delivery.yml", "android-preview-build.yml", "android-preview-ota.yml", "ios-preview-build.yml", "ios-preview-testflight-submit.yml"]) {
    assert.equal(readFileIfPresent(resolve(workflowRoot, removed)), null);
  }
  for (const name of ["pr-required-gates.yml", "mobile-production-update.yml", "security.yml", "migration-validation.yml"]) {
    const workflow = readFileSync(resolve(workflowRoot, name), "utf8");
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

test("independent Preview service is identity-locked, frozen, and TestFlight-internal only", () => {
  const config = readFileSync(resolve(process.cwd(), "../../services/preview-release/config.mjs"), "utf8");
  const client = readFileSync(resolve(process.cwd(), "../../services/preview-release/remote-clients.mjs"), "utf8");
  assert.match(config, /com\.kurioticket\.app\.preview/);
  assert.match(config, /preview-0\.3\.0/);
  assert.match(config, /https:\/\/staging\.kurioticket\.com/);
  assert.match(client, /"build", "--platform", "ios", "--profile", "preview"/);
  assert.match(client, /"--freeze-credentials", "--no-wait", "--auto-submit-with-profile", "preview"/);
  assert.equal(eas.submit.preview.ios.ascAppId, "6797447471");
  assert.doesNotMatch(client, /production-0\.3\.0|com\.kurioticket\.app["']/i);
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
  assert.match(workflow, /embedded\.mobileprovision/);
  assert.match(workflow, /openssl smime -inform der -verify -noverify/);
  assert.match(workflow, /openssl', 'x509', '-inform', 'DER'/);
  assert.match(workflow, /--provisioning-profile/);
  assert.match(workflow, /--certificate-serials/);
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
  assert.deepEqual(config.runtimeVersion, { policy: "fingerprint" });
  assert.deepEqual(config.plugins?.[1], ["expo-splash-screen", {
    ios: {
      image: "./assets/kurioticket-logo-primary-light-bg.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#F7FAFF",
    },
  }]);
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
  assert.deepEqual(config.plugins?.[2], ["react-native-nitro-google-signin", { iosUrlScheme: "com.googleusercontent.apps.459496589401-gi52kj4fscgf092pasrelkth2mal0mph" }]);
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
  assert.deepEqual(config.plugins, ["expo-router", ["expo-splash-screen", {
    ios: {
      image: "./assets/kurioticket-logo-primary-light-bg.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#F7FAFF",
    },
  }], ["react-native-nitro-google-signin", { iosUrlScheme: "com.googleusercontent.apps.459496589401-b4npe68m8c358rqr79edi7igvi3sauao" }]]);
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

test("required Preview validation remains conclusive and delivery-free", () => {
  const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows/pr-required-gates.yml"), "utf8");
  assert.match(workflow, /name: Validate mobile preview/);
  assert.match(workflow, /name: secret-scan/);
  assert.doesNotMatch(workflow, /\beas(?:-cli@[^\s]+)?\s+(?:build|update|submit)\b/i);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

function readFileIfPresent(path: string): string | null {
  try { return readFileSync(path, "utf8"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
