import { recordUpdateCheckResult } from "./updateCheckDiagnostics";
import { recordStartupDiagnostic, type StartupBoundary } from "../diagnostics/startupDiagnostics";

export type UpdateClient = {
  isEnabled: boolean;
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync: () => Promise<{ isNew: boolean }>;
  reloadAsync: () => Promise<void>;
};

export type UpdateCheckResult = "disabled" | "current" | "reloading" | "timeout" | "error";
export type UpdateAppState = "active" | "background" | "inactive" | "unknown" | "extension";

export async function ensureLatestUpdate(client: UpdateClient, timeoutMs = 8_000): Promise<UpdateCheckResult> {
  let phase: StartupBoundary = "update-check";
  const started = Date.now();
  const report = (outcome: Parameters<typeof recordStartupDiagnostic>[1]) => recordStartupDiagnostic(phase, outcome, Date.now() - started);
  if (!client.isEnabled) {
    report("disabled");
    recordUpdateCheckResult("disabled");
    return "disabled";
  }

  let expired = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<UpdateCheckResult>((resolve) => {
    timeout = setTimeout(() => {
      expired = true;
      report("timeout");
      resolve("timeout");
    }, timeoutMs);
  });

  const update = (async (): Promise<UpdateCheckResult> => {
    try {
      report("started");
      const check = await client.checkForUpdateAsync();
      if (!expired) report(check.isAvailable ? "available" : "current");
      if (!check.isAvailable || expired) return expired ? "timeout" : "current";

      phase = "update-download";
      report("started");
      const fetched = await client.fetchUpdateAsync();
      report(fetched.isNew ? expired ? "downloaded-after-deadline" : "downloaded" : "current");
      if (!fetched.isNew || expired) return expired ? "timeout" : "current";

      phase = "update-activation";
      report("started");
      await client.reloadAsync();
      report("reloading");
      return "reloading";
    } catch {
      if (!expired) report("error");
      return expired ? "timeout" : "error";
    }
  })();

  const result = await Promise.race([update, deadline]);
  if (timeout) clearTimeout(timeout);
  recordUpdateCheckResult(result);
  return result;
}

export function createForegroundUpdateHandler(
  runUpdate: () => Promise<unknown>,
  initialState: UpdateAppState | null,
) {
  let foregroundCheckArmed = initialState === "background" || initialState === "inactive";
  let inFlight = false;

  return (nextState: UpdateAppState) => {
    if (nextState === "background" || nextState === "inactive") {
      foregroundCheckArmed = true;
      return;
    }

    if (nextState !== "active" || !foregroundCheckArmed || inFlight) return;

    foregroundCheckArmed = false;
    inFlight = true;
    void runUpdate()
      .catch(() => undefined)
      .finally(() => {
        inFlight = false;
      });
  };
}
