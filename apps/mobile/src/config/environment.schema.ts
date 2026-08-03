export type AppVariant = "preview" | "production";
export type AppBuildMode = "local" | "release";

export type MobileEnvironment = {
  variant: AppVariant;
  buildMode: AppBuildMode;
  displayName: string;
  bundleIdentifier: string;
  androidPackage: string;
  scheme: string;
  apiBaseUrl: string;
  channel: AppVariant;
  distribution: "internal" | "store";
  isPreview: boolean;
};

export type MobileEnvironmentInput = Record<string, string | undefined>;
