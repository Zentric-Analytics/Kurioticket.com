import { getApiBaseUrl } from "../config/apiUrl";
import { recordStartupDiagnostic, type StartupBoundary } from "../diagnostics/startupDiagnostics";

const SAFE_ERROR_MESSAGE =
  "Kurioticket services could not be reached. Check the API URL and try again.";
const REQUEST_TIMEOUT_MS = 8000;

export type HealthResponse = { data: { available: boolean; apiVersion: "v1" | string } };
export type MobileFeatures = {
  flights: boolean; hotels: boolean; cars: boolean; pushNotifications: boolean;
  socialAuthentication: boolean;
};
export type ConfigResponse = { data: { apiVersion: "v1" | string; minimumSupportedAppVersion: string | null; latestAppVersion: string | null; maintenanceMode: boolean; features: MobileFeatures } };
export type ApiError = { message: string; code: "configuration" | "network" | "timeout" | "http" | "parse" | "schema" };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

type Fetcher = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function hasBooleanRecord(value: unknown, keys: string[]) { return isRecord(value) && keys.every((key) => typeof value[key] === "boolean"); }

export function parseHealthResponse(value: unknown): ApiResult<HealthResponse> {
  if (isRecord(value) && isRecord(value.data) && typeof value.data.available === "boolean" && typeof value.data.apiVersion === "string") return { ok: true, data: value as HealthResponse };
  return { ok: false, error: { code: "schema", message: SAFE_ERROR_MESSAGE } };
}

export function parseConfigResponse(value: unknown): ApiResult<ConfigResponse> {
  const featureKeys = ["flights", "hotels", "cars", "pushNotifications", "socialAuthentication"];
  if (isRecord(value) && isRecord(value.data) && typeof value.data.apiVersion === "string" && (typeof value.data.minimumSupportedAppVersion === "string" || value.data.minimumSupportedAppVersion === null) && (typeof value.data.latestAppVersion === "string" || value.data.latestAppVersion === null) && typeof value.data.maintenanceMode === "boolean" && hasBooleanRecord(value.data.features, featureKeys)) return { ok: true, data: value as ConfigResponse };
  return { ok: false, error: { code: "schema", message: SAFE_ERROR_MESSAGE } };
}

async function requestJson<T>(path: string, parser: (value: unknown) => ApiResult<T>, fetcher: Fetcher = fetch): Promise<ApiResult<T>> {
  const boundary: StartupBoundary = path === "/api/mobile/v1/health" ? "health" : "config";
  const started = Date.now();
  const report = (outcome: Parameters<typeof recordStartupDiagnostic>[1], status?: number) => recordStartupDiagnostic(boundary, outcome, Date.now() - started, status);
  const baseUrl = getApiBaseUrl();
  if (!baseUrl.ok) { report("configuration"); return { ok: false, error: { code: "configuration", message: SAFE_ERROR_MESSAGE } }; }
  report("started");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(`${baseUrl.baseUrl}${path}`, { method: "GET", signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) { report("http", response.status); return { ok: false, error: { code: "http", message: SAFE_ERROR_MESSAGE } }; }
    let json: unknown;
    try { json = await response.json(); } catch {
      const code = controller.signal.aborted ? "timeout" : "parse";
      report(code); return { ok: false, error: { code, message: SAFE_ERROR_MESSAGE } };
    }
    const result = parser(json);
    report(result.ok ? "success" : result.error.code);
    return result;
  } catch {
    const code = controller.signal.aborted ? "timeout" : "network";
    report(code); return { ok: false, error: { code, message: SAFE_ERROR_MESSAGE } };
  }
  finally { clearTimeout(timeout); }
}

export function getMobileHealth(fetcher?: Fetcher) { return requestJson("/api/mobile/v1/health", parseHealthResponse, fetcher); }
export function getMobileConfig(fetcher?: Fetcher) { return requestJson("/api/mobile/v1/config", parseConfigResponse, fetcher); }
