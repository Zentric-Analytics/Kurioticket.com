import Constants from "expo-constants";
import type { AppBuildMode, AppVariant } from "./environment.schema";

export type RuntimeEnvironment = {
  variant: AppVariant;
  buildMode: AppBuildMode;
  apiBaseUrl: string;
  channel: AppVariant;
  isPreview: boolean;
};

export function getRuntimeEnvironment(): RuntimeEnvironment {
  const environment = Constants.expoConfig?.extra?.environment as RuntimeEnvironment | undefined;
  if (!environment?.variant || !environment.apiBaseUrl) {
    throw new Error("Mobile environment metadata is missing from the resolved Expo configuration.");
  }
  return environment;
}
