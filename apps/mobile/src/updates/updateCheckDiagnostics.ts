import type { UpdateCheckResult } from "./ensureLatestUpdate";

export type UpdateCheckDiagnostics = Readonly<{
  result: UpdateCheckResult | "not-checked";
  checkedAt: string;
}>;

let latest: UpdateCheckDiagnostics = Object.freeze({ result: "not-checked", checkedAt: "unavailable" });
const listeners = new Set<() => void>();

export function recordUpdateCheckResult(result: UpdateCheckResult, checkedAt = new Date()) {
  latest = Object.freeze({ result, checkedAt: checkedAt.toISOString() });
  listeners.forEach(listener => listener());
  return latest;
}

export function getUpdateCheckDiagnostics() {
  return latest;
}

export function subscribeToUpdateCheckDiagnostics(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
