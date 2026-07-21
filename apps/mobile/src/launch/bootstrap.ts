import { getMobileConfig, getMobileHealth, type ConfigResponse, type ApiError } from "../api/mobileApi";
import { readOnboardingCompleted } from "../storage/onboardingStorage";

export type BootstrapStatus = "initializing" | "ready-first-run" | "ready-guest" | "ready-authenticated-reserved" | "offline" | "configuration-error";
export type BootstrapState = { status: BootstrapStatus; config?: ConfigResponse["data"] };

type BootstrapDependencies = { fetcher?: typeof fetch; readOnboardingCompleted?: () => Promise<boolean>; restoreAuthenticatedSession?: () => Promise<boolean> };

function devLog(message: string, details?: unknown) { if (process.env.NODE_ENV !== "production") console.warn(`[mobile-bootstrap] ${message}`, details); }
function failedState(error: ApiError): BootstrapState { return { status: error.code === "configuration" ? "configuration-error" : "offline" }; }

export async function runBootstrap(deps: BootstrapDependencies = {}): Promise<BootstrapState> {
  const fetcher = deps.fetcher;
  const health = await getMobileHealth(fetcher);
  if (!health.ok) { devLog("health check failed", health.error); return failedState(health.error); }
  if (!health.data.data.available) { devLog("health check unavailable"); return { status: "offline" }; }

  const config = await getMobileConfig(fetcher);
  if (!config.ok) { devLog("config load failed", config.error); return failedState(config.error); }
  if (config.data.data.maintenanceMode) { devLog("maintenance mode enabled"); return { status: "offline", config: config.data.data }; }

  let onboardingCompleted = false;
  try { onboardingCompleted = await (deps.readOnboardingCompleted ?? readOnboardingCompleted)(); }
  catch (error) { devLog("onboarding storage read failed", error); }
  if (!onboardingCompleted) return { status: "ready-first-run", config: config.data.data };

  const hasSession = deps.restoreAuthenticatedSession ? await deps.restoreAuthenticatedSession().catch((error) => { devLog("session restore reserved path failed", error); return false; }) : false;
  return { status: hasSession ? "ready-authenticated-reserved" : "ready-guest", config: config.data.data };
}
