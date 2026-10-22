import assert from "node:assert/strict";
import test from "node:test";

import {
  getJourneyActivityCutoff,
  journeyEventKey,
} from "../lib/search-journey";

test("journey event keys are namespaced for idempotency", () => {
  assert.equal(journeyEventKey("search", "request-1"), "search:request-1");
  assert.equal(journeyEventKey("client", "request-1"), "client:request-1");
  assert.notEqual(journeyEventKey("search", "request-1"), journeyEventKey("client", "request-1"));
});

test("journey activity expires after thirty minutes of inactivity", () => {
  const now = new Date("2026-10-22T10:00:00.000Z");
  assert.equal(getJourneyActivityCutoff(now).toISOString(), "2026-10-22T09:30:00.000Z");
});
