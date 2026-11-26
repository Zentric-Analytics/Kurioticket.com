import { getMobileConfig, getMobileHealth, type ConfigResponse, type ApiError } from "../api/mobileApi";
import { readOnboardingCompleted } from "../storage/onboardingStorage";
import { recordStartupDiagnostic } from "../diagnostics/startupDiagnostics";

export type BootstrapStatus = "initializing" | "ready-first-run" | "ready-guest" | "ready-authenticated-reserved" | "offline" | "configuration-error";
export type BootstrapState = { status: BootstrapStatus; config?: ConfigResponse["data"] };

type BootstrapDependencies = { fetcher?: typeof fetch; readOnboardingCompleted?: () => Promise<boolean>; restoreAuthenticatedSession?: () => Promise<boolean> };

function failedState(error: ApiError): BootstrapState { return { status: error.code === "configuration" ? "configuration-error" : "offline" }; }

export async function runBootstrap(deps: BootstrapDependencies = {}): Promise<BootstrapState> {
  try {
    const fetcher = deps.fetcher;
    const health = await getMobileHealth(fetcher);
    if (!health.ok) return failedState(health.error);
    if (!health.data.data.available) { recordStartupDiagnostic("health", "unavailable"); return { status: "offline" }; }

    const config = await getMobileConfig(fetcher);
    if (!config.ok) return failedState(config.error);
    if (config.data.data.maintenanceMode) { recordStartupDiagnostic("config", "maintenance"); return { status: "offline", config: config.data.data }; }

    const hasSession = deps.restoreAuthenticatedSession ? await deps.restoreAuthenticatedSession().catch(() => { recordStartupDiagnostic("session", "error"); return false; }) : false;
    if (hasSession) return { status: "ready-authenticated-reserved", config: config.data.data };

    let guestPersisted = false;
    try { guestPersisted = await (deps.readOnboardingCompleted ?? readOnboardingCompleted)(); }
    catch { recordStartupDiagnostic("storage", "error"); }
    return { status: guestPersisted ? "ready-guest" : "ready-first-run", config: config.data.data };
  } catch {
    recordStartupDiagnostic("bootstrap", "error");
    return { status: "offline" };
  }
}
