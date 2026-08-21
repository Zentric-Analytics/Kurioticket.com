import assert from "node:assert/strict";
import test from "node:test";
import { getUpdateCheckDiagnostics, recordUpdateCheckResult, subscribeToUpdateCheckDiagnostics } from "./updateCheckDiagnostics";

test("update-check diagnostics notify mounted consumers of foreground results", () => {
  let notifications = 0;
  const unsubscribe = subscribeToUpdateCheckDiagnostics(() => { notifications += 1; });

  recordUpdateCheckResult("current", new Date("2030-01-01T00:00:00Z"));
  assert.equal(notifications, 1);
  assert.deepEqual(getUpdateCheckDiagnostics(), { result: "current", checkedAt: "2030-01-01T00:00:00.000Z" });

  unsubscribe();
  recordUpdateCheckResult("timeout", new Date("2030-01-02T00:00:00Z"));
  assert.equal(notifications, 1);
});
