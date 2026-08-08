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
  assert.match(production, /^\s*workflow_dispatch:/m);
  assert.doesNotMatch(production, /^\s*(?:workflow_call|push|pull_request|schedule):/m);
  assert.match(production, /environment: mobile-production/);
  assert.match(production, /validate-delivery-inputs\.mjs/);
  assert.match(production, /classify-release\.mjs/);
  assert.doesNotMatch(production, /\beas(?:-cli@[^\s]+)?\s+submit\b|--auto-submit|upload.*google play/i);
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

test("Preview iOS configuration declares truthful export compliance", async () => {
  process.env.APP_VARIANT = "preview";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://staging.kurioticket.com";
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "123456-preview.apps.googleusercontent.com";
  const { default: createAppConfig } = await import("../../app.config");
  const config = createAppConfig({ config: {} } as never);
  assert.equal(config.ios?.infoPlist?.ITSAppUsesNonExemptEncryption, false);
  assert.equal(config.ios?.bundleIdentifier, "com.kurioticket.app.preview");
  assert.equal(config.runtimeVersion, "preview-0.3.0");
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
  assert.deepEqual(config.plugins?.[2], ["react-native-nitro-google-signin", { iosUrlScheme: "com.googleusercontent.apps.123456-preview" }]);
});

test("Preview EAS builds fail closed without an iOS OAuth client", async () => {
  process.env.APP_VARIANT = "preview";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://staging.kurioticket.com";
  process.env.EAS_BUILD = "true";
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const { default: createAppConfig } = await import("../../app.config");
  assert.throws(() => createAppConfig({ config: {} } as never), /require EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/);
  delete process.env.EAS_BUILD;
});

test("Production configuration never selects the Preview iOS OAuth plugin", async () => {
  process.env.APP_VARIANT = "production";
  process.env.APP_BUILD_MODE = "release";
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://kurioticket.com";
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "123456-preview.apps.googleusercontent.com";
  const { default: createAppConfig } = await import("../../app.config");
  const config = createAppConfig({ config: {} } as never);
  assert.deepEqual(config.plugins, ["expo-router", ["expo-splash-screen", {
    ios: {
      image: "./assets/kurioticket-logo-primary-light-bg.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#F7FAFF",
    },
  }]]);
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
