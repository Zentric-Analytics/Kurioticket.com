import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { getApiBaseUrl } from "../config/apiUrl";
import { buildDiagnostics } from "./buildDiagnostics";
export function getRuntimeDiagnostics() {
  const api = getApiBaseUrl(); const platform = Constants.platform;
  return buildDiagnostics({ applicationVersion: Constants.expoConfig?.version, nativeBuildVersion: platform?.android?.versionCode ?? platform?.ios?.buildNumber, runtimeVersion: Updates.runtimeVersion, updateId: Updates.updateId, channel: Updates.channel, createdAt: Updates.createdAt, isEmbeddedLaunch: Updates.isEmbeddedLaunch, projectId: Constants.expoConfig?.extra?.eas?.projectId, apiBaseUrl: api.ok ? api.baseUrl : null });
}
