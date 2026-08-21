import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function loadReleaseFiles() {
  return {
    root,
    policy: JSON.parse(readFileSync(resolve(root, "release-policy.json"), "utf8")),
    eas: JSON.parse(readFileSync(resolve(root, "eas.json"), "utf8")),
  };
}

export function assertReleasePolicy(policy, eas) {
  const { preview, production, legacyRuntime } = policy;
  const failures = [];
  const require = (condition, message) => { if (!condition) failures.push(message); };

  require(preview.androidPackage === "com.kurioticket.app.preview", "Preview package is not approved.");
  require(JSON.stringify(preview.supportedPlatforms) === JSON.stringify(["android", "ios"]), "Preview must support Android and iOS.");
  require(JSON.stringify(production.supportedPlatforms) === JSON.stringify(["android", "ios"]), "Production must support Android and iOS.");
  require(preview.bundleIdentifier === "com.kurioticket.app.preview", "Preview iOS bundle is not approved.");
  require(production.bundleIdentifier === "com.kurioticket.app", "Production iOS bundle is not approved.");
  require(preview.bundleIdentifier !== production.bundleIdentifier, "Preview and Production iOS bundles must differ.");
  require(production.androidPackage === "com.kurioticket.app", "Production package is not approved.");
  require(![preview.androidPackage, production.androidPackage].includes("com.kurioticket.mobile"), "Legacy package is forbidden.");
  require(preview.androidPackage !== production.androidPackage, "Preview and Production packages must differ.");
  require(preview.channel === "preview" && production.channel === "production", "Release channels are crossed.");
  require(preview.channel !== production.channel, "Preview and Production channels must differ.");
  require(preview.apiBaseUrl === "https://staging.kurioticket.com", "Preview API origin is crossed.");
  require(production.apiBaseUrl === "https://kurioticket.com", "Production API origin is crossed.");
  require(preview.runtimeVersion === "preview-0.3.0", "Preview runtime is not isolated.");
  require(production.runtimeVersion === "production-0.3.0", "Production runtime is not isolated.");
  require(![preview.runtimeVersion, production.runtimeVersion].includes(legacyRuntime), "Legacy runtime is forbidden.");
  require(preview.runtimeVersion !== production.runtimeVersion, "Preview and Production runtimes must differ.");
  require(eas.build.preview.channel === preview.channel, "Preview EAS channel mismatch.");
  require(eas.build.production.channel === production.channel, "Production EAS channel mismatch.");
  require(eas.build.preview.android.distribution === preview.distribution && eas.build.preview.android.buildType === preview.androidBuildType, "Preview must produce an internal APK.");
  require(eas.build.production.android.distribution === production.distribution && eas.build.production.android.buildType === production.androidBuildType, "Production must produce a store AAB.");
  require(eas.build.preview.ios.distribution === "store" && eas.build.preview.ios.autoIncrement === true, "Preview iOS must produce a store IPA with an independent build number.");
  require(eas.build.production.ios.distribution === "store" && eas.build.production.ios.autoIncrement === true, "Production iOS must produce a store IPA with an independent build number.");
  require(eas.build.preview.env.EXPO_PUBLIC_API_BASE_URL === preview.apiBaseUrl, "Preview EAS API mismatch.");
  require(eas.build.production.env.EXPO_PUBLIC_API_BASE_URL === production.apiBaseUrl, "Production EAS API mismatch.");
  require(eas.cli.appVersionSource === "remote", "EAS remote versioning must remain authoritative.");
  require(eas.build.preview.autoIncrement === undefined && eas.build.production.autoIncrement === undefined, "Profile-wide autoIncrement would couple platform counters.");
  require(eas.build.preview.android.autoIncrement === true && eas.build.production.android.autoIncrement === true, "Android profiles must advance independent remote version codes.");

  if (failures.length) throw new Error(failures.join("\n"));
}
