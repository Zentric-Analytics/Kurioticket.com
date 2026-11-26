import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { requireOptionalNativeModule } from "expo-modules-core";
import { nativeApplicationMetadata } from "./nativeApplicationMetadata";
import { getApiBaseUrl } from "../config/apiUrl";
import { buildDiagnostics } from "./buildDiagnostics";
export function getRuntimeDiagnostics() {
  const api = getApiBaseUrl();
  // Optional bridge keeps this OTA safe on existing binaries without ExpoApplication.
  // A missing native module is reported honestly; OTA manifests cannot attest a build.
  const native = nativeApplicationMetadata(
    () => requireOptionalNativeModule("ExpoApplication"),
    Constants.platform?.ios?.buildNumber,
  );
  return buildDiagnostics({ applicationVersion: native.applicationVersion ?? Constants.expoConfig?.version, nativeBuildVersion: native.nativeBuildVersion, runtimeVersion: Updates.runtimeVersion, updateId: Updates.updateId, channel: Updates.channel, createdAt: Updates.createdAt, isEmbeddedLaunch: Updates.isEmbeddedLaunch, projectId: Constants.expoConfig?.extra?.eas?.projectId, apiBaseUrl: api.ok ? api.baseUrl : null });
}
