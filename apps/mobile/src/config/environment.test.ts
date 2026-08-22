import assert from "node:assert/strict";
import test from "node:test";
import { assertEasPlatformSupported, resolveMobileEnvironment } from "../../app.config";

const preview = {
  APP_VARIANT: "preview",
  APP_BUILD_MODE: "release",
  EXPO_PUBLIC_API_BASE_URL: "https://staging.kurioticket.com",
};
const production = {
  APP_VARIANT: "production",
  APP_BUILD_MODE: "release",
  EXPO_PUBLIC_API_BASE_URL: "https://kurioticket.com",
};

test("resolves the approved Preview identity", () => {
  assert.deepEqual(resolveMobileEnvironment(preview), {
    variant: "preview", buildMode: "release", displayName: "Kurioticket Preview",
    bundleIdentifier: "com.kurioticket.app.preview", androidPackage: "com.kurioticket.app.preview",
    scheme: "kurioticket-preview", apiBaseUrl: "https://staging.kurioticket.com", channel: "preview",
    appVersion: "0.3.0", isPreview: true,
  });
});

test("resolves the approved Production identity", () => {
  assert.deepEqual(resolveMobileEnvironment(production), {
    variant: "production", buildMode: "release", displayName: "Kurioticket",
    bundleIdentifier: "com.kurioticket.app", androidPackage: "com.kurioticket.app",
    scheme: "kurioticket", apiBaseUrl: "https://kurioticket.com", channel: "production",
    appVersion: "0.3.0", isPreview: false,
  });
});

test("release environments reject crossed and arbitrary API origins", () => {
  assert.throws(() => resolveMobileEnvironment({ ...preview, EXPO_PUBLIC_API_BASE_URL: "https://kurioticket.com" }), /preview release requires/);
  assert.throws(() => resolveMobileEnvironment({ ...production, EXPO_PUBLIC_API_BASE_URL: "https://staging.kurioticket.com" }), /production release requires/);
  assert.throws(() => resolveMobileEnvironment({ ...preview, EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000" }), /preview release requires/);
  assert.throws(() => resolveMobileEnvironment({ ...production, EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000" }), /production release requires/);
  assert.throws(() => resolveMobileEnvironment({ ...preview, EXPO_PUBLIC_API_BASE_URL: "http://192.168.1.25:3000" }), /preview release requires/);
  assert.throws(() => resolveMobileEnvironment({ ...production, EXPO_PUBLIC_API_BASE_URL: "http://10.0.0.25:3000" }), /production release requires/);
});

test("local development requires an explicit flag and reuses Preview", () => {
  assert.equal(resolveMobileEnvironment({ APP_VARIANT: "preview", APP_BUILD_MODE: "local", LOCAL_DEVELOPMENT: "true", EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000" }).apiBaseUrl, "http://localhost:3000");
  assert.throws(() => resolveMobileEnvironment({ APP_VARIANT: "preview", APP_BUILD_MODE: "local", EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000" }), /LOCAL_DEVELOPMENT=true/);
  assert.throws(() => resolveMobileEnvironment({ APP_VARIANT: "production", APP_BUILD_MODE: "local", LOCAL_DEVELOPMENT: "true", EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000" }), /Preview identity/);
  assert.throws(() => resolveMobileEnvironment({ APP_VARIANT: "preview", APP_BUILD_MODE: "local", LOCAL_DEVELOPMENT: "true", EAS_BUILD: "true", EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000" }), /forbidden in EAS/);
});

test("missing or unknown configuration never falls back", () => {
  assert.throws(() => resolveMobileEnvironment({}), /APP_VARIANT is required/);
  assert.throws(() => resolveMobileEnvironment({ APP_VARIANT: "staging", APP_BUILD_MODE: "release", EXPO_PUBLIC_API_BASE_URL: "https://staging.kurioticket.com" }), /preview or production/);
});

test("release platform matrix allows Android and iOS for both permanent identities", () => {
  const previewEnvironment = resolveMobileEnvironment(preview);
  const productionEnvironment = resolveMobileEnvironment(production);
  assert.doesNotThrow(() => assertEasPlatformSupported(previewEnvironment, { EAS_BUILD: "true", EAS_BUILD_PLATFORM: "android" }));
  assert.doesNotThrow(() => assertEasPlatformSupported(previewEnvironment, { EAS_BUILD: "true", EAS_BUILD_PLATFORM: "ios" }));
  assert.doesNotThrow(() => assertEasPlatformSupported(productionEnvironment, { EAS_BUILD: "true", EAS_BUILD_PLATFORM: "android" }));
  assert.doesNotThrow(() => assertEasPlatformSupported(productionEnvironment, { EAS_BUILD: "true", EAS_BUILD_PLATFORM: "ios" }));
  assert.throws(() => assertEasPlatformSupported(productionEnvironment, { EAS_BUILD: "true" }), /EAS_BUILD_PLATFORM must be android or ios/);
  assert.throws(() => assertEasPlatformSupported(productionEnvironment, { EAS_BUILD: "true", EAS_BUILD_PLATFORM: "windows" }), /EAS_BUILD_PLATFORM must be android or ios/);
});
