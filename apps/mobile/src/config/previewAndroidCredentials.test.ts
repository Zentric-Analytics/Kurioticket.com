import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { URL } from "node:url";
import test from "node:test";
import createAppConfig from "../../app.config";

const require = createRequire(import.meta.url);
const withCredentials = require("../../config-plugins/withPreviewAndroidCredentials.cjs");
const pluginPath = "./config-plugins/withPreviewAndroidCredentials.cjs";
const preview = {
  APP_VARIANT: "preview", APP_BUILD_MODE: "release",
  EXPO_PUBLIC_API_BASE_URL: "https://staging.kurioticket.com", EAS_BUILD_PLATFORM: "android",
};

async function inEnvironment(input: Record<string, string>, action: () => unknown) {
  const saved = { ...process.env };
  try {
    for (const key of ["APP_VARIANT", "APP_BUILD_MODE", "EXPO_PUBLIC_API_BASE_URL", "EAS_BUILD_PLATFORM", "EAS_BUILD", "LOCAL_DEVELOPMENT", "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"]) delete process.env[key];
    Object.assign(process.env, input);
    return await action();
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
}

function config() {
  return createAppConfig({ config: { name: "fixture", slug: "fixture" } } as Parameters<typeof createAppConfig>[0]);
}

test("Preview Android registers and executes only the project Gradle mod", async () => {
  await inEnvironment(preview, async () => {
    const resolved = config();
    assert.ok(resolved.plugins?.includes(pluginPath));
    const registered = withCredentials(resolved);
    assert.deepEqual(Object.keys(registered.mods), ["android"]);
    assert.deepEqual(Object.keys(registered.mods.android), ["projectBuildGradle"]);
    const original = '// fixture root build.gradle\napply plugin: "expo-root-project"\n';
    const result = await registered.mods.android.projectBuildGradle({
      ...registered, modRequest: { platform: "android" },
      modResults: { language: "groovy", contents: original },
    });
    const output = result.modResults.contents;
    assert.ok(output.startsWith("// fixture root build.gradle\n"));
    assert.ok(output.indexOf("project(':react-native-passkeys')") < output.indexOf('apply plugin: "expo-root-project"'));
    assert.match(output, /project\(':react-native-passkeys'\)/);
    assert.match(output, /it\.name == 'releaseCompileClasspath'/);
    assert.match(output, /credentials:credentials:1\.6\.0/);
    assert.match(output, /credentials:credentials-play-services-auth:1\.6\.0/);
    assert.doesNotMatch(output, /subprojects|allprojects|releaseRuntimeClasspath|debugCompileClasspath/);
    assert.equal(withCredentials.alignCredentials(output), output);
    assert.throws(() => withCredentials.alignCredentials(output.replaceAll(":1.6.0'", ":1.5.0'")), /stale/);
    assert.throws(() => withCredentials.alignCredentials("// unrecognized template"), /anchor/);
    assert.match(output, /throw new GradleException/);
    assert.throws(() => withCredentials({ ...resolved, android: { package: "com.example.wrong" } }), /restricted/);
  });
});

for (const [name, input] of Object.entries({
  ios: { ...preview, EAS_BUILD_PLATFORM: "ios" },
  web: { ...preview, EAS_BUILD_PLATFORM: "web" },
  unspecifiedPlatform: { ...preview, EAS_BUILD_PLATFORM: "" },
  local: { ...preview, APP_BUILD_MODE: "local", LOCAL_DEVELOPMENT: "true", EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000" },
  // Offline configuration fixture only; no build or network access.
  productionAndroid: { ...preview, APP_VARIANT: "production", EXPO_PUBLIC_API_BASE_URL: "https://kurioticket.com" },
})) {
  test(`${name} does not register the plugin or native mods, and rejects direct application`, async () => {
    await inEnvironment(input, () => {
      const resolved = config();
      assert.ok(!resolved.plugins?.includes(pluginPath));
      assert.equal("mods" in resolved, false);
      assert.throws(() => withCredentials(resolved), /restricted/);
      assert.equal("mods" in resolved, false);
    });
  });
}

test("the discarded helper has no autolinking metadata or manifest", () => {
  for (const path of ["expo-module.config.json", "android/build.gradle", "android/src/main/AndroidManifest.xml"]) {
    assert.equal(existsSync(new URL(`../../modules/kurioticket-preview-credentials/${path}`, import.meta.url)), false);
  }
});

test("path-only classification stays conservative without exact source evidence", async () => {
  const classifierPath = new URL("../../../../services/preview-release/classifier.mjs", import.meta.url).href;
  const { classifyChangeSet } = await import(classifierPath);
  const result = classifyChangeSet([
    "apps/mobile/app.config.ts",
    "apps/mobile/config-plugins/withPreviewAndroidCredentials.cjs",
    "apps/mobile/src/config/previewAndroidCredentials.test.ts",
  ]);
  assert.equal(result.classification, "ANDROID_NATIVE+IOS_NATIVE");
  assert.deepEqual(result.web, []);
});
