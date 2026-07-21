import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { isAuthorizedSavedTripReminderCronRequest } from "@/services/savedTripReminderProcessor";

test("missing and invalid saved trip reminder cron secrets return unauthorized", () => {
  assert.equal(isAuthorizedSavedTripReminderCronRequest(new Request("http://test", { method: "POST" }), undefined), false);
  assert.equal(isAuthorizedSavedTripReminderCronRequest(new Request("http://test", { method: "POST", headers: { authorization: "Bearer invalid" } }), "secret"), false);
});

test("authorized cron route returns aggregate counts only", () => {
  const source = readFileSync("src/app/api/cron/saved-trip-reminders/route.ts", "utf8");
  assert.match(source, /isAuthorizedSavedTripReminderCronRequest\(request\)/);
  assert.match(source, /status: 401/);
  assert.match(source, /processed/);
  assert.match(source, /sent/);
  assert.match(source, /skippedByPreferences/);
  assert.match(source, /notDue/);
  assert.match(source, /failed/);
  assert.doesNotMatch(source, /itemId|userId|email/);
});
