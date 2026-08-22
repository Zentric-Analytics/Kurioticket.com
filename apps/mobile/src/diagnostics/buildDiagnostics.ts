export type BuildMetadata = { applicationVersion?: string | null; nativeBuildVersion?: string | number | null; runtimeVersion?: string | null; updateId?: string | null; channel?: string | null; createdAt?: Date | string | null; isEmbeddedLaunch?: boolean; projectId?: string | null; apiBaseUrl?: string | null };
export type BuildDiagnostics = { applicationVersion: string; nativeBuildVersion: string; runtimeVersion: string; updateId: string; shortUpdateId: string; channel: string; createdAt: string; embedded: boolean; projectId: string; apiBaseUrl: string };
const missing = "unavailable";
export function buildDiagnostics(metadata: BuildMetadata): BuildDiagnostics {
  const updateId = metadata.updateId?.trim() || missing;
  const createdAt = metadata.createdAt instanceof Date ? metadata.createdAt : metadata.createdAt ? new Date(metadata.createdAt) : null;
  return { applicationVersion: metadata.applicationVersion?.trim() || missing, nativeBuildVersion: metadata.nativeBuildVersion == null ? missing : String(metadata.nativeBuildVersion), runtimeVersion: metadata.runtimeVersion?.trim() || missing, updateId, shortUpdateId: updateId === missing ? (metadata.isEmbeddedLaunch ? "embedded" : missing) : updateId.slice(0, 8), channel: metadata.channel?.trim() || missing, createdAt: createdAt && !Number.isNaN(createdAt.valueOf()) ? createdAt.toISOString() : missing, embedded: metadata.isEmbeddedLaunch === true, projectId: metadata.projectId?.trim() || missing, apiBaseUrl: metadata.apiBaseUrl?.trim() || "not configured" };
}
export function buildStartupLog(value: BuildDiagnostics) { return `[kurioticket-build] version=${value.applicationVersion} build=${value.nativeBuildVersion} runtime=${value.runtimeVersion} updateId=${value.updateId} channel=${value.channel} embedded=${value.embedded}`; }

export function formatPreviewDiagnostics(value: BuildDiagnostics, check: { result: string; checkedAt: string }) {
  return [
    `Preview ${value.applicationVersion} (${value.nativeBuildVersion})`,
    `Runtime ${value.runtimeVersion}`,
    `Update ${value.shortUpdateId} · ${value.embedded ? "embedded" : "OTA"}`,
    `Channel ${value.channel}`,
    `Published ${value.createdAt}`,
    `Last check ${check.result} · ${check.checkedAt}`,
    `API ${value.apiBaseUrl}`,
  ];
}
