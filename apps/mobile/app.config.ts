import type { ConfigContext, ExpoConfig } from "expo/config";
import type { AppBuildMode, AppVariant, MobileEnvironment, MobileEnvironmentInput } from "./src/config/environment.schema";
import releasePolicy from "./release-policy.json";

const RELEASES = releasePolicy;

function required(input: MobileEnvironmentInput, name: string): string {
  const value = input[name]?.trim();
  if (!value) throw new Error(`[mobile-environment] ${name} is required; no default is permitted.`);
  return value;
}

function parseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("[mobile-environment] EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.");
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("[mobile-environment] API origin must use HTTP(S) and contain no credentials, query, or fragment.");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("[mobile-environment] API base URL must be an origin without a path.");
  }
  return url;
}

export function resolveMobileEnvironment(input: MobileEnvironmentInput): MobileEnvironment {
  const variantValue = required(input, "APP_VARIANT");
  if (variantValue !== "preview" && variantValue !== "production") {
    throw new Error(`[mobile-environment] APP_VARIANT must be preview or production; received ${variantValue}.`);
  }
  const variant: AppVariant = variantValue;
  const buildModeValue = required(input, "APP_BUILD_MODE");
  if (buildModeValue !== "local" && buildModeValue !== "release") {
    throw new Error(`[mobile-environment] APP_BUILD_MODE must be local or release; received ${buildModeValue}.`);
  }
  const buildMode: AppBuildMode = buildModeValue;
  const localDevelopment = input.LOCAL_DEVELOPMENT === "true";
  const apiBaseUrl = parseUrl(required(input, "EXPO_PUBLIC_API_BASE_URL")).origin;
  const release = RELEASES[variant];

  if (buildMode === "local") {
    if (!localDevelopment) throw new Error("[mobile-environment] Local mode requires LOCAL_DEVELOPMENT=true.");
    if (variant !== "preview") throw new Error("[mobile-environment] Local development must reuse the Preview identity.");
    if (input.EAS_BUILD === "true") throw new Error("[mobile-environment] Local API overrides are forbidden in EAS builds.");
  } else {
    if (localDevelopment) throw new Error("[mobile-environment] LOCAL_DEVELOPMENT is forbidden in release builds.");
    if (apiBaseUrl !== release.apiBaseUrl) {
      throw new Error(`[mobile-environment] ${variant} release requires API origin ${release.apiBaseUrl}; received ${apiBaseUrl}.`);
    }
  }

  return { variant, buildMode, displayName: release.displayName, bundleIdentifier: release.bundleIdentifier,
    androidPackage: release.androidPackage, scheme: release.scheme, apiBaseUrl, channel: release.channel as AppVariant,
    appVersion: release.appVersion, isPreview: variant === "preview" };
}

const createAppConfig = ({ config }: ConfigContext): ExpoConfig => {
  const environment = resolveMobileEnvironment(process.env);
  return {
    ...config,
    name: environment.displayName,
    slug: "kurioticket-mobile",
    owner: "zentric-analytics",
    platforms: ["android", "ios"],
    version: environment.appVersion,
    orientation: "portrait",
    scheme: environment.scheme,
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: "./assets/kurioticket-icon-blue.png",
    splash: { image: "./assets/kurioticket-logo-primary-light-bg.png", resizeMode: "contain", backgroundColor: "#F7FAFF" },
    ios: {
      supportsTablet: true,
      bundleIdentifier: environment.bundleIdentifier,
      icon: "./assets/kurioticket-icon-blue.png",
    },
    android: {
      package: environment.androidPackage,
      icon: "./assets/kurioticket-icon-blue.png",
      splash: { image: "./assets/kurioticket-logo-primary-light-bg.png", resizeMode: "contain", backgroundColor: "#F7FAFF" },
      adaptiveIcon: { foregroundImage: "./assets/kurioticket-adaptive-foreground.png", backgroundColor: "#F2F6FA" },
    },
    plugins: ["expo-router"],
    extra: {
      router: {},
      eas: { projectId: "89f6fd88-c0d7-495a-9e2b-8301b09f407d" },
      environment: {
        variant: environment.variant,
        buildMode: environment.buildMode,
        apiBaseUrl: environment.apiBaseUrl,
        channel: environment.channel,
        isPreview: environment.isPreview,
      },
    },
    runtimeVersion: RELEASES[environment.variant].runtimeVersion,
    updates: {
      url: "https://u.expo.dev/89f6fd88-c0d7-495a-9e2b-8301b09f407d",
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 10000,
    },
  };
};

export default createAppConfig;
