const { withProjectBuildGradle } = require("expo/config-plugins");

const marker = "// Kurioticket Preview passkeys compile compatibility";
const alignment = `${marker}
// Refuse reuse of this generated Preview project in another build environment.
if (System.getenv('APP_VARIANT') != 'preview' ||
    System.getenv('APP_BUILD_MODE') != 'release' ||
    System.getenv('EXPO_PUBLIC_API_BASE_URL') != 'https://staging.kurioticket.com' ||
    System.getenv('EAS_BUILD_PLATFORM') != 'android') {
    throw new GradleException('Passkey compile alignment requires Android Preview/Staging.')
}
// Passkeys 0.4.2 requests 1.3.0-alpha01 at compile time, while Google sign-in
// supplies 1.6.0 at runtime. Recompile its Kotlin default-argument calls against
// the packaged API. Do not override app runtime or unrelated library classpaths.
project(':react-native-passkeys') {
    configurations.matching { it.name == 'releaseCompileClasspath' }.configureEach {
        resolutionStrategy.force(
            'androidx.credentials:credentials:1.6.0',
            'androidx.credentials:credentials-play-services-auth:1.6.0'
        )
    }
}
`;

function alignCredentials(contents) {
  if (contents.includes(alignment)) return contents;
  if (contents.includes(marker)) throw new Error("Regenerate Android Preview: stale passkey compile alignment.");
  const anchor = 'apply plugin: "expo-root-project"';
  if (contents.split(anchor).length !== 2) throw new Error("Expected one Expo root plugin anchor for Preview compile alignment.");
  // Install the rule before root plugins can cause subproject evaluation.
  return contents.replace(anchor, `${alignment}\n${anchor}`);
}

module.exports = function withPreviewAndroidCredentials(config) {
  const environment = config.extra?.environment;
  if (environment?.variant !== "preview" || environment.buildMode !== "release"
      || environment.apiBaseUrl !== "https://staging.kurioticket.com"
      || config.android?.package !== "com.kurioticket.app.preview"
      || process.env.APP_VARIANT !== "preview" || process.env.APP_BUILD_MODE !== "release"
      || process.env.EXPO_PUBLIC_API_BASE_URL !== "https://staging.kurioticket.com"
      || process.env.EAS_BUILD_PLATFORM !== "android") {
    throw new Error("Passkey compile alignment is restricted to Android Preview/Staging.");
  }
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== "groovy") throw new Error("Expected Android Preview Groovy build.gradle.");
    mod.modResults.contents = alignCredentials(mod.modResults.contents);
    return mod;
  });
};
module.exports.alignCredentials = alignCredentials;
