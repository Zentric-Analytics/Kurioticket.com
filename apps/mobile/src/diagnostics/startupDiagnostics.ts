/** Device/operator logs only: no URLs, error text, session data or customer data. */
export type StartupBoundary = "update-initialization" | "update-check" | "update-download" | "update-activation" | "health" | "config" | "session" | "storage" | "bootstrap";
export type StartupOutcome = "started" | "success" | "disabled" | "current" | "available" | "downloaded" | "downloaded-after-deadline" | "reloading" | "timeout" | "network" | "http" | "parse" | "schema" | "configuration" | "unavailable" | "maintenance" | "error";
const boundaries: readonly string[] = ["update-initialization", "update-check", "update-download", "update-activation", "health", "config", "session", "storage", "bootstrap"];
const outcomes: readonly string[] = ["started", "success", "disabled", "current", "available", "downloaded", "downloaded-after-deadline", "reloading", "timeout", "network", "http", "parse", "schema", "configuration", "unavailable", "maintenance", "error"];
export function startupDiagnostic(boundary: StartupBoundary, outcome: StartupOutcome, elapsedMs = 0, httpStatus?: number) {
  // Validate even typed callers; never spread objects supplied by network/native exceptions.
  return {
    boundary: boundaries.includes(boundary) ? boundary : "bootstrap",
    outcome: outcomes.includes(outcome) ? outcome : "error",
    elapsedMs: Number.isFinite(elapsedMs) ? Math.max(0, Math.min(600_000, Math.round(elapsedMs))) : 0,
    ...(Number.isInteger(httpStatus) && httpStatus! >= 100 && httpStatus! <= 599 ? { httpStatus } : {}),
  };
}
export function recordStartupDiagnostic(...args: Parameters<typeof startupDiagnostic>) {
  try { console.info("[kurioticket-startup]", JSON.stringify(startupDiagnostic(...args))); }
  catch { /* Diagnostic sinks must not change startup behavior. */ }
}
