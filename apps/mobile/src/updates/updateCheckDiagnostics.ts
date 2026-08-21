import type { UpdateCheckResult } from "./ensureLatestUpdate";

export type UpdateCheckDiagnostics = Readonly<{
  result: UpdateCheckResult | "not-checked";
  checkedAt: string;
}>;

let latest: UpdateCheckDiagnostics = Object.freeze({ result: "not-checked", checkedAt: "unavailable" });

export function recordUpdateCheckResult(result: UpdateCheckResult, checkedAt = new Date()) {
  latest = Object.freeze({ result, checkedAt: checkedAt.toISOString() });
  return latest;
}

export function getUpdateCheckDiagnostics() {
  return latest;
}
